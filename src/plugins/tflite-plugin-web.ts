import { WebPlugin } from '@capacitor/core';
import type { TFLitePluginInterface, GenerateTextOptions, ChatOptions } from './tflite-plugin';

export class TFLitePluginWeb extends WebPlugin implements TFLitePluginInterface {
    async initializeModel(_options: { modelPath?: string }): Promise<{ success: boolean; message?: string }> {
        console.log('Web: TFLite model initialization not supported in browser');
        return { 
            success: false, 
            message: 'TFLite is only available on native platforms' 
        };
    }

    async loadModelFromUri(_options: { uri: string; fileName: string }): Promise<{ success: boolean; message?: string; path?: string; size?: number }> {
        console.log('Web: Model upload not supported in browser');
        return { 
            success: false, 
            message: 'Model upload is only available in the mobile app' 
        };
    }

    async generateText(_options: GenerateTextOptions): Promise<{ text: string; success: boolean }> {
        console.log('Web: Text generation not supported in browser');
        return { 
            text: 'AI features are only available in the mobile app', 
            success: false 
        };
    }

    async chat(_options: ChatOptions): Promise<{ text: string; success: boolean }> {
        console.log('Web: Chat not supported in browser');
        return { 
            text: 'AI chat is only available in the mobile app', 
            success: false 
        };
    }

    async isModelLoaded(): Promise<{ loaded: boolean }> {
        return { loaded: false };
    }

    async releaseModel(): Promise<{ success: boolean }> {
        return { success: true };
    }
}
