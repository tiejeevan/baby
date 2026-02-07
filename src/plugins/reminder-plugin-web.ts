import { WebPlugin } from '@capacitor/core';
import type { ReminderPluginInterface } from './reminder-plugin';

export class ReminderPluginWeb extends WebPlugin implements ReminderPluginInterface {
    async scheduleDailyReminder(options: {
        title: string;
        body: string;
        time: string;
        type: 'medication' | 'exercise' | 'custom';
        reminderId: number;
        isAlarm?: boolean;
    }): Promise<{ success: boolean; reminderId: number }> {
        console.log('Web: scheduleDailyReminder not implemented', options);
        return { success: false, reminderId: options.reminderId };
    }

    async scheduleOneTimeReminder(options: {
        title: string;
        body: string;
        dateTime: string;
        type: 'medication' | 'exercise' | 'custom';
        reminderId: number;
        wakeScreen?: boolean;
        isAlarm?: boolean;
    }): Promise<{ success: boolean; reminderId: number }> {
        console.log('Web: scheduleOneTimeReminder not implemented', options);
        return { success: false, reminderId: options.reminderId };
    }

    async cancelReminder(options: { reminderId: number }): Promise<{ success: boolean }> {
        console.log('Web: cancelReminder not implemented', options);
        return { success: true };
    }

    async cancelAllReminders(): Promise<{ success: boolean }> {
        console.log('Web: cancelAllReminders not implemented');
        return { success: true };
    }

    async checkPermissions(): Promise<{ canScheduleExactAlarms: boolean }> {
        return { canScheduleExactAlarms: false };
    }

    async requestExactAlarmPermission(): Promise<void> {
        console.log('Web: requestExactAlarmPermission not implemented');
    }
}
