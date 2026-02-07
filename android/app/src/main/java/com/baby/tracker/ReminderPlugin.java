package com.baby.tracker;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Calendar;

@CapacitorPlugin(name = "ReminderPlugin")
public class ReminderPlugin extends Plugin {
    private static final String TAG = "ReminderPlugin";
    private AlarmScheduler alarmScheduler;

    @Override
    public void load() {
        super.load();
        alarmScheduler = new AlarmScheduler(getContext());
        Log.d(TAG, "ReminderPlugin loaded");
    }

    @PluginMethod
    public void scheduleDailyReminder(PluginCall call) {
        String title = call.getString("title");
        String body = call.getString("body");
        String time = call.getString("time"); // HH:mm format
        String type = call.getString("type"); // medication, exercise, custom
        int reminderId = call.getInt("reminderId", 0);
        boolean isAlarm = call.getBoolean("isAlarm", false);

        if (title == null || time == null || type == null) {
            call.reject("Missing required parameters");
            return;
        }

        try {
            // Parse time (HH:mm)
            String[] timeParts = time.split(":");
            int hour = Integer.parseInt(timeParts[0]);
            int minute = Integer.parseInt(timeParts[1]);

            // Schedule the alarm
            boolean success = alarmScheduler.scheduleDailyAlarm(
                reminderId,
                title,
                body != null ? body : "",
                type,
                hour,
                minute,
                isAlarm
            );

            if (success) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("reminderId", reminderId);
                call.resolve(ret);
            } else {
                call.reject("Failed to schedule alarm");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling daily reminder", e);
            call.reject("Error scheduling reminder: " + e.getMessage());
        }
    }

    @PluginMethod
    public void scheduleOneTimeReminder(PluginCall call) {
        String title = call.getString("title");
        String body = call.getString("body");
        String dateTime = call.getString("dateTime"); // ISO format
        String type = call.getString("type");
        int reminderId = call.getInt("reminderId", 0);
        boolean wakeScreen = call.getBoolean("wakeScreen", false);
        boolean isAlarm = call.getBoolean("isAlarm", false);

        if (title == null || dateTime == null || type == null) {
            call.reject("Missing required parameters");
            return;
        }

        try {
            long triggerTime = Long.parseLong(dateTime);
            
            boolean success = alarmScheduler.scheduleOneTimeAlarm(
                reminderId,
                title,
                body != null ? body : "",
                type,
                triggerTime,
                wakeScreen,
                isAlarm
            );

            if (success) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("reminderId", reminderId);
                call.resolve(ret);
            } else {
                call.reject("Failed to schedule alarm");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling one-time reminder", e);
            call.reject("Error scheduling reminder: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelReminder(PluginCall call) {
        int reminderId = call.getInt("reminderId", 0);

        if (reminderId == 0) {
            call.reject("Invalid reminder ID");
            return;
        }

        try {
            alarmScheduler.cancelAlarm(reminderId);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling reminder", e);
            call.reject("Error cancelling reminder: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAllReminders(PluginCall call) {
        try {
            alarmScheduler.cancelAllAlarms();
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling all reminders", e);
            call.reject("Error cancelling reminders: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            ret.put("canScheduleExactAlarms", alarmManager.canScheduleExactAlarms());
        } else {
            ret.put("canScheduleExactAlarms", true);
        }
        
        call.resolve(ret);
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            
            if (!alarmManager.canScheduleExactAlarms()) {
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                getActivity().startActivity(intent);
                call.resolve();
            } else {
                call.resolve();
            }
        } else {
            call.resolve();
        }
    }
}
