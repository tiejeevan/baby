import Dexie, { type Table } from 'dexie';
import type {
    PregnancyConfig,
    Milestone,
    CalendarEntry,
    Appointment,
    Medication,
    Photo,
    ReminderSettings,
} from '../types';

export class PregnancyDatabase extends Dexie {
    pregnancyConfig!: Table<PregnancyConfig, number>;
    milestones!: Table<Milestone, number>;
    calendarEntries!: Table<CalendarEntry, number>;
    appointments!: Table<Appointment, number>;
    medications!: Table<Medication, number>;
    photos!: Table<Photo, string>;
    reminderSettings!: Table<ReminderSettings, number>;

    constructor() {
        super('PregnancyTrackerDB');

        this.version(2).stores({
            pregnancyConfig: '++id, referenceDate, createdAt',
            milestones: '++id, type, date, createdAt',
            calendarEntries: '++id, date, createdAt',
            appointments: '++id, date, time, createdAt',
            medications: '++id, name, startDate, endDate',
            photos: 'id, date, associatedWith, associatedId, createdAt',
            reminderSettings: '++id, createdAt',
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
};
