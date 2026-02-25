package com.baby.tracker;

import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.nl.entityextraction.DateTimeEntity;
import com.google.mlkit.nl.entityextraction.Entity;
import com.google.mlkit.nl.entityextraction.EntityAnnotation;
import com.google.mlkit.nl.entityextraction.EntityExtraction;
import com.google.mlkit.nl.entityextraction.EntityExtractor;
import com.google.mlkit.nl.entityextraction.EntityExtractorOptions;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "EntityExtractionPlugin")
public class EntityExtractionPlugin extends Plugin {
    private static final String TAG = "EntityExtractionPlugin";
    private EntityExtractor entityExtractor;

    // Time patterns to match various formats
    private static final Pattern[] TIME_PATTERNS = {
        Pattern.compile("(?i)(\\d{1,2})\\s*[:\\.]?\\s*(\\d{2})\\s*(am|pm)", Pattern.CASE_INSENSITIVE),  // 9 30 PM, 9:30 PM, 9.30 PM
        Pattern.compile("(?i)(\\d{1,2})\\s*(am|pm)", Pattern.CASE_INSENSITIVE),  // 9 PM, 9AM
        Pattern.compile("(?i)time[:\\s]+(\\d{1,2})\\s*[:\\.]?\\s*(\\d{2})\\s*(am|pm)?", Pattern.CASE_INSENSITIVE),  // Time: 9 30 PM
        Pattern.compile("(?i)at\\s+(\\d{1,2})\\s*[:\\.]?\\s*(\\d{2})\\s*(am|pm)?", Pattern.CASE_INSENSITIVE)  // at 9:30 PM
    };

    @Override
    public void load() {
        super.load();
        EntityExtractorOptions options = new EntityExtractorOptions.Builder(EntityExtractorOptions.ENGLISH)
                .build();
        entityExtractor = EntityExtraction.getClient(options);
        
        // Download model if needed
        entityExtractor.downloadModelIfNeeded()
                .addOnSuccessListener(aVoid -> Log.d(TAG, "Entity extraction model ready"))
                .addOnFailureListener(e -> Log.e(TAG, "Model download failed", e));
        
        Log.d(TAG, "EntityExtractionPlugin loaded");
    }

