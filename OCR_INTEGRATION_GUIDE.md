# OCR Integration Guide

## ✅ What Was Added

### 1. **Frontend Plugin** (TypeScript)
- `src/plugins/ocr-plugin.ts` - Main plugin interface
- `src/plugins/ocr-plugin-web.ts` - Web fallback (for browser testing)

### 2. **Android Native Plugin** (Java)
- `android/app/src/main/java/com/baby/tracker/OcrPlugin.java` - ML Kit integration

### 3. **Dependencies**
- Added ML Kit Text Recognition to `android/app/build.gradle`
- Registered plugin in `MainActivity.java`

### 4. **Sample Component**
- `src/components/OcrScanner.tsx` - Ready-to-use React component

---

## 🚀 How to Use

### Basic Usage in Your React Components:

```typescript
import OcrPlugin from './plugins/ocr-plugin';

// Scan from camera
const result = await OcrPlugin.scanTextFromCamera();
console.log(result.text); // "Hello World"

// Scan from gallery
const result = await OcrPlugin.scanTextFromGallery();
console.log(result.text);

// Scan from specific image path
const result = await OcrPlugin.scanTextFromImage({ 
    imagePath: 'file:///path/to/image.jpg' 
});
```

### Result Structure:

```typescript
{
    success: true,
    text: "Full extracted text",
    blocks: [
        {
            text: "Line 1",
            confidence: 0.98,
            boundingBox: { left: 10, top: 20, right: 100, bottom: 40 }
        },
        {
            text: "Line 2",
            confidence: 0.95,
            boundingBox: { left: 10, top: 50, right: 100, bottom: 70 }
        }
    ]
}
```

---

## 📱 Use Cases for Your Pregnancy App

### 1. **Scan Medical Reports**
```typescript
// Scan ultrasound report to extract dates
const result = await OcrPlugin.scanTextFromCamera();
// Extract: "Due Date: March 15, 2025"
```

### 2. **Scan Prescription Labels**
```typescript
// Scan medication bottle
const result = await OcrPlugin.scanTextFromGallery();
// Extract: "Prenatal Vitamins - Take 1 daily"
```

### 3. **Scan Appointment Cards**
```typescript
// Scan doctor's appointment card
const result = await OcrPlugin.scanTextFromCamera();
// Extract: "Next Visit: Feb 20, 2025 at 10:00 AM"
```

### 4. **Scan Nutrition Labels**
```typescript
// Scan food packaging
const result = await OcrPlugin.scanTextFromGallery();
// Extract nutritional information
```

---

## 🔧 Build & Deploy

### Step 1: Sync Capacitor
```bash
npm run build
npx cap sync android
```

### Step 2: Open in Android Studio
```bash
npx cap open android
```

### Step 3: Build & Run
- Click "Run" in Android Studio
- Or use: `./gradlew assembleDebug`

---

## 🎨 Integration Example

Add the OCR scanner to any screen:

```typescript
// In your screen component
import { OcrScanner } from '../components/OcrScanner';

export const SettingsScreen = () => {
    return (
        <div>
            <h1>Settings</h1>
            <OcrScanner />
        </div>
    );
};
```

---

## 🔐 Permissions

The plugin automatically handles:
- ✅ Camera permission (for scanTextFromCamera)
- ✅ Storage permission (for scanTextFromGallery)

No additional AndroidManifest.xml changes needed!

---

## 🌐 Web Browser Support

When testing in browser (npm run dev):
- OCR methods will return mock errors
- Full functionality works only on Android device

---

## 📊 Features

✅ **Camera Scan** - Live camera capture + OCR  
✅ **Gallery Scan** - Pick existing image + OCR  
✅ **File Path Scan** - Process image from path  
✅ **Text Blocks** - Get individual text segments  
✅ **Confidence Scores** - ML Kit confidence per block  
✅ **Bounding Boxes** - Position of each text block  
✅ **Offline** - Works without internet  
✅ **Free** - No API costs  
✅ **Privacy** - All processing on-device  

---

## 🐛 Troubleshooting

### Issue: "OcrPlugin not found"
**Solution:** Run `npx cap sync android`

### Issue: Camera not opening
**Solution:** Check camera permissions in Android settings

### Issue: Build error
**Solution:** Clean and rebuild:
```bash
cd android
./gradlew clean
./gradlew build
```

---

## 📝 Advanced Usage

### Extract Specific Information:

```typescript
const result = await OcrPlugin.scanTextFromCamera();

// Extract dates
const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}/g;
const dates = result.text.match(dateRegex);

// Extract times
const timeRegex = /\d{1,2}:\d{2}\s?(AM|PM)/gi;
const times = result.text.match(timeRegex);

// Extract numbers
const numbers = result.text.match(/\d+/g);
```

### Filter by Confidence:

```typescript
const highConfidenceBlocks = result.blocks?.filter(
    block => block.confidence > 0.9
);
```

---

## 🎯 Next Steps

1. Test on Android device
2. Integrate into your screens
3. Add custom text parsing logic
4. Style the UI to match your app theme

Enjoy your new OCR feature! 🎉
