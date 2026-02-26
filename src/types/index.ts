// Core data types for the pregnancy tracking app

export interface PregnancyConfig {
    id?: number;
    firstName?: string;
    lastName?: string;
    referenceDate: string; // ISO date string
    referenceWeeks: number; // e.g., 8
    referenceDays: number; // e.g., 2
    dueDate?: string; // Calculated due date
    createdAt: string;
    updatedAt: string;
}

export interface CurrentPregnancyStatus {
    weeks: number;
    days: number;
    totalDays: number;
    dueDate: string;
    percentComplete: number;
}

export type MilestoneType = 'first_test' | 'hospital_visit' | 'ultrasound' | 'custom';

export interface Milestone {
    id?: number;
    type: MilestoneType;
    title: string;
    date: string; // ISO date string
    notes?: string;
    photoIds: string[]; // References to photos in filesystem
    attachments?: FileAttachment[]; // References to mixed media (images, videos, docs)
    week?: number;
    createdAt: string;
    updatedAt: string;
}

export interface DateReminder {
    id: string;
    type: 'notification' | 'alarm';
    time: string; // HH:mm format
    title: string;
    note?: string;
    enabled: boolean;
    notificationId?: number;
}

export interface FileAttachment {
    id: string;
    name: string;
    type: string; // MIME type
    size: number; // bytes
    filepath: string; // Storage path
    thumbnail?: string; // Thumbnail path for images
    uploadedAt: string;
}

export interface CalendarEntry {
    id?: number;
    date: string; // ISO date string (YYYY-MM-DD)
    notes?: string;
    photoIds: string[];
    activities: Activity[];
    reminders?: DateReminder[];
    attachments?: FileAttachment[]; // New field for file attachments
    createdAt: string;
    updatedAt: string;
}

export interface Activity {
    id: string;
    type: 'exercise' | 'note' | 'symptom' | 'mood' | 'custom';
    description: string;
    time?: string; // HH:mm format
}

export interface Appointment {
    id?: number;
    title: string;
    date: string; // ISO date string
    time: string; // HH:mm format
    location?: string;
    notes?: string;
    reminderMinutes: number; // Minutes before appointment
    reminderEnabled: boolean;
    notificationId?: number; // Capacitor notification ID
    createdAt: string;
    updatedAt: string;
}

export interface Medication {
    id?: number;
    name: string;
    dosage: string;
    frequency: 'daily' | 'twice_daily' | 'three_times_daily' | 'as_needed' | 'custom';
    customSchedule?: string[]; // Array of HH:mm times
    startDate: string;
    endDate?: string;
    reminderEnabled: boolean;
    notificationIds: number[]; // Multiple notification IDs for recurring reminders
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Photo {
    id: string; // UUID
    filepath: string; // Capacitor filesystem path
    thumbnail?: string; // Thumbnail path
    date: string; // ISO date string
    associatedWith: 'milestone' | 'calendar';
    associatedId: number;
    createdAt: string;
}

export interface WeekInfo {
    week: number;
    babySize: string; // e.g., "Size of a raspberry"
    babyLength: string; // e.g., "1.6 cm"
    babyWeight: string; // e.g., "1 gram"
    developmentHighlights: string[];
    maternalChanges: string[];
    tips: string[];
}

export interface ReminderSettings {
    id?: number;
    medicationEnabled: boolean;
    medicationTime: string; // HH:mm format
    medicationNotificationId?: number;
    medicationAlarm?: boolean; // Play alarm sound
    exerciseEnabled: boolean;
    exerciseTime: string; // HH:mm format
    exerciseNotificationId?: number;
    exerciseAlarm?: boolean; // Play alarm sound
    customReminders: CustomReminder[];
    createdAt: string;
    updatedAt: string;
}

export interface CustomReminder {
    id: string;
    title: string;
    time: string; // HH:mm format
    enabled: boolean;
    notificationId?: number;
    repeatDaily: boolean;
    isAlarm?: boolean; // Play alarm sound
}

// --- Diet & Health Types ---

export interface DietPreference {
    id?: number;
    dietType: 'standard' | 'vegetarian' | 'vegan' | 'pescatarian' | 'gluten_free' | 'keto' | 'paleo';
    allergies: string[]; // e.g., ['nuts', 'dairy']
    dislikes: string[];
    calorieGoal?: number;
    waterGoal?: number; // in ml
    createdAt: string;
    updatedAt: string;
}

export interface Meal {
    id: string; // UUID
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    name: string;
    description: string;
    calories?: number;
    nutrients?: {
        protein?: number;
        carbs?: number;
        fats?: number;
        iron?: number;
        calcium?: number;
        folate?: number;
    };
    ingredients: string[];
    recipe?: string;
    completed: boolean;
}

export interface DailyDietPlan {
    id?: number;
    date: string; // YYYY-MM-DD
    meals: Meal[];
    totalCalories?: number;
    waterIntake: number; // in ml
    notes?: string;
    generatedByAI: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface WaterLog {
    id?: number;
    date: string; // YYYY-MM-DD
    amount: number; // ml
    timestamp: string; // ISO
}

export interface WeightLog {
    id?: number;
    date: string; // YYYY-MM-DD
    weight: number; // kg or lbs from settings
    note?: string;
}
