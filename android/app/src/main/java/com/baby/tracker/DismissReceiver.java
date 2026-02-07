package com.baby.tracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class DismissReceiver extends BroadcastReceiver {
    private static final String TAG = "DismissReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Dismiss action triggered");

        int reminderId = intent.getIntExtra("reminderId", 0);

        // Dismiss the notification
        android.app.NotificationManager notificationManager = 
            (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.cancel(reminderId);

        Log.d(TAG, "Notification dismissed: " + reminderId);
    }
}
