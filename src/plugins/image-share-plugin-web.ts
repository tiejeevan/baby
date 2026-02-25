import { WebPlugin } from '@capacitor/core';
import type { ImageSharePluginInterface, PendingIntentResult } from './image-share-plugin';

export class ImageSharePluginWeb extends WebPlugin implements ImageSharePluginInterface {
    async checkPendingIntent(): Promise<PendingIntentResult> {
        return { hasImage: false };
    }
}
