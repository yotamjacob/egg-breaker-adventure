# Android Pre-Launch Audit Prompt

Copy everything below the `---` into Claude Code at the root of your project.

---

You are acting as a senior Android release auditor. My game ships to the Play Store in ~2 weeks. I need you to run a full pre-launch audit of this codebase. Treat this as a staged investigation, not a one-shot dump. Work in the phases below, in order, and **do not make any code changes during phases 1–4** — this is a read-only audit. You'll propose fixes at the end and wait for my approval before touching anything.

## Phase 0 — Orient yourself

Before anything else, figure out what you're actually looking at. Report back a short project profile:

- Build system (Gradle Groovy / Kotlin DSL / Bazel / other) and AGP version
- Language mix (Kotlin / Java / C++ / other) and percentages
- Engine / framework (native Android, Unity, Unreal, Godot, LibGDX, Flutter, React Native, etc.) — look at `build.gradle`, `Assets/`, `Source/`, native libs, entry points
- Architecture pattern (MVVM, MVI, MVP, Clean, ECS for games, etc.)
- Key third-party SDKs (Firebase, GameServices, ads, analytics, IAP, crash reporting, Unity/Unreal plugins)
- `minSdk`, `targetSdk`, `compileSdk`, `versionCode`, `versionName`
- CI/CD presence (GitHub Actions, Bitrise, Fastlane, etc.)
- Test setup (JUnit, Robolectric, Espresso, UIAutomator, Firebase Test Lab config)
- Monetization model (IAP, ads, subscriptions, none)
- Whether the game has online features (auth, cloud saves, leaderboards, matchmaking, remote config)

Create `AUDIT.md` at the repo root with this profile as the first section. Every subsequent finding goes into this file.

## Phase 1 — Define severity and stop-ship criteria

Use this rubric for every finding you report:

- **🔴 BLOCKER** — ship must be delayed. Security vulnerability, policy violation that will get rejected, crash-on-launch on common devices, data loss, IAP receipts unverified, missing required Play Store artifacts.
- **🟠 HIGH** — should be fixed before launch. Performance regression visible to players, common memory leak, privacy/analytics non-compliance, poor error handling on network failures.
- **🟡 MEDIUM** — fix in a post-launch patch. Minor jank, non-optimal battery behavior, test gaps, code quality that increases bug risk.
- **🟢 LOW / NICE-TO-HAVE** — defer. Style, minor refactors, optional modernizations.

Each finding must include: file path + line range, what's wrong, why it matters for launch, concrete fix (code sketch or steps), estimated effort (S/M/L), and whether it can be verified automatically.

## Phase 2 — Run the audit across every domain below

Work through each domain. For each one, explicitly state what you checked, what you found, and what you couldn't determine without running the app. Do not skip domains silently — if something doesn't apply, say "N/A — reason."

### 2.1 Play Store readiness (check first; these are ship blockers)

- `targetSdkVersion` is **35 or higher** (required for new apps on Play Store as of 2025; will be rejected otherwise).
- `compileSdkVersion` matches or exceeds target.
- `minSdkVersion` — check what device share you're cutting off; for a game, 24+ is common, 21+ gives broader reach.
- **16 KB page size support** — required since Nov 1, 2025 for any app with native `.so` libraries. Inspect every `.so` under `lib/arm64-v8a`, `lib/x86_64`. Check AGP ≥ 8.5.1 and NDK ≥ r28 if native code exists. Flag any third-party SDK whose `.so` isn't 16 KB aligned.
- 64-bit native libraries present for `arm64-v8a` (required). Flag if only `armeabi-v7a`.
- App Bundle (AAB) configured, not raw APK.
- Release signing config is a real keystore, not debug. Keystore is not checked into VCS. `signingConfig` in release buildType is set.
- ProGuard/R8 enabled for release (`minifyEnabled true`, `shrinkResources true`). Keep-rules exist for reflection-used classes, Gson/Moshi/kotlinx.serialization models, native method bridges, JNI.
- `android:allowBackup` and `android:fullBackupContent` reviewed — saves/credentials shouldn't be world-backupable.
- `android:debuggable` must be false in release (usually auto, but verify no override).
- AndroidManifest: every `exported="true"` component is intentional; all activities/services/receivers/providers on API 31+ have explicit `exported` attribute.
- `usesCleartextTraffic` is false (or restricted via `networkSecurityConfig` to specific dev hosts only).
- Permissions list is minimal — for each permission, either justify it or flag for removal. Runtime permissions have correct flow for API 23+. `POST_NOTIFICATIONS` handled for API 33+.
- Predictive back gesture: if `targetSdk ≥ 34`, check `android:enableOnBackInvokedCallback` and custom back handling migrated.
- Edge-to-edge: on `targetSdk 35`, windows go edge-to-edge by default — verify UI respects system bars (no overlap with navigation bar, status bar, display cutouts).
- Adaptive icon (foreground + background layers), monochrome icon for themed icons on API 33+.
- Locale config (`locales_config.xml`) if supporting multiple languages for per-app language picker.
- Play Data Safety form implications — identify every piece of data collected/transmitted and by which SDK. You'll reconcile this with what's declared later; flag any collection that looks undeclared.
- Version bumped from last submission.

