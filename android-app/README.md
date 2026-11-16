# ZUNE Android App

This Android wrapper opens ZUNE Market first and keeps ZUNE Acts inside the same app.

- Market: https://mrnehemiah.github.io/Z-marketing-/
- Seller Portal: https://mrnehemiah.github.io/zuneacts/
- Application ID: `com.zune.app`
- Native project: Android / Java / WebView
- Backend: existing hosted sites and existing Supabase project; no database migration is performed by this wrapper.

## Build an APK

Every push that changes `android-app/**` or the workflow starts a GitHub Actions build.

1. Open the repository's **Actions** tab.
2. Select **Build ZUNE Android APK**.
3. Open the successful run.
4. Download the `ZUNE-Android-APK` artifact.
5. Extract `app-debug.apk` and install it on an Android device.

For local builds, use JDK 17 and Gradle 8.9:

```sh
gradle -p android-app :app:assembleDebug
```

The APK is currently a debug build for testing. A signed release APK/AAB requires a protected signing key and Play Console setup.

## Current integration notes

The WebView supports JavaScript, DOM storage, browser back navigation and website file pickers. ZUNE Market and ZUNE Acts remain hosted independently and share their existing backend. Google OAuth callback/deep-link handling, native push notifications, offline-first behavior and Play Store signing are follow-up release tasks; they are not claimed as complete in this initial wrapper.
