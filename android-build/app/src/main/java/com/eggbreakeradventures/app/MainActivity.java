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

public class MainActivity extends Activity {

    private WebView webView;
    private static final String GAME_URL = "https://egg-breaker-adventures.vercel.app/";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on while playing
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        webView = new WebView(this);
        // Match game background — no white flash while loading
        webView.setBackgroundColor(0xFF1A1A2E);
        setContentView(webView);

        applyImmersiveMode();

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);       // localStorage for game saves
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false); // allow autoplay music
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // Exposes window.AndroidBridge to JS so the game can detect it's inside
        // the Android app (e.g. to use a custom OAuth redirect scheme).
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public boolean isAndroidApp() { return true; }
        }, "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Google OAuth blocks WebView requests (Error 403: disallowed_useragent).
                // Open the Supabase/Google auth URL in the device's default browser via a
                // plain ACTION_VIEW intent (not a Custom Tab). Custom Tabs can suppress
                // the custom-scheme intent that fires on the OAuth redirect, so a real
                // browser window gives more reliable onNewIntent() routing for the
                // eggbreakeradventures:// callback.
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

        // If launched from a shortcut or App Link (OAuth callback), use that URL
        Uri intentData = getIntent().getData();
        String url = (intentData != null) ? intentData.toString() : GAME_URL;
        webView.loadUrl(url);
    }

    // Called when the OAuth redirect returns to this already-running activity.
    // singleTask launch mode ensures we land here rather than a new instance.
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();

        // Log into the JS debug log so we can see this from the in-app debug button.
        final String dataStr = (data != null) ? data.toString() : "null";
        jsLog("onNewIntent data=" + dataStr.substring(0, Math.min(dataStr.length(), 120)));

        if (data == null || webView == null) return;

        String scheme = data.getScheme();
        if ("eggbreakeradventures".equals(scheme)) {
            String fragment = data.getFragment(); // implicit: access_token=...&refresh_token=...
            String query    = data.getQuery();    // PKCE:     code=XXXX

            if (fragment != null) {
                // Implicit flow: webView.loadUrl() with a hash is a same-page navigation —
                // the page doesn't reload so Supabase never scans the URL. Instead, call
                // handleAndroidOAuthCallback() via JS to pass the tokens to setSession().
                jsLog("onNewIntent: implicit, injecting via JS");
                final String escaped = fragment.replace("\\", "\\\\").replace("'", "\\'");
                webView.post(() -> webView.evaluateJavascript(
                    "if(typeof handleAndroidOAuthCallback==='function')" +
                    "handleAndroidOAuthCallback('" + escaped + "')", null));
            } else if (query != null) {
                // PKCE flow: full page reload with ?code=... so Supabase can exchange it.
                String gameUrl = GAME_URL + "?" + query;
                jsLog("onNewIntent: PKCE, reloading gameUrl=" + gameUrl.substring(0, Math.min(gameUrl.length(), 100)));
                webView.loadUrl(gameUrl);
            }
        } else {
            // Fallback: HTTPS App Link or shortcut launch.
            webView.loadUrl(data.toString());
        }
    }

    /** Injects a _oauthLog() call into the WebView — visible via the in-app debug button. */
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
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
