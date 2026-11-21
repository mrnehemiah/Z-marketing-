package com.zune.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class ZuneFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "ZUNE-PUSH";
    private static final String CHANNEL_ID = "zune_notifications";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        SharedPreferences prefs = getSharedPreferences("zune_fcm", MODE_PRIVATE);
        prefs.edit().putString("fcm_token", token).apply();
        Log.i(TAG, "FCM registration token refreshed.");
        MainActivity.notifyNativePushTokenReady();
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        super.onMessageReceived(message);
        String title = "ZUNE";
        String body = "Una arifa jipya kutoka ZUNE.";
        if (message.getNotification() != null) {
            if (message.getNotification().getTitle() != null) title = message.getNotification().getTitle();
            if (message.getNotification().getBody() != null) body = message.getNotification().getBody();
        }
        Map<String, String> data = message.getData();
        if (data.containsKey("title")) title = data.get("title");
        if (data.containsKey("body")) body = data.get("body");
        showNotification(title, body, data);
    }

    private void showNotification(String title, String body, Map<String, String> data) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Arifa za ZUNE", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Arifa za oda, malipo na taarifa nyingine za ZUNE.");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 250, 150, 250});
            manager.createNotificationChannel(channel);
        }

        Intent openApp = new Intent(this, MainActivity.class);
        openApp.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        String actionUrl = data.get("action_url");
        if (actionUrl == null || actionUrl.isEmpty()) actionUrl = data.get("url");
        if (actionUrl != null && !actionUrl.isEmpty()) {
            openApp.putExtra("action_url", actionUrl);
            openApp.putExtra("url", actionUrl);
        }
        String notificationId = data.get("notification_id");
        if (notificationId != null) openApp.putExtra("notification_id", notificationId);
        String notificationType = data.get("type");
        if (notificationType != null) openApp.putExtra("notification_type", notificationType);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 1001, openApp,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.zune_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setGroup("zune_messages")
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        try {
            NotificationManagerCompat.from(this).notify((int) (System.currentTimeMillis() & 0x7fffffff), notification.build());
        } catch (SecurityException error) {
            Log.w(TAG, "Notification permission is not granted.", error);
        }
    }
}
