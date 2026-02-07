import { LocalNotifications } from '@capacitor/local-notifications';
import type { Appointment, Medication } from '../types';
import { parseISO, addMinutes, setHours, setMinutes, isBefore } from 'date-fns';

/**
 * Notification service for managing appointment and medication reminders
 */

let notificationIdCounter = 1000;

export const notificationService = {
    /**
     * Initialize notifications and request permissions
     */
    async initialize(): Promise<boolean> {
        try {
            const permission = await LocalNotifications.requestPermissions();
            return permission.display === 'granted';
        } catch (error) {
            console.error('Failed to request notification permissions:', error);
            return false;
        }
    },

    /**
     * Schedule appointment reminder
     */
    async scheduleAppointmentReminder(appointment: Appointment): Promise<number | null> {
        if (!appointment.reminderEnabled) return null;

        try {
            const appointmentDateTime = parseISO(`${appointment.date}T${appointment.time}`);
            const reminderTime = addMinutes(appointmentDateTime, -appointment.reminderMinutes);

            // Don't schedule if reminder time is in the past
            if (isBefore(reminderTime, new Date())) {
                return null;
            }

            const notificationId = notificationIdCounter++;

            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: notificationId,
                        title: 'Appointment Reminder',
                        body: `${appointment.title} in ${appointment.reminderMinutes} minutes`,
                        schedule: {
                            at: reminderTime,
                        },
                        extra: {
                            type: 'appointment',
                            appointmentId: appointment.id,
                        },
                    },
                ],
            });

            return notificationId;
        } catch (error) {
            console.error('Failed to schedule appointment reminder:', error);
            return null;
        }
    },

    /**
     * Schedule medication reminders (can be multiple per day)
     */
    async scheduleMedicationReminders(medication: Medication): Promise<number[]> {
        if (!medication.reminderEnabled) return [];

        try {
            const notificationIds: number[] = [];
            const times = this.getMedicationTimes(medication);

            const today = new Date();
            const startDate = parseISO(medication.startDate);
            const endDate = medication.endDate ? parseISO(medication.endDate) : null;

            for (const time of times) {
                const [hours, minutes] = time.split(':').map(Number);

                // Schedule for today if not past
                let scheduleDate = setMinutes(setHours(today, hours), minutes);

                if (isBefore(scheduleDate, today)) {
                    // If time has passed today, schedule for tomorrow
                    scheduleDate = new Date(scheduleDate.getTime() + 24 * 60 * 60 * 1000);
                }

                // Check if within medication date range
                if (isBefore(scheduleDate, startDate) || (endDate && isBefore(endDate, scheduleDate))) {
                    continue;
                }

                const notificationId = notificationIdCounter++;
                notificationIds.push(notificationId);

                await LocalNotifications.schedule({
                    notifications: [
                        {
                            id: notificationId,
                            title: 'Medication Reminder',
                            body: `Time to take ${medication.name} (${medication.dosage})`,
                            schedule: {
                                at: scheduleDate,
                                every: 'day', // Repeat daily
                            },
                            extra: {
                                type: 'medication',
                                medicationId: medication.id,
                            },
                        },
                    ],
                });
            }

            return notificationIds;
        } catch (error) {
            console.error('Failed to schedule medication reminders:', error);
            return [];
        }
    },

    /**
     * Cancel notification by ID
     */
    async cancelNotification(notificationId: number): Promise<void> {
        try {
            await LocalNotifications.cancel({
                notifications: [{ id: notificationId }],
            });
        } catch (error) {
            console.error('Failed to cancel notification:', error);
        }
    },

    /**
     * Cancel multiple notifications
     */
    async cancelNotifications(notificationIds: number[]): Promise<void> {
        try {
            await LocalNotifications.cancel({
                notifications: notificationIds.map(id => ({ id })),
            });
        } catch (error) {
            console.error('Failed to cancel notifications:', error);
        }
    },

    /**
     * Get medication times based on frequency
     */
    getMedicationTimes(medication: Medication): string[] {
        if (medication.customSchedule && medication.customSchedule.length > 0) {
            return medication.customSchedule;
        }

        switch (medication.frequency) {
            case 'daily':
                return ['09:00'];
            case 'twice_daily':
                return ['09:00', '21:00'];
            case 'three_times_daily':
                return ['08:00', '14:00', '20:00'];
            case 'as_needed':
                return [];
            default:
                return ['09:00'];
        }
    },

    /**
     * Reschedule appointment reminder (cancel old, schedule new)
     */
    async rescheduleAppointmentReminder(
        oldNotificationId: number | undefined,
        appointment: Appointment
    ): Promise<number | null> {
        if (oldNotificationId) {
            await this.cancelNotification(oldNotificationId);
        }
        return await this.scheduleAppointmentReminder(appointment);
    },

    /**
     * Reschedule medication reminders (cancel old, schedule new)
     */
    async rescheduleMedicationReminders(
        oldNotificationIds: number[],
        medication: Medication
    ): Promise<number[]> {
        if (oldNotificationIds.length > 0) {
            await this.cancelNotifications(oldNotificationIds);
        }
        return await this.scheduleMedicationReminders(medication);
    },

    /**
     * Schedule daily reminder (for medication, exercise, or custom reminders)
     */
    async scheduleDailyReminder(
        title: string,
        body: string,
        time: string, // HH:mm format
        type: 'medication' | 'exercise' | 'custom',
        extraData?: Record<string, unknown>
    ): Promise<number | null> {
        try {
            const [hours, minutes] = time.split(':').map(Number);
            const today = new Date();
            let scheduleDate = setMinutes(setHours(today, hours), minutes);

            // If time has passed today, schedule for tomorrow
            if (isBefore(scheduleDate, today)) {
                scheduleDate = new Date(scheduleDate.getTime() + 24 * 60 * 60 * 1000);
            }

            const notificationId = notificationIdCounter++;

            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: notificationId,
                        title,
                        body,
                        schedule: {
                            at: scheduleDate,
                            every: 'day', // Repeat daily
                        },
                        extra: {
                            type,
                            ...extraData,
                        },
                        actionTypeId: 'REMINDER_ACTION',
                        // Android-specific settings
                        sound: undefined, // Use default sound
                        smallIcon: 'ic_stat_icon_config_sample',
                        largeIcon: undefined,
                        channelId: 'pregnancy-reminders',
                    },
                ],
            });

            return notificationId;
        } catch (error) {
            console.error('Failed to schedule daily reminder:', error);
            return null;
        }
    },

    /**
     * Schedule a specific date calendar reminder
     */
    async scheduleCalendarReminder(
        date: string, // YYYY-MM-DD
        reminder: { time: string; title: string; note?: string; enabled: boolean; type: 'notification' | 'alarm'; id: string }
    ): Promise<number | null> {
        if (!reminder.enabled) return null;

        try {
            // Check if reminder time is in the past
            const reminderDate = parseISO(`${date}T${reminder.time}`);
            if (isBefore(reminderDate, new Date())) {
                return null;
            }

            const notificationId = Math.floor(Date.now() + Math.random() * 10000); // Generate unique ID

            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: notificationId,
                        title: reminder.title || 'Reminder',
                        body: reminder.note || 'You have a reminder',
                        schedule: {
                            at: reminderDate,
                            allowWhileIdle: true,
                        },
                        sound: reminder.type === 'alarm' ? 'alarm.wav' : undefined,
                        extra: {
                            type: 'calendar_reminder',
                            reminderId: reminder.id,
                            dateStr: date,
                        },
                    },
                ],
            });

            return notificationId;
        } catch (error) {
            console.error('Failed to schedule calendar reminder:', error);
            return null;
        }
    },

    /**
     * Create notification channel for Android (call on app init)
     */
    async createNotificationChannel(): Promise<void> {
        try {
            await LocalNotifications.createChannel({
                id: 'pregnancy-reminders',
                name: 'Pregnancy Reminders',
                description: 'Daily reminders for medication, exercise, and custom alerts',
                importance: 4, // High importance
                sound: 'default',
                vibration: true,
                visibility: 1, // Public
            });
        } catch (error) {
            console.error('Failed to create notification channel:', error);
        }
    },

    /**
     * Register notification action types (for snooze/dismiss)
     */
    async registerActionTypes(): Promise<void> {
        try {
            await LocalNotifications.registerActionTypes({
                types: [
                    {
                        id: 'REMINDER_ACTION',
                        actions: [
                            {
                                id: 'snooze',
                                title: 'Snooze 10 min',
                            },
                            {
                                id: 'dismiss',
                                title: 'Dismiss',
                                destructive: true,
                            },
                        ],
                    },
                ],
            });

            // Listen for action performed
            await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
                console.log('Notification action performed:', notification);

                if (notification.actionId === 'snooze') {
                    // Reschedule for 10 minutes later
                    const snoozeTime = new Date(Date.now() + 10 * 60 * 1000);
                    LocalNotifications.schedule({
                        notifications: [
                            {
                                ...notification.notification,
                                id: notificationIdCounter++,
                                schedule: { at: snoozeTime },
                            },
                        ],
                    });
                }
                // Dismiss action does nothing (notification is auto-removed)
            });
        } catch (error) {
            console.error('Failed to register action types:', error);
        }
    },
};
