import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO } from 'date-fns';
import { dbHelpers } from '../../services/database';
import { validatePregnancyConfig, getLMPDate, calculatePregnancyStatus } from '../../services/pregnancy-calculator';
import type { PregnancyConfig } from '../../types';
import ReminderSettingsSection from '../../components/ReminderSettings/ReminderSettingsSection';
import { useTheme, type Theme } from '../../context/ThemeContext';
import './SettingsScreen.css';

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

    return (
        <div className="settings-screen">
            <div className="settings-section">
                <h2>Appearance</h2>
                <div className="theme-grid">
                    {['day', 'dark', 'boy', 'girl'].map((t) => (
                        <button
                            key={t}
                            className={`theme-card ${theme === t ? 'active' : ''}`}
                            onClick={() => setTheme(t as Theme)}
                        >
                            <div className={`theme-preview theme-${t}`} />
                            <span className="theme-label">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="settings-section">
                <h2>Pregnancy Configuration</h2>
                <p className="section-description">
                    Set your reference date and pregnancy progress. The app will automatically calculate your current week and day.
                </p>

                <div className="form-group">
                    <label>Reference Date</label>
                    <input
                        type="date"
                        value={formData.referenceDate}
                        onChange={(e) => setFormData({ ...formData, referenceDate: e.target.value })}
                    />
                    <p className="field-help">The date when you knew your pregnancy progress</p>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Weeks at Reference Date</label>
                        <input
                            type="number"
                            min="0"
                            max="42"
                            value={formData.referenceWeeks}
                            onChange={(e) => setFormData({ ...formData, referenceWeeks: parseInt(e.target.value) })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Days at Reference Date</label>
                        <input
                            type="number"
                            min="0"
                            max="6"
                            value={formData.referenceDays}
                            onChange={(e) => setFormData({ ...formData, referenceDays: parseInt(e.target.value) })}
                        />
                    </div>
                </div>

                <p className="example-text">
                    Example: If on December 19, 2024, you were 8 weeks and 2 days pregnant, enter that date and those values.
                </p>

                <div className="button-group">
                    <button className="btn-primary" onClick={handleSave}>
                        Save Settings
                    </button>
                    <button className="btn-danger" onClick={handleReset}>
                        Reset Configuration
                    </button>
                </div>
            </div>

            {/* Reminder Settings */}
            <div className="settings-section">
                <ReminderSettingsSection />
            </div>

            <div className="settings-section">
                <h2>About</h2>
                <div className="info-card">
                    <h3>Pregnancy Tracker</h3>
                    <p>Version 1.0.0</p>
                    <p className="about-text">
                        A private, local-first pregnancy tracking app designed to help you document your journey with complete privacy.
                        All your data is stored locally on your device.
                    </p>
                </div>
            </div>

            <div className="settings-section">
                <h2>Disclaimer</h2>
                <div className="disclaimer-card">
                    <p>
                        ⚠️ This app is for informational purposes only and is not a substitute for professional medical advice,
                        diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with
                        any questions you may have regarding your pregnancy or medical condition.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsScreen;
