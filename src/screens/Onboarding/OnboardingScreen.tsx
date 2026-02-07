import React, { useState } from 'react';
import { dbHelpers } from '../../services/database';
import './OnboardingScreen.css';

interface OnboardingScreenProps {
    onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
    const [formData, setFormData] = useState({
        referenceDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        referenceWeeks: 0,
        referenceDays: 0,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        await dbHelpers.savePregnancyConfig({
            ...formData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        onComplete();
    };

    return (
        <div className="onboarding-screen">
            <div className="onboarding-container">
                <div className="onboarding-header">
                    <h1>Welcome to Your Pregnancy Journey</h1>
                    <p>Let's set up your tracker with your current pregnancy progress</p>
                </div>

                <form onSubmit={handleSubmit} className="onboarding-form">
                    <div className="form-group">
                        <label>Reference Date</label>
                        <input
                            type="date"
                            value={formData.referenceDate}
                            onChange={(e) => setFormData({ ...formData, referenceDate: e.target.value })}
                            required
                        />
                        <p className="field-help">
                            Choose a date when you knew your exact pregnancy progress
                        </p>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Weeks</label>
                            <input
                                type="number"
                                min="0"
                                max="42"
                                value={formData.referenceWeeks}
                                onChange={(e) => setFormData({ ...formData, referenceWeeks: parseInt(e.target.value) })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Days</label>
                            <input
                                type="number"
                                min="0"
                                max="6"
                                value={formData.referenceDays}
                                onChange={(e) => setFormData({ ...formData, referenceDays: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                    </div>

                    <div className="example-box">
                        <p>
                            <strong>Example:</strong> If on December 19, 2025, you were 8 weeks and 2 days pregnant,
                            enter that date and those values. The app will automatically calculate your current progress.
                        </p>
                    </div>

                    <button type="submit" className="btn-primary btn-large">
                        Start Tracking
                    </button>
                </form>

            </div>
        </div>
    );
};

export default OnboardingScreen;
