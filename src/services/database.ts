import Dexie, { type Table } from 'dexie';
import type {
    PregnancyConfig,
    Milestone,
    CalendarEntry,
    Appointment,
    Medication,
    Photo,
    ReminderSettings,
    ChatMessage,
    DietPreference,
    DailyDietPlan,
    WaterLog,
    WeightLog,
} from '../types';

export class PregnancyDatabase extends Dexie {
    pregnancyConfig!: Table<PregnancyConfig, number>;
    milestones!: Table<Milestone, number>;
    calendarEntries!: Table<CalendarEntry, number>;
    appointments!: Table<Appointment, number>;
    medications!: Table<Medication, number>;
    photos!: Table<Photo, string>;
    reminderSettings!: Table<ReminderSettings, number>;
    chatMessages!: Table<ChatMessage, number>;
    dietPreferences!: Table<DietPreference, number>;
    dailyDietPlans!: Table<DailyDietPlan, number>;
    waterLogs!: Table<WaterLog, number>;
    weightLogs!: Table<WeightLog, number>;

    constructor() {
        super('PregnancyTrackerDB');

        this.version(3).stores({
            pregnancyConfig: '++id, referenceDate, createdAt',
            milestones: '++id, type, date, createdAt',
            calendarEntries: '++id, date, createdAt',
            appointments: '++id, date, time, createdAt',
            medications: '++id, name, startDate, endDate',
            photos: 'id, date, associatedWith, associatedId, createdAt',
            reminderSettings: '++id, createdAt',
            chatMessages: '++id, createdAt',
        });

        this.version(4).stores({
            dietPreferences: '++id, createdAt',
            dailyDietPlans: '++id, date, createdAt',
            waterLogs: '++id, date, createdAt',
            weightLogs: '++id, date',
        });
    }
}

// Create singleton instance
export const db = new PregnancyDatabase();

