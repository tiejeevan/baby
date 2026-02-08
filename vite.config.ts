import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-tflite-model',
      buildStart() {
        // Model upload is now handled through the app UI
        // No need to bundle the model in the APK
        console.log('✓ Model upload will be handled through app settings');
      }
    }
  ],
})
