package com.baby.tracker.inference;

import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import androidx.activity.result.ActivityResult;

@CapacitorPlugin(name = "TFLitePlugin")
public class TFLitePlugin extends Plugin {
    private static final String TAG = "TFLitePlugin";
    private TFLiteInference inference;

    @Override
    public void load() {
        super.load();
        inference = new TFLiteInference(getContext());
        Log.d(TAG, "TFLitePlugin loaded");
    }

    @PluginMethod
    public void initializeModel(PluginCall call) {
        String modelPath = call.getString("modelPath", "gemma-2b-it-cpu-int8.task");
        
        try {
            boolean success = inference.initialize(modelPath);
            JSObject result = new JSObject();
            result.put("success", success);
            
            if (success) {
                result.put("message", "Model initialized successfully");
                call.resolve(result);
            } else {
                String errorMsg = "Failed to initialize model. The model file may be incompatible with MediaPipe. " +
                                "Please ensure you're using a MediaPipe-compatible Gemma model from Kaggle. " +
                                "See DOWNLOAD_MODEL.md for instructions.";
                call.reject(errorMsg);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error initializing model", e);
            String errorMsg = "Model initialization error: " + e.getMessage() + 
                            ". This usually means the model format is incompatible. " +
                            "Download the correct MediaPipe Gemma model from Kaggle.";
            call.reject(errorMsg);
        }
    }

    @PluginMethod
    public void loadModelFromUri(PluginCall call) {
        String uri = call.getString("uri");
        String fileName = call.getString("fileName", "custom-model.task");
        
        Log.d(TAG, "loadModelFromUri called with uri: " + uri + ", fileName: " + fileName);
        
        // If URI is empty, launch file picker
        if (uri == null || uri.isEmpty()) {
            Log.d(TAG, "Launching file picker...");
            
            // Launch file picker
            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_GET_CONTENT);
            intent.setType("*/*");
            intent.addCategory(android.content.Intent.CATEGORY_OPENABLE);
            
            // Add MIME types for model files
            String[] mimeTypes = {"application/octet-stream", "*/*"};
            intent.putExtra(android.content.Intent.EXTRA_MIME_TYPES, mimeTypes);
            
            startActivityForResult(call, intent, "filePickerResult");
            return;
        }

        // Process the file from URI
        processModelFile(call, uri, fileName);
    }
    
    @ActivityCallback
    protected void filePickerResult(PluginCall call, ActivityResult result) {
        Log.d(TAG, "filePickerResult callback triggered");
        
        if (result.getResultCode() == android.app.Activity.RESULT_CANCELED) {
            Log.w(TAG, "File selection cancelled");
            call.reject("File selection cancelled");
            return;
        }
        
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null) {
            Log.e(TAG, "Failed to select file - resultCode: " + result.getResultCode());
            call.reject("Failed to select file");
            return;
        }
        
        android.net.Uri fileUri = result.getData().getData();
        if (fileUri == null) {
            Log.e(TAG, "No file URI in result");
            call.reject("No file selected");
            return;
        }
        
        Log.d(TAG, "File selected: " + fileUri.toString());
        
        // Get the file name from URI
        String fileName = "selected-model.task";
        try {
            android.database.Cursor cursor = getContext().getContentResolver().query(
                fileUri, null, null, null, null
            );
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                if (nameIndex >= 0) {
                    fileName = cursor.getString(nameIndex);
                    Log.d(TAG, "File name from cursor: " + fileName);
                }
                cursor.close();
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not get file name from URI", e);
        }
        
        // Process the selected file
        processModelFile(call, fileUri.toString(), fileName);
    }
    
    private void processModelFile(PluginCall call, String uriString, String fileName) {
        try {
            // Copy file from URI to cache
            android.net.Uri fileUri = android.net.Uri.parse(uriString);
            java.io.InputStream inputStream = getContext().getContentResolver().openInputStream(fileUri);
            
            if (inputStream == null) {
                call.reject("Could not open file");
                return;
            }

            java.io.File cacheFile = new java.io.File(getContext().getCacheDir(), fileName);
            java.io.FileOutputStream outputStream = new java.io.FileOutputStream(cacheFile);
            
            byte[] buffer = new byte[8192];
            int bytesRead;
            long totalBytes = 0;
            
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
                totalBytes += bytesRead;
            }
            
            outputStream.close();
            inputStream.close();
            
            Log.d(TAG, "Model copied to cache: " + cacheFile.getAbsolutePath() + " (" + (totalBytes / (1024 * 1024)) + " MB)");
            
            // Now initialize with the new model
            boolean success = inference.initialize(fileName);
            
            JSObject result = new JSObject();
            result.put("success", success);
            result.put("path", cacheFile.getAbsolutePath());
            result.put("size", totalBytes);
            
            if (success) {
                result.put("message", "Model loaded and initialized successfully");
                call.resolve(result);
            } else {
                call.reject("Model copied but failed to initialize");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error loading model from URI", e);
            call.reject("Error loading model: " + e.getMessage());
        }
    }

    @PluginMethod
    public void generateText(PluginCall call) {
        String prompt = call.getString("prompt");
        Integer maxTokens = call.getInt("maxTokens", 512);
        Float temperature = call.getFloat("temperature", 0.7f);
        
        if (prompt == null || prompt.isEmpty()) {
            call.reject("Prompt is required");
            return;
        }

        try {
            String response = inference.generateText(prompt, maxTokens, temperature);
            JSObject result = new JSObject();
            result.put("text", response);
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error generating text", e);
            call.reject("Error generating text: " + e.getMessage());
        }
    }

    @PluginMethod
    public void chat(PluginCall call) {
        JSArray messages = call.getArray("messages");
        Integer maxTokens = call.getInt("maxTokens", 512);
        Float temperature = call.getFloat("temperature", 0.7f);
        
        if (messages == null || messages.length() == 0) {
            call.reject("Messages array is required");
            return;
        }

        try {
            // Build conversation context
            StringBuilder conversationContext = new StringBuilder();
            for (int i = 0; i < messages.length(); i++) {
                org.json.JSONObject msg = messages.getJSONObject(i);
                String role = msg.getString("role");
                String content = msg.getString("content");
                
                if ("user".equals(role)) {
                    conversationContext.append("User: ").append(content).append("\n");
                } else if ("assistant".equals(role)) {
                    conversationContext.append("Assistant: ").append(content).append("\n");
                }
            }
            conversationContext.append("Assistant: ");
            
            String response = inference.generateText(conversationContext.toString(), maxTokens, temperature);
            JSObject result = new JSObject();
            result.put("text", response);
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error in chat", e);
            call.reject("Error in chat: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isModelLoaded(PluginCall call) {
        JSObject result = new JSObject();
        result.put("loaded", inference.isModelLoaded());
        call.resolve(result);
    }

    @PluginMethod
    public void releaseModel(PluginCall call) {
        try {
            inference.release();
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error releasing model", e);
            call.reject("Error releasing model: " + e.getMessage());
        }
    }
}
