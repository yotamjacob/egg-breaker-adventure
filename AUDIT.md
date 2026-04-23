# Pre-Launch Audit

## Project Profile

### App identity
- **Package:** `com.eggbreakeradventures.app`
- **App name:** Egg Smash Adventures
- **Hosted URL:** `https://egg-breaker-adventures.vercel.app/`

### Build system
- **Gradle DSL:** Groovy (`.gradle` files, not Kotlin DSL)
- **AGP:** 8.9.1
- **Google Services plugin:** 4.4.2
- **Build tool:** `bubblewrap-cli` generated the Android project; releases are built manually with `./gradlew bundleRelease` + `jarsigner`

### Language mix
- **100% Java** — 5 source files, 0 Kotlin, 0 C/C++
  - `MainActivity.java` — WebView host, Play Billing bridge, OAuth redirect handler
  - `LauncherActivity.java` — TWA launcher (extends `androidbrowserhelper.LauncherActivity`) — **not registered in manifest, dead code**
  - `Application.java` — stub (`onCreate` is empty)
  - `EbaFirebaseMessagingService.java` — FCM token + message handling
  - `DelegationService.java` — Digital Goods / push delegation for TWA

### Engine / framework
**TWA (Trusted Web Activity).** The "game" is a vanilla-JavaScript web app (HTML/CSS/JS) hosted on Vercel and served inside Chrome's Custom Tabs shell. There is no Unity, Unreal, LibGDX, React Native, or Flutter. The Android layer is a thin wrapper: billing bridge, OAuth intent intercept, FCM token delivery.

### Architecture pattern
**Single-Activity + WebView JavaScript bridge.** All game logic lives in the web layer (`game.js`, `render.js`, etc.). Android exposes a `JavascriptInterface` (`AndroidBridge`) for billing, push permission, and JS-ready signalling. No MVVM/MVP/Clean architecture — the web app is the application.

### Key third-party SDKs
| SDK | Version | Purpose |
|-----|---------|---------|
| `com.android.billingclient:billing` | 7.0.0 | Google Play in-app purchases |
| `com.google.androidbrowserhelper:androidbrowserhelper` | 2.6.2 | TWA shell + Custom Tabs |
| `com.google.androidbrowserhelper:billing` | 1.1.0 | Digital Goods API bridge |
| Firebase BOM | 33.1.2 | Version alignment |
| `firebase-messaging` | (from BOM) | Push notifications (FCM) |
| Supabase JS SDK | (web layer) | Auth, cloud save DB |

### SDK versions
| Field | Value |
|-------|-------|
| `compileSdkVersion` | 36 |
| `targetSdkVersion` | 35 |
| `minSdkVersion` | 21 |
| `versionCode` | 106 |
| `versionName` | **"2.3.9"** — web app `config.js VERSION = '2.4.30'` (21+ versions of drift; `build.gradle` has never been kept in sync) |

### CI/CD
- **GitHub Actions** — `.github/workflows/smoke-tests.yml`
  - Triggers: push to `main` + twice-daily schedule (08:00 & 20:00 UTC) + manual dispatch
  - Runs Node.js smoke tests against the live Vercel production URL
  - Sends failure-alert email via Gmail App Password (optional secrets)
- **No Android build CI** — AAB is built and signed manually on the developer's machine

### Test setup
- **Node.js smoke tests** (`tests/smoke.test.js`) — web-layer only; covers: app availability, Supabase auth health, IAP verify/restore proxy, FCM push round-trip, cloud save round-trip, RLS enforcement
- **No JUnit, Robolectric, Espresso, or UIAutomator** — no `src/test/` or `src/androidTest/` directories
- **No Firebase Test Lab** configuration

### Monetization
**Google Play Billing non-consumable IAPs.** Purchase flow:
1. JS calls `AndroidBridge.purchaseProduct(productId)` → native `launchBillingFlow`
2. `onPlayPurchaseResult` callback → JS → Vercel proxy → Supabase Edge Fn `verify-play-purchase`
3. Entitlement stored in Supabase `play_purchases` table + `PREMIUM_KEY` in localStorage
4. On cold start: `queryOwnedPurchases()` re-verifies all owned tokens (idempotent)

### Online features
| Feature | Implementation |
|---------|---------------|
| Cloud save / auth | Supabase (Google OAuth via Custom Tab → App Link callback) |
| Push notifications | Firebase Cloud Messaging |
| IAP verification | Vercel proxy → Supabase Edge Function |
| Purchase restore | Vercel proxy → Supabase Edge Function (`restore-purchases`) |
| Remote hosting | Vercel (CDN, auto-deploy on git push) |

