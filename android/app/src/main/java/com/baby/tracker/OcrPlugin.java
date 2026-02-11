package com.baby.tracker;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Log;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

@CapacitorPlugin(name = "OcrPlugin")
public class OcrPlugin extends Plugin {
    private static final String TAG = "OcrPlugin";
    
    private TextRecognizer recognizer;

    @Override
    public void load() {
        super.load();
        recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        Log.d(TAG, "OcrPlugin loaded with ML Kit Text Recognition");
    }

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void scanTextFromCamera(PluginCall call) {
        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (takePictureIntent.resolveActivity(getContext().getPackageManager()) != null) {
            startActivityForResult(call, takePictureIntent, "handleCameraResult");
        } else {
            call.reject("Camera not available");
        }
    }

    @PluginMethod
    public void scanTextFromGallery(PluginCall call) {
        Intent pickPhotoIntent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
        pickPhotoIntent.setType("image/*");
        if (pickPhotoIntent.resolveActivity(getContext().getPackageManager()) != null) {
            startActivityForResult(call, pickPhotoIntent, "handleGalleryResult");
        } else {
            call.reject("Gallery not available");
        }
    }

    @PluginMethod
    public void scanTextFromImage(PluginCall call) {
        String imagePath = call.getString("imagePath");
        if (imagePath == null || imagePath.isEmpty()) {
            call.reject("Image path is required");
            return;
        }

        try {
            InputImage image;
            if (imagePath.startsWith("content://") || imagePath.startsWith("file://")) {
                Uri uri = Uri.parse(imagePath);
                image = InputImage.fromFilePath(getContext(), uri);
            } else {
                File file = new File(imagePath);
                if (!file.exists()) {
                    call.reject("Image file not found");
                    return;
                }
                image = InputImage.fromFilePath(getContext(), Uri.fromFile(file));
            }

            processImage(image, call);
        } catch (IOException e) {
            Log.e(TAG, "Error loading image", e);
            call.reject("Error loading image: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void handleCameraResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            try {
                Bitmap bitmap = (Bitmap) result.getData().getExtras().get("data");
                if (bitmap != null) {
                    InputImage image = InputImage.fromBitmap(bitmap, 0);
                    processImage(image, call);
                } else {
                    call.reject("Failed to capture image");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error processing camera image", e);
                call.reject("Error processing image: " + e.getMessage());
            }
        } else {
            call.reject("Camera capture cancelled");
        }
    }

    @ActivityCallback
    private void handleGalleryResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            try {
                Uri imageUri = result.getData().getData();
                if (imageUri != null) {
                    InputImage image = InputImage.fromFilePath(getContext(), imageUri);
                    processImage(image, call);
                } else {
                    call.reject("Failed to get image from gallery");
                }
            } catch (IOException e) {
                Log.e(TAG, "Error processing gallery image", e);
                call.reject("Error processing image: " + e.getMessage());
            }
        } else {
            call.reject("Gallery selection cancelled");
        }
    }

    private void processImage(InputImage image, PluginCall call) {
        recognizer.process(image)
            .addOnSuccessListener(visionText -> {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("text", visionText.getText());
                
                JSArray blocks = new JSArray();
                for (Text.TextBlock block : visionText.getTextBlocks()) {
                    JSObject blockObj = new JSObject();
                    blockObj.put("text", block.getText());
                    
                    if (block.getBoundingBox() != null) {
                        JSObject bbox = new JSObject();
                        bbox.put("left", block.getBoundingBox().left);
                        bbox.put("top", block.getBoundingBox().top);
                        bbox.put("right", block.getBoundingBox().right);
                        bbox.put("bottom", block.getBoundingBox().bottom);
                        blockObj.put("boundingBox", bbox);
                    }
                    
                    // Add lines within the block
                    JSArray lines = new JSArray();
                    for (Text.Line line : block.getLines()) {
                        JSObject lineObj = new JSObject();
                        lineObj.put("text", line.getText());
                        lines.put(lineObj);
                    }
                    blockObj.put("lines", lines);
                    
                    blocks.put(blockObj);
                }
                result.put("blocks", blocks);
                
                Log.d(TAG, "OCR Success: " + visionText.getText());
                call.resolve(result);
            })
            .addOnFailureListener(e -> {
                Log.e(TAG, "OCR failed", e);
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("text", "");
                result.put("error", e.getMessage());
                call.resolve(result);
            });
    }

    @Override
    protected void handleOnDestroy() {
        if (recognizer != null) {
            recognizer.close();
        }
        super.handleOnDestroy();
    }
}
