import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbHelpers } from '../../services/database';
import type { CalendarEntry, Activity, DateReminder, FileAttachment } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { notificationService } from '../../services/notifications';
import { storageService } from '../../services/storage';
import pregnancyPlan from '../../data/pregnancy_plan.json';
import { getLMPDate } from '../../services/pregnancy-calculator';
import { addDays } from 'date-fns';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    Button,
    FormControl,
    InputLabel,
    Box,
    Card,
    CardContent,
    Typography,
    IconButton,
    Divider,
    Chip,
} from '@mui/material';
import './CalendarScreen.css';

const CalendarScreen: React.FC = () => {
    const location = useLocation();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isBlinking, setIsBlinking] = useState(true);

    useEffect(() => {
        // Handle navigation from Home screen plan
        if (location.state && location.state.targetDate) {
            const targetDate = new Date(location.state.targetDate);
            // Verify date is valid
            if (!isNaN(targetDate.getTime())) {
                setCurrentDate(targetDate); // Set calendar month view
                setSelectedDate(targetDate); // Open detail panel

                // Clear state history so back button works nicely or strict mode doesn't double trigger weirdly
                window.history.replaceState({}, document.title);
            }
        }
    }, [location]);

    useEffect(() => {
        // Trigger blink animation on mount
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 2200);
        return () => clearTimeout(timer);
    }, []);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    const calendarEntries = useLiveQuery(
        () => dbHelpers.getCalendarEntriesForMonth(currentDate.getFullYear(), currentDate.getMonth()),
        [currentDate]
    );


    const pregnancyConfig = useLiveQuery(() => dbHelpers.getPregnancyConfig());

    const planEvents = React.useMemo(() => {
        if (!pregnancyConfig) return [];
        try {
            const lmpDate = getLMPDate(pregnancyConfig);
            return pregnancyPlan.map(event => ({
                ...event,
                date: format(addDays(lmpDate, event.week * 7), 'yyyy-MM-dd'),
                dateObj: addDays(lmpDate, event.week * 7)
            }));
        } catch (e) {
            console.error('Error calculating plan dates:', e);
            return [];
        }
    }, [pregnancyConfig]);

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const hasEntry = (date: Date): boolean => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const entry = calendarEntries?.find(entry => entry.date === dateStr);
        const hasPlan = planEvents.some(event => event.date === dateStr);

        if (hasPlan) return true;

        if (!entry) return false;
        // Only show indicator if there are actual activities or reminders
        return !!((entry.activities && entry.activities.length > 0) || (entry.reminders && entry.reminders.length > 0));
    };

    const getPlanEventsForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return planEvents.filter(event => event.date === dateStr);
    };

    const getEntryForDate = (date: Date): CalendarEntry | undefined => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return calendarEntries?.find(entry => entry.date === dateStr);
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const [year, month] = e.target.value.split('-');
        setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1));
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
    };

    return (
        <div className="calendar-screen">
            <div className="calendar-header">
                <div className="month-navigation">
                    <button className="nav-button" onClick={handlePrevMonth}>‹</button>
                    <div className="current-month-container">
                        <span className="current-month">
                            {format(currentDate, 'MMMM yyyy')}
                        </span>
                        <input
                            type="month"
                            className="month-picker-input"
                            value={format(currentDate, 'yyyy-MM')}
                            onChange={handleMonthChange}
                        />
                    </div>
                    <button className="nav-button" onClick={handleNextMonth}>›</button>
                </div>
            </div>

            <div className="calendar-grid">
                <div className="weekday-header">Sun</div>
                <div className="weekday-header">Mon</div>
                <div className="weekday-header">Tue</div>
                <div className="weekday-header">Wed</div>
                <div className="weekday-header">Thu</div>
                <div className="weekday-header">Fri</div>
                <div className="weekday-header">Sat</div>

                {/* Empty cells for days before month starts */}
                {Array.from({ length: monthStart.getDay() }).map((_, index) => (
                    <div key={`empty-${index}`} className="calendar-day empty" />
                ))}

                {/* Days of the month */}
                {daysInMonth.map((day) => (
                    <div
                        key={day.toISOString()}
                        className={`calendar-day ${!isSameMonth(day, currentDate) ? 'other-month' : ''} ${isToday(day) ? 'today' : ''
                            } ${isToday(day) && isBlinking ? 'blink-active' : ''} ${hasEntry(day) ? 'has-entry' : ''
                            } ${selectedDate && isSameDay(day, selectedDate) ? 'selected' : ''}`}
                        onClick={() => handleDateClick(day)}
                    >
                        <span className="day-number">{format(day, 'd')}</span>
                        {hasEntry(day) && <div className="entry-indicator" />}
                    </div>
                ))}
            </div>

            {selectedDate && (

                <DateDetailPanel
                    date={selectedDate}
                    entry={getEntryForDate(selectedDate)}
                    planEvents={getPlanEventsForDate(selectedDate)}
                    onClose={() => setSelectedDate(null)}
                />
            )}
        </div>
    );
};


