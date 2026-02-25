import OcrPlugin from '../plugins/ocr-plugin';
import EntityExtractionPlugin from '../plugins/entity-extraction-plugin';
import ReminderPlugin from '../plugins/reminder-plugin';
import type { ExtractedDate } from '../plugins/entity-extraction-plugin';

export interface ProcessedImageResult {
    success: boolean;
    text: string;
    dates: ExtractedDate[];
    error?: string;
}

export interface ReminderSuggestion {
    title: string;
    body: string;
    dateTime: number;
    formattedDate: string;
    originalText: string;
}

class ImageToReminderService {
    /**
     * Process an image: OCR -> Entity Extraction -> Return suggestions
     */
    async processImage(imageUri: string): Promise<ProcessedImageResult> {
        try {
            // Step 1: Extract text from image using OCR
            console.log('Processing image:', imageUri);
            const ocrResult = await OcrPlugin.scanTextFromImage({ imagePath: imageUri });
            
            if (!ocrResult.success || !ocrResult.text) {
                return {
                    success: false,
                    text: '',
                    dates: [],
                    error: 'Failed to extract text from image'
                };
            }

            console.log('OCR extracted text:', ocrResult.text);

            // Step 2: Extract entities (dates, times, etc.) from the text
            const entityResult = await EntityExtractionPlugin.extractEntities({ 
                text: ocrResult.text 
            });

            if (!entityResult.success) {
                return {
                    success: false,
                    text: ocrResult.text,
                    dates: [],
                    error: 'Failed to extract entities from text'
                };
            }

            console.log('Found dates:', entityResult.dates);

            return {
                success: true,
                text: ocrResult.text,
                dates: entityResult.dates,
            };
        } catch (error) {
            console.error('Error processing image:', error);
            return {
                success: false,
                text: '',
                dates: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Generate reminder suggestions from extracted dates
     */
    generateReminderSuggestions(
        text: string, 
        dates: ExtractedDate[]
    ): ReminderSuggestion[] {
        const suggestions: ReminderSuggestion[] = [];
        const now = Date.now();

        for (const date of dates) {
            // Only suggest future dates
            if (date.timestamp > now) {
                // Try to extract context around the date
                const contextStart = Math.max(0, date.start - 50);
                const contextEnd = Math.min(text.length, date.end + 50);
                const context = text.substring(contextStart, contextEnd).trim();

                // Generate a title from the context
                const title = this.generateTitle(context, date.text);

                suggestions.push({
                    title,
                    body: context,
                    dateTime: date.timestamp,
                    formattedDate: date.formatted,
                    originalText: date.text
                });
            }
        }

        return suggestions;
    }

    /**
     * Generate a meaningful title from context
     */
    private generateTitle(context: string, dateText: string): string {
        // Remove the date text from context
        const cleanContext = context.replace(dateText, '').trim();
        
        // Look for common keywords
        const keywords = [
            'appointment', 'meeting', 'doctor', 'checkup', 'visit',
            'deadline', 'due', 'reminder', 'event', 'birthday',
            'anniversary', 'vaccination', 'ultrasound', 'scan'
        ];

        for (const keyword of keywords) {
            if (cleanContext.toLowerCase().includes(keyword)) {
                // Extract a sentence containing the keyword
                const sentences = cleanContext.split(/[.!?]/);
                for (const sentence of sentences) {
                    if (sentence.toLowerCase().includes(keyword)) {
                        return sentence.trim().substring(0, 50);
                    }
                }
            }
        }

        // Fallback: use first few words
        const words = cleanContext.split(/\s+/).slice(0, 6).join(' ');
        return words || 'Reminder';
    }

    /**
     * Create a reminder from a suggestion
     */
    async createReminder(suggestion: ReminderSuggestion, isAlarm: boolean = false): Promise<boolean> {
        try {
            console.log('Creating reminder for:', suggestion);
            const reminderId = Date.now(); // Use timestamp as unique ID
            
            // Schedule the alarm
            console.log('Scheduling alarm...');
            const result = await ReminderPlugin.scheduleOneTimeReminder({
                title: suggestion.title,
                body: suggestion.body,
                dateTime: suggestion.dateTime.toString(),
                type: 'custom',
                reminderId,
                wakeScreen: true,
                isAlarm: isAlarm // Use the passed parameter
            });

            console.log('Alarm scheduled:', result);

            if (!result.success) {
                console.error('Failed to schedule alarm');
                return false;
            }

            // Save to database as an appointment
            console.log('Saving to database...');
            const { dbHelpers } = await import('./database');
            const appointmentDate = new Date(suggestion.dateTime);
            
            const appointmentData = {
                title: suggestion.title,
                date: appointmentDate.toISOString().split('T')[0],
                time: appointmentDate.toTimeString().substring(0, 5), // HH:MM format
                location: '',
                notes: suggestion.body,
                reminderMinutes: 0, // Already scheduled
                reminderEnabled: true,
                notificationId: reminderId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            console.log('Appointment data:', appointmentData);
            
            const appointmentId = await dbHelpers.addAppointment(appointmentData);
            console.log('Appointment saved with ID:', appointmentId);

            return true;
        } catch (error) {
            console.error('Error creating reminder:', error);
            return false;
        }
    }

    /**
     * Process multiple images
     */
    async processMultipleImages(imageUris: string[]): Promise<ProcessedImageResult[]> {
        const results: ProcessedImageResult[] = [];
        
        for (const uri of imageUris) {
            const result = await this.processImage(uri);
            results.push(result);
        }
        
        return results;
    }
}

export default new ImageToReminderService();
