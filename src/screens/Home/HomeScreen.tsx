import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import { dbHelpers } from '../../services/database';
import { useNavigate } from 'react-router-dom';
import { calculatePregnancyStatus, getTrimester, getDaysUntilDue, getLMPDate } from '../../services/pregnancy-calculator';
import type { CurrentPregnancyStatus } from '../../types';
import pregnancyPlan from '../../data/pregnancy_plan.json';
import { addDays } from 'date-fns';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Button,
    IconButton,
    Box,
    Typography,
    Card,
    CardContent,
    Chip,
} from '@mui/material';
import './HomeScreen.css';
import NamePromptDialog from '../../components/NamePromptDialog';

const HomeScreen: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<CurrentPregnancyStatus | null>(null);
    const [isPlanOpen, setIsPlanOpen] = useState(false);
    const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);

    const config = useLiveQuery(() => dbHelpers.getPregnancyConfig());
    const upcomingAppointments = useLiveQuery(() => dbHelpers.getUpcomingAppointments(3));

    useEffect(() => {
        if (config) {
            // Force current date to ensure we're using device time
            const now = new Date();
            // console.log('Current date:', now.toISOString());

            const currentStatus = calculatePregnancyStatus(config, now);
            setStatus(currentStatus);

            // Check if name is missing
            if (!config.firstName) {
                setIsNameDialogOpen(true);
            }
        }
    }, [config]);

    const handleSaveName = async (firstName: string, lastName: string) => {
        if (config) {
            await dbHelpers.savePregnancyConfig({
                ...config,
                firstName,
                lastName
            });
            setIsNameDialogOpen(false);
        }
    };

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

    // Get dynamic greeting based on time of day
    // Get dynamic greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            return {
                text: 'Good Morning',
                icon: <Sunrise size={28} color="#FFD700" strokeWidth={1.5} />,
                gradient: 'linear-gradient(135deg, #FFE5B4 0%, #FFD700 100%)'
            };
        } else if (hour >= 12 && hour < 17) {
            return {
                text: 'Good Afternoon',
                icon: <Sun size={28} color="#F6A192" strokeWidth={1.5} />,
                gradient: 'linear-gradient(135deg, #FDB99B 0%, #F6A192 100%)'
            };
        } else if (hour >= 17 && hour < 21) {
            return {
                text: 'Good Evening',
                icon: <Sunset size={28} color="#9D84B7" strokeWidth={1.5} />,
                gradient: 'linear-gradient(135deg, #C9A9E9 0%, #9D84B7 100%)'
            };
        } else {
            return {
                text: 'Good Night',
                icon: <Moon size={28} color="#4C63D2" strokeWidth={1.5} />,
                gradient: 'linear-gradient(135deg, #667EEA 0%, #4C63D2 100%)'
            };
        }
    };

    const greeting = getGreeting();

    return (
        <div className="home-screen" style={{ marginTop: -20 }}>
            {/* Seamless Header */}
            <Box sx={{
                pt: 6,
                pb: 4,
                px: 3,
                background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 100%)',
                mb: 2
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, opacity: 0.9 }}>
                    {greeting.icon}
                    <Typography variant="subtitle2" fontWeight="bold" sx={{
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                        letterSpacing: '1.5px',
                        color: 'text.secondary',
                        pt: 0.5
                    }}>
                        {greeting.text}
                    </Typography>
                </Box>
                <Typography variant="h3" fontWeight={800} sx={{
                    background: greeting.gradient,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'inline-block',
                    fontSize: '2.5rem',
                    lineHeight: 1.2,
                    mb: 1
                }}>
                    {config.firstName || 'Mama'}
                </Typography>
                <Typography variant="h6" sx={{
                    color: 'text.primary',
                    fontWeight: 600,
                    mt: 1,
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 0.5
                }}>
                    You are in <Box component="span" sx={{ color: 'primary.main', fontWeight: 800, fontSize: '1.5rem' }}>Week {status.weeks}</Box>, Day {status.days}
                </Typography>
            </Box>

            <div className="hero-section" style={{ marginTop: 0 }}>
                <Card elevation={0} sx={{
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(10px)',
                    mb: 4
                }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'flex-end' }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 1 }}>PROGRESS</Typography>
                                <Typography variant="h4" fontWeight="bold" color="primary.main">
                                    {status.percentComplete.toFixed(0)}%
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="h6" fontWeight="bold">{daysUntilDue}</Typography>
                                <Typography variant="caption" color="text.secondary">DAYS LEFT</Typography>
                            </Box>
                        </Box>

                        <div className="progress-container" style={{ marginTop: 0 }}>
                            <div className="progress-bar" style={{ height: 12, borderRadius: 6, backgroundColor: '#eff2f5' }}>
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${status.percentComplete}%`,
                                        background: greeting.gradient,
                                        borderRadius: 6,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="stats-grid">
                    <div className="stat-card" style={{ background: '#f8f9fa', border: 'none' }}>
                        <div className="stat-value">{trimester}</div>
                        <div className="stat-label">Trimester</div>
                    </div>
                    {/* Size comparison could go here if available, using existing stat card for now */}
                    <div className="stat-card" style={{ background: '#fff0f3', border: 'none' }}>
                        <div className="stat-value">Baby</div>
                        <div className="stat-label">is growing</div> {/* Placeholder since we don't have size in status yet */}
                    </div>
                    <div className="stat-card" style={{ background: '#e3f2fd', border: 'none' }}>
                        <div className="stat-value">{new Date(status.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div className="stat-label">Due Date</div>
                    </div>
                </div>
            </div>

            <NamePromptDialog
                open={isNameDialogOpen}
                onSave={handleSaveName}
            />

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


            <Box sx={{ p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Nutrition & Diet Card */}
                <Card
                    elevation={0}
                    sx={{
                        background: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)',
                        color: 'white',
                        borderRadius: 4,
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 24px rgba(86, 171, 47, 0.3)',
                        }
                    }}
                    onClick={() => navigate('/diet')}
                >
                    <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                    <Box sx={{
                                        fontSize: '2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    }}>
                                        🥗
                                    </Box>
                                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.25rem' }}>
                                        Nutrition & Diet
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ opacity: 0.95, mb: 2, ml: 7.5 }}>
                                    AI-powered meal plans for Week {status?.weeks || 0}
                                </Typography>
                                <Button
                                    variant="contained"
                                    size="medium"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/diet');
                                    }}
                                    sx={{
                                        bgcolor: 'white',
                                        color: '#56ab2f',
                                        fontWeight: 'bold',
                                        ml: 7.5,
                                        px: 3,
                                        py: 1,
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.9)',
                                            transform: 'scale(1.05)',
                                        }
                                    }}
                                >
                                    Open Diet Plan →
                                </Button>
                            </Box>
                            <Box sx={{
                                fontSize: '4rem',
                                opacity: 0.3,
                                position: 'absolute',
                                right: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                            }}>
                                🥑
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {/* View Full Pregnancy Plan Card */}
                <Card
                    elevation={0}
                    sx={{
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        borderRadius: 4,
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 24px rgba(245, 87, 108, 0.3)',
                        }
                    }}
                    onClick={() => setIsPlanOpen(true)}
                >
                    <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                    <Box sx={{
                                        fontSize: '2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    }}>
                                        📅
                                    </Box>
                                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.25rem' }}>
                                        Pregnancy Plan
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ opacity: 0.95, mb: 2, ml: 7.5 }}>
                                    Complete week-by-week pregnancy journey
                                </Typography>
                                <Button
                                    variant="contained"
                                    size="medium"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsPlanOpen(true);
                                    }}
                                    sx={{
                                        bgcolor: 'white',
                                        color: '#f5576c',
                                        fontWeight: 'bold',
                                        ml: 7.5,
                                        px: 3,
                                        py: 1,
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.9)',
                                            transform: 'scale(1.05)',
                                        }
                                    }}
                                >
                                    View Full Plan →
                                </Button>
                            </Box>
                            <Box sx={{
                                fontSize: '4rem',
                                opacity: 0.3,
                                position: 'absolute',
                                right: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                            }}>
                                🤰
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            <Dialog
                open={isPlanOpen}
                onClose={() => setIsPlanOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxHeight: '85vh',
                        bgcolor: '#fafafa'
                    }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'white',
                    pb: 2,
                    pt: 3
                }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        Pregnancy Journey Map
                    </Typography>
                    <IconButton onClick={() => setIsPlanOpen(false)} size="small" sx={{ color: 'text.secondary' }}>
                        ✕
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {pregnancyPlan.map((item, index) => {
                            const isCompleted = status ? item.week < status.weeks : false;
                            const isCurrent = status ? item.week === status.weeks : false;

                            // Calculate target date for this week
                            let targetDate: Date | null = null;
                            if (config) {
                                try {
                                    const lmpDate = getLMPDate(config);
                                    targetDate = addDays(lmpDate, item.week * 7);
                                } catch (e) {
                                    console.error('Error calculating date', e);
                                }
                            }

                            return (
                                <Card
                                    key={index}
                                    elevation={0}
                                    onClick={() => {
                                        if (targetDate) {
                                            navigate('/calendar', { state: { targetDate: targetDate.toISOString() } });
                                        }
                                    }}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: isCurrent ? 'primary.main' : 'divider',
                                        borderRadius: 2,
                                        bgcolor: isCompleted ? '#f8f9fa' : 'white',
                                        opacity: isCompleted ? 0.8 : 1,
                                        position: 'relative',
                                        overflow: 'visible',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: 2,
                                            borderColor: 'primary.main'
                                        }
                                    }}
                                >
                                    {isCurrent && (
                                        <Box sx={{
                                            position: 'absolute',
                                            top: -10,
                                            right: 16,
                                            bgcolor: 'primary.main',
                                            color: 'white',
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: 4,
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            zIndex: 1
                                        }}>
                                            CURRENT WEEK
                                        </Box>
                                    )}
                                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <Box sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                minWidth: 48
                                            }}>
                                                <Box sx={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: '50%',
                                                    bgcolor: isCurrent ? 'primary.main' : 'primary.50',
                                                    color: isCurrent ? 'white' : 'primary.main',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: '1.2rem',
                                                    mb: 0.5
                                                }}>
                                                    {item.week}
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                    WEEK
                                                </Typography>
                                            </Box>

                                            <Box sx={{ flex: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
                                                        {item.title}
                                                    </Typography>
                                                </Box>

                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.5 }}>
                                                    {item.description}
                                                </Typography>

                                                <Chip
                                                    label={item.category.toUpperCase()}
                                                    size="small"
                                                    sx={{
                                                        height: 24,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        bgcolor: item.category === 'checkup' ? 'success.50' :
                                                            item.category === 'scan' ? 'info.50' : 'warning.50',
                                                        color: item.category === 'checkup' ? 'success.700' :
                                                            item.category === 'scan' ? 'info.700' : 'warning.700',
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                            <Button
                                component="a"
                                href="/pregnancy-plan.jpg"
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="text"
                                sx={{
                                    textTransform: 'none',
                                    color: 'text.secondary',
                                    textDecoration: 'underline'
                                }}
                            >
                                View Source Document
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default HomeScreen;
