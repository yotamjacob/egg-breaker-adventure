package com.eggbreakeradventures.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.browser.customtabs.CustomTabsIntent;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import com.google.firebase.messaging.FirebaseMessaging;

import java.lang.ref.WeakReference;
import java.util.Collections;
import java.util.List;

public class MainActivity extends Activity {

    private WebView webView;
    private BillingClient billingClient;
    private volatile boolean _billingReady = false;
    private volatile boolean _jsReady      = false;
    private static final String GAME_URL = "https://egg-breaker-adventures.vercel.app/";

    // WeakReference so EbaFirebaseMessagingService can deliver tokens without preventing GC.
    static WeakReference<MainActivity> _instanceRef;

    // Called from EbaFirebaseMessagingService when a new FCM token is issued
    static void deliverFcmToken(String token) {
        MainActivity a = _instanceRef != null ? _instanceRef.get() : null;
        if (a != null) a.sendFcmTokenToJs(token);
    }

    private void sendFcmTokenToJs(String token) {
        if (webView == null) return;
        final String escaped = token.replace("\\", "\\\\").replace("'", "\\'");
        webView.post(() -> webView.evaluateJavascript(
            "if(typeof window.onFcmToken==='function')window.onFcmToken('" + escaped + "')", null));
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        _instanceRef = new WeakReference<>(this);

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

            // Called from JS once the game is fully initialised.
            // Fires queryOwnedPurchases() only when BOTH billing and JS are ready.
            @JavascriptInterface
            public void jsReady() {
                _jsReady = true;
                if (_billingReady) queryOwnedPurchases();
            }

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

            // Fetches the FCM registration token and delivers it to JS via window.onFcmToken(token).
            // Called from JS when the user enables push notifications on Android.
            @JavascriptInterface
            public void requestFcmToken() {
                FirebaseMessaging.getInstance().getToken()
                    .addOnSuccessListener(token -> { if (token != null) sendFcmTokenToJs(token); })
                    .addOnFailureListener(e -> payLog("FCM token failed: " + e.getMessage()));
            }

        }, "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Google OAuth blocks WebView (Error 403: disallowed_useragent).
                // Open auth URLs in a Chrome Custom Tab (same task as this activity).
                // Because MainActivity is singleTask, the App Link OAuth callback pops
                // the Custom Tab automatically when onNewIntent() fires — no manual close needed.
                if (url.contains("supabase.co/auth") || url.contains("accounts.google.com")) {
                    new CustomTabsIntent.Builder().build()
                        .launchUrl(MainActivity.this, Uri.parse(url));
                    return true;
                }
                return false;
            }
        });
        // Grant web permission requests (Notification API, Push Manager) from our controlled origin.
        // Origin check prevents any rogue cross-origin frame from silently acquiring permissions.
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                if (Uri.parse("https://egg-breaker-adventures.vercel.app").equals(request.getOrigin())) {
                    request.grant(request.getResources());
                } else {
                    request.deny();
                }
            }
        });

        // Android 13+ requires POST_NOTIFICATIONS runtime permission even if declared in manifest.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(
                    new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 1001);
            }
        }

        // Register predictive back callback (API 33+); onBackPressed() handles API < 33.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                () -> { if (webView != null && webView.canGoBack()) webView.goBack(); else finish(); });
        }

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
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    _billingReady = true;
                    if (_jsReady) queryOwnedPurchases();
                }
            }
            @Override
            public void onBillingServiceDisconnected() {
                jsLog("Billing disconnected — reconnecting");
                connectBilling();
            }
        });
    }

    /** Queries all owned in-app products and pipes each through onPlayPurchaseResult.
     *  Called on billing setup so owned items (e.g. from a previous install) are
     *  automatically verified and applied without requiring a manual restore. */
    private void queryOwnedPurchases() {
        if (billingClient == null || !billingClient.isReady()) return;
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build();
        payLog("queryOwned: querying Play Billing");
        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            int count = purchases != null ? purchases.size() : 0;
            payLog("queryOwned code=" + billingResult.getResponseCode() + " count=" + count);
            jsLog("queryOwned code=" + billingResult.getResponseCode() + " count=" + count);
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) return;
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED
                        && !purchase.getProducts().isEmpty()) {
                    String productId = purchase.getProducts().get(0);
                    payLog("queryOwned found=" + productId + " state=" + purchase.getPurchaseState());
                    callJsPurchaseResult(productId, purchase.getPurchaseToken(), true, null);
                }
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
        String fragment = data.getFragment();
        String query    = data.getQuery();

        boolean isAppLink = "https".equals(scheme) &&
                            "egg-breaker-adventures.vercel.app".equals(data.getHost());

        if ("eggbreakeradventures".equals(scheme) || isAppLink) {
            if (fragment != null && fragment.contains("access_token")) {
                // Implicit flow — inject token via JS so the page doesn't reload
                // and sessionStorage (_oauthPending flag) stays intact.
                jsLog("onNewIntent: implicit, injecting via JS");
                final String escaped = fragment.replace("\\", "\\\\").replace("'", "\\'");
                webView.post(() -> webView.evaluateJavascript(
                    "if(typeof handleAndroidOAuthCallback==='function')" +
                    "handleAndroidOAuthCallback('" + escaped + "')", null));
            } else if (query != null && query.contains("code=")) {
                // PKCE flow — extract the code and exchange via JS without a page reload.
                // webView.loadUrl() would reload the page which can clear sessionStorage
                // and the Supabase code_verifier. handleAndroidPkceCallback() calls
                // exchangeCodeForSession(), which looks up the stored verifier itself.
                try {
                    String code = Uri.parse("https://x/?" + query).getQueryParameter("code");
                    if (code != null) {
                        jsLog("onNewIntent: PKCE, injecting code via JS");
                        final String escaped = code.replace("\\", "\\\\").replace("'", "\\'");
                        webView.post(() -> webView.evaluateJavascript(
                            "if(typeof handleAndroidPkceCallback==='function')" +
                            "handleAndroidPkceCallback('" + escaped + "')", null));
                    } else {
                        jsLog("onNewIntent: PKCE, no code param in query=" + query.substring(0, Math.min(query.length(), 60)));
                    }
                } catch (Exception e) {
                    jsLog("onNewIntent: PKCE parse error: " + e.getMessage());
                }
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

    /** Injects _payLog() into the WebView so billing events appear in the payment debug log. */
    private void payLog(final String msg) {
        if (webView == null) return;
        final String escaped = msg.replace("\\", "\\\\").replace("'", "\\'");
        webView.post(() -> webView.evaluateJavascript(
            "if(typeof _payLog==='function')_payLog('" + escaped + "')", null));
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

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        // Handles API < 33; API 33+ uses OnBackInvokedCallback registered in onCreate().
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
        if (_instanceRef != null && _instanceRef.get() == this) _instanceRef = null;
        if (billingClient != null) { billingClient.endConnection(); billingClient = null; }
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
