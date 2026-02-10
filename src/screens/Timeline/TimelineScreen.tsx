import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbHelpers } from '../../services/database';
import { storageService } from '../../services/storage';
import type { Milestone, MilestoneType } from '../../types';
import { calculatePregnancyDuration, getWeekStartDate } from '../../utils/pregnancy';
import dailyHighlightsData from '../../data/daily_highlights.json';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    MenuItem,
    DialogActions,
    Stack,
    Chip,
    Avatar,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Fab,
    useTheme,
    alpha
} from '@mui/material';
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineOppositeContent
} from '@mui/lab';
import {
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    PhotoCamera as PhotoCameraIcon,
    Edit as EditIcon,
    Favorite as FavoriteIcon,
    Event as EventIcon,
    ChildCare as ChildCareIcon,
    LocalHospital as HospitalIcon,
    Science as ScienceIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { format, addDays } from 'date-fns';

// --- Types ---

interface TimelineNode {
    week: number;
    startDate: Date;
    endDate: Date;
    isPast: boolean;
    isCurrent: boolean;
    isFuture: boolean;
    milestones: Milestone[];
    highlights?: {
        size: string;
        length: string;
        weight: string;
        summary: string;
        days: Record<string, string>;
    };
}

// --- Icons Helper ---

const getMilestoneIcon = (type: MilestoneType) => {
    switch (type) {
        case 'first_test': return <FavoriteIcon color="error" />;
        case 'hospital_visit': return <HospitalIcon color="primary" />;
        case 'ultrasound': return <ScienceIcon color="info" />;
        case 'custom': default: return <EventIcon color="secondary" />;
    }
};

// --- Photo Preview Component ---

const PhotoPreview: React.FC<{ photoId: string }> = ({ photoId }) => {
    const [src, setSrc] = useState<string>('');
    const [fullSrc, setFullSrc] = useState<string>('');
    const [error, setError] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const loadPhoto = async () => {
            setError(false);
            try {
                // Try to load thumbnail first for performance (if it exists)
                try {
                    const thumbUri = await storageService.readPhoto(`pregnancy-photos/${photoId}_thumb.jpg`);
                    if (isMounted) {
                        setSrc(thumbUri);
                        return; // Successfully loaded thumbnail
                    }
                } catch (e) {
                    // unexpected, maybe thumbnail doesn't exist yet
                }

                // If no thumb or failed, load original
                const uri = await storageService.readPhoto(`pregnancy-photos/${photoId}.jpg`);
                if (isMounted) {
                    setSrc(uri);
                    setFullSrc(uri); // It's already the full one
                }
            } catch (e) {
                console.error(`Failed to load photo ${photoId}`, e);
                if (isMounted) setError(true);
            }
        };
        loadPhoto();
        return () => { isMounted = false; };
    }, [photoId]);

    const handleOpen = () => {
        setIsOpen(true);
        // Load full res if not already loaded
        if (!fullSrc) {
            storageService.readPhoto(`pregnancy-photos/${photoId}.jpg`)
                .then(uri => setFullSrc(uri))
                .catch(e => console.error("Failed to load full res", e));
        }
    };

    const handleClose = () => setIsOpen(false);

    if (error) {
        return (
            <Box
                width={60}
                height={60}
                bgcolor="error.light"
                borderRadius={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
                title="Failed to load"
            >
                <Typography variant="caption" color="white" fontWeight="bold">!</Typography>
            </Box>
        );
    }

    if (!src) return <Box width={60} height={60} bgcolor="grey.200" borderRadius={1} />;

    return (
        <>
            <Avatar
                src={src}
                variant="rounded"
                sx={{ width: 60, height: 60, cursor: 'pointer', border: '1px solid #eee' }}
                onClick={handleOpen}
            />

            <Dialog
                open={isOpen}
                onClose={handleClose}
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        bgcolor: 'black',
                        boxShadow: 'none',
                        m: 1,
                        overflow: 'hidden',
                        borderRadius: 2
                    }
                }}
            >
                <Box position="relative" display="flex" justifyContent="center" alignItems="center" bgcolor="black" minHeight="50vh">
                    <IconButton
                        onClick={handleClose}
                        sx={{ position: 'absolute', top: 8, right: 8, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                    >
                        <CloseIcon />
                    </IconButton>

                    {fullSrc ? (
                        <img
                            src={fullSrc}
                            alt="Memory"
                            style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
                        />
                    ) : (
                        <Box display="flex" justifyContent="center" alignItems="center" p={4}>
                            <Typography color="white">Loading...</Typography>
                        </Box>
                    )}
                </Box>
            </Dialog>
        </>
    );
};