### 2.2 Security

- Hardcoded secrets: search the full tree (including `strings.xml`, `BuildConfig`, Gradle files, `assets/`, native source) for API keys, JWT tokens, signing keys, cloud credentials, webhook URLs with secrets, test creds left behind.
- Network security config: HTTPS enforced, cert pinning considered for auth / payment / anti-cheat endpoints, no wildcard trust anchors.
- TLS: OkHttp/HttpsURLConnection configured properly. No `TrustManager` that accepts all certs. No `HostnameVerifier` returning true unconditionally.
- WebView (if any): `setJavaScriptEnabled` scrutinized, `addJavascriptInterface` targets only `@JavascriptInterface`-annotated methods, `setAllowFileAccess`/`setAllowContentAccess` tightened, no loading of user-controlled URLs.
- Deep links & intent filters: every exported activity that accepts intents validates its extras. Check `scheme`/`host` filters; look for intent redirection vulnerabilities.
- Broadcast receivers: exported receivers validate sender; use `LocalBroadcastManager` or `Context.RECEIVER_NOT_EXPORTED` (API 33+) where the sender is internal.
- Content providers: exported providers enforce permissions or `grantUriPermissions` correctly; no SQL injection in selection args.
- SharedPreferences / local storage: anything sensitive (session tokens, player IDs used for auth, save data tied to purchases) uses `EncryptedSharedPreferences` or equivalent. Sqlite DBs for auth/IAP state use SQLCipher or similar if sensitive.
- File IO: no world-readable files. Scoped storage respected on API 29+. No `file://` URIs shared cross-app — `FileProvider` used.
- IAP: Google Play Billing Library **7.x or newer** (5.x is deprecated, 4.x sunset). Purchases are **acknowledged** within 3 days, consumables consumed, purchases verified server-side (receipt → Google Play Developer API). No client-only validation of entitlements.
- Anti-tamper for competitive/leaderboard/IAP integrity: consider Play Integrity API (successor to SafetyNet Attestation, which is deprecated). Root detection if economy matters.
- Obfuscation: R8 rules reviewed; `-keepattributes Signature, InnerClasses` if using reflection with generics; native method signatures kept.
- Native code: if C/C++ is present, scan for obvious issues — `strcpy`/`sprintf`/`gets` usage, unbounded `memcpy`, integer overflow on allocations, missing bounds checks on JNI `GetArrayLength` paths. Flag for a dedicated native review if substantial.
- Anti-debug / anti-hook: if the game has real economy stakes, check whether it detects common tools (Frida, Xposed, emulators) — decide if warranted for this title.
- Dependency CVEs: run `./gradlew dependencyUpdates` equivalent mentally — flag any dep with known critical CVEs. Pay attention to OkHttp, Netty, Gson, Jackson, Apache libs.

### 2.3 Performance

