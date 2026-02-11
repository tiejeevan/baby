
import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Sunrise, Sunset, BookOpen, AlertCircle, CalendarCheck, Baby } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dailyHighlightsData from '../../data/daily_highlights.json';
import trimesterData from '../../data/trimester_data.json';
import tipsData from '../../data/tips.json';
import { dbHelpers } from '../../services/database';
import { useNavigate, useLocation } from 'react-router-dom';
import { calculatePregnancyStatus, getTrimester, getDaysUntilDue, getLMPDate } from '../../services/pregnancy-calculator';
import type { CurrentPregnancyStatus } from '../../types';
import pregnancyPlan from '../../data/pregnancy_plan.json';
import { addDays } from 'date-fns';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Box,
    Typography,
    Card,
    CardContent,
    Chip,
    Divider,
} from '@mui/material';
import './HomeScreen.css';
import NamePromptDialog from '../../components/NamePromptDialog';

const HomeScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = useState<CurrentPregnancyStatus | null>(null);
    const [isPlanOpen, setIsPlanOpen] = useState(false);
    const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const [showDailyDetail, setShowDailyDetail] = useState(false);
    const [showTrimesterDetail, setShowTrimesterDetail] = useState(false);
    const [shuffledTips, setShuffledTips] = useState<string[]>([]);
    const [showGlowAnimation, setShowGlowAnimation] = useState(true);
    const [currentTrimesterView, setCurrentTrimesterView] = useState(0); // 0 = current, -1 = previous, 1 = next
    const [currentDayOffset, setCurrentDayOffset] = useState(0); // offset in days from current day

    const config = useLiveQuery(() => dbHelpers.getPregnancyConfig());
    const upcomingAppointments = useLiveQuery(() => dbHelpers.getUpcomingAppointments(3));

    const getTrimesterDataByOffset = (offset: number) => {
        if (!status) return null;
        const currentTrimester = getTrimester(status.weeks);
        const targetTrimester = currentTrimester + offset;
        
        if (targetTrimester < 1 || targetTrimester > 3) return null;
        
        return (trimesterData as any).trimesters[targetTrimester.toString()];
    };

    const getDailyHighlightByOffset = (offset: number) => {
        if (!status) return null;

        // Calculate target date
        const totalDays = (status.weeks * 7) + status.days + offset;
        const targetWeeks = Math.floor(totalDays / 7);
        const targetDays = totalDays % 7;

        // Validate range (weeks 1-40)
        if (targetWeeks < 1 || targetWeeks > 40) return null;

        const weekKey = targetWeeks.toString();
        const weekData = (dailyHighlightsData as any).weeks[weekKey];

        const defaultData = {
            size: "Tiny Miracle",
            length: "Length varies",
            weight: "Weight varies",
            summary: `Week ${targetWeeks} is a time of rapid growth and change for your baby.`,
            days: {}
        };

        const data = weekData || defaultData;

        return {
            ...data,
            weeks: targetWeeks,
            days: targetDays,
            dayHighlight: (data.days && data.days[targetDays.toString()]) || data.summary || "Your baby is developing new features every single day."
        };
    };

    useEffect(() => {
        // Shuffle tips on mount
        const shuffled = [...tipsData].sort(() => Math.random() - 0.5);
        setShuffledTips(shuffled);

        const interval = setInterval(() => {
            setCurrentTipIndex((prev) => (prev + 1) % shuffled.length);
        }, 10000); // 10 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Trigger glow animation on mount
        setShowGlowAnimation(true);
        const timer = setTimeout(() => {
            setShowGlowAnimation(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    // Trigger animation when navigating to home
    useEffect(() => {
        if (location.state && (location.state as any).timestamp) {
            setShowGlowAnimation(true);
            const timer = setTimeout(() => {
                setShowGlowAnimation(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [location]);

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
    // Define colors based on theme
    const isBoy = theme === 'boy';

    const getGreeting = () => {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            return {
                text: 'Good Morning',
                icon: <Sunrise size={28} color={isBoy ? "#4fc3f7" : "#FFD700"} strokeWidth={1.5} />,
                gradient: isBoy
                    ? 'linear-gradient(135deg, #81d4fa 0%, #29b6f6 100%)'
                    : 'linear-gradient(135deg, #FFE5B4 0%, #FFD700 100%)'
            };
        } else if (hour >= 12 && hour < 17) {
            return {
                text: 'Good Afternoon',
                icon: <Sun size={28} color={isBoy ? "#29b6f6" : "#F6A192"} strokeWidth={1.5} />,
                gradient: isBoy
                    ? 'linear-gradient(135deg, #4fc3f7 0%, #039be5 100%)'
                    : 'linear-gradient(135deg, #FDB99B 0%, #F6A192 100%)'
            };
        } else if (hour >= 17 && hour < 21) {
            return {
                text: 'Good Evening',
                icon: <Sunset size={28} color={isBoy ? "#5c6bc0" : "#9D84B7"} strokeWidth={1.5} />,
                gradient: isBoy
                    ? 'linear-gradient(135deg, #7986cb 0%, #3949ab 100%)'
                    : 'linear-gradient(135deg, #C9A9E9 0%, #9D84B7 100%)'
            };
        } else {
            return {
                text: 'Good Night',
                icon: <Moon size={28} color={isBoy ? "#3949ab" : "#4C63D2"} strokeWidth={1.5} />,
                gradient: isBoy
                    ? 'linear-gradient(135deg, #5c6bc0 0%, #1a237e 100%)'
                    : 'linear-gradient(135deg, #667EEA 0%, #4C63D2 100%)'
            };
        }
    };

    const greeting = getGreeting();

    // Baby Stat Card Color
    const babyCardBg = isBoy ? '#e3f2fd' : '#fff0f3'; // Light Blue vs Light Pink

    // Pregnancy Plan Card Gradient
    const planCardGradient = isBoy
        ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' // Blue Gradient
        : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'; // Pink/Red Gradient

    // Nutrition Card - kept green as it represents health usually, but could be adjusted if needed.

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
                    mb: 1,
                    animation: showGlowAnimation ? 'glowPulse 3s ease-in-out' : 'none',
                    '@keyframes glowPulse': {
                        '0%, 100%': {
                            filter: 'drop-shadow(0 0 0px transparent)',
                        },
                        '50%': {
                            filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))',
                        }
                    }
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
                    gap: 0.5,
                    animation: showGlowAnimation ? 'glowPulse 3s ease-in-out' : 'none',
                    '@keyframes glowPulse': {
                        '0%, 100%': {
                            filter: 'drop-shadow(0 0 0px transparent)',
                        },
                        '50%': {
                            filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))',
                        }
                    }
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
                                        width: `${status.percentComplete}% `,
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
                    <div
                        className="stat-card clickable"
                        style={{ background: '#f8f9fa', border: 'none', cursor: 'pointer' }}
                        onClick={() => setShowTrimesterDetail(true)}
                    >
                        <div className="stat-value">{trimester}</div>
                        <div className="stat-label">Trimester</div>
                    </div>
                    {/* Size comparison could go here if available, using existing stat card for now */}
                    <div className="stat-card" style={{ background: babyCardBg, border: 'none' }}>
                        <div className="stat-value">Baby</div>
                        <div className="stat-label">is growing</div> {/* Placeholder since we don't have size in status yet */}
                    </div>
                    <div className="stat-card" style={{ background: '#e3f2fd', border: 'none' }}>
                        <div className="stat-value">{new Date(status.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div className="stat-label">Due Date</div>
                    </div>
                </div>
            </div>

            {/* Trimester Detail Dialog */}
            <Dialog
                open={showTrimesterDetail}
                onClose={() => {
                    setShowTrimesterDetail(false);
                    setCurrentTrimesterView(0);
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
            >
                {(() => {
                    const tData = getTrimesterDataByOffset(currentTrimesterView);
                    const currentTrimester = status ? getTrimester(status.weeks) : 1;
                    const viewingTrimester = currentTrimester + currentTrimesterView;
                    
                    if (!tData) return null;

                    return (
                        <>
                            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <BookOpen size={24} color={theme === 'boy' ? '#0288d1' : '#e91e63'} />
                                    <Box>
                                        <Typography variant="h6" fontWeight={700}>
                                            {tData?.title}
                                            {viewingTrimester === currentTrimester && (
                                                <Chip 
                                                    label="CURRENT" 
                                                    size="small" 
                                                    sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} 
                                                    color="primary" 
                                                />
                                            )}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">{tData?.weeks}</Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <IconButton 
                                        size="small" 
                                        onClick={() => setCurrentTrimesterView(prev => prev - 1)}
                                        disabled={viewingTrimester <= 1}
                                        sx={{ 
                                            bgcolor: 'action.hover',
                                            '&:disabled': { opacity: 0.3 }
                                        }}
                                    >
                                        ←
                                    </IconButton>
                                    <IconButton 
                                        size="small" 
                                        onClick={() => setCurrentTrimesterView(prev => prev + 1)}
                                        disabled={viewingTrimester >= 3}
                                        sx={{ 
                                            bgcolor: 'action.hover',
                                            '&:disabled': { opacity: 0.3 }
                                        }}
                                    >
                                        →
                                    </IconButton>
                                </Box>
                            </DialogTitle>
                            <DialogContent>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={viewingTrimester}
                                        initial={{ opacity: 0, x: currentTrimesterView > 0 ? 50 : -50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: currentTrimesterView > 0 ? -50 : 50 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Box sx={{ mb: 3, bgcolor: theme === 'boy' ? '#e1f5fe' : '#fce4ec', p: 2, borderRadius: 2 }}>
                                            <Typography variant="body1" paragraph>
                                                {tData?.overview}
                                            </Typography>
                                        </Box>

                                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <AlertCircle size={16} /> WHAT TO EXPECT
                                        </Typography>
                                        <Box component="ul" sx={{ pl: 2, mb: 3 }}>
                                            {tData?.whatToExpect.map((item: string, index: number) => (
                                                <Typography component="li" key={index} variant="body2" sx={{ mb: 0.5 }}>
                                                    {item}
                                                </Typography>
                                            ))}
                                        </Box>

                                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Baby size={16} /> BABY'S DEVELOPMENT
                                        </Typography>
                                        <Box component="ul" sx={{ pl: 2, mb: 3 }}>
                                            {tData?.babyDevelopment.map((item: string, index: number) => (
                                                <Typography component="li" key={index} variant="body2" sx={{ mb: 0.5 }}>
                                                    {item}
                                                </Typography>
                                            ))}
                                        </Box>

                                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <CalendarCheck size={16} /> CHECKLIST
                                        </Typography>
                                        <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                                            {tData?.toDoList.map((item: string, index: number) => (
                                                <Typography component="li" key={index} variant="body2" sx={{ mb: 0.5 }}>
                                                    {item}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </motion.div>
                                </AnimatePresence>
                            </DialogContent>
                            <DialogActions>
                                <Button 
                                    onClick={() => {
                                        setShowTrimesterDetail(false);
                                        setCurrentTrimesterView(0);
                                    }} 
                                    variant="contained" 
                                    fullWidth 
                                    sx={{ borderRadius: 2, bgcolor: theme === 'boy' ? '#0288d1' : '#e91e63' }}
                                >
                                    Close
                                </Button>
                            </DialogActions>
                        </>
                    )
                })()}
            </Dialog>

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

            {/* Dynamic Daily Highlights */}
            {status && (
                <div className="section week-info">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" fontWeight={700}>Today's Highlights</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton 
                                size="small" 
                                onClick={() => setCurrentDayOffset(prev => prev - 1)}
                                disabled={currentDayOffset <= -((status.weeks * 7) + status.days - 7)} // Can't go before week 1
                                sx={{ 
                                    bgcolor: 'action.hover',
                                    '&:disabled': { opacity: 0.3 }
                                }}
                            >
                                ←
                            </IconButton>
                            <IconButton 
                                size="small" 
                                onClick={() => setCurrentDayOffset(prev => prev + 1)}
                                disabled={currentDayOffset >= (280 - ((status.weeks * 7) + status.days))} // Can't go beyond week 40
                                sx={{ 
                                    bgcolor: 'action.hover',
                                    '&:disabled': { opacity: 0.3 }
                                }}
                            >
                                →
                            </IconButton>
                        </Box>
                    </Box>

                    {(() => {
                        const dailyInfo = getDailyHighlightByOffset(currentDayOffset);
                        const isCurrentDay = currentDayOffset === 0;
                        
                        return dailyInfo ? (
                            <>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentDayOffset}
                                        initial={{ opacity: 0, x: currentDayOffset > 0 ? 50 : -50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: currentDayOffset > 0 ? -50 : 50 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Card
                                            elevation={0}
                                            sx={{
                                                borderRadius: 4,
                                                bgcolor: 'white',
                                                mb: 3,
                                                border: '1px solid',
                                                borderColor: isCurrentDay ? 'primary.main' : 'divider',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
                                            }}
                                            onClick={() => setShowDailyDetail(true)}
                                        >
                                            <CardContent sx={{ p: 3 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                    <Box>
                                                        <Chip
                                                            label={`WEEK ${dailyInfo.weeks} • DAY ${dailyInfo.days + 1}${isCurrentDay ? ' • TODAY' : ''}`}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: isCurrentDay ? 'primary.main' : 'primary.50',
                                                                color: isCurrentDay ? 'white' : 'primary.main',
                                                                fontWeight: 700,
                                                                fontSize: '0.7rem',
                                                                mb: 1,
                                                                borderRadius: 1
                                                            }}
                                                        />
                                                        <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                                                            Baby is the size of a {dailyInfo.size}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
                                                            <Box sx={{ bgcolor: '#f5f5f5', px: 1.5, py: 0.5, borderRadius: 2 }}>
                                                                <Typography variant="caption" color="text.secondary" display="block">LENGTH</Typography>
                                                                <Typography variant="body2" fontWeight={700}>{dailyInfo.length}</Typography>
                                                            </Box>
                                                            <Box sx={{ bgcolor: '#f5f5f5', px: 1.5, py: 0.5, borderRadius: 2 }}>
                                                                <Typography variant="caption" color="text.secondary" display="block">WEIGHT</Typography>
                                                                <Typography variant="body2" fontWeight={700}>{dailyInfo.weight}</Typography>
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                    <Box sx={{
                                                        fontSize: '3.5rem',
                                                        lineHeight: 1,
                                                        filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.1))'
                                                    }}>
                                                        🤰
                                                    </Box>
                                                </Box>

                                                <Divider sx={{ my: 2 }} />

                                                <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                                                    {dailyInfo.dayHighlight}
                                                </Typography>

                                                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'primary.main', fontWeight: 600 }}>
                                                    Tap to read more →
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </AnimatePresence>

                                {/* Detailed View Dialog */}
                                <Dialog
                                    open={showDailyDetail}
                                    onClose={() => setShowDailyDetail(false)}
                                    maxWidth="sm"
                                    fullWidth
                                    PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
                                >
                                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <span style={{ fontSize: '1.5rem' }}>👶</span>
                                        <Typography variant="h6" fontWeight={700}>Week {dailyInfo.weeks} Overview</Typography>
                                    </DialogTitle>
                                    <DialogContent>
                                        <Box sx={{ mb: 3, bgcolor: 'primary.50', p: 2, borderRadius: 2 }}>
                                            <Typography variant="subtitle2" color="primary.main" fontWeight={700} gutterBottom>
                                                WEEKLY SUMMARY
                                            </Typography>
                                            <Typography variant="body1" paragraph>
                                                {dailyInfo.summary}
                                            </Typography>
                                        </Box>

                                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom>
                                            DAY {dailyInfo.days + 1}
                                        </Typography>
                                        <Typography variant="body1" paragraph sx={{ mb: 3 }}>
                                            {dailyInfo.dayHighlight}
                                        </Typography>

                                        <Divider sx={{ mb: 2 }} />

                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, textAlign: 'center' }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">SIZE</Typography>
                                                <Typography variant="body2" fontWeight={700}>{dailyInfo.size}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">LENGTH</Typography>
                                                <Typography variant="body2" fontWeight={700}>{dailyInfo.length}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">WEIGHT</Typography>
                                                <Typography variant="body2" fontWeight={700}>{dailyInfo.weight}</Typography>
                                            </Box>
                                        </Box>
                                    </DialogContent>
                                    <DialogActions>
                                        <Button onClick={() => setShowDailyDetail(false)} variant="contained" fullWidth sx={{ borderRadius: 2 }}>
                                            Close
                                        </Button>
                                    </DialogActions>
                                </Dialog>
                            </>
                        ) : (
                            <Card sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: '#f8f9fa' }} elevation={0}>
                                <Typography color="text.secondary">Detailed highlights coming soon for this week!</Typography>
                            </Card>
                        );
                    })()}

                    {/* Rotating Tips Carousel */}
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 4,
                            bgcolor: '#fff8e1',
                            border: '1px solid #ffecb3',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <CardContent sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Box sx={{
                                fontSize: '1.5rem',
                                bgcolor: 'white',
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #ffecb3'
                            }}>
                                💡
                            </Box>
                            <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 40, display: 'flex', alignItems: 'center' }}>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentTipIndex}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.5, ease: "easeInOut" }}
                                        style={{ width: '100%' }}
                                    >
                                        <Typography variant="body2" fontWeight={600} color="#795548" sx={{ lineHeight: 1.4 }}>
                                            {shuffledTips[currentTipIndex] || tipsData[currentTipIndex]}
                                        </Typography>
                                    </motion.div>
                                </AnimatePresence>
                            </Box>
                        </CardContent>
                    </Card>
                </div>
            )}


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
                        background: planCardGradient,
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
                                        color: isBoy ? '#00f2fe' : '#f5576c',
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
