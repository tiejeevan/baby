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
    private final Object lock = new Object();  // Thread safety lock
    private volatile boolean isGenerating = false;  // Prevent concurrent generation

    public TFLiteInference(Context context) {
        this.context = context;
    }

    public boolean initialize(String modelFileName) {
        synchronized (lock) {
            try {
                Log.d(TAG, "Initializing MediaPipe LLM with model: " + modelFileName);
                
                // Force heap expansion before loading model
                Runtime runtime = Runtime.getRuntime();
                long maxMemory = runtime.maxMemory() / (1024 * 1024);
                long totalMemory = runtime.totalMemory() / (1024 * 1024);
                long freeMemory = runtime.freeMemory() / (1024 * 1024);
                
                Log.d(TAG, "Initial heap: " + freeMemory + " MB free / " + totalMemory + " MB total / " + maxMemory + " MB max");
                
                // Try to expand heap by allocating and releasing memory
                if (totalMemory < 100) {
                    Log.d(TAG, "Heap is too small, attempting to expand...");
                    try {
                        // Allocate 50MB to force heap expansion
                        byte[] dummy = new byte[50 * 1024 * 1024];
                        dummy = null;
                        System.gc();
                        Thread.sleep(500);
                        
                        totalMemory = runtime.totalMemory() / (1024 * 1024);
                        freeMemory = runtime.freeMemory() / (1024 * 1024);
                        Log.d(TAG, "After expansion: " + freeMemory + " MB free / " + totalMemory + " MB total");
                    } catch (OutOfMemoryError e) {
                        Log.w(TAG, "Could not expand heap, continuing anyway");
                    }
                }
                
                // Wait if currently generating
                while (isGenerating) {
                    Log.d(TAG, "Waiting for ongoing generation to complete...");
                    try {
                        lock.wait(5000);  // Wait max 5 seconds
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return false;
                    }
                }
                
                // Release any existing instance first
                if (llmInference != null) {
                    Log.d(TAG, "Releasing existing LLM instance");
                    try {
                        llmInference.close();
                    } catch (Exception e) {
                        Log.w(TAG, "Error closing existing instance", e);
                    }
                    llmInference = null;
                    modelLoaded = false;
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
                long modelSizeMB = modelFile.length() / (1024 * 1024);
                Log.d(TAG, "Model file size: " + modelSizeMB + " MB");
                
                // Validate model file size
                // Gemma 3 270M: ~290 MB
                // Gemma 3 1B: ~800-1500 MB
                // Gemma 3 2B: ~1300-2500 MB
                if (modelSizeMB < 100) {
                    Log.e(TAG, "Model file is too small (" + modelSizeMB + " MB), likely corrupted");
                    Log.e(TAG, "Expected size: 290 MB for Gemma 3 270M, 800+ MB for larger models");
                    modelFile.delete();
                    return false;
                }
                
                if (modelSizeMB >= 250 && modelSizeMB <= 350) {
                    Log.i(TAG, "Detected Gemma 3 270M model (" + modelSizeMB + " MB) - optimized for mobile");
                } else if (modelSizeMB >= 700 && modelSizeMB <= 1600) {
                    Log.i(TAG, "Detected Gemma 3 1B model (" + modelSizeMB + " MB)");
                } else if (modelSizeMB >= 1200 && modelSizeMB <= 3000) {
                    Log.i(TAG, "Detected Gemma 3 2B model (" + modelSizeMB + " MB)");
                } else {
                    Log.w(TAG, "Unusual model size: " + modelSizeMB + " MB - may be corrupted or unknown variant");
                }
                
                // Check available memory
                maxMemory = runtime.maxMemory() / (1024 * 1024);
                freeMemory = runtime.freeMemory() / (1024 * 1024);
                totalMemory = runtime.totalMemory() / (1024 * 1024);
                Log.d(TAG, "Memory: " + freeMemory + " MB free / " + totalMemory + " MB total / " + maxMemory + " MB max");
                
                // Require at least 100MB free memory
                if (freeMemory < 100) {
                    Log.w(TAG, "Low memory warning: " + freeMemory + " MB free");
                    System.gc();
                    Thread.sleep(500);
                    freeMemory = runtime.freeMemory() / (1024 * 1024);
                    Log.d(TAG, "After GC: " + freeMemory + " MB free");
                }
            
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
                                .setMaxTokens(256)  // Reduced from 512 to save memory
                                .build();
                        
                        llmInference = LlmInference.createFromOptions(context, options);
                        
                        // Verify model is actually working with a simple test
                        try {
                            Log.d(TAG, "Testing model with simple prompt...");
                            String testResponse = llmInference.generateResponse("Hi");
                            Log.d(TAG, "Model test successful, response length: " + testResponse.length());
                        } catch (Exception testEx) {
                            Log.e(TAG, "Model test failed", testEx);
                            throw testEx;
                        }
                        
                        modelLoaded = true;
                        Log.d(TAG, "MediaPipe LLM initialized successfully!");
                        return true;
                    } catch (Exception e) {
                        lastException = e;
                        Log.e(TAG, "Attempt " + (attempt + 1) + " failed: " + e.getMessage(), e);
                        if (llmInference != null) {
                            try {
                                llmInference.close();
                            } catch (Exception closeEx) {
                                Log.w(TAG, "Error closing failed instance", closeEx);
                            }
                            llmInference = null;
                        }
                        modelLoaded = false;
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
        synchronized (lock) {
            if (!modelLoaded || llmInference == null) {
                Log.e(TAG, "Cannot generate text: model not loaded");
                return "Error: Model not loaded";
            }

            // Prevent concurrent generation
            if (isGenerating) {
                Log.w(TAG, "Generation already in progress, rejecting request");
                return "Error: Another generation is in progress. Please wait.";
            }

            try {
                isGenerating = true;
                Log.d(TAG, "Generating text with MediaPipe LLM");
                Log.d(TAG, "Prompt: " + prompt.substring(0, Math.min(100, prompt.length())));
                
                // Trim prompt if too long to reduce memory usage
                String trimmedPrompt = prompt;
                if (prompt.length() > 1000) {
                    trimmedPrompt = prompt.substring(Math.max(0, prompt.length() - 1000));
                    Log.d(TAG, "Prompt trimmed to last 1000 characters");
                }
                
                // Check memory before generation
                Runtime runtime = Runtime.getRuntime();
                long freeMemory = runtime.freeMemory() / (1024 * 1024);
                Log.d(TAG, "Free memory before generation: " + freeMemory + " MB");
                
                if (freeMemory < 50) {
                    Log.w(TAG, "Low memory, forcing GC");
                    System.gc();
                    Thread.sleep(500);
                }
                
                // Generate response using MediaPipe LLM with timeout protection
                String response = null;
                try {
                    Log.d(TAG, "Calling llmInference.generateResponse()...");
                    response = llmInference.generateResponse(trimmedPrompt);
                    Log.d(TAG, "generateResponse() returned: " + (response == null ? "NULL" : "length=" + response.length()));
                } catch (NullPointerException e) {
                    Log.e(TAG, "Null pointer during generation - model may be corrupted", e);
                    // Mark model as not loaded to force reinitialization
                    modelLoaded = false;
                    return "Error: Model encountered an issue. Please restart the app.";
                } catch (Exception e) {
                    Log.e(TAG, "Exception during generation", e);
                    return "Error: " + e.getMessage();
                }
                
                if (response == null || response.isEmpty()) {
                    Log.w(TAG, "Generated empty response - this usually means:");
                    Log.w(TAG, "1. Model file is corrupted or incompatible");
                    Log.w(TAG, "2. Insufficient memory to run inference");
                    Log.w(TAG, "3. Prompt format is incorrect for this model");
                    
                    // Try to get more info
                    long freeMemoryAfter = runtime.freeMemory() / (1024 * 1024);
                    Log.w(TAG, "Free memory after generation: " + freeMemoryAfter + " MB");
                    
                    return "I apologize, but I couldn't generate a response. This may be due to low memory or a model issue. Please try restarting the app.";
                }
                
                Log.d(TAG, "Generated response length: " + response.length());
                return response;
            } catch (OutOfMemoryError e) {
                Log.e(TAG, "Out of memory during text generation", e);
                // Force garbage collection
                System.gc();
                // Mark model as not loaded to prevent further crashes
                modelLoaded = false;
                return "I'm sorry, I don't have enough memory to process that request. Please restart the app.";
            } catch (Exception e) {
                Log.e(TAG, "Error generating text with MediaPipe", e);
                // Check if this is a native crash indicator
                if (e.getMessage() != null && e.getMessage().contains("JNI")) {
                    modelLoaded = false;
                    return "Error: Model crashed. Please restart the app.";
                }
                return "I apologize, but I encountered an error generating a response. Please try again.";
            } finally {
                isGenerating = false;
                lock.notifyAll();  // Wake up any waiting threads
            }
        }
    }

    public boolean isModelLoaded() {
        return modelLoaded;
    }

    public void release() {
        synchronized (lock) {
            // Wait for any ongoing generation
            while (isGenerating) {
                Log.d(TAG, "Waiting for generation to complete before release...");
                try {
                    lock.wait(5000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
            
            if (llmInference != null) {
                try {
                    llmInference.close();
                } catch (Exception e) {
                    Log.e(TAG, "Error closing LLM instance", e);
                }
                llmInference = null;
            }
            modelLoaded = false;
            Log.d(TAG, "MediaPipe LLM released");
        }
    }
}
