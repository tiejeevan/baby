package com.baby.tracker.inference;

import android.content.Context;
import android.util.Log;
import com.google.mediapipe.tasks.genai.llminference.LlmInference;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class TFLiteInference {
    private static final String TAG = "TFLiteInference";
    private Context context;
    private LlmInference llmInference;
    private boolean modelLoaded = false;

    public TFLiteInference(Context context) {
        this.context = context;
    }

    public boolean initialize(String modelFileName) {
        try {
            Log.d(TAG, "Initializing MediaPipe LLM with model: " + modelFileName);
            
            // Release any existing instance first
            if (llmInference != null) {
                Log.d(TAG, "Releasing existing LLM instance");
                try {
                    llmInference.close();
                } catch (Exception e) {
                    Log.w(TAG, "Error closing existing instance", e);
                }
                llmInference = null;
            }
            
            // Check if model exists in cache, if not try to copy from assets
            File modelFile = new File(context.getCacheDir(), modelFileName);
            
            if (!modelFile.exists()) {
                Log.d(TAG, "Model not in cache, attempting to copy from assets");
                modelFile = copyAssetToCache(modelFileName);
            } else {
                Log.d(TAG, "Model found in cache: " + modelFile.getAbsolutePath());
            }
            
            if (modelFile == null || !modelFile.exists()) {
                Log.e(TAG, "Model file not found. Please download the model first.");
                return false;
            }

            Log.d(TAG, "Model file path: " + modelFile.getAbsolutePath());
            Log.d(TAG, "Model file size: " + (modelFile.length() / (1024 * 1024)) + " MB");
            
            // Check available memory
            Runtime runtime = Runtime.getRuntime();
            long maxMemory = runtime.maxMemory() / (1024 * 1024);
            long freeMemory = runtime.freeMemory() / (1024 * 1024);
            Log.d(TAG, "Available memory: " + freeMemory + " MB / " + maxMemory + " MB");
            
            // Initialize MediaPipe LLM Inference with retry logic
            int maxRetries = 2;
            Exception lastException = null;
            
            for (int attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    if (attempt > 0) {
                        Log.d(TAG, "Retry attempt " + (attempt + 1) + " of " + maxRetries);
                        // Force garbage collection before retry
                        System.gc();
                        Thread.sleep(1000);
                    }
                    
                    LlmInference.LlmInferenceOptions options = LlmInference.LlmInferenceOptions.builder()
                            .setModelPath(modelFile.getAbsolutePath())
                            .setMaxTokens(512)
                            .build();
                    
                    llmInference = LlmInference.createFromOptions(context, options);
                    modelLoaded = true;
                    
                    Log.d(TAG, "MediaPipe LLM initialized successfully!");
                    return true;
                } catch (Exception e) {
                    lastException = e;
                    Log.e(TAG, "Attempt " + (attempt + 1) + " failed: " + e.getMessage());
                    if (llmInference != null) {
                        try {
                            llmInference.close();
                        } catch (Exception closeEx) {
                            // Ignore
                        }
                        llmInference = null;
                    }
                }
            }
            
            // All retries failed
            Log.e(TAG, "Failed to initialize MediaPipe LLM after " + maxRetries + " attempts", lastException);
            modelLoaded = false;
            return false;
            
        } catch (Exception e) {
            Log.e(TAG, "Error initializing MediaPipe LLM", e);
            modelLoaded = false;
            return false;
        }
    }

    private File copyAssetToCache(String assetFileName) {
        try {
            InputStream inputStream = context.getAssets().open(assetFileName);
            File cacheFile = new File(context.getCacheDir(), assetFileName);
            
            // Skip if already exists and is the right size
            if (cacheFile.exists()) {
                Log.d(TAG, "Model already in cache, reusing");
                inputStream.close();
                return cacheFile;
            }
            
            FileOutputStream outputStream = new FileOutputStream(cacheFile);
            byte[] buffer = new byte[8192];
            int bytesRead;
            long totalBytes = 0;
            
            Log.d(TAG, "Copying model to cache...");
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
                totalBytes += bytesRead;
                
                // Log progress every 50MB
                if (totalBytes % (50 * 1024 * 1024) == 0) {
                    Log.d(TAG, "Copied " + (totalBytes / (1024 * 1024)) + " MB");
                }
            }
            
            outputStream.close();
            inputStream.close();
            
            Log.d(TAG, "Model copied successfully: " + (totalBytes / (1024 * 1024)) + " MB");
            return cacheFile;
        } catch (IOException e) {
            Log.e(TAG, "Error copying model to cache", e);
            return null;
        }
    }

    public String generateText(String prompt, int maxTokens, float temperature) {
        if (!modelLoaded || llmInference == null) {
            return "Error: Model not loaded";
        }

        try {
            Log.d(TAG, "Generating text with MediaPipe LLM");
            Log.d(TAG, "Prompt: " + prompt.substring(0, Math.min(100, prompt.length())));
            
            // Generate response using MediaPipe LLM
            String response = llmInference.generateResponse(prompt);
            
            Log.d(TAG, "Generated response length: " + response.length());
            return response;
        } catch (Exception e) {
            Log.e(TAG, "Error generating text with MediaPipe", e);
            return "I apologize, but I encountered an error generating a response. Please try again.";
        }
    }

    public boolean isModelLoaded() {
        return modelLoaded;
    }

    public void release() {
        if (llmInference != null) {
            llmInference.close();
            llmInference = null;
        }
        modelLoaded = false;
        Log.d(TAG, "MediaPipe LLM released");
    }
}
