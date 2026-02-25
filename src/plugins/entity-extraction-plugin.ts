import { registerPlugin } from '@capacitor/core';

export interface ExtractedEntity {
    text: string;
    start: number;
    end: number;
}

export interface ExtractedDate extends ExtractedEntity {
    timestamp: number;
    granularity: number;
    formatted: string;
}

export interface EntityExtractionResult {
    success: boolean;
    dates: ExtractedDate[];
    addresses: ExtractedEntity[];
    phones: ExtractedEntity[];
    emails: ExtractedEntity[];
    urls: ExtractedEntity[];
    error?: string;
}

export interface EntityExtractionPluginInterface {
    /**
     * Extract entities (dates, addresses, phones, etc.) from text
     */
    extractEntities(options: { text: string }): Promise<EntityExtractionResult>;

    /**
     * Download the ML model if not already available
     */
    downloadModel(): Promise<{ success: boolean; message: string }>;
}

const EntityExtractionPlugin = registerPlugin<EntityExtractionPluginInterface>(
    'EntityExtractionPlugin',
    {
        web: () => import('./entity-extraction-plugin-web').then(m => new m.EntityExtractionPluginWeb()),
    }
);

export default EntityExtractionPlugin;
