import { registerPlugin } from '@capacitor/core';

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface GenerateTextOptions {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
}

export interface ChatOptions {
    messages: Message[];
    maxTokens?: number;
    temperature?: number;
}

export interface TFLitePluginInterface {
    initializeModel(options: { modelPath?: string }): Promise<{ success: boolean; message?: string }>;
    
    loadModelFromUri(options: { uri: string; fileName: string }): Promise<{ success: boolean; message?: string; path?: string; size?: number }>;
    
    generateText(options: GenerateTextOptions): Promise<{ text: string; success: boolean }>;
    
    chat(options: ChatOptions): Promise<{ text: string; success: boolean }>;
    
    isModelLoaded(): Promise<{ loaded: boolean }>;
    
    releaseModel(): Promise<{ success: boolean }>;
}

const TFLitePlugin = registerPlugin<TFLitePluginInterface>('TFLitePlugin', {
    web: () => import('./tflite-plugin-web').then(m => new m.TFLitePluginWeb()),
});

export default TFLitePlugin;