- Startup: cold start path. What runs before first frame? Is Firebase/analytics/ads SDK init on the main thread at `Application.onCreate`? Move to background where safe, or defer via `App Startup` library.
- **Baseline Profiles**: check if present (`baseline-prof.txt`). Not required, but for a game they're a 10–30% startup and jank win. Flag as HIGH if absent.
- Startup ANR risk: any disk IO, network, or heavy reflection on the main thread during `Application`/launcher Activity creation.
- Frame pacing: for native Android games, check Android Frame Pacing / Swappy usage. For Unity/Unreal, verify `Application.targetFrameRate` / frame rate settings are sensible and not capped unnecessarily low or high.
- Rendering: scan for overdraw patterns (nested backgrounds, redundant `setBackground` calls on inflated views). Flag `HardwareBitmaps` opportunities for loaded textures.
- Main-thread work: scan for disk IO, `SharedPreferences.commit()` (vs `apply()`), synchronous network, `Thread.sleep`, heavy JSON parsing, regex compile on hot paths.
- Hot-path allocations: inside the game loop / `onDraw` / update tick, flag any `new`, boxing, `String.format`, `ArrayList` growth, iterator allocations — these are GC triggers that cause stutter.
- Object pooling: particles, projectiles, spawned entities — are they pooled?
- Bitmap/texture handling: `BitmapFactory.Options.inSampleSize`, `inBitmap` reuse, decode off main thread. Mipmaps enabled for textures that scale down. Texture compression format appropriate (ASTC for modern devices).
- Asset size: APK/AAB size. Lint for unused resources. Language/density splits. Play Asset Delivery for large games (>150 MB base).
- Network: responses gzipped, response caching via OkHttp cache, CDN for static assets. Multiple redundant requests at startup flagged.
- Database: Room / SQLite — missing indexes on frequently-queried columns, N+1 query patterns, queries on main thread.
- LeakCanary / strict mode findings, if the project has them wired up.

### 2.4 Memory

- Context leaks: static fields / singletons / companion objects holding `Activity` or `View` references.
- Listener leaks: unregistered `BroadcastReceiver`s, `SensorManager` listeners, `LocationManager` updates, `OrientationEventListener`.
- Coroutine / Job leaks: scopes tied to Activity/Fragment lifecycle use `lifecycleScope`/`viewModelScope`; no `GlobalScope` in UI code; `SupervisorJob`s cancelled on dispose.
- Bitmap leaks: bitmaps not recycled or cached without bounds; no `LruCache` eviction strategy for texture/avatar caches.
- Inner class leaks: non-static `Handler`, `AsyncTask`, `Thread`, `Runnable` holding outer class refs.
- Native memory: GPU texture residency, large mmap'd assets, native heap via NDK. Flag if the game ships big uncompressed textures or preloads entire asset catalogs.
- `onTrimMemory` / `onLowMemory` implemented with real eviction (not just logged).
- Large object allocations during gameplay: identify anywhere a multi-MB allocation happens per frame or per level-load without reuse.

### 2.5 Battery

- Wakelocks: any `PowerManager.newWakeLock` without a timeout or with a lifetime exceeding the screen-on requirement? `FLAG_KEEP_SCREEN_ON` preferred for gameplay; wakelocks discouraged.
- Background work: `AlarmManager` usage reviewed — prefer `WorkManager` for deferrable work. `setExact`/`setExactAndAllowWhileIdle` only where justified.
- Foreground services: each one has a valid `foregroundServiceType` (API 34+ requires it) and would survive Play policy review. Music/gameplay services stopped when not needed.
- Sensors & location: polling frequency reasonable; unregistered in `onPause`; fused location provider used over GPS where possible; `PRIORITY_HIGH_ACCURACY` only when needed.
- Network batching: analytics events batched, not one POST per event. WorkManager `NetworkType.UNMETERED` for heavy uploads.
- Doze / App Standby: no reliance on exact timing in background; job constraints set.
- Frame rate cap: menus/pause screens can drop to 30 fps to save battery; verify this is considered.
- CPU usage at idle: game loop shouldn't spin when paused/backgrounded. Verify `onPause` suspends simulation, audio, network keepalives.

### 2.6 Memory leaks & lifecycle correctness (deeper pass)