// Database helper functions
export const dbHelpers = {
    // Pregnancy Config
    async getPregnancyConfig(): Promise<PregnancyConfig | undefined> {
        return await db.pregnancyConfig.toCollection().first();
    },

    async savePregnancyConfig(config: Omit<PregnancyConfig, 'id'>): Promise<number> {
        const existing = await this.getPregnancyConfig();
        if (existing?.id) {
            await db.pregnancyConfig.update(existing.id, {
                ...config,
                updatedAt: new Date().toISOString(),
            });
            return existing.id;
        }
        return await db.pregnancyConfig.add(config as PregnancyConfig);
    },

    async deletePregnancyConfig(): Promise<void> {
        const existing = await this.getPregnancyConfig();
        if (existing?.id) {
            await db.pregnancyConfig.delete(existing.id);
        }
    },

    // Milestones
    async getMilestones(): Promise<Milestone[]> {
        return await db.milestones.orderBy('date').reverse().toArray();
    },

    async getMilestoneById(id: number): Promise<Milestone | undefined> {
        return await db.milestones.get(id);
    },

    async addMilestone(milestone: Omit<Milestone, 'id'>): Promise<number> {
        return await db.milestones.add(milestone as Milestone);
    },

    async updateMilestone(id: number, updates: Partial<Milestone>): Promise<void> {
        await db.milestones.update(id, {
            ...updates,
            updatedAt: new Date().toISOString(),
        });
    },

    async deleteMilestone(id: number): Promise<void> {
        const milestone = await db.milestones.get(id);
        if (milestone) {
            // Delete associated photos
            await Promise.all(
                milestone.photoIds.map(photoId => db.photos.delete(photoId))
            );
        }
        await db.milestones.delete(id);
    },

    // Calendar Entries
    async getCalendarEntriesForMonth(year: number, month: number): Promise<CalendarEntry[]> {
        const startDate = new Date(year, month, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

        return await db.calendarEntries
            .where('date')
            .between(startDate, endDate, true, true)
            .toArray();
    },

    async getCalendarEntryByDate(date: string): Promise<CalendarEntry | undefined> {
        return await db.calendarEntries.where('date').equals(date).first();
    },

    async saveCalendarEntry(entry: Omit<CalendarEntry, 'id'>): Promise<number> {
        const existing = await this.getCalendarEntryByDate(entry.date);
        if (existing?.id) {
            await db.calendarEntries.update(existing.id, {
                ...entry,
                updatedAt: new Date().toISOString(),
            });
            return existing.id;
        }
        return await db.calendarEntries.add(entry as CalendarEntry);
    },

    async deleteCalendarEntry(id: number): Promise<void> {
        const entry = await db.calendarEntries.get(id);
        if (entry) {
            // Delete associated photos
            await Promise.all(
                entry.photoIds.map(photoId => db.photos.delete(photoId))
            );
        }
        await db.calendarEntries.delete(id);
    },

    // Appointments
    async getUpcomingAppointments(limit = 5): Promise<Appointment[]> {
        const now = new Date().toISOString();
        return await db.appointments
            .where('date')
            .aboveOrEqual(now.split('T')[0])
            .limit(limit)
            .toArray();
    },

    async getAllAppointments(): Promise<Appointment[]> {
        return await db.appointments.orderBy('date').toArray();
    },

    async addAppointment(appointment: Omit<Appointment, 'id'>): Promise<number> {
        return await db.appointments.add(appointment as Appointment);
    },

    async updateAppointment(id: number, updates: Partial<Appointment>): Promise<void> {
        await db.appointments.update(id, {
            ...updates,
            updatedAt: new Date().toISOString(),
        });
    },

    async deleteAppointment(id: number): Promise<void> {
        await db.appointments.delete(id);
    },

    // Medications
    async getActiveMedications(): Promise<Medication[]> {
        const today = new Date().toISOString().split('T')[0];
        return await db.medications
            .where('startDate')
            .belowOrEqual(today)
            .filter(med => !med.endDate || med.endDate >= today)
            .toArray();
    },

    async getAllMedications(): Promise<Medication[]> {
        return await db.medications.orderBy('startDate').reverse().toArray();
    },

    async addMedication(medication: Omit<Medication, 'id'>): Promise<number> {
        return await db.medications.add(medication as Medication);
    },

    async updateMedication(id: number, updates: Partial<Medication>): Promise<void> {
        await db.medications.update(id, {
            ...updates,
            updatedAt: new Date().toISOString(),
        });
    },

    async deleteMedication(id: number): Promise<void> {
        await db.medications.delete(id);
    },

    // Photos
    async addPhoto(photo: Photo): Promise<string> {
        await db.photos.add(photo);
        return photo.id;
    },

    async getPhoto(id: string): Promise<Photo | undefined> {
        return await db.photos.get(id);
    },

    async getPhotosByDate(date: string): Promise<Photo[]> {
        return await db.photos.where('date').equals(date).toArray();
    },

    async deletePhoto(id: string): Promise<void> {
        await db.photos.delete(id);
    },

    // Reminder Settings
    async getReminderSettings(): Promise<ReminderSettings | undefined> {
        return await db.reminderSettings.toCollection().first();
    },

    async saveReminderSettings(settings: Omit<ReminderSettings, 'id'>): Promise<number> {
        const existing = await this.getReminderSettings();
        if (existing?.id) {
            await db.reminderSettings.update(existing.id, {
                ...settings,
                updatedAt: new Date().toISOString(),
            });
            return existing.id;
        }
        return await db.reminderSettings.add(settings as ReminderSettings);
    },

    // Chat Messages
    async getChatMessages(limit = 50): Promise<ChatMessage[]> {
        return await db.chatMessages.orderBy('createdAt').reverse().limit(limit).reverse().toArray();
    },

    async addChatMessage(message: Omit<ChatMessage, 'id'>): Promise<number> {
        return await db.chatMessages.add(message as ChatMessage);
    },

    async clearChatHistory(): Promise<void> {
        await db.chatMessages.clear();
    },

    // --- Diet & Health Helpers ---

    // Diet Preferences
    async getDietPreference(): Promise<DietPreference | undefined> {
        return await db.dietPreferences.orderBy('createdAt').last();
    },

    async saveDietPreference(pref: Omit<DietPreference, 'id'>): Promise<number> {
        return await db.dietPreferences.add(pref as DietPreference);
    },

    async updateDietPreference(id: number, updates: Partial<DietPreference>): Promise<void> {
        await db.dietPreferences.update(id, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    },

    // Daily Diet Plans
    async getDailyPlan(date: string): Promise<DailyDietPlan | undefined> {
        return await db.dailyDietPlans.where('date').equals(date).first();
    },

    async saveDailyPlan(plan: Omit<DailyDietPlan, 'id'>): Promise<number> {
        const existing = await this.getDailyPlan(plan.date);
        if (existing?.id) {
            await db.dailyDietPlans.update(existing.id, {
                ...plan,
                updatedAt: new Date().toISOString()
            });
            return existing.id;
        }
        return await db.dailyDietPlans.add(plan as DailyDietPlan);
    },

    // Water Logging
    async addWaterLog(log: Omit<WaterLog, 'id'>): Promise<number> {
        return await db.waterLogs.add(log as WaterLog);
    },

    async getWaterLogs(date: string): Promise<WaterLog[]> {
        return await db.waterLogs.where('date').equals(date).toArray();
    },

    async getTotalWaterIntake(date: string): Promise<number> {
        const logs = await this.getWaterLogs(date);
        return logs.reduce((sum, log) => sum + log.amount, 0);
    },

    // Weight Logging
    async addWeightLog(log: Omit<WeightLog, 'id'>): Promise<number> {
        // Check if logs exist for this date, if so update
        const existing = await db.weightLogs.where('date').equals(log.date).first();
        if (existing?.id) {
            await db.weightLogs.update(existing.id, log);
            return existing.id;
        }
        return await db.weightLogs.add(log as WeightLog);
    },

    async getWeightHistory(): Promise<WeightLog[]> {
        return await db.weightLogs.orderBy('date').toArray();
    },

    async getLatestWeight(): Promise<WeightLog | undefined> {
        return await db.weightLogs.orderBy('date').last();
    },

    async resetDietData(): Promise<void> {
        await db.dietPreferences.clear();
        await db.dailyDietPlans.clear();
        await db.waterLogs.clear();
    },
};
