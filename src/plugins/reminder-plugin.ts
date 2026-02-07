import { registerPlugin } from '@capacitor/core';

export interface ScheduleDailyOptions {
    title: string;
    body: string;
    time: string; // HH:mm format
    type: 'medication' | 'exercise' | 'custom';
    reminderId: number;
    isAlarm?: boolean; // If true, plays loud alarm sound continuously
}

export interface ReminderPluginInterface {
    scheduleDailyReminder(options: ScheduleDailyOptions): Promise<{ success: boolean; reminderId: number }>;

    scheduleOneTimeReminder(options: {
        title: string;
        body: string;
        dateTime: string; // ISO string
        type: 'medication' | 'exercise' | 'custom';
        reminderId: number;
        wakeScreen?: boolean;
        isAlarm?: boolean;
    }): Promise<{ success: boolean; reminderId: number }>;

    cancelReminder(options: { reminderId: number }): Promise<{ success: boolean }>;

    cancelAllReminders(): Promise<{ success: boolean }>;

    checkPermissions(): Promise<{ canScheduleExactAlarms: boolean }>;

    requestExactAlarmPermission(): Promise<void>;
}

const ReminderPlugin = registerPlugin<ReminderPluginInterface>('ReminderPlugin', {
    web: () => import('./reminder-plugin-web').then(m => new m.ReminderPluginWeb()),
});

export default ReminderPlugin;
