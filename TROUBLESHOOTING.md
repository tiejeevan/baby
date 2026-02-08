# Troubleshooting Guide

## App Crashes with Native Library Error

### Symptoms
- App crashes immediately after trying to use AI chat
- Error in logs: `Fatal signal 11 (SIGSEGV)` in `libllm_inference_engine_jni.so`
- Crash occurs in `TFLiteInference.generateText()`

### Root Causes
1. **Corrupted or incompatible model file**
2. **Insufficient memory**
3. **Concurrent access to the model**
4. **Model not properly initialized**

### Solutions

#### 1. Verify Model File
The model file must be a MediaPipe-compatible Gemma model:

```bash
# Check if model exists and size
adb shell ls -lh /data/data/com.baby.tracker/cache/gemma-2b-it-cpu-int8.task

# Expected size: ~1.5-2GB
# If file is missing or < 1MB, it's corrupted
```

**Fix:** Re-download the model from Kaggle:
- Visit: https://www.kaggle.com/models/google/gemma/tfLite/gemma-2b-it-cpu-int8
- Download `gemma-2b-it-cpu-int8.task`
- Place in `android/app/src/main/assets/` or use the in-app file picker

#### 2. Check Memory
The model requires significant RAM:

```bash
# Check available memory
adb shell dumpsys meminfo com.baby.tracker
```

**Requirements:**
- Minimum: 2GB RAM device
- Recommended: 4GB+ RAM
- Free memory needed: ~500MB-1GB

**Fix:**
- Close other apps before using AI chat
- Restart the device
- Consider using a smaller model variant

#### 3. Clear Cache and Restart
```bash
# Clear app cache
adb shell pm clear com.baby.tracker

# Or from device: Settings > Apps > Baby Tracker > Storage > Clear Cache
```

#### 4. Check Logs for Specific Errors
```bash
# Monitor logs while reproducing the crash
adb logcat -s TFLiteInference:* TFLitePlugin:* AndroidRuntime:* DEBUG:*

# Look for:
# - "Model file is too small, likely corrupted"
# - "Low memory warning"
# - "Out of memory during text generation"
# - "Model test failed"
```

### Prevention
The updated code now includes:
- ✅ Thread-safe model access (prevents concurrent crashes)
- ✅ Model validation test after initialization
- ✅ Memory checks before generation
- ✅ Automatic model reinitialization on corruption
- ✅ Better error messages

### Still Crashing?

If the app still crashes after trying all solutions:

1. **Check device compatibility:**
   ```bash
   adb shell getprop ro.product.cpu.abi
   # Should be: arm64-v8a or x86_64
   ```

2. **Verify MediaPipe library:**
   ```bash
   # Check if native library exists
   adb shell ls -l /data/app/*/com.baby.tracker*/lib/arm64/libllm_inference_engine_jni.so
   ```

3. **Try a clean build:**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug
   ```

4. **Use a different model:**
   - Try the 1B parameter version instead of 2B
   - Use a quantized model (int4 instead of int8)

### Error Messages Explained

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Model not loaded" | Model initialization failed | Check model file exists and is valid |
| "Another generation is in progress" | Concurrent requests | Wait for current generation to complete |
| "Model encountered an issue" | Native crash detected | Restart app, check model file |
| "Out of memory" | Insufficient RAM | Close other apps, restart device |
| "Model crashed" | Native library error | Re-download model, clear cache |

### Debug Mode

Enable verbose logging:
```bash
adb shell setprop log.tag.TFLiteInference VERBOSE
adb shell setprop log.tag.TFLitePlugin VERBOSE
```

### Getting Help

If issues persist, collect these logs:
```bash
# Capture full crash log
adb logcat -d > crash_log.txt

# Get memory info
adb shell dumpsys meminfo com.baby.tracker > memory_info.txt

# Get model file info
adb shell ls -lh /data/data/com.baby.tracker/cache/ > cache_info.txt
```

Then create an issue with these files attached.
