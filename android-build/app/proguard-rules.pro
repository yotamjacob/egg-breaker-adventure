# Keep @JavascriptInterface bridge methods so R8 cannot rename or remove them.
# Belt-and-suspenders over R8's built-in WebView handling.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep androidbrowserhelper TWA + Digital Goods entry points.
-keep class com.google.androidbrowserhelper.** { *; }

# Keep Play Billing listener interfaces and result classes used via callbacks.
-keep class com.android.billingclient.api.** { *; }
