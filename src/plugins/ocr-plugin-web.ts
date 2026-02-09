import { WebPlugin } from '@capacitor/core';
import type { OcrPluginInterface, OcrResult } from './ocr-plugin';

export class OcrPluginWeb extends WebPlugin implements OcrPluginInterface {
    async scanTextFromCamera(): Promise<OcrResult> {
        console.log('Web: scanTextFromCamera not implemented');
        return {
            success: false,
            text: '',
            error: 'OCR not available in web browser'
        };
    }

    async scanTextFromGallery(): Promise<OcrResult> {
        console.log('Web: scanTextFromGallery not implemented');
        return {
            success: false,
            text: '',
            error: 'OCR not available in web browser'
        };
    }

    async scanTextFromImage(options: { imagePath: string }): Promise<OcrResult> {
        console.log('Web: scanTextFromImage not implemented', options);
        return {
            success: false,
            text: '',
            error: 'OCR not available in web browser'
        };
    }

    async checkAvailability(): Promise<{ available: boolean }> {
        return { available: false };
    }
}