interface DateDetailPanelProps {
    date: Date;
    entry: CalendarEntry | undefined;
    planEvents: typeof pregnancyPlan & { date: string }[];
    onClose: () => void;
}


const DateDetailPanel: React.FC<DateDetailPanelProps> = ({ date, entry, planEvents, onClose }) => {
    // Activities and Reminders State
    const [activities, setActivities] = useState<Activity[]>(entry?.activities || []);
    const [reminders, setReminders] = useState<DateReminder[]>(entry?.reminders || []);
    const [attachments, setAttachments] = useState<FileAttachment[]>(entry?.attachments || []);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalCategory, setModalCategory] = useState<'activity' | 'reminder'>('activity');
    const [editingItem, setEditingItem] = useState<(Activity | DateReminder) | null>(null);

    // Form State (Temporary)
    const [formType, setFormType] = useState<string>('');
    const [formDescription, setFormDescription] = useState<string>(''); // Used for title/desc
    const [formTime, setFormTime] = useState<string>('');

    // File upload state
    const [isUploading, setIsUploading] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState<FileAttachment | null>(null);

    // Sync state when entry updates
    useEffect(() => {
        setActivities(entry?.activities || []);
        setReminders(entry?.reminders || []);
        setAttachments(entry?.attachments || []);
    }, [entry]);

    // Auto-save function
    const saveToDb = async (newActivities: Activity[], newReminders: DateReminder[], newAttachments: FileAttachment[]) => {
        const dateStr = format(date, 'yyyy-MM-dd');

        // Handle Notification cancellations
        const originalReminders = entry?.reminders || [];
        const deletedReminders = originalReminders.filter(
            or => !newReminders.some(nr => nr.id === or.id)
        );
        for (const dr of deletedReminders) {
            if (dr.notificationId) await notificationService.cancelNotification(dr.notificationId);
        }

        // Handle Reminder scheduling
        const updatedReminders = await Promise.all(newReminders.map(async (r) => {
            // Basic check: if it's new or modified (we don't track modified easily here, so we reschedule all capable)
            // Optimization: pass a flag if modified? For now, simplistic approach: cancel & reschedule if possible to ensure sync.
            if (r.notificationId) await notificationService.cancelNotification(r.notificationId);

            let newNotificationId: number | undefined = undefined;
            if (r.enabled) {
                const id = await notificationService.scheduleCalendarReminder(dateStr, r);
                if (id !== null) newNotificationId = id;
            }
            return { ...r, notificationId: newNotificationId };
        }));

        const entryData: CalendarEntry = {
            date: dateStr,
            notes: entry?.notes || '',
            activities: newActivities,
            reminders: updatedReminders,
            attachments: newAttachments,
            photoIds: entry?.photoIds || [],
            createdAt: entry?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (entry?.id) entryData.id = entry.id;

        await dbHelpers.saveCalendarEntry(entryData);
    };

    // --- Actions ---

    const openAddModal = (category: 'activity' | 'reminder') => {
        setModalCategory(category);
        setEditingItem(null);
        setFormDescription('');
        setFormTime(format(new Date(), 'HH:mm'));
        setFormType(category === 'activity' ? 'note' : 'notification');
        setIsModalOpen(true);
    };

    const openEditModal = (category: 'activity' | 'reminder', item: Activity | DateReminder) => {
        setModalCategory(category);
        setEditingItem(item);
        if (category === 'activity') {
            const act = item as Activity;
            setFormType(act.type);
            setFormDescription(act.description);
            setFormTime(act.time || format(new Date(), 'HH:mm'));
        } else {
            const rem = item as DateReminder;
            setFormType(rem.type);
            setFormDescription(rem.title);
            setFormTime(rem.time);
        }
        setIsModalOpen(true);
    };

    const handleModalSave = () => {
        if (modalCategory === 'activity') {
            const newItem: Activity = {
                id: editingItem ? editingItem.id : Date.now().toString(),
                type: formType as Activity['type'],
                description: formDescription,
                time: formTime,
            };

            let newActivities;
            if (editingItem) {
                newActivities = activities.map(a => a.id === editingItem.id ? newItem : a);
            } else {
                newActivities = [...activities, newItem];
            }
            setActivities(newActivities);
            saveToDb(newActivities, reminders, attachments);

        } else {
            const newItem: DateReminder = {
                id: editingItem ? editingItem.id : Date.now().toString(),
                type: formType as DateReminder['type'],
                title: formDescription,
                time: formTime,
                enabled: true, // Default enabled when adding/editing
            };

            let newReminders;
            if (editingItem) {
                newReminders = reminders.map(r => r.id === editingItem.id ? newItem : r);
            } else {
                newReminders = [...reminders, newItem];
            }
            setReminders(newReminders);
            saveToDb(activities, newReminders, attachments);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string, category: 'activity' | 'reminder') => {
        // Find the item to get its details for the confirmation message
        let itemName = '';
        if (category === 'activity') {
            const activity = activities.find(a => a.id === id);
            itemName = activity?.description || 'this activity';
        } else {
            const reminder = reminders.find(r => r.id === id);
            itemName = reminder?.title || 'this reminder';
        }

        // Ask for confirmation before deleting
        const confirmed = window.confirm(
            `Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        if (category === 'activity') {
            const newActivities = activities.filter(a => a.id !== id);
            setActivities(newActivities);
            saveToDb(newActivities, reminders, attachments);
        } else {
            const newReminders = reminders.filter(r => r.id !== id);
            setReminders(newReminders);
            saveToDb(activities, newReminders, attachments);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);

        try {
            const newAttachments: FileAttachment[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileId = `${Date.now()}_${i}`;

                // Save file using storage service
                const { filepath, thumbnail } = await storageService.saveFile(
                    file,
                    fileId,
                    file.name,
                    file.type
                );

                const attachment: FileAttachment = {
                    id: fileId,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    filepath,
                    thumbnail,
                    uploadedAt: new Date().toISOString(),
                };

                newAttachments.push(attachment);
            }

            const updatedAttachments = [...attachments, ...newAttachments];
            setAttachments(updatedAttachments);
            await saveToDb(activities, reminders, updatedAttachments);
        } catch (error) {
            console.error('Failed to upload files:', error);
            alert('Failed to upload files. Please try again.');
        } finally {
            setIsUploading(false);
            // Reset input
            event.target.value = '';
        }
    };

    const handleDeleteAttachment = async (attachmentId: string) => {
        const attachment = attachments.find(a => a.id === attachmentId);
        if (!attachment) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete "${attachment.name}"?\n\nThis action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            // Delete from storage
            await storageService.deleteFile(attachment.filepath, attachment.thumbnail);

            // Update state and database
            const updatedAttachments = attachments.filter(a => a.id !== attachmentId);
            setAttachments(updatedAttachments);
            await saveToDb(activities, reminders, updatedAttachments);
        } catch (error) {
            console.error('Failed to delete attachment:', error);
            alert('Failed to delete file. Please try again.');
        }
    };

    return (
        <>
            <Dialog
                open={true}
                onClose={onClose}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxHeight: '85vh',
                    }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pb: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                        {format(date, 'MMMM d, yyyy')}
                    </Typography>
                    <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
                        ✕
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ pt: 3, pb: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Reminders Section */}
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    ⏰ Reminders & Alarms
                                </Typography>
                                <IconButton
                                    onClick={() => openAddModal('reminder')}
                                    size="small"
                                    sx={{
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'primary.dark' },
                                        width: 32,
                                        height: 32
                                    }}
                                >
                                    +
                                </IconButton>
                            </Box>

                            {reminders.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3, fontStyle: 'italic' }}>
                                    No reminders set
                                </Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {reminders.map((reminder) => (
                                        <Card
                                            key={reminder.id}
                                            variant="outlined"
                                            sx={{
                                                borderRadius: 2,
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    boxShadow: 2,
                                                    borderColor: 'primary.light'
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Typography sx={{ fontSize: '1.5rem' }}>
                                                        {reminder.type === 'alarm' ? '⏰' : '🔔'}
                                                    </Typography>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                            {reminder.title || 'No Title'}
                                                        </Typography>
                                                        <Chip
                                                            label={reminder.time}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: 'primary.light',
                                                                color: 'primary.dark',
                                                                fontWeight: 600,
                                                                fontSize: '0.75rem'
                                                            }}
                                                        />
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => openEditModal('reminder', reminder)}
                                                            sx={{ color: 'primary.main' }}
                                                        >
                                                            ✎
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDelete(reminder.id, 'reminder')}
                                                            sx={{ color: 'error.main' }}
                                                        >
                                                            🗑️
                                                        </IconButton>
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        <Divider />

                        {/* Plan Events Section */}
                        {planEvents && planEvents.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" sx={{
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    mb: 1.5,
                                    textTransform: 'uppercase',
                                    fontSize: '0.75rem',
                                    letterSpacing: 0.5,
                                    mt: 1
                                }}>
                                    Suggested Medical Plan
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {planEvents.map((event, index) => (
                                        <Card
                                            key={`plan-${index}`}
                                            variant="outlined"
                                            sx={{
                                                borderRadius: 2,
                                                bgcolor: 'primary.50',
                                                borderColor: 'primary.200'
                                            }}
                                        >
                                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                                    <Typography sx={{ fontSize: '1.5rem' }}>
                                                        {event.category === 'scan' ? '🖥️' :
                                                            event.category === 'test' ? '🩸' : '⚕️'}
                                                    </Typography>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5, color: 'primary.900' }}>
                                                            {event.title}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            {event.description}
                                                        </Typography>
                                                        <Chip
                                                            label={`Week ${event.week}`}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: 'primary.100',
                                                                color: 'primary.800',
                                                                fontWeight: 600,
                                                                fontSize: '0.75rem'
                                                            }}
                                                        />
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>
                                <Divider sx={{ mt: 3 }} />
                            </Box>
                        )}

                        {/* Activities Section */}
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    📝 Activities
                                </Typography>
                                <IconButton
                                    onClick={() => openAddModal('activity')}
                                    size="small"
                                    sx={{
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'primary.dark' },
                                        width: 32,
                                        height: 32
                                    }}
                                >
                                    +
                                </IconButton>
                            </Box>

                            {activities.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3, fontStyle: 'italic' }}>
                                    No activities recorded
                                </Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {activities.map((activity) => (
                                        <Card
                                            key={activity.id}
                                            variant="outlined"
                                            sx={{
                                                borderRadius: 2,
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    boxShadow: 2,
                                                    borderColor: 'primary.light'
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                            {activity.description || 'No Description'}
                                                        </Typography>
                                                        <Chip
                                                            label={activity.type}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: 'secondary.light',
                                                                color: 'secondary.dark',
                                                                fontWeight: 600,
                                                                fontSize: '0.75rem',
                                                                textTransform: 'capitalize'
                                                            }}
                                                        />
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => openEditModal('activity', activity)}
                                                            sx={{ color: 'primary.main' }}
                                                        >
                                                            ✎
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDelete(activity.id, 'activity')}
                                                            sx={{ color: 'error.main' }}
                                                        >
                                                            🗑️
                                                        </IconButton>
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        <Divider />

                        {/* File Attachments Section */}
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    📎 Pictures & Files
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    {isUploading && (
                                        <Typography variant="caption" color="primary" sx={{ fontStyle: 'italic' }}>
                                            Uploading...
                                        </Typography>
                                    )}
                                    <Button
                                        component="label"
                                        size="small"
                                        variant="contained"
                                        disabled={isUploading}
                                        sx={{
                                            bgcolor: 'primary.main',
                                            color: 'white',
                                            '&:hover': { bgcolor: 'primary.dark' },
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            px: 2
                                        }}
                                    >
                                        + Add Files
                                        <input
                                            type="file"
                                            hidden
                                            multiple
                                            accept="image/*,application/pdf,.doc,.docx,.txt"
                                            onChange={handleFileUpload}
                                        />
                                    </Button>
                                </Box>
                            </Box>

                            {attachments.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3, fontStyle: 'italic' }}>
                                    No files attached
                                </Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {attachments.map((attachment) => (
                                        <Card
                                            key={attachment.id}
                                            variant="outlined"
                                            sx={{
                                                borderRadius: 2,
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    boxShadow: 2,
                                                    borderColor: 'primary.light'
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    {/* Thumbnail or Icon */}
                                                    <Box
                                                        onClick={() => {
                                                            if (attachment.type.startsWith('image/')) {
                                                                setPreviewAttachment(attachment);
                                                            }
                                                        }}
                                                        sx={{
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: 1,
                                                            overflow: 'hidden',
                                                            bgcolor: 'grey.100',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            cursor: attachment.type.startsWith('image/') ? 'pointer' : 'default',
                                                            '&:hover': attachment.type.startsWith('image/') ? {
                                                                opacity: 0.8,
                                                                transform: 'scale(1.05)',
                                                                transition: 'all 0.2s'
                                                            } : {}
                                                        }}
                                                    >
                                                        {attachment.type.startsWith('image/') ? (
                                                            <FilePreview attachment={attachment} />
                                                        ) : (
                                                            <Typography sx={{ fontSize: '1.5rem' }}>
                                                                {attachment.type.includes('pdf') ? '📄' : '📎'}
                                                            </Typography>
                                                        )}
                                                    </Box>

                                                    {/* File Info */}
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 600,
                                                                mb: 0.5,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {attachment.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {formatFileSize(attachment.size)}
                                                        </Typography>
                                                    </Box>

                                                    {/* Delete Button */}
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteAttachment(attachment.id)}
                                                        sx={{ color: 'error.main' }}
                                                    >
                                                        🗑️
                                                    </IconButton>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Add/Edit Modal */}
            <Dialog
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        padding: 1,
                    }
                }}
            >
                <DialogTitle sx={{
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    color: 'text.primary',
                    pb: 1
                }}>
                    {editingItem ? 'Edit' : 'Add'} {modalCategory === 'activity' ? 'Activity' : 'Reminder'}
                </DialogTitle>

                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                        {modalCategory === 'activity' ? (
                            <>
                                <FormControl fullWidth>
                                    <InputLabel id="activity-type-label">Type</InputLabel>
                                    <Select
                                        labelId="activity-type-label"
                                        value={formType}
                                        label="Type"
                                        onChange={e => setFormType(e.target.value)}
                                    >
                                        <MenuItem value="exercise">Exercise</MenuItem>
                                        <MenuItem value="note">Note</MenuItem>
                                        <MenuItem value="symptom">Symptom</MenuItem>
                                        <MenuItem value="mood">Mood</MenuItem>
                                        <MenuItem value="custom">Custom</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField
                                    fullWidth
                                    label="Description"
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    placeholder="What did you do?"
                                    autoFocus
                                    multiline
                                    rows={2}
                                />
                            </>
                        ) : (
                            <>
                                <FormControl fullWidth>
                                    <InputLabel id="reminder-type-label">Type</InputLabel>
                                    <Select
                                        labelId="reminder-type-label"
                                        value={formType}
                                        label="Type"
                                        onChange={e => setFormType(e.target.value)}
                                    >
                                        <MenuItem value="notification">🔔 Notification</MenuItem>
                                        <MenuItem value="alarm">⏰ Alarm</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField
                                    fullWidth
                                    label="Time"
                                    type="time"
                                    value={formTime}
                                    onChange={e => setFormTime(e.target.value)}
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                />

                                <TextField
                                    fullWidth
                                    label="Title"
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    placeholder="Reminder Title"
                                />
                            </>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button
                        onClick={() => setIsModalOpen(false)}
                        variant="outlined"
                        color="error"
                        sx={{
                            flex: 1,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleModalSave}
                        variant="contained"
                        color="success"
                        sx={{
                            flex: 1,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600
                        }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Image Preview Modal */}
            {previewAttachment && (
                <Dialog
                    open={true}
                    onClose={() => setPreviewAttachment(null)}
                    maxWidth="lg"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 3,
                            bgcolor: 'rgba(0, 0, 0, 0.9)',
                            maxHeight: '90vh',
                        }
                    }}
                >
                    <DialogTitle sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        pb: 1,
                        color: 'white'
                    }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: 'white' }}>
                            {previewAttachment.name}
                        </Typography>
                        <IconButton onClick={() => setPreviewAttachment(null)} size="small" sx={{ color: 'white' }}>
                            ✕
                        </IconButton>
                    </DialogTitle>

                    <DialogContent sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <FullImagePreview attachment={previewAttachment} />
                    </DialogContent>

                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Typography variant="caption" sx={{ color: 'grey.400', flex: 1 }}>
                            {formatFileSize(previewAttachment.size)}
                        </Typography>
                        <Button
                            onClick={() => setPreviewAttachment(null)}
                            variant="outlined"
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                color: 'white',
                                borderColor: 'white',
                                '&:hover': {
                                    borderColor: 'grey.300',
                                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                                }
                            }}
                        >
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );
};

// Helper component for file preview
const FilePreview: React.FC<{ attachment: FileAttachment }> = ({ attachment }) => {
    const [imageUrl, setImageUrl] = useState<string>('');

    useEffect(() => {
        const loadImage = async () => {
            try {
                const path = attachment.thumbnail || attachment.filepath;
                // Use readFile to get base64 data URL which works in web browsers
                const dataUrl = await storageService.readFile(path, attachment.type);
                setImageUrl(dataUrl);
            } catch (error) {
                console.error('Failed to load image:', error);
            }
        };
        loadImage();
    }, [attachment]);

    if (!imageUrl) {
        return <Typography sx={{ fontSize: '1.5rem' }}>🖼️</Typography>;
    }

    return (
        <img
            src={imageUrl}
            alt={attachment.name}
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
            }}
        />
    );
};

// Helper component for full-size image preview
const FullImagePreview: React.FC<{ attachment: FileAttachment }> = ({ attachment }) => {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadImage = async () => {
            try {
                setLoading(true);
                // Use readFile to get base64 data URL which works in web browsers
                const dataUrl = await storageService.readFile(attachment.filepath, attachment.type);
                setImageUrl(dataUrl);
            } catch (error) {
                console.error('Failed to load full image:', error);
            } finally {
                setLoading(false);
            }
        };
        loadImage();
    }, [attachment]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Typography sx={{ color: 'white', fontSize: '1.2rem' }}>Loading...</Typography>
            </Box>
        );
    }

    if (!imageUrl) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Typography sx={{ color: 'white', fontSize: '1.2rem' }}>Failed to load image</Typography>
            </Box>
        );
    }

    return (
        <img
            src={imageUrl}
            alt={attachment.name}
            style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px'
            }}
        />
    );
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export default CalendarScreen;
