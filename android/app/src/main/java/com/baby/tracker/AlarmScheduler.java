package com.baby.tracker;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

public class AlarmScheduler {
    private static final String TAG = "AlarmScheduler";
    private static final String PREFS_NAME = "ReminderPrefs";
    private static final String KEY_ACTIVE_ALARMS = "active_alarms";
    
    private Context context;
    private AlarmManager alarmManager;
    private SharedPreferences prefs;

    public AlarmScheduler(Context context) {
        this.context = context;
        this.alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public boolean scheduleDailyAlarm(int reminderId, String title, String body, String type, int hour, int minute, boolean isAlarm) {
        try {
            // Create intent for the alarm
            Intent intent = new Intent(context, NotificationReceiver.class);
            intent.putExtra("reminderId", reminderId);
            intent.putExtra("title", title);
            intent.putExtra("body", body);
            intent.putExtra("type", type);
            intent.putExtra("isDaily", true);
            intent.putExtra("hour", hour);
            intent.putExtra("minute", minute);
            intent.putExtra("isAlarm", isAlarm);
            if (isAlarm) {
                intent.putExtra("wakeScreen", true); // Always wake screen for alarms
            }

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                reminderId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Calculate trigger time
            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);

            // If time has passed today, schedule for tomorrow
            if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
                calendar.add(Calendar.DAY_OF_MONTH, 1);
            }

            // Schedule exact alarm (manual repetition in Receiver)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        calendar.getTimeInMillis(),
                        pendingIntent
                    );
                } else {
                    Log.w(TAG, "Cannot schedule exact alarms - permission not granted");
                    // Fallback to inexact
                    alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        calendar.getTimeInMillis(),
                        pendingIntent
                    );
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    calendar.getTimeInMillis(),
                    pendingIntent
                );
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    calendar.getTimeInMillis(),
                    pendingIntent
                );
            }

            // Save alarm info for reboot
            saveAlarmInfo(reminderId, title, body, type, hour, minute, true, isAlarm, isAlarm);

            Log.d(TAG, "Scheduled daily alarm: " + reminderId + " at " + hour + ":" + minute);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling daily alarm", e);
            return false;
        }
    }

    public boolean scheduleOneTimeAlarm(int reminderId, String title, String body, String type, long triggerTime, boolean wakeScreen, boolean isAlarm) {
        try {
            Intent intent = new Intent(context, NotificationReceiver.class);
            intent.putExtra("reminderId", reminderId);
            intent.putExtra("title", title);
            intent.putExtra("body", body);
            intent.putExtra("type", type);
            intent.putExtra("isDaily", false);
            intent.putExtra("wakeScreen", wakeScreen || isAlarm);
            intent.putExtra("isAlarm", isAlarm);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                reminderId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Schedule one-time alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    );
                } else {
                    Log.w(TAG, "Cannot schedule exact alarms - permission not granted");
                    return false;
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
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

            // Save alarm info
            saveAlarmInfo(reminderId, title, body, type, 0, 0, false, wakeScreen || isAlarm, isAlarm);

            Log.d(TAG, "Scheduled one-time alarm: " + reminderId);
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling one-time alarm", e);
            return false;
        }
    }

    public void cancelAlarm(int reminderId) {
        try {
            Intent intent = new Intent(context, NotificationReceiver.class);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                reminderId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();

            // Remove from saved alarms
            removeAlarmInfo(reminderId);

            Log.d(TAG, "Cancelled alarm: " + reminderId);
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling alarm", e);
        }
    }

    public void cancelAllAlarms() {
        try {
            JSONArray alarms = getActiveAlarms();
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject alarm = alarms.getJSONObject(i);
                cancelAlarm(alarm.getInt("reminderId"));
            }
            
            // Clear all saved alarms
            prefs.edit().remove(KEY_ACTIVE_ALARMS).apply();
            
            Log.d(TAG, "Cancelled all alarms");
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling all alarms", e);
        }
    }

    private void saveAlarmInfo(int reminderId, String title, String body, String type, int hour, int minute, boolean isDaily, boolean wakeScreen, boolean isAlarm) {
        try {
            JSONArray alarms = getActiveAlarms();
            JSONObject alarmInfo = new JSONObject();
            alarmInfo.put("reminderId", reminderId);
            alarmInfo.put("title", title);
            alarmInfo.put("body", body);
            alarmInfo.put("type", type);
            alarmInfo.put("hour", hour);
            alarmInfo.put("minute", minute);
            alarmInfo.put("isDaily", isDaily);
            alarmInfo.put("wakeScreen", wakeScreen);
            alarmInfo.put("isAlarm", isAlarm);

            // Remove existing alarm with same ID
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject existing = alarms.getJSONObject(i);
                if (existing.getInt("reminderId") == reminderId) {
                    alarms.remove(i);
                    break;
                }
            }

            alarms.put(alarmInfo);
            prefs.edit().putString(KEY_ACTIVE_ALARMS, alarms.toString()).apply();
        } catch (JSONException e) {
            Log.e(TAG, "Error saving alarm info", e);
        }
    }

    private void removeAlarmInfo(int reminderId) {
        try {
            JSONArray alarms = getActiveAlarms();
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject alarm = alarms.getJSONObject(i);
                if (alarm.getInt("reminderId") == reminderId) {
                    alarms.remove(i);
                    break;
                }
            }
            prefs.edit().putString(KEY_ACTIVE_ALARMS, alarms.toString()).apply();
        } catch (JSONException e) {
            Log.e(TAG, "Error removing alarm info", e);
        }
    }

    public JSONArray getActiveAlarms() {
        String alarmsJson = prefs.getString(KEY_ACTIVE_ALARMS, "[]");
        try {
            return new JSONArray(alarmsJson);
        } catch (JSONException e) {
            Log.e(TAG, "Error parsing active alarms", e);
            return new JSONArray();
        }
    }

    public void rescheduleAllAlarms() {
        try {
            JSONArray alarms = getActiveAlarms();
            Log.d(TAG, "Rescheduling " + alarms.length() + " alarms after reboot");

            for (int i = 0; i < alarms.length(); i++) {
                JSONObject alarm = alarms.getJSONObject(i);
                int reminderId = alarm.getInt("reminderId");
                String title = alarm.getString("title");
                String body = alarm.getString("body");
                String type = alarm.getString("type");
                boolean isDaily = alarm.getBoolean("isDaily");
                boolean isAlarm = alarm.optBoolean("isAlarm", false);

                if (isDaily) {
                    int hour = alarm.getInt("hour");
                    int minute = alarm.getInt("minute");
                    scheduleDailyAlarm(reminderId, title, body, type, hour, minute, isAlarm);
                }
                // One-time alarms that have passed won't be rescheduled
            }
        } catch (Exception e) {
            Log.e(TAG, "Error rescheduling alarms", e);
        }
    }
}
