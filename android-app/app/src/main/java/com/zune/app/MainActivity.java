package com.zune.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private static final String MARKET = "https://mrnehemiah.github.io/";
    private static final String SELLER = "https://mrnehemiah.github.io/zuneacts/";
    private static final String LATEST_RELEASE = "https://api.github.com/repos/mrnehemiah/mrnehemiah.github.io/releases/latest";
    private WebView webView;
    private ValueCallback<Uri[]> uploadCallback;
    private static final int FILE_CHOOSER_REQUEST = 4201;
    private long activeDownloadId = -1;
    private BroadcastReceiver downloadReceiver;

    private boolean isTrusted(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        String host = uri.getHost();
        return "mrnehemiah.github.io".equalsIgnoreCase(host)
                && (url.startsWith(MARKET) || url.startsWith(SELLER)
                || url.equals("https://mrnehemiah.github.io/"));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setLoadsImagesAutomatically(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (isTrusted(url)) return false;
                openExternal(url);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                if (uploadCallback != null) uploadCallback.onReceiveValue(null);
                uploadCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException ex) {
                    uploadCallback = null;
                    Toast.makeText(MainActivity.this, "Hakuna app ya kuchagua faili.", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        webView.clearCache(false);
        webView.loadUrl(MARKET);
        checkForUpdates();
    }

    private void checkForUpdates() {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(LATEST_RELEASE).openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setRequestProperty("Accept", "application/vnd.github+json");
                connection.setRequestProperty("User-Agent", "ZUNE-Android-App");
                if (connection.getResponseCode() != 200) return;
                StringBuilder jsonText = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) jsonText.append(line);
                }
                JSONObject release = new JSONObject(jsonText.toString());
                if (release.optBoolean("draft", false) || release.optBoolean("prerelease", false)) return;
                String body = release.optString("body", "");
                int remoteCode = extractVersionCode(body);
                int localCode = getLocalVersionCode();
                if (remoteCode <= localCode) return;

                JSONArray assets = release.optJSONArray("assets");
                String apkUrl = null;
                if (assets != null) {
                    for (int i = 0; i < assets.length(); i++) {
                        JSONObject asset = assets.getJSONObject(i);
                        if ("ZUNE.apk".equalsIgnoreCase(asset.optString("name"))) {
                            apkUrl = asset.optString("browser_download_url", null);
                            break;
                        }
                    }
                }
                if (apkUrl == null || !apkUrl.startsWith("https://github.com/")) return;

                String notes = body.replaceAll("(?m)^versionCode\\s*=.*$", "").trim();
                String finalApkUrl = apkUrl;
                new Handler(Looper.getMainLooper()).post(() -> showUpdateDialog(
                        release.optString("tag_name", "Toleo jipya"), notes, finalApkUrl));
            } catch (Exception ignored) {
                // Update checks are optional; the marketplace remains usable offline.
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private int extractVersionCode(String body) {
        try {
            java.util.regex.Matcher matcher = java.util.regex.Pattern
                    .compile("(?m)^versionCode\\s*=\\s*(\\d+)\\s*$").matcher(body);
            return matcher.find() ? Integer.parseInt(matcher.group(1)) : 0;
        } catch (Exception ignored) { return 0; }
    }

    private int getLocalVersionCode() {
        try {
            PackageInfo info;
            if (Build.VERSION.SDK_INT >= 33) {
                info = getPackageManager().getPackageInfo(getPackageName(),
                        PackageManager.PackageInfoFlags.of(0));
            } else {
                info = getPackageManager().getPackageInfo(getPackageName(), 0);
            }
            return (int) (Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode);
        } catch (Exception ignored) { return 0; }
    }

    private void showUpdateDialog(String version, String notes, String apkUrl) {
        if (isFinishing()) return;
        String message = notes.isEmpty()
                ? "Kuna toleo jipya la ZUNE lenye maboresho na marekebisho."
                : notes;
        new AlertDialog.Builder(this)
                .setTitle("ZUNE ina sasisho jipya")
                .setMessage("Toleo: " + version + "\\n\\n" + message
                        + "\\n\\nUngependa kupakua na kusakinisha sasisho sasa?")
                .setCancelable(true)
                .setNegativeButton("Baadaye", (dialog, which) -> dialog.dismiss())
                .setPositiveButton("Sasisha sasa", (dialog, which) -> downloadUpdate(apkUrl))
                .show();
    }

    private void downloadUpdate(String apkUrl) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
            request.setTitle("ZUNE Update");
            request.setDescription("Inapakua toleo jipya la ZUNE...");
            request.setMimeType("application/vnd.android.package-archive");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, "ZUNE-update.apk");
            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            activeDownloadId = manager.enqueue(request);
            registerDownloadReceiver();
            Toast.makeText(this, "Upakuaji wa ZUNE umeanza.", Toast.LENGTH_LONG).show();
        } catch (Exception ex) {
            Toast.makeText(this, "Imeshindikana kuanza upakuaji wa update.", Toast.LENGTH_LONG).show();
        }
    }

    private void registerDownloadReceiver() {
        if (downloadReceiver != null) return;
        downloadReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != activeDownloadId) return;
                DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                Uri apkUri = manager.getUriForDownloadedFile(activeDownloadId);
                if (apkUri == null) {
                    Toast.makeText(MainActivity.this, "Upakuaji haujakamilika. Jaribu tena.", Toast.LENGTH_LONG).show();
                    return;
                }
                if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
                    Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + getPackageName()));
                    startActivity(settingsIntent);
                    Toast.makeText(MainActivity.this, "Ruhusu ZUNE kusakinisha masasisho, kisha fungua ZUNE tena.", Toast.LENGTH_LONG).show();
                    return;
                }
                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(apkUri, "application/vnd.android.package-archive");
                install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try { startActivity(install); }
                catch (ActivityNotFoundException ex) {
                    Toast.makeText(MainActivity.this, "Simu haijapata kisakinishi cha APK.", Toast.LENGTH_LONG).show();
                }
            }
        };
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(downloadReceiver, filter);
    }

    private void openExternal(String url) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (ActivityNotFoundException ignored) {
            Toast.makeText(this, "Kiungo hiki hakiwezi kufunguliwa.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && uploadCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            uploadCallback.onReceiveValue(results);
            uploadCallback = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (downloadReceiver != null) {
            try { unregisterReceiver(downloadReceiver); } catch (Exception ignored) {}
        }
        if (uploadCallback != null) uploadCallback.onReceiveValue(null);
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
