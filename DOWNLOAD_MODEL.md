# Download Gemma 3 Model

## Recommended Model: Gemma 3 1B INT4

For optimal performance on mobile devices, use the **Gemma 3 1B INT4** model.

### Download Link
https://www.kaggle.com/models/google/gemma-3/tfLite/gemma-3-1b-it-cpu-int4

### File Details
- **File name:** `gemma-3-1b-it-cpu-int4.task`
- **Size:** ~800 MB
- **Parameters:** 1 billion
- **Quantization:** INT4 (optimized for mobile)

## Installation Steps

### 1. Download from Kaggle

1. Visit: https://www.kaggle.com/models/google/gemma-3/tfLite/gemma-3-1b-it-cpu-int4
2. Click "Download" button
3. Wait for the ~800 MB file to download
4. Verify file size:
   ```bash
   ls -lh gemma-3-1b-it-cpu-int4.task
   # Should show approximately 800 MB
   ```

### 2. Transfer to Android Device

**Option A: Using ADB (Recommended)**
```bash
# Push to device Downloads folder
adb push gemma-3-1b-it-cpu-int4.task /sdcard/Download/

# Verify transfer
adb shell ls -lh /sdcard/Download/gemma-3-1b-it-cpu-int4.task
```

**Option B: Manual Transfer**
1. Connect device via USB
2. Copy file to device's Download folder
3. Or use cloud storage (Google Drive, Dropbox)

### 3. Load in App

1. Open the Baby Tracker app
2. Go to AI Chat settings
3. Tap "Load Model from File"
4. Navigate to Downloads folder
5. Select `gemma-3-1b-it-cpu-int4.task`
6. Wait for initialization (may take 30-60 seconds)

## Alternative Models

If you have more RAM or need better quality:

### Gemma 3 2B INT4 (~1.3 GB)
- Better quality responses
- Requires more memory
- Download: https://www.kaggle.com/models/google/gemma-3/tfLite/gemma-3-2b-it-cpu-int4

### Gemma 3 1B INT8 (~1.5 GB)
- Higher precision than INT4
- Slightly better quality
- Requires more memory
- Download: https://www.kaggle.com/models/google/gemma-3/tfLite/gemma-3-1b-it-cpu-int8

### Gemma 3 2B INT8 (~2.5 GB)
- Best quality
- Requires 4GB+ RAM device
- Download: https://www.kaggle.com/models/google/gemma-3/tfLite/gemma-3-2b-it-cpu-int8

## Device Requirements

| Model | Size | Min RAM | Recommended RAM |
|-------|------|---------|-----------------|
| 1B INT4 | 800 MB | 2 GB | 3 GB |
| 1B INT8 | 1.5 GB | 3 GB | 4 GB |
| 2B INT4 | 1.3 GB | 3 GB | 4 GB |
| 2B INT8 | 2.5 GB | 4 GB | 6 GB |

## Troubleshooting

### Model file is too small
If the downloaded file is less than 500 MB, the download was interrupted:
- Delete the partial file
- Re-download from Kaggle
- Check your internet connection

### Out of memory errors
If the app crashes with memory errors:
- Close all other apps
- Restart your device
- Try a smaller model (1B INT4)
- Consider upgrading to a device with more RAM

### Model not loading
If initialization fails:
- Verify file size matches expected size
- Check file is not corrupted
- Ensure file has `.task` extension
- Try re-downloading the model

### Empty responses
If model loads but generates empty responses:
- Model file may be corrupted
- Re-download and try again
- Check device has enough free storage
- Restart the app

## Verification

After loading, check the logs:
```bash
adb logcat -s TFLiteInference:D | grep "Model file size"
```

You should see:
```
Model file size: 800 MB  (for 1B INT4)
Model file size: 1300 MB (for 2B INT4)
Model file size: 1500 MB (for 1B INT8)
Model file size: 2500 MB (for 2B INT8)
```

If you see a much smaller size (like 289 MB), the model is corrupted.

## Need Help?

If you encounter issues:
1. Check TROUBLESHOOTING.md
2. Collect logs: `adb logcat -d > model_issue.log`
3. Create an issue with logs attached
