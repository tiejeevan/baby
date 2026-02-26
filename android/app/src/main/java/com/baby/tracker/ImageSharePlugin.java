package com.baby.tracker;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.content.ContentResolver;
import android.database.Cursor;
import android.provider.OpenableColumns;
import android.media.MediaMetadataRetriever;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;

@CapacitorPlugin(name = "ImageSharePlugin")
public class ImageSharePlugin extends Plugin {
    private static final String TAG = "ImageSharePlugin";
    private JSObject pendingSingleIntent = null;
    private JSObject pendingMultipleIntent = null;

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        Log.d(TAG, "handleOnNewIntent called");
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        String action = intent.getAction();
        String type = intent.getType();
        
        Log.d(TAG, "handleIntent - action: " + action + ", type: " + type);
        
        if (type != null) {
            if (Intent.ACTION_SEND.equals(action)) {
                Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (uri != null) {
                    Log.d(TAG, "Received shared file: " + uri.toString());
                    JSObject data = extractMetadata(uri);
                    pendingSingleIntent = data;
                    notifyListeners("sharedImage", data);
                }
            } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
                ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (uris != null && !uris.isEmpty()) {
                    Log.d(TAG, "Received " + uris.size() + " shared files");
                    
                    JSObject data = new JSObject();
                    JSArray urisArray = new JSArray();
                    for (Uri uri : uris) {
                        urisArray.put(uri.toString());
                    }
                    data.put("imageUris", urisArray); // kept for backward compatibility

                    JSArray filesArray = new JSArray();
                    for (Uri uri : uris) {
                        filesArray.put(extractMetadata(uri));
                    }
                    data.put("files", filesArray);
                    
                    pendingMultipleIntent = data;
                    notifyListeners("sharedImages", data);
                }
            } else if (Intent.ACTION_VIEW.equals(action)) {
                Uri uri = intent.getData();
                if (uri != null) {
                    Log.d(TAG, "Received file to view: " + uri.toString());
                    JSObject data = extractMetadata(uri);
                    pendingSingleIntent = data;
                    notifyListeners("viewImage", data);
                }
            }
        }
    }

    @PluginMethod
    public void checkPendingIntent(PluginCall call) {
        Log.d(TAG, "checkPendingIntent called");
        
        // Check if there's a pending intent from app launch
        Intent intent = getActivity().getIntent();
        if (intent != null) {
            handleIntent(intent);
        }
        
        JSObject result = new JSObject();
        if (pendingSingleIntent != null) {
            result.put("hasImage", true);
            result.put("imageUri", pendingSingleIntent.getString("imageUri"));
            result.put("mimeType", pendingSingleIntent.getString("mimeType"));
            result.put("timestamp", pendingSingleIntent.getString("timestamp"));
            pendingSingleIntent = null;
        } else if (pendingMultipleIntent != null) {
            result.put("hasImages", true);
            try {
                result.put("imageUris", pendingMultipleIntent.getJSONArray("imageUris"));
                result.put("files", pendingMultipleIntent.getJSONArray("files"));
            } catch (Exception e) {
                Log.e(TAG, "Error parsing multiple intent arrays", e);
            }
            pendingMultipleIntent = null;
        } else {
            result.put("hasImage", false);
        }
        
        call.resolve(result);
    }

    private JSObject extractMetadata(Uri uri) {
        JSObject data = new JSObject();
        data.put("imageUri", uri.toString()); // Keep named imageUri for backward compatibility with React code
        
        ContentResolver cR = getContext().getContentResolver();
        String mimeType = cR.getType(uri);
        if (mimeType == null) mimeType = "application/octet-stream";
        data.put("mimeType", mimeType);

        long timestamp = 0;
        String name = null;
        
        // Try to get name and last modified from Cursor
        try {
            Cursor cursor = cR.query(uri, null, null, null, null);
            if (cursor != null) {
                if (cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex != -1) {
                        name = cursor.getString(nameIndex);
                        data.put("name", name);
                    }
                    
                    int lastModifiedIndex = cursor.getColumnIndex("last_modified");
                    if (lastModifiedIndex != -1) {
                        timestamp = cursor.getLong(lastModifiedIndex);
                    }
                }
                cursor.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error reading Cursor metadata", e);
        }

        // For video files, try MediaMetadataRetriever
        if (mimeType.startsWith("video/")) {
            MediaMetadataRetriever retriever = new MediaMetadataRetriever();
            try {
                retriever.setDataSource(getContext(), uri);
                String dateStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DATE);
                if (dateStr != null) {
                    // Could parse dateStr here if needed
                }
                retriever.release();
            } catch (Exception e) {
                Log.e(TAG, "Error getting video metadata", e);
            }
        }
        
        data.put("timestamp", String.valueOf(timestamp));
        return data;
    }
}
