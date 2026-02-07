import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbHelpers } from '../../services/database';
import { calculatePregnancyStatus, getTrimester, getDaysUntilDue } from '../../services/pregnancy-calculator';
import type { CurrentPregnancyStatus } from '../../types';
import './HomeScreen.css';

const HomeScreen: React.FC = () => {
    const [status, setStatus] = useState<CurrentPregnancyStatus | null>(null);

    const config = useLiveQuery(() => dbHelpers.getPregnancyConfig());
    const upcomingAppointments = useLiveQuery(() => dbHelpers.getUpcomingAppointments(3));

    useEffect(() => {
        if (config) {
            // Force current date to ensure we're using device time
            const now = new Date();
            console.log('Current date:', now.toISOString());
            console.log('Config:', config);

            const currentStatus = calculatePregnancyStatus(config, now);
            console.log('Calculated status:', currentStatus);

            setStatus(currentStatus);
        }
    }, [config]);

    if (!config || !status) {
        return (
            <div className="home-screen">
                <div className="welcome-card">
                    <h1>Welcome to Your Pregnancy Journey</h1>
                    <p>Setting up your tracker...</p>
                </div>
            </div>
        );
    }

    const trimester = getTrimester(status.weeks);
    const daysUntilDue = getDaysUntilDue(status.dueDate);

    return (
        <div className="home-screen">
            <div className="hero-section">
                <div className="week-display">
                    <div className="week-number">
                        <span className="weeks">{status.weeks}</span>
                        <span className="label">weeks</span>
                    </div>
                    <div className="day-number">
                        <span className="days">{status.days}</span>
                        <span className="label">days</span>
                    </div>
                </div>

                <div className="progress-container">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${status.percentComplete}%` }}
                        />
                    </div>
                    <p className="progress-text">{status.percentComplete.toFixed(1)}% complete</p>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{trimester}</div>
                        <div className="stat-label">Trimester</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{daysUntilDue}</div>
                        <div className="stat-label">Days Until Due</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{new Date(status.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div className="stat-label">Due Date</div>
                    </div>
                </div>
            </div>

            {upcomingAppointments && upcomingAppointments.length > 0 && (
                <div className="section">
                    <h2>Upcoming Appointments</h2>
                    <div className="appointments-list">
                        {upcomingAppointments.map((appointment) => (
                            <div key={appointment.id} className="appointment-card">
                                <div className="appointment-icon">📅</div>
                                <div className="appointment-details">
                                    <h3>{appointment.title}</h3>
                                    <p className="appointment-datetime">
                                        {new Date(appointment.date).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })} at {appointment.time}
                                    </p>
                                    {appointment.location && (
                                        <p className="appointment-location">📍 {appointment.location}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="section week-info">
                <h2>Week {status.weeks} Highlights</h2>
                <div className="info-card">
                    <p className="info-text">
                        Your baby is growing rapidly! This is an exciting time in your pregnancy journey.
                    </p>
                    <p className="info-tip">
                        💡 <strong>Tip:</strong> Stay hydrated and get plenty of rest.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HomeScreen;