- Fragment transactions after `onSaveInstanceState` — check for `commitAllowingStateLoss` abuse vs. correct state handling.
- Configuration changes: rotation, dark mode toggle, font scale, per-app language — does the game survive without state loss? Are ViewModels / saved state used?
- Process death: `SavedStateHandle` / `onSaveInstanceState` covers player progress, current level state, UI state.
- Multi-window / split-screen / foldable unfold: if supported, `onPause` ≠ game freeze; `onMultiWindowModeChanged` handled.

### 2.7 Testing

- Unit test coverage for: save/load serialization, scoring/economy logic, IAP entitlement resolution, any server response parsing.
- Deterministic sim tests for game logic (seeded RNG in, expected state out).
- Instrumented smoke test that launches the app and reaches gameplay.
- Monkey test: `adb shell monkey -p com.package 5000` — has this been run recently? Any crashes?
- Firebase Test Lab matrix configured — at minimum a Robo test across 3–5 physical device classes (low-end, mid-range, high-end, tablet, foldable).
- Release-build tests: R8/ProGuard rules tested — missing keep-rules typically only manifest in release. Run or document having run `./gradlew assembleRelease` and a full smoke test on the release artifact.
- Crash reproduction: flaky tests flagged; disabled tests investigated.

### 2.8 Services, background work, and IPC

- Every `Service` justified, declared in manifest with correct `exported`/`permission`, lifecycle correct, started/stopped as intended.
- `JobScheduler`/`WorkManager` jobs have unique tags, aren't duplicated, handle retry/backoff.
- `BroadcastReceiver` registrations paired with unregistrations; no `Context.registerReceiver` in an Activity without `onDestroy` cleanup.
- FCM: token refresh handled, topic subscriptions idempotent, notification channels created before posting on API 26+.
- Bound services: `ServiceConnection` unbound on scope end.

### 2.9 Cloud & network

- Base URLs: no staging/dev URLs shipped in release. `BuildConfig` flavors separate envs.
- Retrofit/OkHttp: timeouts set (connect / read / write); retry policy sane; interceptors don't log sensitive payloads in release (`HttpLoggingInterceptor.Level.NONE` in release).
- Auth: token refresh flow handles 401 without infinite loop. Refresh token storage encrypted. Logout clears tokens.
- Offline behavior: game handles no network gracefully (no ANR, queued actions, offline-capable gameplay if intended).
- Cloud saves (Play Games Services / Firebase / custom): conflict resolution defined. Corruption-resistant format (checksum/version). Migration path for schema changes.
- Analytics / attribution SDKs (Firebase Analytics, Adjust, AppsFlyer, Singular, GameAnalytics): init order, user consent gates for GDPR/CCPA regions, IDFA/AAID handling respects `com.google.android.gms.permission.AD_ID` declaration rules.
- Remote config: default values present so first-launch-offline works. Fetch throttling respected.
- Crashlytics / crash reporting: wired up, mapping file upload configured for R8, NDK symbol upload if native crashes should be symbolicated.
- Error handling: no silent `catch (Exception e) {}` on network calls that should surface to the player.

### 2.10 Privacy & compliance

- Privacy policy URL present, reachable, and matches actual data collection.
- Consent flow for EU (GDPR), California (CPRA), Brazil (LGPD) where applicable — UMP SDK if serving ads.
- **AD_ID permission** declared only if you actually use the advertising ID; if target is children or no ad attribution, don't declare it.
- Children's content: if `Designed for Families` or rating suggests under-13 audience, check COPPA compliance — no personalized ads, limited SDKs, no behavioral analytics.
- Data safety form mapping: list every data type transmitted off-device, by which SDK, for which purpose.
- Third-party SDK inventory: every SDK listed with version, purpose, data it collects, and whether it's GDPR-ready.

### 2.11 Accessibility & internationalization

- Content descriptions on interactive UI elements outside the game canvas.
- Minimum touch target sizes (48dp).
- Font scale: UI survives 200% font scale without clipping.
- Color contrast sufficient on HUD/menus.
- RTL layout support (`supportsRtl`) or explicit opt-out justified.
- All user-facing strings in `strings.xml`, no hardcoded text in code/layouts. Translation completeness per locale.
- Locale-sensitive formatting (numbers, dates, currencies) uses `Locale`-aware APIs.

### 2.12 Device & form factor compatibility

