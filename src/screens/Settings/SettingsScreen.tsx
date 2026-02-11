import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { dbHelpers } from '../../services/database';
import { validatePregnancyConfig, getLMPDate, calculatePregnancyStatus } from '../../services/pregnancy-calculator';
import type { PregnancyConfig } from '../../types';
import ReminderSettingsSection from '../../components/ReminderSettings/ReminderSettingsSection';
import OcrSettingsSection from '../../components/OcrSettings/OcrSettingsSection';
import { useTheme, type Theme } from '../../context/ThemeContext';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    Box,
    Alert,
    Divider,
    Stack,
} from '@mui/material';

const SettingsScreen: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const config = useLiveQuery(() => dbHelpers.getPregnancyConfig());
    const [formData, setFormData] = useState({
        referenceDate: '',
        referenceWeeks: 8,
        referenceDays: 2,
    });

    useEffect(() => {
        if (config) {
            setFormData({
                referenceDate: config.referenceDate,
                referenceWeeks: config.referenceWeeks,
                referenceDays: config.referenceDays,
            });
        }
    }, [config]);

    const handleSave = async () => {
        // Validate configuration
        const validationError = validatePregnancyConfig(formData);
        if (validationError) {
            alert(`Invalid configuration: ${validationError}`);
            return;
        }

        const configData: Omit<PregnancyConfig, 'id'> = {
            ...formData,
            createdAt: config?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await dbHelpers.savePregnancyConfig(configData);

        // Show calculated LMP for verification
        const now = new Date();
        const lmpDate = getLMPDate(configData);
        const status = calculatePregnancyStatus(configData, now);

        console.log('Settings saved:', {
            config: configData,
            currentDate: now.toISOString(),
            lmpDate: lmpDate.toISOString(),
            calculatedStatus: status
        });

        alert(
            `Settings saved successfully!\n\n` +
            `Today: ${format(now, 'MMM dd, yyyy')}\n` +
            `Calculated LMP: ${format(lmpDate, 'MMM dd, yyyy')}\n` +
            `Current progress: ${status.weeks}w ${status.days}d\n` +
            `Due date: ${format(parseISO(status.dueDate), 'MMM dd, yyyy')}\n` +
            `Completion: ${status.percentComplete}%`
        );
    };

    const handleReset = async () => {
        const confirmed = window.confirm(
            '⚠️ Reset Configuration\n\n' +
            'This will erase all your pregnancy reference data and you will need to set it up again.\n\n' +
            'Your milestones, calendar entries, and other data will NOT be deleted.\n\n' +
            'Are you sure you want to continue?'
        );

        if (confirmed) {
            await dbHelpers.deletePregnancyConfig();
            window.location.reload();
        }
    };

    const themeOptions = [
        { value: 'day', label: 'Day', gradient: 'linear-gradient(135deg, #fafaf9 0%, #ffffff 100%)' },
        { value: 'dark', label: 'Dark', gradient: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' },
        { value: 'boy', label: 'Boy', gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' },
        { value: 'girl', label: 'Girl', gradient: 'linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%)' },
    ];

    return (
        <Container maxWidth="md" sx={{ py: 3, pb: 10 }}>
            {/* Appearance Section */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                    🎨 Appearance
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                    {themeOptions.map((option) => (
                        <Box key={option.value}>
                            <Card
                                onClick={() => setTheme(option.value as Theme)}
                                sx={{
                                    cursor: 'pointer',
                                    border: 2,
                                    borderColor: theme === option.value ? 'primary.main' : 'transparent',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 4,
                                    },
                                }}
                            >
                                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                                    <Box
                                        sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: '50%',
                                            background: option.gradient,
                                            margin: '0 auto 12px',
                                            border: '1px solid rgba(0,0,0,0.1)',
                                        }}
                                    />
                                    <Typography variant="body2" fontWeight={600}>
                                        {option.label}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Box>
                    ))}
                </Box>
            </Paper>

            {/* Pregnancy Configuration Section */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                    🤰 Pregnancy Configuration
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                    Set your reference date and pregnancy progress. The app will automatically calculate your current week and day.
                </Typography>

                <Stack spacing={3}>
                    <Box>
                        <TextField
                            fullWidth
                            label="Reference Date"
                            type="date"
                            value={formData.referenceDate}
                            onChange={(e) => setFormData({ ...formData, referenceDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            helperText="The date when you knew your pregnancy progress"
                        />
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Weeks at Reference Date"
                            type="number"
                            inputProps={{ min: 0, max: 42 }}
                            value={formData.referenceWeeks}
                            onChange={(e) => setFormData({ ...formData, referenceWeeks: parseInt(e.target.value) })}
                        />
                        <TextField
                            fullWidth
                            label="Days at Reference Date"
                            type="number"
                            inputProps={{ min: 0, max: 6 }}
                            value={formData.referenceDays}
                            onChange={(e) => setFormData({ ...formData, referenceDays: parseInt(e.target.value) })}
                        />
                    </Box>

                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                        <Typography variant="body2">
                            <strong>Example:</strong> If on December 19, 2024, you were 8 weeks and 2 days pregnant, enter that date and those values.
                        </Typography>
                    </Alert>

                    <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleSave}
                            sx={{
                                flex: 1,
                                minWidth: 150,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                            }}
                        >
                            Save Settings
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            size="large"
                            onClick={handleReset}
                            sx={{
                                flex: 1,
                                minWidth: 150,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                            }}
                        >
                            Reset Configuration
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {/* Reminder Settings */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                <ReminderSettingsSection />
            </Paper>

            {/* OCR Scanner */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                <OcrSettingsSection />
            </Paper>

            {/* About Section */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                    ℹ️ About
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Card variant="outlined" sx={{ bgcolor: 'background.default', borderRadius: 2 }}>
                    <CardContent>
                        <Typography variant="h6" color="primary" gutterBottom>
                            Pregnancy Tracker
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Version 1.0.0
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mt: 1 }}>
                            A private, local-first pregnancy tracking app designed to help you document your journey with complete privacy.
                            All your data is stored locally on your device.
                        </Typography>
                    </CardContent>
                </Card>
            </Paper>


        </Container>
    );
};

export default SettingsScreen;