---

## Executive Summary

- **0 blockers, 4 high, 4 medium, 5 low**
- **Ship recommendation: GO-WITH-FIXES** — No definitive Play Store rejection-level issues found statically. The 4 HIGH items are real risks that should be fixed before submission; none require architectural changes.
- **Top 5 risks ranked:**
  1. Session tokens backed up to Google Drive via Auto-Backup (privacy/policy exposure)
  2. `onPermissionRequest` grants all WebView permissions without origin check (security)
  3. No ProGuard keep-rules file + no `shrinkResources` (release build hygiene; untested R8 behavior)
  4. `versionName "2.3.9"` shown to users while app is actually `2.4.30` (cosmetic but visible day-1)
  5. Deprecated `onBackPressed()` on targetSdk 35 with no predictive back opt-in (UX regression on Android 14+)

---

## High (🟠)

### [H-01] `android:allowBackup="true"` exposes session tokens and IAP state to Google Drive
**Severity:** 🟠 HIGH  
**Domain:** 2.1 Play Store readiness / 2.10 Privacy  
**Location:** [android-build/app/src/main/AndroidManifest.xml](android-build/app/src/main/AndroidManifest.xml#L10)  
**What's wrong:** `android:allowBackup="true"` is set with no `android:dataExtractionRules` (API 31+) or `android:fullBackupContent` rules. Android Auto-Backup will include the entire app's data directory, which for a WebView app contains everything Chrome stores in `files/` and `app_webview/`: the Supabase session JWT (`sb-hhpikvqeopscjdzuhbfk.supabase.co-auth-token`), `_cloudLinkPref`, `PREMIUM_KEY` (IAP entitlements), and the compressed game save. If a user restores to a new device from backup, their session tokens arrive ready to use — potentially allowing session replay or confusion if the token has expired.  
**Why it matters for launch:** Play Data Safety requires accurately declaring whether credential data is backed up. A session token being silently included in Auto-Backup is a privacy disclosure gap. Also, if a user uninstalls and reinstalls (e.g. after a factory reset restore), they may get a stale session that causes confusing auth failures.  
**Fix:**

```xml
<!-- AndroidManifest.xml — add to <application> -->
android:dataExtractionRules="@xml/data_extraction_rules"
android:fullBackupContent="@xml/backup_rules"
```

```xml
<!-- res/xml/data_extraction_rules.xml  (API 31+) -->
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="sharedpref" path="."/>  <!-- excludes all SharedPreferences -->
    <exclude domain="database" path="."/>
    <!-- WebView data lives under file/app_webview — no domain tag covers it directly,
         so exclude root-level app data that Chrome mirrors there -->
  </cloud-backup>
  <device-transfer>
    <exclude domain="sharedpref" path="."/>
    <exclude domain="database" path="."/>
  </device-transfer>
</data-extraction-rules>
```

> Note: WebView `localStorage` lives inside `app_webview/` which is under the `root` domain. Adding `<exclude domain="root" path="app_webview"/>` will exclude the entire WebView store. Game saves are synced to Supabase anyway, so losing them on a fresh install is acceptable — the cloud restore flow handles re-hydration.

**Effort:** S  
**Auto-verifiable:** Partially — `adb backup` can be used to inspect what is included; full verification requires manual device test.

---

### [H-02] `onPermissionRequest` grants all WebView permissions without origin check
**Severity:** 🟠 HIGH  
**Domain:** 2.2 Security  
**Location:** [android-build/app/src/main/java/com/eggbreakeradventures/app/MainActivity.java](android-build/app/src/main/java/com/eggbreakeradventures/app/MainActivity.java#L176-L180)  
**What's wrong:**
```java
webView.setWebChromeClient(new WebChromeClient() {
    @Override
    public void onPermissionRequest(PermissionRequest request) {
        request.grant(request.getResources());   // grants everything — camera, mic, geolocation, etc.
    }
});
```
This grants any permission requested by any origin in the WebView with zero validation. The comment says "from our controlled origin," but the code doesn't enforce that. While the only loaded URL is `https://egg-breaker-adventures.vercel.app/`, the `AUDIO_CAPTURE` and `VIDEO_CAPTURE` resources would be silently granted to any JS call — including push notification permission (the intended use case), but also `getUserMedia()` calls for camera or microphone if they ever appeared in the game JS.  
**Why it matters for launch:** Google Play policy explicitly requires that dangerous permissions (camera, microphone, location) are requested only when needed with user understanding. An unconditional grant also means any future XSS on the Vercel domain would immediately get camera/mic without user interaction.  
**Fix:** Whitelist only the resources the game actually needs:
```java
webView.setWebChromeClient(new WebChromeClient() {
    private static final Set<String> ALLOWED = new HashSet<>(Arrays.asList(
        PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID  // for push/notifications
    ));
    @Override
    public void onPermissionRequest(PermissionRequest request) {
        String[] toGrant = Arrays.stream(request.getResources())
            .filter(ALLOWED::contains)
            .toArray(String[]::new);
        if (toGrant.length > 0) request.grant(toGrant);
        else request.deny();
    }
});
```
If the game uses the Web Push API, `RESOURCE_PROTECTED_MEDIA_ID` is the relevant resource; verify what Chrome reports for push and add only that.  
**Effort:** S  
**Auto-verifiable:** No — requires device test with a page that requests `getUserMedia`.

---

### [H-03] No `proguardFiles` in release `buildType` — R8 runs without app-specific keep rules
**Severity:** 🟠 HIGH  
**Domain:** 2.1 Play Store readiness / 2.2 Security  
**Location:** [android-build/app/build.gradle](android-build/app/build.gradle#L156-L160)  
**What's wrong:**
```groovy
buildTypes {
    release {
        minifyEnabled true
        // ← no proguardFiles, no shrinkResources
    }
}
```
R8 runs with only library consumer rules (from AAR dependencies). The AGP default rules file (`proguard-android-optimize.txt`) — which contains keep rules for `Activity`, `Application`, `Service`, reflection-used Android APIs, and `@JavascriptInterface` — is **not applied** because `proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'` is never declared. In practice R8 has built-in handling for `@JavascriptInterface`, but without the default file:
- `androidbrowserhelper` internal reflection may be stripped
- Custom Activity subclasses referenced only via manifest XML may be stripped
- Future code additions will have no safety net

Additionally, `shrinkResources true` is absent — unused assets stay in the AAB.  
**Why it matters for launch:** An R8 regression in the release build (e.g., `AndroidBridge` methods renamed, `DelegationService` removed) would silently break billing, OAuth, or push notifications only in the signed release build — not caught until a user reports it.  
**Fix:**
```groovy
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```
Create `app/proguard-rules.pro` with:
```
# Keep JavascriptInterface bridge methods (belt-and-suspenders over R8 built-in)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
# Keep androidbrowserhelper entry points
-keep class com.google.androidbrowserhelper.** { *; }
# Keep billing library callbacks used via lambda/listener
-keep class com.android.billingclient.api.** { *; }
```
Then do a **full release build smoke test**: build the signed AAB, install on a device, verify billing launches and `window.AndroidBridge.jsReady()` fires.  
**Effort:** S  
**Auto-verifiable:** Yes — `./gradlew bundleRelease` + install on device + run billing flow.

---

### [H-04] `versionName` is "2.3.9" while the web app is at v2.4.30
**Severity:** 🟠 HIGH  
**Domain:** 2.14 Build & release pipeline  
**Location:** [android-build/app/build.gradle](android-build/app/build.gradle#L62)  
**What's wrong:** `versionName "2.3.9"` is what the Play Store shows users in "What's new" and what Android's `PackageInfo.versionName` returns. The web app has shipped 21+ releases since this was last updated. Anyone who checks the app version in Settings or a bug report will see "2.3.9," making debugging and support confusing. The `build.gradle` `versionCode` (106) and `versionName` have never been kept in sync with `config.js VERSION`.  
**Why it matters for launch:** The version shown on the Play Store listing will be wrong from day one. Support interactions ("what version are you on?") will get the wrong number. Automated crash-report triage that correlates app version to bug regressions will be off.  
**Fix:** Before every AAB submission, manually sync `build.gradle`:
```groovy
versionCode 107          // increment monotonically each build submitted
versionName "2.4.30"     // match config.js VERSION
```
Longer term: add a Gradle task or a step in the CLAUDE.md build instructions that reads `config.js` and sets `versionName` automatically.  
**Effort:** S  
**Auto-verifiable:** Yes — `grep versionName android-build/app/build.gradle` vs `grep VERSION config.js`.

---

## Medium (🟡)

### [M-01] `onBackPressed()` is deprecated on API 33+ with no predictive back opt-in
**Severity:** 🟡 MEDIUM  
**Domain:** 2.1 Play Store readiness  
**Location:** [android-build/app/src/main/java/com/eggbreakeradventures/app/MainActivity.java](android-build/app/src/main/java/com/eggbreakeradventures/app/MainActivity.java#L364-L369)  
**What's wrong:** `onBackPressed()` is deprecated since API 33. For `targetSdk 35`, Android expects `android:enableOnBackInvokedCallback="true"` in the `<application>` tag (or per-activity) and the back logic migrated to `OnBackPressedCallback`. Without the opt-in flag, the predictive back animation (the "peek" that shows what's behind the app) is disabled for the entire app.  
**Why it matters for launch:** Play Store won't reject this, but it will appear in the Play Console pre-launch report as a compatibility warning. On Android 14+ devices, the back gesture will have no preview animation, which feels dated compared to system apps.  
**Fix:**
```xml
<!-- AndroidManifest.xml — <activity android:name=".MainActivity"> -->
android:enableOnBackInvokedCallback="true"
```
```java
// In onCreate(), replace onBackPressed() override with:
getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
    @Override
    public void handleOnBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else setEnabled(false); // let the system handle it (exit)
    }
});
```
**Effort:** S  
**Auto-verifiable:** Yes — verify with Android Studio's lint check for `onBackPressed` deprecation.

---

### [M-02] No Android build CI — release pipeline is entirely manual
**Severity:** 🟡 MEDIUM  
**Domain:** 2.14 Build & release pipeline  
**Location:** `.github/workflows/` (no Android workflow present)  
**What's wrong:** The GitHub Actions CI only runs web-layer smoke tests against Vercel. Building, signing, and uploading the AAB is a fully manual process documented only in `CLAUDE.md`. There is no automated check that `./gradlew bundleRelease` succeeds after a code change, no automated release artifact, and no mapping file upload.  
**Why it matters for launch:** A manual pipeline is error-prone: a Gradle dependency update could silently break the build between AAB submissions; mapping file upload to Play Console for crash symbolication could be forgotten; signing with the wrong key config could go undetected until upload.  
**Fix:** Add a GitHub Actions workflow (e.g. `android-release.yml`) with:
- Trigger: push of a `v*` tag
- Steps: checkout → set up JDK → `./gradlew bundleRelease` → sign with keystore from Actions secrets → upload AAB artifact

**Effort:** M  
**Auto-verifiable:** Yes — workflow run passes or fails.

---

### [M-03] `jcenter()` repository is sunset and should be replaced
**Severity:** 🟡 MEDIUM  
**Domain:** 2.14 Build & release pipeline  
**Location:** [android-build/build.gradle](android-build/build.gradle#L23) and [android-build/build.gradle](android-build/build.gradle#L37)  
**What's wrong:** `jcenter()` appears in both `buildscript.repositories` and `allprojects.repositories`. JCenter was sunset by JFrog in May 2021 — no new artifacts are published. Existing artifacts remain cached locally and in the JFrog CDN, but the service could become unreliable. New contributors or CI machines without a warm Gradle cache may experience intermittent download failures.  
**Fix:** Replace both `jcenter()` with `mavenCentral()`. All dependencies in this project (`billing`, `androidbrowserhelper`, Firebase) are available on Maven Central.  
**Effort:** S  
**Auto-verifiable:** Yes — remove `jcenter()`, clean Gradle cache, run `./gradlew dependencies`.

---

### [M-04] Hardcoded notification ID `1` causes all push notifications to replace each other
**Severity:** 🟡 MEDIUM  
**Domain:** 2.8 Services / 2.13 Game-specific  
**Location:** [android-build/app/src/main/java/com/eggbreakeradventures/app/EbaFirebaseMessagingService.java](android-build/app/src/main/java/com/eggbreakeradventures/app/EbaFirebaseMessagingService.java#L53)  
**What's wrong:** `nm.notify(1, builder.build())` uses a hardcoded ID. Every FCM message replaces the previous notification in the notification shade. If two push notifications arrive in quick succession (e.g. a "hammers refilled" alert followed by a "daily reward" message), only the second will be visible.  
**Fix:**
```java
// Use a unique ID per message — e.g. a counter or hash of the message body:
int notifId = (int) System.currentTimeMillis();  // simple, unique per second
nm.notify(notifId, builder.build());
```
**Effort:** S  
**Auto-verifiable:** No — requires two back-to-back FCM messages on a device.

---

## Low (🟢)

### [L-01] `shrinkResources true` missing from release buildType
**Severity:** 🟢 LOW  
**Domain:** 2.3 Performance / 2.14 Build  
**Location:** [android-build/app/build.gradle](android-build/app/build.gradle#L156-L160)  
**What's wrong:** `minifyEnabled true` shrinks code but `shrinkResources true` (which removes unused resource files) is absent. For a TWA app with few custom resources this has minimal impact on AAB size, but it's standard release hygiene.  
**Fix:** Add `shrinkResources true` alongside `minifyEnabled true` (requires H-03 fix first — `shrinkResources` requires `minifyEnabled`).  
**Effort:** S  
**Auto-verifiable:** Yes — compare AAB sizes before/after.

---

### [L-02] No monochrome adaptive icon (themed icons on API 33+)
**Severity:** 🟢 LOW  
**Domain:** 2.1 Play Store readiness  
**Location:** [android-build/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml](android-build/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml)  
**What's wrong:** The adaptive icon has `<background>` and `<foreground>` layers but no `<monochrome>` layer. On Android 13+ (API 33) with themed icons enabled, the launcher will fall back to the regular foreground icon rather than showing a system-tinted monochrome version. This is purely cosmetic.  
**Fix:** Add a monochrome vector drawable and reference it:
```xml
<adaptive-icon>
  <background android:drawable="@color/backgroundColor"/>
  <foreground android:drawable="@mipmap/ic_maskable"/>
  <monochrome android:drawable="@drawable/ic_monochrome"/>  <!-- new -->
</adaptive-icon>
```
**Effort:** S  
**Auto-verifiable:** Visually — enable themed icons in Android 13+ device settings.

---

### [L-03] `LauncherActivity.java` is dead code — not registered in the manifest
**Severity:** 🟢 LOW  
**Domain:** 2.14 Build  
**Location:** [android-build/app/src/main/java/com/eggbreakeradventures/app/LauncherActivity.java](android-build/app/src/main/java/com/eggbreakeradventures/app/LauncherActivity.java)  
**What's wrong:** `LauncherActivity.java` extends `com.google.androidbrowserhelper.trusted.LauncherActivity` and is a vestigial file from the original `bubblewrap-cli` template. It is not declared in `AndroidManifest.xml` — the real launcher is `MainActivity`. R8 will likely strip it, but it adds confusion about app entry points.  
**Fix:** Delete `LauncherActivity.java`. If `androidbrowserhelper.trusted.LauncherActivity` was ever used, that functionality is now handled by `MainActivity` directly.  
**Effort:** S  
**Auto-verifiable:** Yes — build succeeds after deletion.

---

### [L-04] No Baseline Profiles
**Severity:** 🟢 LOW  
**Domain:** 2.3 Performance  
**Location:** (absent from project)  
**What's wrong:** No `baseline-prof.txt` / Baseline Profile module present. For a TWA app most startup cost is in Chrome itself (not in the app's Java code), so the benefit is lower than for a native app — but generating one for `MainActivity`'s code path is still a small win.  
**Fix:** Use the `androidx.benchmark:benchmark-macrobenchmark` module or Android Studio's Baseline Profile generator to capture a startup profile. Minimal effort for a single-Activity app.  
**Effort:** M  
**Auto-verifiable:** Yes — presence of `baseline-prof.txt` in the module.

---

### [L-05] `static MainActivity instance` is a textbook memory leak pattern
**Severity:** 🟢 LOW  
**Domain:** 2.4 Memory  
**Location:** [android-build/app/src/main/java/com/eggbreakeradventures/app/MainActivity.java](android-build/app/src/main/java/com/eggbreakeradventures/app/MainActivity.java#L45-L46)  
**What's wrong:**
```java
static MainActivity instance;   // set in onCreate, cleared in onDestroy
```
This pattern is used to let `EbaFirebaseMessagingService` deliver FCM tokens to the live Activity. The reference is nulled in `onDestroy`, so the risk in a single-Activity app is minimal — but it delays GC of the Activity between `onDestroy` and the next GC cycle, and LeakCanary would flag it.  
**Fix:** Use a `WeakReference<MainActivity>` or, better, a local `BroadcastReceiver` / `LiveData` event bus to deliver the FCM token. For this app the practical risk is negligible; address in a post-launch cleanup.  
**Effort:** S  
**Auto-verifiable:** No — requires LeakCanary or heap dump analysis.

---

## Domains reviewed with no findings

- **2.1 (partial)** — `targetSdk 35` ✓, `compileSdk 36` ≥ target ✓, AAB build configured ✓, release keystore present outside VCS (`android-build/` is gitignored) ✓, no native `.so` libraries (16 KB page size N/A, 64-bit requirement N/A), `setMixedContentMode(MIXED_CONTENT_NEVER_ALLOW)` ✓, `POST_NOTIFICATIONS` runtime permission handled for API 33+ ✓, App Link `android:autoVerify="true"` set + `assetlinks.json` present with 2 SHA256 fingerprints ✓, Adaptive icon foreground+background layers present ✓
- **2.2 (partial)** — No hardcoded Supabase service-role key in Java source ✓, Firebase API key in `google-services.json` is package-scoped and not in VCS ✓, `setAllowFileAccess(false)` + `setAllowContentAccess(false)` ✓, all bridge methods have `@JavascriptInterface` ✓, Play Billing 7.0.0 (not deprecated) ✓, server-side IAP verification via Edge Function ✓, `verify-play-purchase` idempotency confirmed in smoke tests ✓, no exported Content Providers ✓, no world-readable file operations ✓
- **2.5 Battery** — `FLAG_KEEP_SCREEN_ON` used (preferred over wakelock) ✓, `webView.onPause()` called in `onPause` ✓, no `AlarmManager`, `WakeLock`, or `WorkManager` misuse ✓, no background sensors
- **2.8 Services** — `EbaFirebaseMessagingService` exported=false ✓, `DelegationService` export gated on `@bool/enableNotification` ✓, `PaymentActivity`/`PaymentService` exported=true is intentional for Play Billing Digital Goods API ✓, billing connection disconnected in `onDestroy` ✓
- **2.9 Cloud/network** — No staging URLs in production build ✓, all network calls go through HTTPS ✓, offline handled by PWA service worker ✓, IAP restore queries by both `device_id` and `user_id` ✓
- **2.12 Device compatibility** — `minSdk 21` (~99% device coverage), portrait-only justified for a game, no native code to worry about, no GPU manifest requirements needed ✓
- **2.13 Game-specific** — Save system backed by Supabase cloud save + localStorage ✓, IAP non-consumables verified server-side ✓, no leaderboards/PvP (anti-cheat N/A), no native assets > 200 MB (Play Asset Delivery N/A)

---

## Unable to assess without runtime / device

1. **R8 correctness in release build** — Whether R8 strips any critical reflection or callback paths in the signed release AAB can only be confirmed by building the release artifact and running a full billing + OAuth smoke test on-device. Specifically verify: `window.AndroidBridge` is accessible, `jsReady()` fires, `purchaseProduct()` launches the billing sheet.
2. **App Links (Digital Asset Links) verification** — `android:autoVerify="true"` requires `/.well-known/assetlinks.json` to be reachable from Vercel and match the release certificate fingerprint. The file exists locally at `.well-known/assetlinks.json` with 2 fingerprints. Verify via: `adb shell pm get-app-links com.eggbreakeradventures.app` — should report `verified` for `egg-breaker-adventures.vercel.app`.
3. **Predictive back gesture on Android 14+** — Without `android:enableOnBackInvokedCallback="true"`, Play Console pre-launch report may flag a back-navigation regression. Test with a physical Android 14+ device after M-01 fix.
4. **Edge-to-edge UI on Android 15 (API 35)** — `targetSdk 35` opts the app into edge-to-edge by default. The immersive mode + `WindowInsetsController.hide(systemBars())` should handle this, but display cutout (notch) handling and bottom navigation bar overlap need visual verification on a device.
5. **Push notification delivery end-to-end** — FCM token acquisition, `subscribe-push` registration, and notification tap-to-open URL routing all need device verification.
6. **Play Console checks** — Privacy policy URL must be set and reachable; Data Safety form must be filled out (the app collects: game progress, purchase history, Google account info for cloud save, FCM device token — all must be declared); content rating questionnaire.
7. **Low-end device test** — Verify the WebView + game JS runs acceptably on a minSdk 21 device (Android 5.0). Chrome WebView version on very old devices may not support all JS features used by the game.
8. **Auto-Backup scope** — The exact WebView data directories included in Auto-Backup need to be verified with `adb backup` + extraction, since the `root` domain scoping for WebView data varies by Android version.