- Screen sizes: phone, large phone, tablet (7"/10"), foldables (unfolded state).
- Aspect ratios: `maxAspectRatio` / `android:resizeableActivity` reviewed for modern devices (21:9, 20:9, foldables).
- Orientation: if locked, justified; if free, layouts handle both.
- Low-RAM devices (`ActivityManager.isLowRamDevice()`): graceful asset degradation.
- Chromebook / desktop mode / keyboard input: at least no crashes on unexpected input devices.
- Low-end GPU / Vulkan fallback / OpenGL ES version declared in manifest matches actual requirement.

### 2.13 Game-specific concerns

- Save system: atomic writes (write to temp + rename), versioning, corruption detection, migration on update.
- Anti-cheat for leaderboards/PvP: server authoritative for anything that matters; client-submitted scores validated.
- Economy: IAP receipts validated server-side, entitlements stored server-side, race conditions on consumables handled.
- Difficulty spikes / tutorial completion / first-session funnel: analytics events emit at each step so you can diagnose day-1 churn.
- Asset streaming: Play Asset Delivery (install-time / fast-follow / on-demand) for assets > 200 MB.
- Audio: audio focus handled (ducks on call, resumes after), no playback in background unless intentional.
- Input: handles gamepads if the game supports them; multi-touch gesture conflicts resolved.
- Ads (if present): interstitials not shown during gameplay, rewarded ads have fallback for failed load, ad frequency capped.

### 2.14 Build & release pipeline

- `.gitignore` covers keystores, `google-services.json` (decide if you want it in VCS), `local.properties`, `.idea`.
- CI builds release artifact and runs tests. If no CI — flag as MEDIUM.
- Fastlane / Gradle Play Publisher / manual upload documented.
- Version code strategy (monotonic, e.g., `major*10000 + minor*100 + patch`).
- Mapping file upload to Play Console / Crashlytics automated.
- Native symbol upload configured.
- Tag/branch strategy for release build reproducibility.
- A rollback plan exists (previous version code stored, staged rollout percentages planned).

## Phase 3 — Produce the audit report

Write all findings to `AUDIT.md` with this structure:

```
# Pre-Launch Audit

## Project Profile
(from Phase 0)

## Executive Summary
- N blockers, N high, N medium, N low
- Ship recommendation: GO / GO-WITH-FIXES / HOLD
- Top 5 risks ranked

## Blockers (🔴)
<one entry per finding with full template>

## High (🟠)
...

## Medium (🟡)
...

## Low (🟢)
...

## Domains reviewed with no findings
(list every 2.x section that came back clean)

## Unable to assess without runtime / device
(things that need a device, profiler, or Play Console access)
```

Finding template:

```
### [ID] Short title
**Severity:** 🔴 BLOCKER
**Domain:** 2.2 Security
**Location:** `app/src/main/java/.../NetworkModule.kt:42-58`
**What's wrong:** ...
**Why it matters for launch:** ...
**Fix:** ... (with code sketch if small)
**Effort:** S / M / L
**Auto-verifiable:** yes / no (and how)
```

## Phase 4 — Stop and report

After writing `AUDIT.md`, summarize in chat:
1. Ship recommendation.
2. Blocker count and titles.
3. The 3 highest-leverage fixes (biggest risk reduction per hour of work).
4. What you could not determine statically and need me to run on-device (profiler traces, Play Console checks, Firebase Test Lab runs, etc.).

Then wait. Do not start fixing anything until I review the report and tell you which findings to address first.

## Rules of engagement

- Read-only until I approve fixes. No code edits, no `git` mutations, no dependency bumps during Phases 1–4.
- If a check requires running the app / a profiler / a device, note it under "Unable to assess without runtime" rather than guessing.
- If you're uncertain whether something is a real issue or a false positive, mark it as a finding with severity "needs human review" and explain the ambiguity.
- Prefer citing exact file paths and line ranges over vague descriptions.
- Don't pad the report. A domain with no findings gets one line ("2.x — clean"). Don't invent issues to fill space.
- If the codebase is large, work in chunks and checkpoint progress in `AUDIT.md` as you go so nothing is lost if the session resets.

Start with Phase 0 now.
