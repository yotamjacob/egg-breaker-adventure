package com.eggbreakeradventures.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class EbaFirebaseMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "eba_push";

    @Override
    public void onNewToken(String token) {
        MainActivity.deliverFcmToken(token);
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        RemoteMessage.Notification notif = message.getNotification();
        if (notif == null) return;

        String title = notif.getTitle() != null ? notif.getTitle() : "Egg Breaker Adventures";
        String body  = notif.getBody()  != null ? notif.getBody()  : "";
        String url   = message.getData().containsKey("url") ? message.getData().get("url") : "/";

        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Game Updates", NotificationManager.IMPORTANCE_DEFAULT);
            nm.createNotificationChannel(ch);
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.setData(Uri.parse("https://egg-breaker-adventures.vercel.app" + url));
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notification_icon)
            .setAutoCancel(true)
            .setContentIntent(pi);

        // Unique ID per message so rapid notifications don't replace each other.
        String msgId = message.getMessageId();
        int notifId = (msgId != null) ? msgId.hashCode() : (int) System.currentTimeMillis();
        nm.notify(notifId, builder.build());
    }
}
