
import { GoogleGenerativeAI } from "@google/generative-ai";
import { dbHelpers } from './database';
import type { DailyDietPlan, DietPreference } from "../types";
import { calculatePregnancyStatus } from "./pregnancy-calculator";

// Initialize Gemini API
// NOTE: For a real production app, this key should come from a secure backend or environment variable.
// Since this is a local-only prototype, we'll try to find one or prompt the user.
// For now, we'll assume the user might input it or we use a free tier one if available.
// Ideally, we'd have a Settings field for "Gemini API Key".
// Hardcoded Key as requested
let API_KEY = "AIzaSyC6x3aKWmU-ULlucuxwHoQYeI2S9khPnMs";

export const setGeminiApiKey = (key: string) => {
    if (key) API_KEY = key;
};

const getModel = () => {
    if (!API_KEY) {
        // Fallback or error
        console.warn("Gemini API Key not set.");
        return null;
    }
    const genAI = new GoogleGenerativeAI(API_KEY);
    return genAI.getGenerativeModel({ model: "gemini-flash-latest" });
};

export const geminiService = {
    async generateDietPlan(date: string, preferences: DietPreference): Promise<DailyDietPlan | null> {
        console.log("🥗 Starting diet plan generation...");
        console.log("Date:", date);
        console.log("Preferences:", preferences);

        const model = getModel();
        if (!model) {
            console.error("❌ Model initialization failed - API key issue");
            return null;
        }

        try {
            // Context Gathering
            const config = await dbHelpers.getPregnancyConfig();
            const status = config ? calculatePregnancyStatus(config) : null;
            const week = status?.weeks || 10; // Default if not found

            console.log("👶 Pregnancy week:", week);

            const prompt = `
                Act as a professional pre-natal nutritionist.
                Create a 1-day meal plan for a pregnant woman at Week ${week}.
                Date: ${date}
                Diet Type: ${preferences.dietType}
                Allergies: ${preferences.allergies.join(', ') || 'None'}
                Dislikes: ${preferences.dislikes.join(', ') || 'None'}
                Calorie Goal: ${preferences.calorieGoal || 'Standard for pregnancy'}
                
                Provide the response ONLY in valid JSON format with this structure:
                {
                    "meals": [
                        { "type": "breakfast", "name": "...", "description": "...", "calories": 100, "ingredients": ["..."], "recipe": "...", "nutrients": { "protein": 0, "carbs": 0, "fats": 0, "iron": 0, "calcium": 0, "folate": 0 } },
                        { "type": "lunch", "name": "...", ... },
                        { "type": "snack", "name": "...", ... },
                        { "type": "dinner", "name": "...", ... }
                    ],
                    "totalCalories": 0,
                    "notes": "Advice for today..."
                }
                Do not include markdown code blocks. Just the raw JSON string.
            `;

            console.log("📤 Sending request to Gemini API...");
            const result = await model.generateContent(prompt);
            console.log("📥 Received response from Gemini API");

            const response = await result.response;
            const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

            console.log("📄 Raw response text:", text.substring(0, 200) + "...");

            const data = JSON.parse(text);
            console.log("✅ Successfully parsed JSON response");

            return {
                date: date,
                meals: data.meals.map((m: any) => ({ ...m, id: crypto.randomUUID(), completed: false })),
                totalCalories: data.totalCalories,
                waterIntake: 0,
                notes: data.notes,
                generatedByAI: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            } as DailyDietPlan;

        } catch (error: any) {
            console.error("❌ Gemini Diet Generation Error:", error);
            console.error("Error name:", error?.name);
            console.error("Error message:", error?.message);
            console.error("Error stack:", error?.stack);
            if (error.response) {
                console.error("Gemini API Response Error:", error.response);
            }
            if (error instanceof SyntaxError) {
                console.error("JSON Parsing Error - Invalid response format");
            }
            return null;
        }
    },

    async askNutritionQuestion(question: string): Promise<string> {
        const model = getModel();
        if (!model) return "Please configure your Gemini API Key in Settings first.";

        const prompt = `
            You are a helpful pregnancy nutrition assistant. Answer this user question briefly and safely.
            Question: "${question}"
            
            Disclaimer: Always remind them to consult a doctor for medical advice if relevant.
        `;

        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error(error);
            return "Sorry, I couldn't reach the nutrition expert right now.";
        }
    },

    async checkFoodSafety(foodName: string): Promise<{ safe: string, reasoning: string }> {
        const model = getModel();
        if (!model) return { safe: "unknown", reasoning: "API Key missing." };

        const prompt = `
            Is it safe for a pregnant woman to eat "${foodName}"?
            Response format: JSON
            { "safe": "yes" | "no" | "limit", "reasoning": "..." }
            Do not markdown.
        `;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(text);
        } catch (error) {
            console.error(error);
            return { safe: "unknown", reasoning: "Could not verify." };
        }
    }
};
