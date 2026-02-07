import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbHelpers } from '../../services/database';
import ReminderPlugin from '../../plugins/reminder-plugin';
import type { ReminderSettings, CustomReminder } from '../../types';
import './ReminderSettingsSection.css';

const ReminderSettingsSection: React.FC = () => {
    const savedSettings = useLiveQuery(() => dbHelpers.getReminderSettings());

    const [settings, setSettings] = useState<Omit<ReminderSettings, 'id' | 'createdAt' | 'updatedAt'>>({
        medicationEnabled: false,
        medicationTime: '09:00',
        medicationAlarm: false,
        exerciseEnabled: false,
        exerciseTime: '18:00',
        exerciseAlarm: false,
        customReminders: [],
    });

    const [showAddCustom, setShowAddCustom] = useState(false);
    const [newCustomReminder, setNewCustomReminder] = useState({
        title: '',
        time: '12:00',
        isAlarm: false,
    });

    useEffect(() => {
        if (savedSettings) {
            setSettings({
                medicationEnabled: savedSettings.medicationEnabled,
                medicationTime: savedSettings.medicationTime,
                medicationAlarm: savedSettings.medicationAlarm || false,
                medicationNotificationId: savedSettings.medicationNotificationId,
                exerciseEnabled: savedSettings.exerciseEnabled,
                exerciseTime: savedSettings.exerciseTime,
                exerciseAlarm: savedSettings.exerciseAlarm || false,
                exerciseNotificationId: savedSettings.exerciseNotificationId,
                customReminders: savedSettings.customReminders || [],
            });
        }
    }, [savedSettings]);

    const handleToggleMedication = async (enabled: boolean) => {
        const newSettings = { ...settings, medicationEnabled: enabled };
        setSettings(newSettings);

        if (enabled) {
            // Schedule notification using native plugin
            try {
                const result = await ReminderPlugin.scheduleDailyReminder({
                    title: 'Medication Reminder',
                    body: 'Time to take your prenatal vitamins and medications',
                    time: settings.medicationTime,
                    type: 'medication',
                    reminderId: 1001, // Fixed ID for medication reminder
                    isAlarm: settings.medicationAlarm,
                });

                if (result.success) {
                    newSettings.medicationNotificationId = result.reminderId;
                }
            } catch (error) {
                console.error('Failed to schedule medication reminder:', error);
            }
        } else {
            // Cancel notification
            if (savedSettings?.medicationNotificationId) {
                try {
                    await ReminderPlugin.cancelReminder({ reminderId: savedSettings.medicationNotificationId });
                } catch (error) {
                    console.error('Failed to cancel medication reminder:', error);
                }
            }
        }

        await saveSettings(newSettings);
    };

    const handleToggleExercise = async (enabled: boolean) => {
        const newSettings = { ...settings, exerciseEnabled: enabled };
        setSettings(newSettings);

        if (enabled) {
            // Schedule notification using native plugin
            try {
                const result = await ReminderPlugin.scheduleDailyReminder({
                    title: 'Exercise Reminder',
                    body: 'Time for your daily pregnancy exercise routine',
                    time: settings.exerciseTime,
                    type: 'exercise',
                    reminderId: 1002, // Fixed ID for exercise reminder
                    isAlarm: settings.exerciseAlarm,
                });

                if (result.success) {
                    newSettings.exerciseNotificationId = result.reminderId;
                }
            } catch (error) {
                console.error('Failed to schedule exercise reminder:', error);
            }
        } else {
            // Cancel notification
            if (savedSettings?.exerciseNotificationId) {
                try {
                    await ReminderPlugin.cancelReminder({ reminderId: savedSettings.exerciseNotificationId });
                } catch (error) {
                    console.error('Failed to cancel exercise reminder:', error);
                }
            }
        }

        await saveSettings(newSettings);
    };

    const handleTimeChange = async (type: 'medication' | 'exercise', time: string) => {
        const newSettings = { ...settings };

        if (type === 'medication') {
            newSettings.medicationTime = time;

            // Reschedule if enabled
            if (settings.medicationEnabled) {
                try {
                    if (savedSettings?.medicationNotificationId) {
                        await ReminderPlugin.cancelReminder({ reminderId: savedSettings.medicationNotificationId });
                    }

                    const result = await ReminderPlugin.scheduleDailyReminder({
                        title: 'Medication Reminder',
                        body: 'Time to take your prenatal vitamins and medications',
                        time,
                        type: 'medication',
                        reminderId: 1001,
                        isAlarm: settings.medicationAlarm,
                    });

                    if (result.success) {
                        newSettings.medicationNotificationId = result.reminderId;
                    }
                } catch (error) {
                    console.error('Failed to reschedule medication reminder:', error);
                }
            }
        } else {
            newSettings.exerciseTime = time;

            // Reschedule if enabled
            if (settings.exerciseEnabled) {
                try {
                    if (savedSettings?.exerciseNotificationId) {
                        await ReminderPlugin.cancelReminder({ reminderId: savedSettings.exerciseNotificationId });
                    }

                    const result = await ReminderPlugin.scheduleDailyReminder({
                        title: 'Exercise Reminder',
                        body: 'Time for your daily pregnancy exercise routine',
                        time,
                        type: 'exercise',
                        reminderId: 1002,
                        isAlarm: settings.exerciseAlarm,
                    });

                    if (result.success) {
                        newSettings.exerciseNotificationId = result.reminderId;
                    }
                } catch (error) {
                    console.error('Failed to reschedule exercise reminder:', error);
                }
            }
        }

        setSettings(newSettings);
        await saveSettings(newSettings);
    };

    const handleAlarmChange = async (type: 'medication' | 'exercise', isAlarm: boolean) => {
        const newSettings = { ...settings };

        if (type === 'medication') {
            newSettings.medicationAlarm = isAlarm;

            // Reschedule if enabled
            if (settings.medicationEnabled) {
                try {
                    if (savedSettings?.medicationNotificationId) {
                        await ReminderPlugin.cancelReminder({ reminderId: savedSettings.medicationNotificationId });
                    }

                    const result = await ReminderPlugin.scheduleDailyReminder({
                        title: 'Medication Reminder',
                        body: 'Time to take your prenatal vitamins and medications',
                        time: settings.medicationTime,
                        type: 'medication',
                        reminderId: 1001,
                        isAlarm: isAlarm,
                    });

                    if (result.success) {
                        newSettings.medicationNotificationId = result.reminderId;
                    }
                } catch (error) {
                    console.error('Failed to reschedule medication reminder:', error);
                }
            }
        } else {
            newSettings.exerciseAlarm = isAlarm;

            // Reschedule if enabled
            if (settings.exerciseEnabled) {
                try {
                    if (savedSettings?.exerciseNotificationId) {
                        await ReminderPlugin.cancelReminder({ reminderId: savedSettings.exerciseNotificationId });
                    }

                    const result = await ReminderPlugin.scheduleDailyReminder({
                        title: 'Exercise Reminder',
                        body: 'Time for your daily pregnancy exercise routine',
                        time: settings.exerciseTime,
                        type: 'exercise',
                        reminderId: 1002,
                        isAlarm: isAlarm,
                    });

                    if (result.success) {
                        newSettings.exerciseNotificationId = result.reminderId;
                    }
                } catch (error) {
                    console.error('Failed to reschedule exercise reminder:', error);
                }
            }
        }

        setSettings(newSettings);
        await saveSettings(newSettings);
    };

    const handleAddCustomReminder = async () => {
        if (!newCustomReminder.title.trim()) {
            alert('Please enter a reminder title');
            return;
        }

        const reminderId = Date.now(); // Use timestamp as unique ID
        const customReminder: CustomReminder = {
            id: reminderId.toString(),
            title: newCustomReminder.title,
            time: newCustomReminder.time,
            enabled: true,
            repeatDaily: true,
            isAlarm: newCustomReminder.isAlarm,
        };

        // Schedule notification using native plugin
        try {
            const result = await ReminderPlugin.scheduleDailyReminder({
                title: 'Custom Reminder',
                body: customReminder.title,
                time: customReminder.time,
                type: 'custom',
                reminderId: reminderId,
                isAlarm: customReminder.isAlarm,
            });

            if (result.success) {
                customReminder.notificationId = result.reminderId;
            }
        } catch (error) {
            console.error('Failed to schedule custom reminder:', error);
        }

        const newSettings = {
            ...settings,
            customReminders: [...settings.customReminders, customReminder],
        };

        setSettings(newSettings);
        await saveSettings(newSettings);

        // Reset form
        setNewCustomReminder({ title: '', time: '12:00', isAlarm: false });
        setShowAddCustom(false);
    };

    const handleToggleCustomReminder = async (reminderId: string, enabled: boolean) => {
        const updatedReminders = settings.customReminders.map(r => {
            if (r.id === reminderId) {
                return { ...r, enabled };
            }
            return r;
        });

        const reminder = updatedReminders.find(r => r.id === reminderId);

        if (reminder) {
            if (enabled) {
                // Schedule notification
                try {
                    const result = await ReminderPlugin.scheduleDailyReminder({
                        title: 'Custom Reminder',
                        body: reminder.title,
                        time: reminder.time,
                        type: 'custom',
                        reminderId: parseInt(reminder.id),
                        isAlarm: reminder.isAlarm,
                    });

                    if (result.success) {
                        reminder.notificationId = result.reminderId;
                    }
                } catch (error) {
                    console.error('Failed to schedule custom reminder:', error);
                }
            } else {
                // Cancel notification
                if (reminder.notificationId) {
                    try {
                        await ReminderPlugin.cancelReminder({ reminderId: reminder.notificationId });
                    } catch (error) {
                        console.error('Failed to cancel custom reminder:', error);
                    }
                }
            }
        }

        const newSettings = { ...settings, customReminders: updatedReminders };
        setSettings(newSettings);
        await saveSettings(newSettings);
    };

    const handleCustomAlarmChange = async (reminderId: string, isAlarm: boolean) => {
        let reminderToUpdate = settings.customReminders.find(r => r.id === reminderId);

        if (!reminderToUpdate) return;

        // Create updated reminder object first
        const updatedReminder = { ...reminderToUpdate, isAlarm };

        if (updatedReminder.enabled) {
            // Reschedule
            try {
                if (updatedReminder.notificationId) {
                    await ReminderPlugin.cancelReminder({ reminderId: updatedReminder.notificationId });
                }

                const result = await ReminderPlugin.scheduleDailyReminder({
                    title: 'Custom Reminder',
                    body: updatedReminder.title,
                    time: updatedReminder.time,
                    type: 'custom',
                    reminderId: parseInt(updatedReminder.id),
                    isAlarm: isAlarm,
                });

                if (result.success) {
                    updatedReminder.notificationId = result.reminderId;
                }
            } catch (error) {
                console.error('Failed to reschedule custom reminder alarm:', error);
            }
        }

        const updatedReminders = settings.customReminders.map(r =>
            r.id === reminderId ? updatedReminder : r
        );

        const newSettings = { ...settings, customReminders: updatedReminders };
        setSettings(newSettings);
        await saveSettings(newSettings);
    };

    const handleDeleteCustomReminder = async (reminderId: string) => {
        const reminder = settings.customReminders.find(r => r.id === reminderId);

        if (reminder?.notificationId) {
            try {
                await ReminderPlugin.cancelReminder({ reminderId: reminder.notificationId });
            } catch (error) {
                console.error('Failed to cancel custom reminder:', error);
            }
        }

        const newSettings = {
            ...settings,
            customReminders: settings.customReminders.filter(r => r.id !== reminderId),
        };

        setSettings(newSettings);
        await saveSettings(newSettings);
    };

    const saveSettings = async (newSettings: Omit<ReminderSettings, 'id' | 'createdAt' | 'updatedAt'>) => {
        await dbHelpers.saveReminderSettings({
            ...newSettings,
            createdAt: savedSettings?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    };

    return (
        <div className="reminder-settings-section">
            <h2>Daily Reminders</h2>
            <p className="section-description">
                Set up daily reminders to help you stay on track with your pregnancy routine
            </p>

            {/* Medication Reminder */}
            <div className="reminder-item">
                <div className="reminder-header">
                    <div className="reminder-info">
                        <h3>💊 Medication Reminder</h3>
                        <p>Daily reminder for prenatal vitamins and medications</p>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={settings.medicationEnabled}
                            onChange={(e) => handleToggleMedication(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
                {settings.medicationEnabled && (
                    <div className="reminder-details">
                        <div className="reminder-time">
                            <label>Reminder Time:</label>
                            <input
                                type="time"
                                value={settings.medicationTime}
                                onChange={(e) => handleTimeChange('medication', e.target.value)}
                            />
                        </div>
                        <label className="alarm-checkbox">
                            <input
                                type="checkbox"
                                checked={settings.medicationAlarm}
                                onChange={(e) => handleAlarmChange('medication', e.target.checked)}
                            />
                            <span>🔔 Play Alarm Sound</span>
                        </label>
                    </div>
                )}
            </div>

            {/* Exercise Reminder */}
            <div className="reminder-item">
                <div className="reminder-header">
                    <div className="reminder-info">
                        <h3>🏃‍♀️ Exercise Reminder</h3>
                        <p>Daily reminder for pregnancy-safe exercises</p>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={settings.exerciseEnabled}
                            onChange={(e) => handleToggleExercise(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
                {settings.exerciseEnabled && (
                    <div className="reminder-details">
                        <div className="reminder-time">
                            <label>Reminder Time:</label>
                            <input
                                type="time"
                                value={settings.exerciseTime}
                                onChange={(e) => handleTimeChange('exercise', e.target.value)}
                            />
                        </div>
                        <label className="alarm-checkbox">
                            <input
                                type="checkbox"
                                checked={settings.exerciseAlarm}
                                onChange={(e) => handleAlarmChange('exercise', e.target.checked)}
                            />
                            <span>🔔 Play Alarm Sound</span>
                        </label>
                    </div>
                )}
            </div>

            {/* Custom Reminders */}
            <div className="custom-reminders-section">
                <div className="custom-reminders-header">
                    <h3>Custom Reminders</h3>
                    <button className="btn-secondary btn-small" onClick={() => setShowAddCustom(!showAddCustom)}>
                        {showAddCustom ? 'Cancel' : '+ Add Custom'}
                    </button>
                </div>

                {showAddCustom && (
                    <div className="add-custom-reminder">
                        <input
                            type="text"
                            placeholder="Reminder title (e.g., Drink water)"
                            value={newCustomReminder.title}
                            onChange={(e) => setNewCustomReminder({ ...newCustomReminder, title: e.target.value })}
                            className="custom-reminder-input"
                        />
                        <div className="custom-reminder-options">
                            <input
                                type="time"
                                value={newCustomReminder.time}
                                onChange={(e) => setNewCustomReminder({ ...newCustomReminder, time: e.target.value })}
                            />
                            <label className="alarm-checkbox-small">
                                <input
                                    type="checkbox"
                                    checked={newCustomReminder.isAlarm}
                                    onChange={(e) => setNewCustomReminder({ ...newCustomReminder, isAlarm: e.target.checked })}
                                />
                                <span>🔔 Alarm</span>
                            </label>
                        </div>
                        <button className="btn-primary btn-small" onClick={handleAddCustomReminder}>
                            Add Reminder
                        </button>
                    </div>
                )}

                {settings.customReminders.length > 0 && (
                    <div className="custom-reminders-list">
                        {settings.customReminders.map((reminder) => (
                            <div key={reminder.id} className="custom-reminder-item">
                                <div className="custom-reminder-content">
                                    <span className="custom-reminder-title">{reminder.title}</span>
                                    <div className="custom-reminder-meta">
                                        <span className="custom-reminder-time">{reminder.time}</span>
                                        {reminder.isAlarm && <span className="alarm-badge">🔔</span>}
                                    </div>
                                </div>
                                <div className="custom-reminder-actions">
                                    <label className="alarm-checkbox-tiny" title="Toggle Alarm Sound">
                                        <input
                                            type="checkbox"
                                            checked={reminder.isAlarm || false}
                                            onChange={(e) => handleCustomAlarmChange(reminder.id, e.target.checked)}
                                        />
                                        <span>🔔</span>
                                    </label>
                                    <label className="toggle-switch toggle-switch-small">
                                        <input
                                            type="checkbox"
                                            checked={reminder.enabled}
                                            onChange={(e) => handleToggleCustomReminder(reminder.id, e.target.checked)}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <button
                                        className="btn-icon-delete"
                                        onClick={() => handleDeleteCustomReminder(reminder.id)}
                                        title="Delete reminder"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {settings.customReminders.length === 0 && !showAddCustom && (
                    <p className="empty-state">No custom reminders yet. Click "+ Add Custom" to create one.</p>
                )}
            </div>
        </div>
    );
};

export default ReminderSettingsSection;
