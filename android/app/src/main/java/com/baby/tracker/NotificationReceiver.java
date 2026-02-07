package com.baby.tracker;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class NotificationReceiver extends BroadcastReceiver {
    private static final String TAG = "NotificationReceiver";
    private static final String CHANNEL_ID = "pregnancy_reminders";
    private static final String CHANNEL_NAME = "Pregnancy Reminders";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Alarm triggered");

        int reminderId = intent.getIntExtra("reminderId", 0);
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        String type = intent.getStringExtra("type");
        boolean isDaily = intent.getBooleanExtra("isDaily", false);
        boolean wakeScreen = intent.getBooleanExtra("wakeScreen", false);
        boolean isAlarm = intent.getBooleanExtra("isAlarm", false);

        // Create notification channel
        createNotificationChannel(context, isAlarm);

        // Show notification
        showNotification(context, reminderId, title, body, type, wakeScreen, isAlarm);

        // If it's a daily alarm, reschedule for next day
        if (isDaily) {
            int hour = intent.getIntExtra("hour", 9);
            int minute = intent.getIntExtra("minute", 0);
            AlarmScheduler scheduler = new AlarmScheduler(context);
            scheduler.scheduleDailyAlarm(reminderId, title, body, type, hour, minute, isAlarm);
        }
    }

    private void createNotificationChannel(Context context, boolean isAlarm) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = 
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

            String channelId = isAlarm ? CHANNEL_ID + "_alarm" : CHANNEL_ID;
            String channelName = isAlarm ? CHANNEL_NAME + " (Alarm)" : CHANNEL_NAME;
            int importance = NotificationManager.IMPORTANCE_HIGH; // Both high to wake screen

            NotificationChannel channel = new NotificationChannel(
                channelId,
                channelName,
                importance
            );
            channel.setDescription("Daily reminders for medication, exercise, and custom alerts");
            channel.enableLights(true);
            channel.setLightColor(0xFFFFC0CB); // Pink color
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500}); // Longer pattern
            
            Uri soundUri = RingtoneManager.getDefaultUri(
                isAlarm ? RingtoneManager.TYPE_ALARM : RingtoneManager.TYPE_NOTIFICATION
            );
            channel.setSound(soundUri, null);

            notificationManager.createNotificationChannel(channel);
        }
    }

    private void showNotification(Context context, int reminderId, String title, String body, String type, boolean wakeScreen, boolean isAlarm) {
        NotificationManager notificationManager = 
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        // Intent to open app when notification is tapped
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
            context,
            reminderId,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Snooze action
        Intent snoozeIntent = new Intent(context, SnoozeReceiver.class);
        snoozeIntent.putExtra("reminderId", reminderId);
        snoozeIntent.putExtra("title", title);
        snoozeIntent.putExtra("body", body);
        snoozeIntent.putExtra("type", type);
        PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
            context,
            reminderId + 10000,
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Dismiss action
        Intent dismissIntent = new Intent(context, DismissReceiver.class);
        dismissIntent.putExtra("reminderId", reminderId);
        PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
            context,
            reminderId + 20000,
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Get icon based on type
        int icon = getIconForType(type);

        String channelId = isAlarm ? CHANNEL_ID + "_alarm" : CHANNEL_ID;

        // Build notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(icon)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX) // MAX to ensure heads-up
            .setCategory(isAlarm ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(openAppPendingIntent)
            .addAction(0, "Snooze 10 min", snoozePendingIntent)
            .addAction(0, "Dismiss", dismissPendingIntent)
            .setVibrate(new long[]{0, 500, 200, 500, 200, 500})
            .setLights(0xFFFFC0CB, 1000, 3000); // Pink color

        if (isAlarm) {
            builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM));
        } else {
            builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
        }

        // Full screen intent for wake-up
        if (wakeScreen || isAlarm) {
            Intent fullScreenIntent = new Intent(context, MainActivity.class);
            fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                context,
                reminderId + 30000,
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            builder.setFullScreenIntent(fullScreenPendingIntent, true);
        }

        Notification notification = builder.build();
        
        if (isAlarm) {
            notification.flags |= Notification.FLAG_INSISTENT; // Loop sound until dismissed
        }

        notificationManager.notify(reminderId, notification);

        Log.d(TAG, "Notification shown: " + reminderId + " (Alarm: " + isAlarm + ")");
    }

    private int getIconForType(String type) {
        // Use default notification icon
        // You can customize this based on type
        return android.R.drawable.ic_dialog_info;
    }
}
