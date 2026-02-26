import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface FileShareData {
    imageUri: string; // Original property for backward compatibility
    mimeType: string;
    timestamp: string;
    name?: string;
}

export interface ImageShareData extends FileShareData {}

export interface ImagesShareData {
    imageUris: string[];
    files: FileShareData[];
}

export interface PendingIntentResult {
    hasImage?: boolean;
    imageUri?: string;
    mimeType?: string;
    timestamp?: string;
    name?: string;
    hasImages?: boolean;
    imageUris?: string[];
    files?: FileShareData[];
}

export interface ImageSharePluginInterface {
    /**
     * Check if there's a pending shared image from app launch
     */
    checkPendingIntent(): Promise<PendingIntentResult>;

    /**
     * Listen for shared images
     */
    addListener(
        eventName: 'sharedImage',
        listenerFunc: (data: ImageShareData) => void
    ): Promise<PluginListenerHandle>;

    /**
     * Listen for multiple shared images
     */
    addListener(
        eventName: 'sharedImages',
        listenerFunc: (data: ImagesShareData) => void
    ): Promise<PluginListenerHandle>;

    /**
     * Listen for viewed images
     */
    addListener(
        eventName: 'viewImage',
        listenerFunc: (data: ImageShareData) => void
    ): Promise<PluginListenerHandle>;
}

const ImageSharePlugin = registerPlugin<ImageSharePluginInterface>('ImageSharePlugin', {
    web: () => import('./image-share-plugin-web').then(m => new m.ImageSharePluginWeb()),
});

export default ImageSharePlugin;
