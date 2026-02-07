import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbHelpers } from '../../services/database';
import type { CalendarEntry, Activity, DateReminder } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { notificationService } from '../../services/notifications';
import './CalendarScreen.css';

const CalendarScreen: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isBlinking, setIsBlinking] = useState(true);

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

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const hasEntry = (date: Date): boolean => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return calendarEntries?.some(entry => entry.date === dateStr) || false;
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
                    onClose={() => setSelectedDate(null)}
                />
            )}
        </div>
    );
};

interface DateDetailPanelProps {
    date: Date;
    entry: CalendarEntry | undefined;
    onClose: () => void;
}


const DateDetailPanel: React.FC<DateDetailPanelProps> = ({ date, entry, onClose }) => {
    // Activities and Reminders State
    const [activities, setActivities] = useState<Activity[]>(entry?.activities || []);
    const [reminders, setReminders] = useState<DateReminder[]>(entry?.reminders || []);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalCategory, setModalCategory] = useState<'activity' | 'reminder'>('activity');
    const [editingItem, setEditingItem] = useState<(Activity | DateReminder) | null>(null);

    // Form State (Temporary)
    const [formType, setFormType] = useState<string>('');
    const [formDescription, setFormDescription] = useState<string>(''); // Used for title/desc
    const [formTime, setFormTime] = useState<string>('');

    // Sync state when entry updates
    useEffect(() => {
        setActivities(entry?.activities || []);
        setReminders(entry?.reminders || []);
    }, [entry]);

    // Auto-save function
    const saveToDb = async (newActivities: Activity[], newReminders: DateReminder[]) => {
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
            saveToDb(newActivities, reminders);

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
            saveToDb(activities, newReminders);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string, category: 'activity' | 'reminder') => {
        if (category === 'activity') {
            const newActivities = activities.filter(a => a.id !== id);
            setActivities(newActivities);
            saveToDb(newActivities, reminders);
        } else {
            const newReminders = reminders.filter(r => r.id !== id);
            setReminders(newReminders);
            saveToDb(activities, newReminders);
        }
    };

    return (
        <div className="date-detail-panel">
            <div className="panel-header">
                <h2>{format(date, 'MMMM d, yyyy')}</h2>
                <button className="close-button" onClick={onClose}>×</button>
            </div>

            <div className="panel-content">
                {/* Reminders Section */}
                <div className="section">
                    <div className="section-header">
                        <h3>Reminders & Alarms</h3>
                        <button className="btn-icon-add" onClick={() => openAddModal('reminder')} title="Add Reminder">
                            <span>+</span>
                        </button>
                    </div>
                    <div className="reminders-list">
                        {reminders.map((reminder) => (
                            <div key={reminder.id} className="reminder-item glass-item">
                                <span className="item-icon">
                                    {reminder.type === 'alarm' ? '⏰' : '🔔'}
                                </span>
                                <div className="item-content">
                                    <span className="read-only-subtext">{reminder.time}</span>
                                    <span className="read-only-text">{reminder.title || 'No Title'}</span>
                                </div>
                                <div className="item-actions">
                                    <button className="action-btn btn-edit" onClick={() => openEditModal('reminder', reminder)}>✎</button>
                                    <button className="action-btn btn-delete" onClick={() => handleDelete(reminder.id, 'reminder')}>🗑️</button>
                                </div>
                            </div>
                        ))}
                        {reminders.length === 0 && <p className="empty-message">No reminders set</p>}
                    </div>
                </div>

                {/* Activities Section */}
                <div className="section">
                    <div className="section-header">
                        <h3>Activities</h3>
                        <button className="btn-icon-add" onClick={() => openAddModal('activity')} title="Add Activity">
                            <span>+</span>
                        </button>
                    </div>
                    <div className="activities-list">
                        {activities.map((activity) => (
                            <div key={activity.id} className="activity-item glass-item">
                                <div className="item-content">
                                    <span className="read-only-subtext">{activity.type}</span>
                                    <span className="read-only-text">{activity.description || 'No Description'}</span>
                                </div>
                                <div className="item-actions">
                                    <button className="action-btn btn-edit" onClick={() => openEditModal('activity', activity)}>✎</button>
                                    <button className="action-btn btn-delete" onClick={() => handleDelete(activity.id, 'activity')}>🗑️</button>
                                </div>
                            </div>
                        ))}
                        {activities.length === 0 && <p className="empty-message">No activities recorded</p>}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">
                            {editingItem ? 'Edit' : 'Add'} {modalCategory === 'activity' ? 'Activity' : 'Reminder'}
                        </h3>
                        <div className="modal-form">
                            {modalCategory === 'activity' ? (
                                <>
                                    <label>
                                        <span className="modal-label">Type</span>
                                        <select className="modal-select" value={formType} onChange={e => setFormType(e.target.value)}>
                                            <option value="exercise">Exercise</option>
                                            <option value="note">Note</option>
                                            <option value="symptom">Symptom</option>
                                            <option value="mood">Mood</option>
                                            <option value="custom">Custom</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span className="modal-label">Description</span>
                                        <input
                                            className="modal-input"
                                            value={formDescription}
                                            onChange={e => setFormDescription(e.target.value)}
                                            placeholder="What did you do?"
                                            autoFocus
                                        />
                                    </label>
                                </>
                            ) : (
                                <>
                                    <label>
                                        <span className="modal-label">Type</span>
                                        <select className="modal-select" value={formType} onChange={e => setFormType(e.target.value)}>
                                            <option value="notification">Notification</option>
                                            <option value="alarm">Alarm</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span className="modal-label">Time</span>
                                        <input
                                            type="time"
                                            className="modal-input"
                                            value={formTime}
                                            onChange={e => setFormTime(e.target.value)}
                                        />
                                    </label>
                                    <label>
                                        <span className="modal-label">Title</span>
                                        <input
                                            className="modal-input"
                                            value={formDescription}
                                            onChange={e => setFormDescription(e.target.value)}
                                            placeholder="Reminder Title"
                                        />
                                    </label>
                                </>
                            )}

                            <div className="modal-actions">
                                <button className="modal-btn btn-cancel" onClick={() => setIsModalOpen(false)}>
                                    ✗
                                </button>
                                <button className="modal-btn btn-confirm" onClick={handleModalSave}>
                                    ✓
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarScreen;
