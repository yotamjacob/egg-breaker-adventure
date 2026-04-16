package com.eggbreakeradventures.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;

import java.util.Collections;
import java.util.List;

public class MainActivity extends Activity {

    private WebView webView;
    private BillingClient billingClient;
    private static final String GAME_URL = "https://egg-breaker-adventures.vercel.app/";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF1A1A2E);
        setContentView(webView);

        applyImmersiveMode();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // Set up Play Billing client
        billingClient = BillingClient.newBuilder(this)
            .setListener(this::onPurchasesUpdated)
            .enablePendingPurchases()
            .build();
        connectBilling();

        // AndroidBridge exposes native functionality to JavaScript
        webView.addJavascriptInterface(new Object() {

            @JavascriptInterface
            public boolean isAndroidApp() { return true; }

            // Called from JS: window.AndroidBridge.purchaseProduct('gold_s')
            // Queries Play Billing for the product then launches the purchase sheet.
            // Result fires window.onPlayPurchaseResult(productId, token, success, errorMsg)
            @JavascriptInterface
            public void purchaseProduct(final String productId) {
                if (billingClient == null || !billingClient.isReady()) {
                    callJsPurchaseResult(productId, null, false, "Billing not ready");
                    return;
                }
                QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(Collections.singletonList(
                        QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(productId)
                            .setProductType(BillingClient.ProductType.INAPP)
                            .build()
                    ))
                    .build();

                billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
                            || productDetailsList == null || productDetailsList.isEmpty()) {
                        callJsPurchaseResult(productId, null, false,
                            "Product not found (code " + billingResult.getResponseCode() + ")");
                        return;
                    }
                    ProductDetails details = productDetailsList.get(0);
                    BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(Collections.singletonList(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(details)
                                .build()
                        ))
                        .build();
                    // launchBillingFlow must run on the UI thread
                    runOnUiThread(() -> billingClient.launchBillingFlow(MainActivity.this, flowParams));
                });
            }

        }, "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Google OAuth blocks WebView (Error 403: disallowed_useragent).
                // Open auth URLs in the device's default browser; the custom-scheme
                // redirect (eggbreakeradventures://) is caught by onNewIntent().
                if (url.contains("supabase.co/auth") || url.contains("accounts.google.com")) {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(browserIntent);
                    return true;
                }
                return false;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        Uri intentData = getIntent().getData();
        String url = (intentData != null) ? intentData.toString() : GAME_URL;
        webView.loadUrl(url);
    }

    // ── Play Billing ─────────────────────────────────────────────────────────

    private void connectBilling() {
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                jsLog("Billing setup: " + result.getResponseCode());
            }
            @Override
            public void onBillingServiceDisconnected() {
                jsLog("Billing disconnected — reconnecting");
                connectBilling();
            }
        });
    }

    private void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                String productId = purchase.getProducts().get(0);
                callJsPurchaseResult(productId, purchase.getPurchaseToken(), true, null);
            }
        } else if (result.getResponseCode() != BillingClient.BillingResponseCode.USER_CANCELED) {
            callJsPurchaseResult(null, null, false, "Code " + result.getResponseCode());
        }
        // USER_CANCELED: silently ignore — user dismissed the sheet
    }

    /** Fires window.onPlayPurchaseResult(productId, token, success, errorMsg) in the WebView. */
    private void callJsPurchaseResult(String productId, String token, boolean ok, String error) {
        String pid = productId != null ? "'" + productId.replace("'", "\\'") + "'" : "null";
        String tok = token     != null ? "'" + token.replace("'", "\\'")     + "'" : "null";
        String err = error     != null ? "'" + error.replace("'", "\\'")     + "'" : "null";
        String js  = "if(typeof window.onPlayPurchaseResult==='function')" +
                     "window.onPlayPurchaseResult(" + pid + "," + tok + "," + ok + "," + err + ");";
        if (webView != null) webView.post(() -> webView.evaluateJavascript(js, null));
    }

    // ── OAuth ────────────────────────────────────────────────────────────────

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();

        final String dataStr = (data != null) ? data.toString() : "null";
        jsLog("onNewIntent data=" + dataStr.substring(0, Math.min(dataStr.length(), 120)));

        if (data == null || webView == null) return;

        String scheme = data.getScheme();
        if ("eggbreakeradventures".equals(scheme)) {
            String fragment = data.getFragment();
            String query    = data.getQuery();

            if (fragment != null) {
                jsLog("onNewIntent: implicit, injecting via JS");
                final String escaped = fragment.replace("\\", "\\\\").replace("'", "\\'");
                webView.post(() -> webView.evaluateJavascript(
                    "if(typeof handleAndroidOAuthCallback==='function')" +
                    "handleAndroidOAuthCallback('" + escaped + "')", null));
            } else if (query != null) {
                String gameUrl = GAME_URL + "?" + query;
                jsLog("onNewIntent: PKCE, reloading=" + gameUrl.substring(0, Math.min(gameUrl.length(), 100)));
                webView.loadUrl(gameUrl);
            }
        } else {
            webView.loadUrl(data.toString());
        }
    }

    // ── Utilities ────────────────────────────────────────────────────────────

    /** Injects _oauthLog() into the WebView for in-app debugging. */
    private void jsLog(final String msg) {
        if (webView == null) return;
        final String escaped = msg.replace("\\", "\\\\").replace("'", "\\'");
        webView.post(() -> webView.evaluateJavascript(
            "if(typeof _oauthLog==='function')_oauthLog('" + escaped + "')", null));
    }

    private void applyImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            android.view.WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(android.view.WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(
                    android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            //noinspection deprecation
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyImmersiveMode();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        applyImmersiveMode();
    }

    @Override
    protected void onDestroy() {
        if (billingClient != null) { billingClient.endConnection(); billingClient = null; }
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
