import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbHelpers } from '../../services/database';
import ReminderPlugin from '../../plugins/reminder-plugin';
import type { ReminderSettings, CustomReminder } from '../../types';
import {
    Typography,
    Switch,
    TextField,
    Button,
    Card,
    CardContent,
    Box,
    Stack,
    Divider,
    IconButton,
    Checkbox,
    FormControlLabel,
    Chip,
} from '@mui/material';

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

        // Ask for confirmation before deleting
        const confirmed = window.confirm(
            `Are you sure you want to delete the reminder "${reminder?.title}"?\n\nThis action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

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
        <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
                ⏰ Daily Reminders
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                Set up daily reminders to help you stay on track with your pregnancy routine
            </Typography>

            {/* Medication Reminder */}
            <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" gutterBottom>
                                💊 Medication Reminder
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Daily reminder for prenatal vitamins and medications
                            </Typography>
                        </Box>
                        <Switch
                            checked={settings.medicationEnabled}
                            onChange={(e) => handleToggleMedication(e.target.checked)}
                        />
                    </Box>

                    {settings.medicationEnabled && (
                        <Stack spacing={2} sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                            <TextField
                                label="Reminder Time"
                                type="time"
                                value={settings.medicationTime}
                                onChange={(e) => handleTimeChange('medication', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                sx={{ maxWidth: 200 }}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={settings.medicationAlarm}
                                        onChange={(e) => handleAlarmChange('medication', e.target.checked)}
                                    />
                                }
                                label="🔔 Play Alarm Sound"
                            />
                        </Stack>
                    )}
                </CardContent>
            </Card>

            {/* Exercise Reminder */}
            <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" gutterBottom>
                                🏃‍♀️ Exercise Reminder
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Daily reminder for pregnancy-safe exercises
                            </Typography>
                        </Box>
                        <Switch
                            checked={settings.exerciseEnabled}
                            onChange={(e) => handleToggleExercise(e.target.checked)}
                        />
                    </Box>

                    {settings.exerciseEnabled && (
                        <Stack spacing={2} sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                            <TextField
                                label="Reminder Time"
                                type="time"
                                value={settings.exerciseTime}
                                onChange={(e) => handleTimeChange('exercise', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                sx={{ maxWidth: 200 }}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={settings.exerciseAlarm}
                                        onChange={(e) => handleAlarmChange('exercise', e.target.checked)}
                                    />
                                }
                                label="🔔 Play Alarm Sound"
                            />
                        </Stack>
                    )}
                </CardContent>
            </Card>

            {/* Custom Reminders */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                        Custom Reminders
                    </Typography>
                    <Button
                        variant={showAddCustom ? "outlined" : "contained"}
                        size="small"
                        onClick={() => setShowAddCustom(!showAddCustom)}
                        sx={{ textTransform: 'none' }}
                    >
                        {showAddCustom ? 'Cancel' : '+ Add Custom'}
                    </Button>
                </Box>

                {showAddCustom && (
                    <Card variant="outlined" sx={{ mb: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                        <CardContent>
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    placeholder="Reminder title (e.g., Drink water)"
                                    value={newCustomReminder.title}
                                    onChange={(e) => setNewCustomReminder({ ...newCustomReminder, title: e.target.value })}
                                    size="small"
                                />
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <TextField
                                        label="Time"
                                        type="time"
                                        value={newCustomReminder.time}
                                        onChange={(e) => setNewCustomReminder({ ...newCustomReminder, time: e.target.value })}
                                        InputLabelProps={{ shrink: true }}
                                        size="small"
                                        sx={{ maxWidth: 150 }}
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={newCustomReminder.isAlarm}
                                                onChange={(e) => setNewCustomReminder({ ...newCustomReminder, isAlarm: e.target.checked })}
                                                size="small"
                                            />
                                        }
                                        label="🔔 Alarm"
                                    />
                                </Box>
                                <Button
                                    variant="contained"
                                    onClick={handleAddCustomReminder}
                                    sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                                >
                                    Add Reminder
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                )}

                {settings.customReminders.length > 0 && (
                    <Stack spacing={1.5}>
                        {settings.customReminders.map((reminder) => (
                            <Card key={reminder.id} variant="outlined" sx={{ borderRadius: 2 }}>
                                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body1" fontWeight={500}>
                                                {reminder.title}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                                                <Chip
                                                    label={reminder.time}
                                                    size="small"
                                                    sx={{ height: 20, fontSize: '0.75rem' }}
                                                />
                                                {reminder.isAlarm && (
                                                    <Chip
                                                        label="🔔"
                                                        size="small"
                                                        sx={{ height: 20, fontSize: '0.75rem' }}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={reminder.isAlarm || false}
                                                        onChange={(e) => handleCustomAlarmChange(reminder.id, e.target.checked)}
                                                        size="small"
                                                    />
                                                }
                                                label="🔔"
                                                sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: '1rem' } }}
                                            />
                                            <Switch
                                                checked={reminder.enabled}
                                                onChange={(e) => handleToggleCustomReminder(reminder.id, e.target.checked)}
                                                size="small"
                                            />
                                            <IconButton
                                                onClick={() => handleDeleteCustomReminder(reminder.id)}
                                                size="small"
                                                color="error"
                                                title="Delete reminder"
                                            >
                                                🗑️
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                )}

                {settings.customReminders.length === 0 && !showAddCustom && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3, fontStyle: 'italic' }}>
                        No custom reminders yet. Click "+ Add Custom" to create one.
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default ReminderSettingsSection;
