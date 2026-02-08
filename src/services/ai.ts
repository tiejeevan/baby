import TFLitePlugin, { type Message } from '../plugins/tflite-plugin';
import { dbHelpers } from './database';
import { calculatePregnancyStatus } from './pregnancy-calculator';

/**
 * AI service for managing TFLite model and generating responses
 */

export interface AIConfig {
    maxTokens: number;
    temperature: number;
    systemPrompt: string;
}

const DEFAULT_CONFIG: AIConfig = {
    maxTokens: 256,  // Reduced to prevent memory issues
    temperature: 0.7,
    systemPrompt: `You are a helpful AI assistant for a pregnancy tracking app. 
You provide supportive, accurate, and empathetic information about pregnancy, health, and wellness.
Always remind users to consult healthcare professionals for medical advice.
Keep responses concise and friendly.`
};

class AIService {
    private config: AIConfig = DEFAULT_CONFIG;
    private modelInitialized = false;

    /**
     * Initialize the TFLite model
     */
    async initialize(): Promise<boolean> {
        try {
            // First check if a model is already loaded
            const alreadyLoaded = await this.isReady();
            if (alreadyLoaded) {
                console.log('Model already loaded, skipping initialization');
                this.modelInitialized = true;
                return true;
            }

            const result = await TFLitePlugin.initializeModel({
                modelPath: 'gemma-3-270m-it-int8.task'
            });
            
            this.modelInitialized = result.success;
            
            if (result.success) {
                console.log('AI model initialized successfully');
            } else {
                console.error('Failed to initialize AI model:', result.message);
            }
            
            return result.success;
        } catch (error) {
            console.error('Error initializing AI model:', error);
            // Check if model is loaded despite the error
            const isLoaded = await this.isReady();
            this.modelInitialized = isLoaded;
            return isLoaded;
        }
    }

    /**
     * Check if model is loaded
     */
    async isReady(): Promise<boolean> {
        try {
            const result = await TFLitePlugin.isModelLoaded();
            return result.loaded;
        } catch (error) {
            console.error('Error checking model status:', error);
            return false;
        }
    }

    /**
     * Generate a response with pregnancy context
     */
    async generateResponse(userMessage: string, conversationHistory: Message[] = []): Promise<string> {
        if (!this.modelInitialized) {
            const initialized = await this.initialize();
            if (!initialized) {
                return "I'm sorry, the AI assistant is not available right now. Please try again later.";
            }
        }

        try {
            // Get pregnancy context
            const context = await this.getPregnancyContext();
            
            // Limit conversation history to last 3 messages to reduce memory usage
            const recentHistory = conversationHistory.slice(-3);
            
            // Build messages with system prompt and context
            const messages: Message[] = [
                { role: 'system', content: this.config.systemPrompt },
                { role: 'system', content: context },
                ...recentHistory,
                { role: 'user', content: userMessage }
            ];

            const result = await TFLitePlugin.chat({
                messages,
                maxTokens: this.config.maxTokens,
                temperature: this.config.temperature
            });

            if (result.success) {
                return result.text;
            } else {
                return "I'm having trouble generating a response. Please try again.";
            }
        } catch (error) {
            console.error('Error generating AI response:', error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            
            // Check for memory-related errors
            if (errorMsg.toLowerCase().includes('memory')) {
                return "I'm running low on memory. Please try a shorter message or restart the app.";
            }
            
            return "An error occurred while processing your message. Please try again.";
        }
    }

    /**
     * Get pregnancy context for AI
     */
    private async getPregnancyContext(): Promise<string> {
        try {
            const config = await dbHelpers.getPregnancyConfig();
            
            if (!config) {
                return "The user hasn't set up their pregnancy tracking yet.";
            }

            const status = calculatePregnancyStatus(config);

            return `Current pregnancy context:
- Week: ${status.weeks} weeks and ${status.days} days
- Due date: ${new Date(status.dueDate).toLocaleDateString()}
- Progress: ${status.percentComplete.toFixed(1)}% complete
- Total days: ${status.totalDays} days`;
        } catch (error) {
            console.error('Error getting pregnancy context:', error);
            return "Unable to retrieve pregnancy information.";
        }
    }

    /**
     * Generate pregnancy-related suggestions
     */
    async getSuggestions(topic: 'nutrition' | 'exercise' | 'symptoms' | 'general'): Promise<string> {
        const prompts = {
            nutrition: "What are some healthy nutrition tips for my current pregnancy stage?",
            exercise: "What safe exercises can I do at my current pregnancy stage?",
            symptoms: "What are common symptoms I might experience at my current pregnancy stage?",
            general: "What should I know about my current pregnancy stage?"
        };

        return this.generateResponse(prompts[topic]);
    }

    /**
     * Update AI configuration
     */
    updateConfig(config: Partial<AIConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): AIConfig {
        return { ...this.config };
    }

    /**
     * Release model resources
     */
    async release(): Promise<void> {
        try {
            await TFLitePlugin.releaseModel();
            this.modelInitialized = false;
            console.log('AI model released');
        } catch (error) {
            console.error('Error releasing AI model:', error);
        }
    }
}

export const aiService = new AIService();
