package com.baby.tracker;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;

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
    private String pendingImageUri = null;
    private ArrayList<String> pendingImageUris = null;

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
        
        if (type != null && type.startsWith("image/")) {
            if (Intent.ACTION_SEND.equals(action)) {
                Uri imageUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (imageUri != null) {
                    Log.d(TAG, "Received shared image: " + imageUri.toString());
                    pendingImageUri = imageUri.toString();
                    notifyListeners("sharedImage", createImageData(imageUri.toString()));
                }
            } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
                ArrayList<Uri> imageUris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (imageUris != null && !imageUris.isEmpty()) {
                    Log.d(TAG, "Received " + imageUris.size() + " shared images");
                    pendingImageUris = new ArrayList<>();
                    for (Uri uri : imageUris) {
                        pendingImageUris.add(uri.toString());
                    }
                    notifyListeners("sharedImages", createImagesData(pendingImageUris));
                }
            } else if (Intent.ACTION_VIEW.equals(action)) {
                Uri imageUri = intent.getData();
                if (imageUri != null) {
                    Log.d(TAG, "Received image to view: " + imageUri.toString());
                    pendingImageUri = imageUri.toString();
                    notifyListeners("viewImage", createImageData(imageUri.toString()));
                }
            }
        }
    }

    @PluginMethod
    public void checkPendingIntent(PluginCall call) {
        Log.d(TAG, "checkPendingIntent called");
        
        // Check if there's a pending image from app launch
        Intent intent = getActivity().getIntent();
        if (intent != null) {
            handleIntent(intent);
        }
        
        JSObject result = new JSObject();
        if (pendingImageUri != null) {
            result.put("hasImage", true);
            result.put("imageUri", pendingImageUri);
            pendingImageUri = null;
        } else if (pendingImageUris != null && !pendingImageUris.isEmpty()) {
            result.put("hasImages", true);
            JSArray uris = new JSArray();
            for (String uri : pendingImageUris) {
                uris.put(uri);
            }
            result.put("imageUris", uris);
            pendingImageUris = null;
        } else {
            result.put("hasImage", false);
        }
        
        call.resolve(result);
    }

    private JSObject createImageData(String imageUri) {
        JSObject data = new JSObject();
        data.put("imageUri", imageUri);
        return data;
    }

    private JSObject createImagesData(ArrayList<String> imageUris) {
        JSObject data = new JSObject();
        JSArray uris = new JSArray();
        for (String uri : imageUris) {
            uris.put(uri);
        }
        data.put("imageUris", uris);
        return data;
    }
}