const TimelineScreen: React.FC = () => {
    const theme = useTheme();
    const config = useLiveQuery(() => dbHelpers.getPregnancyConfig());
    const milestones = useLiveQuery(() => dbHelpers.getMilestones());

    // State
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
    const [tempPhotos, setTempPhotos] = useState<string[]>([]); // Array of base64 strings for preview

    // Form State
    const [formData, setFormData] = useState<{
        type: MilestoneType;
        title: string;
        date: string;
        notes: string;
        photoIds: string[];
        week?: number;
    }>({
        type: 'custom',
        title: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        photoIds: [] as string[],
        week: undefined
    });

    // --- Data Processing ---

    const timelineNodes = useMemo(() => {
        if (!config) return [];

        const { weeks: currentWeek } = calculatePregnancyDuration(config);
        const nodes: TimelineNode[] = [];
        const TOTAL_WEEKS = 42;

        for (let w = 1; w <= TOTAL_WEEKS; w++) {
            const startDate = getWeekStartDate(config, w);
            const endDate = addDays(startDate, 6);

            // Format dates for safe string comparison (YYYY-MM-DD)
            const startDateStr = format(startDate, 'yyyy-MM-dd');
            const endDateStr = format(endDate, 'yyyy-MM-dd');

            // Find milestones in this week range
            const weekMilestones = milestones?.filter(m => {
                // Priority 1: Check explicit week link
                if (m.week !== undefined) {
                    return m.week === w;
                }

                // Priority 2: Fallback to date range check (legacy support)
                // Use string comparison to avoid timezone issues
                if (m.date) {
                    const mDateStr = m.date.split('T')[0];
                    return mDateStr >= startDateStr && mDateStr <= endDateStr;
                }

                return false;
            }) || [];

            // Get highlights from JSON
            // JSON keys are strings "4", "5", etc.
            const highlights = (dailyHighlightsData.weeks as any)[w.toString()];

            nodes.push({
                week: w,
                startDate,
                endDate,
                isPast: w < currentWeek,
                isCurrent: w === currentWeek,
                isFuture: w > currentWeek,
                milestones: weekMilestones,
                highlights
            });
        }
        return nodes;
    }, [config, milestones]);

    // Initialize expanded week to current week
    useEffect(() => {
        if (config && expandedWeek === null) {
            const { weeks } = calculatePregnancyDuration(config);
            setExpandedWeek(weeks > 0 ? weeks : 1);
        }
    }, [config, expandedWeek]);

    // --- Handlers ---

    const handleExpandClick = (week: number) => {
        setExpandedWeek(expandedWeek === week ? null : week);
    };

    const handleOpenDialog = (milestone?: Milestone, weekData?: { week: number, date: string }) => {
        if (milestone) {
            setEditingMilestone(milestone);
            setFormData({
                type: milestone.type,
                title: milestone.title,
                date: milestone.date,
                notes: milestone.notes || '',
                photoIds: milestone.photoIds,
                week: milestone.week
            });
        } else {
            setEditingMilestone(null);
            setFormData({
                type: 'custom',
                title: '',
                date: weekData?.date || new Date().toISOString().split('T')[0],
                notes: '',
                photoIds: [],
                week: weekData?.week // Store the week number for new milestones
            });
        }
        setTempPhotos([]);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingMilestone(null);
        setTempPhotos([]);
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setTempPhotos(prev => [...prev, event.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        // Save photos first
        const savedPhotoIds: string[] = [...formData.photoIds];

        for (const base64 of tempPhotos) {
            const photoId = crypto.randomUUID();
            // Assuming storageService.savePhoto handles base64 string
            await storageService.savePhoto(base64, photoId);
            savedPhotoIds.push(photoId);
        }

        const milestoneData = {
            ...formData,
            photoIds: savedPhotoIds,
            createdAt: editingMilestone?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (editingMilestone?.id) {
            await dbHelpers.updateMilestone(editingMilestone.id, milestoneData);
        } else {
            await dbHelpers.addMilestone(milestoneData);
        }
        handleCloseDialog();
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this memory?')) {
            await dbHelpers.deleteMilestone(id);
            if (editingMilestone?.id === id) {
                handleCloseDialog();
            }
        }
    };

    // --- Render Helpers ---

    if (!config) return <Box p={4}><Typography>Loading your journey...</Typography></Box>;

    return (
        <Box sx={{ pb: 10, bgcolor: 'background.default', minHeight: '100vh' }}>
            <Box sx={{
                p: 3,
                position: 'sticky',
                top: 0,
                zIndex: 10,
                bgcolor: 'background.paper',
                boxShadow: 1,
                mb: 2
            }}>
                <Typography variant="h5" fontWeight="bold" color="primary">Your Journey</Typography>
                <Typography variant="body2" color="text.secondary">
                    Week {calculatePregnancyDuration(config).weeks} • Day {calculatePregnancyDuration(config).days}
                </Typography>
            </Box>

            <Timeline position="right" sx={{ px: 0 }}>
                {timelineNodes.map((node) => (
                    <TimelineItem key={node.week} sx={{ '&:before': { flex: 0, padding: 0 } }}>
                        <TimelineOppositeContent sx={{ flex: 'auto', maxWidth: '80px', px: 1, pt: 2, textAlign: 'right' }}>
                            <Typography variant="subtitle2" fontWeight="bold" color={node.isCurrent ? 'primary' : 'text.secondary'}>
                                Week {node.week}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {format(node.startDate, 'MMM d')}
                            </Typography>
                        </TimelineOppositeContent>

                        <TimelineSeparator>
                            <TimelineDot
                                color={node.isCurrent ? 'primary' : node.isPast ? 'success' : 'grey'}
                                variant={node.isFuture ? 'outlined' : 'filled'}
                                sx={{
                                    transform: node.isCurrent ? 'scale(1.2)' : 'scale(1)',
                                    boxShadow: node.isCurrent ? `0 0 8px ${alpha(theme.palette.primary.main, 0.4)}` : 'none'
                                }}
                            >
                                {node.milestones.length > 0 ? <FavoriteIcon fontSize="small" /> : <ChildCareIcon fontSize="small" />}
                            </TimelineDot>
                            {node.week < 42 && <TimelineConnector sx={{ bgcolor: node.isPast ? 'success.light' : 'grey.300' }} />}
                        </TimelineSeparator>

                        <TimelineContent sx={{ py: 2, px: 1, flex: 1 }}>
                            <Card
                                elevation={node.isCurrent ? 3 : 1}
                                sx={{
                                    borderRadius: 3,
                                    border: node.isCurrent ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}` : 'none',
                                    bgcolor: node.isCurrent ? alpha(theme.palette.primary.main, 0.02) : 'background.paper',
                                    overflow: 'hidden'
                                }}
                            >
                                <CardContent sx={{ pb: 1, '&:last-child': { pb: 2 } }}>
                                    {/* Header Section */}
                                    <Box display="flex" justifyContent="space-between" alignItems="center" onClick={() => handleExpandClick(node.week)} sx={{ cursor: 'pointer' }}>
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                            <Avatar sx={{ bgcolor: node.isCurrent ? theme.palette.primary.light : theme.palette.grey[200], width: 40, height: 40 }}>
                                                <Typography fontSize="1.2rem">{node.highlights?.size?.charAt(0) || '?'}</Typography>
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    Size: {node.highlights?.size || 'Growing'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {node.highlights?.weight || ''} {node.highlights?.length ? `• ${node.highlights.length}` : ''}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <IconButton
                                            size="small"
                                            sx={{ transform: expandedWeek === node.week ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}
                                        >
                                            <ExpandMoreIcon />
                                        </IconButton>
                                    </Box>

                                    {/* Collapsible Details */}
                                    <Accordion
                                        expanded={expandedWeek === node.week}
                                        disableGutters
                                        elevation={0}
                                        sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, minHeight: 0 }}
                                    >
                                        <AccordionSummary sx={{ display: 'none', minHeight: 0, m: 0 }} />
                                        <AccordionDetails sx={{ p: 0, mt: 2 }}>
                                            <Box sx={{ bgcolor: alpha(theme.palette.background.paper, 0.5), p: 1.5, borderRadius: 2, mb: 2 }}>
                                                <Typography variant="body2" color="text.primary" paragraph sx={{ mb: 1 }}>
                                                    {node.highlights?.summary}
                                                </Typography>
                                            </Box>

                                            {/* Daily Highlights Teaser */}
                                            {node.highlights?.days && (
                                                <Box mb={2}>
                                                    <Typography variant="caption" fontWeight="bold" color="primary" sx={{ display: 'block', mb: 1 }}>
                                                        DAILY INSIGHTS
                                                    </Typography>
                                                    {Object.entries(node.highlights.days).slice(0, 3).map(([day, text]) => (
                                                        <Box key={day} display="flex" gap={1} mb={0.5} alignItems="start">
                                                            <Chip label={`Day ${day}`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', minWidth: 45 }} />
                                                            <Typography variant="body2" fontSize="0.8rem" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                                                                {text}
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            )}

                                            {/* User Milestones */}
                                            <Box mb={2}>
                                                <Typography variant="caption" fontWeight="bold" color="secondary" sx={{ display: 'block', mb: 1 }}>
                                                    YOUR MEMORIES
                                                </Typography>

                                                {node.milestones.length > 0 ? (
                                                    <Stack spacing={1}>
                                                        {node.milestones.map((m) => (
                                                            <Card key={m.id} variant="outlined" sx={{ borderRadius: 2, borderColor: alpha(theme.palette.secondary.main, 0.2) }}>
                                                                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                                                                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                                                        {getMilestoneIcon(m.type)}
                                                                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                                                                            {m.title}
                                                                        </Typography>
                                                                        <IconButton size="small" onClick={() => handleOpenDialog(m)}>
                                                                            <EditIcon fontSize="small" sx={{ fontSize: 16 }} />
                                                                        </IconButton>
                                                                    </Box>
                                                                    {m.notes && (
                                                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1, fontSize: '0.85rem' }}>
                                                                            "{m.notes}"
                                                                        </Typography>
                                                                    )}
                                                                    {/* Photo Gallery */}
                                                                    {m.photoIds.length > 0 && (
                                                                        <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                                                                            {m.photoIds.map((pid, idx) => (
                                                                                <PhotoPreview key={idx} photoId={pid} />
                                                                            ))}
                                                                        </Box>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </Stack>
                                                ) : (
                                                    <Box
                                                        bgcolor={alpha(theme.palette.action.disabledBackground, 0.3)}
                                                        borderRadius={2}
                                                        p={2}
                                                        textAlign="center"
                                                        border={`1px dashed ${theme.palette.divider}`}
                                                    >
                                                        <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
                                                            No memories yet for Week {node.week}.
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>

                                            <Button
                                                variant="outlined"
                                                startIcon={<AddIcon />}
                                                size="small"
                                                fullWidth
                                                onClick={() => handleOpenDialog(undefined, { week: node.week, date: format(node.startDate, 'yyyy-MM-dd') })}
                                                sx={{ borderRadius: 2, textTransform: 'none' }}
                                            >
                                                Add Memory for Week {node.week}
                                            </Button>
                                        </AccordionDetails>
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </TimelineContent>
                    </TimelineItem>
                ))}
            </Timeline>

            {/* Floating Action Button */}
            <Fab
                color="primary"
                aria-label="add"
                sx={{ position: 'fixed', bottom: 90, right: 16 }}
                onClick={() => handleOpenDialog()}
            >
                <AddIcon />
            </Fab>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="xs">
                <DialogTitle>{editingMilestone ? 'Edit Memory' : 'New Memory'}</DialogTitle>
                <DialogContent>
                    <Box component="form" sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            select
                            label="Type"
                            fullWidth
                            size="small"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as MilestoneType })}
                        >
                            <MenuItem value="custom">Memory</MenuItem>
                            <MenuItem value="first_test">First Positive Test</MenuItem>
                            <MenuItem value="hospital_visit">Hospital Visit</MenuItem>
                            <MenuItem value="ultrasound">Ultrasound</MenuItem>
                        </TextField>
                        <TextField
                            label="Title"
                            fullWidth
                            size="small"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                        <TextField
                            type="date"
                            label="Date"
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                        <TextField
                            label="Notes"
                            multiline
                            rows={3}
                            fullWidth
                            size="small"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />

                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={<PhotoCameraIcon />}
                            fullWidth
                        >
                            Upload Photo
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={handlePhotoSelect}
                            />
                        </Button>

                        {/* Preview Photos */}
                        {tempPhotos.length > 0 && (
                            <Box display="flex" gap={1} overflow="auto" p={1} bgcolor="grey.50" borderRadius={1}>
                                {tempPhotos.map((src, i) => (
                                    <Avatar key={i} src={src} variant="rounded" sx={{ width: 60, height: 60 }} />
                                ))}
                            </Box>
                        )}

                        {/* Existing Photos (if editing) - simplified for now, just count them */}
                        {formData.photoIds.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                {formData.photoIds.length} existing photo(s) attached.
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    {editingMilestone?.id && (
                        <Button onClick={() => handleDelete(editingMilestone.id!)} color="error">
                            Delete
                        </Button>
                    )}
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" disabled={!formData.title}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TimelineScreen;
