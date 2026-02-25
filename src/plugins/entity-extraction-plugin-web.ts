import { WebPlugin } from '@capacitor/core';
import type { EntityExtractionPluginInterface, EntityExtractionResult } from './entity-extraction-plugin';

export class EntityExtractionPluginWeb extends WebPlugin implements EntityExtractionPluginInterface {
    async extractEntities(options: { text: string }): Promise<EntityExtractionResult> {
        console.log('Entity extraction not available on web', options);
        return {
            success: false,
            dates: [],
            addresses: [],
            phones: [],
            emails: [],
            urls: [],
            error: 'Entity extraction is only available on native platforms'
        };
    }

    async downloadModel(): Promise<{ success: boolean; message: string }> {
        return {
            success: false,
            message: 'Model download is only available on native platforms'
        };
    }
}
