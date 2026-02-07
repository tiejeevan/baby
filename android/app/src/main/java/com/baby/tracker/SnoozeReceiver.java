package com.baby.tracker;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class SnoozeReceiver extends BroadcastReceiver {
    private static final String TAG = "SnoozeReceiver";
    private static final long SNOOZE_DURATION = 10 * 60 * 1000; // 10 minutes

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Snooze action triggered");

        int reminderId = intent.getIntExtra("reminderId", 0);
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        String type = intent.getStringExtra("type");

        // Dismiss the current notification
        android.app.NotificationManager notificationManager = 
            (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancel(reminderId);

        // Schedule a new alarm for 10 minutes later
        Intent alarmIntent = new Intent(context, NotificationReceiver.class);
        alarmIntent.putExtra("reminderId", reminderId + 50000); // Different ID for snoozed notification
        alarmIntent.putExtra("title", title);
        alarmIntent.putExtra("body", body);
        alarmIntent.putExtra("type", type);
        alarmIntent.putExtra("isDaily", false);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            reminderId + 50000,
            alarmIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        long triggerTime = System.currentTimeMillis() + SNOOZE_DURATION;

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            );
        } else {
            alarmManager.setExact(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            );
        }

        Log.d(TAG, "Snoozed for 10 minutes");
    }
}
