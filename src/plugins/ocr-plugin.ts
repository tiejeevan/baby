import { registerPlugin } from '@capacitor/core';

export interface OcrResult {
    success: boolean;
    text: string;
    blocks?: TextBlock[];
    error?: string;
}

export interface TextBlock {
    text: string;
    lines?: TextLine[];
    boundingBox?: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
}

export interface TextLine {
    text: string;
}

export interface OcrPluginInterface {
    /**
     * Open camera and scan text from live view
     */
    scanTextFromCamera(): Promise<OcrResult>;

    /**
     * Pick an image from gallery and scan text
     */
    scanTextFromGallery(): Promise<OcrResult>;

    /**
     * Scan text from a specific image path
     */
    scanTextFromImage(options: { imagePath: string }): Promise<OcrResult>;

    /**
     * Check if ML Kit is available on device
     */
    checkAvailability(): Promise<{ available: boolean }>;
}

const OcrPlugin = registerPlugin<OcrPluginInterface>('OcrPlugin', {
    web: () => import('./ocr-plugin-web').then(m => new m.OcrPluginWeb()),
});

export default OcrPlugin;