    @PluginMethod
    public void extractEntities(PluginCall call) {
        String text = call.getString("text");
        
        if (text == null || text.isEmpty()) {
            call.reject("Text is required");
            return;
        }

        entityExtractor.annotate(text)
                .addOnSuccessListener(entityAnnotations -> {
                    JSObject result = new JSObject();
                    result.put("success", true);
                    
                    JSArray dates = new JSArray();
                    JSArray addresses = new JSArray();
                    JSArray phones = new JSArray();
                    JSArray emails = new JSArray();
                    JSArray urls = new JSArray();

                    // Extract time from text using regex
                    TimeInfo extractedTime = extractTimeFromText(text);
                    Log.d(TAG, "Extracted time: " + (extractedTime != null ? extractedTime.toString() : "none"));

                    for (EntityAnnotation annotation : entityAnnotations) {
                        List<Entity> entities = annotation.getEntities();
                        String annotatedText = text.substring(
                                annotation.getStart(),
                                annotation.getEnd()
                        );
                        
                        for (Entity entity : entities) {
                            JSObject entityObj = new JSObject();
                            entityObj.put("text", annotatedText);
                            entityObj.put("start", annotation.getStart());
                            entityObj.put("end", annotation.getEnd());
                            
                            switch (entity.getType()) {
                                case Entity.TYPE_DATE_TIME:
                                    DateTimeEntity dateTimeEntity = entity.asDateTimeEntity();
                                    long timestamp = dateTimeEntity.getTimestampMillis();
                                    
                                    // If we extracted a time, combine it with the date
                                    if (extractedTime != null) {
                                        timestamp = combineDateTime(timestamp, extractedTime);
                                        Log.d(TAG, "Combined date+time timestamp: " + timestamp);
                                    }
                                    
                                    entityObj.put("timestamp", timestamp);
                                    entityObj.put("granularity", dateTimeEntity.getDateTimeGranularity());
                                    
                                    // Format the date for display
                                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault());
                                    String formattedDate = sdf.format(new Date(timestamp));
                                    entityObj.put("formatted", formattedDate);
                                    
                                    dates.put(entityObj);
                                    break;
                                    
                                case Entity.TYPE_ADDRESS:
                                    addresses.put(entityObj);
                                    break;
                                    
                                case Entity.TYPE_PHONE:
                                    phones.put(entityObj);
                                    break;
                                    
                                case Entity.TYPE_EMAIL:
                                    emails.put(entityObj);
                                    break;
                                    
                                case Entity.TYPE_URL:
                                    urls.put(entityObj);
                                    break;
                            }
                        }
                    }
                    
                    result.put("dates", dates);
                    result.put("addresses", addresses);
                    result.put("phones", phones);
                    result.put("emails", emails);
                    result.put("urls", urls);
                    
                    Log.d(TAG, "Entity extraction success. Found " + dates.length() + " dates");
                    call.resolve(result);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Entity extraction failed", e);
                    JSObject result = new JSObject();
                    result.put("success", false);
                    result.put("error", e.getMessage());
                    call.resolve(result);
                });
    }

    private TimeInfo extractTimeFromText(String text) {
        for (Pattern pattern : TIME_PATTERNS) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                try {
                    int hour = Integer.parseInt(matcher.group(1));
                    int minute = 0;
                    String ampm = null;
                    
                    // Check if we have minutes
                    if (matcher.groupCount() >= 2 && matcher.group(2) != null && !matcher.group(2).isEmpty()) {
                        try {
                            minute = Integer.parseInt(matcher.group(2));
                        } catch (NumberFormatException e) {
                            // Group 2 might be AM/PM
                            ampm = matcher.group(2);
                        }
                    }
                    
                    // Check for AM/PM
                    if (matcher.groupCount() >= 3 && matcher.group(3) != null) {
                        ampm = matcher.group(3);
                    }
                    
                    // Convert to 24-hour format if AM/PM is specified
                    if (ampm != null) {
                        ampm = ampm.toUpperCase();
                        if (ampm.equals("PM") && hour < 12) {
                            hour += 12;
                        } else if (ampm.equals("AM") && hour == 12) {
                            hour = 0;
                        }
                    }
                    
                    Log.d(TAG, "Parsed time: " + hour + ":" + minute + " from pattern: " + pattern.pattern());
                    return new TimeInfo(hour, minute);
                } catch (Exception e) {
                    Log.e(TAG, "Error parsing time", e);
                }
            }
        }
        return null;
    }
    
    private long combineDateTime(long dateTimestamp, TimeInfo time) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(dateTimestamp);
        calendar.set(Calendar.HOUR_OF_DAY, time.hour);
        calendar.set(Calendar.MINUTE, time.minute);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar.getTimeInMillis();
    }
    
    private static class TimeInfo {
        int hour;
        int minute;
        
        TimeInfo(int hour, int minute) {
            this.hour = hour;
            this.minute = minute;
        }
        
        @Override
        public String toString() {
            return String.format(Locale.getDefault(), "%02d:%02d", hour, minute);
        }
    }

    @PluginMethod
    public void downloadModel(PluginCall call) {
        entityExtractor.downloadModelIfNeeded()
                .addOnSuccessListener(aVoid -> {
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("message", "Model downloaded successfully");
                    call.resolve(result);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Model download failed", e);
                    call.reject("Model download failed: " + e.getMessage());
                });
    }

    @Override
    protected void handleOnDestroy() {
        if (entityExtractor != null) {
            entityExtractor.close();
        }
        super.handleOnDestroy();
    }
}
