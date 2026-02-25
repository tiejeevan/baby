import React, { useEffect, useState } from 'react';
import { 
    Box, Typography, Button, Card, CardContent, CircularProgress, Alert, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
    ToggleButtonGroup, ToggleButton, Divider, IconButton, Stack
} from '@mui/material';
import ImageToReminderService from '../services/ImageToReminderService';
import ImageSharePlugin from '../plugins/image-share-plugin';
import type { ReminderSuggestion } from '../services/ImageToReminderService';
import { format } from 'date-fns';

interface SharedImageProcessorProps {
    onComplete?: () => void;
}

interface EnhancedSuggestion extends ReminderSuggestion {
    needsTimeConfirmation?: boolean;
    confirmedTime?: string;
    reminderType?: 'notification' | 'alarm';
}

const SharedImageProcessor: React.FC<SharedImageProcessorProps> = ({ onComplete }) => {
    const [processing, setProcessing] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState<string>('');
    const [suggestions, setSuggestions] = useState<EnhancedSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [creatingReminder, setCreatingReminder] = useState<number | null>(null);
    
    // Confirmation dialog state
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<EnhancedSuggestion | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const [confirmedDate, setConfirmedDate] = useState<string>('');
    const [confirmedTime, setConfirmedTime] = useState<string>('');
    const [reminderType, setReminderType] = useState<'notification' | 'alarm'>('notification');
    const [customTitle, setCustomTitle] = useState<string>('');

    useEffect(() => {
        // Check for pending intent on mount
        ImageSharePlugin.checkPendingIntent().then(result => {
            if (result.hasImage && result.imageUri) {
                setImageUri(result.imageUri);
                processSharedImage(result.imageUri);
            } else if (result.hasImages && result.imageUris && result.imageUris.length > 0) {
                setImageUri(result.imageUris[0]);
                processSharedImage(result.imageUris[0]);
            }
        });

        // Listen for shared images
        const sharedImageListener = ImageSharePlugin.addListener('sharedImage', (data) => {
            console.log('Shared image event:', data);
            if (data.imageUri) {
                setImageUri(data.imageUri);
                processSharedImage(data.imageUri);
            }
        });

        const viewImageListener = ImageSharePlugin.addListener('viewImage', (data) => {
            console.log('View image event:', data);
            if (data.imageUri) {
                setImageUri(data.imageUri);
                processSharedImage(data.imageUri);
            }
        });

        const sharedImagesListener = ImageSharePlugin.addListener('sharedImages', (data) => {
            console.log('Multiple shared images event:', data);
            if (data.imageUris && data.imageUris.length > 0) {
                // For now, process the first image
                setImageUri(data.imageUris[0]);
                processSharedImage(data.imageUris[0]);
            }
        });

        return () => {
            sharedImageListener.then(h => h.remove());
            viewImageListener.then(h => h.remove());
            sharedImagesListener.then(h => h.remove());
        };
    }, []);

    const processSharedImage = async (uri: string) => {
        setProcessing(true);
        setError(null);
        setSuggestions([]);
        setExtractedText('');

        try {
            const result = await ImageToReminderService.processImage(uri);

            if (!result.success) {
                setError(result.error || 'Failed to process image');
                return;
            }

            setExtractedText(result.text);

            // Generate reminder suggestions
            const reminderSuggestions = ImageToReminderService.generateReminderSuggestions(
                result.text,
                result.dates
            );

            // Check if times need confirmation (no AM/PM or ambiguous)
            const enhancedSuggestions: EnhancedSuggestion[] = reminderSuggestions.map(suggestion => {
                // Check if time seems ambiguous (e.g., extracted as 12-hour without AM/PM clarification)
                const needsConfirmation = suggestion.originalText.toLowerCase().includes(':') && 
                    !suggestion.originalText.toLowerCase().includes('am') && 
                    !suggestion.originalText.toLowerCase().includes('pm');
                
                return {
                    ...suggestion,
                    needsTimeConfirmation: needsConfirmation,
                    reminderType: 'notification'
                };
            });

            setSuggestions(enhancedSuggestions);

            if (enhancedSuggestions.length === 0) {
                setError('No dates or events found in the image');
            }
        } catch (err) {
            console.error('Error processing image:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setProcessing(false);
        }
    };

    const openConfirmDialog = (suggestion: EnhancedSuggestion, index: number) => {
        setSelectedSuggestion(suggestion);
        setSelectedIndex(index);
        setCustomTitle(suggestion.title);
        
        const date = new Date(suggestion.dateTime);
        setConfirmedDate(format(date, 'yyyy-MM-dd'));
        setConfirmedTime(format(date, 'HH:mm'));
        setReminderType(suggestion.reminderType || 'notification');
        
        setConfirmDialogOpen(true);
    };

    const handleConfirmAndCreate = async () => {
        if (!selectedSuggestion) return;

        setConfirmDialogOpen(false);
        setCreatingReminder(selectedIndex);
        
        try {
            // Combine date and time
            const dateTimeString = `${confirmedDate}T${confirmedTime}:00`;
            const confirmedDateTime = new Date(dateTimeString).getTime();

            const updatedSuggestion: ReminderSuggestion = {
                ...selectedSuggestion,
                title: customTitle,
                dateTime: confirmedDateTime,
                formattedDate: format(confirmedDateTime, 'MMM d, yyyy h:mm a')
            };

            // Pass the alarm type to the service
            const isAlarm = reminderType === 'alarm';
            const success = await ImageToReminderService.createReminder(updatedSuggestion, isAlarm);
            
            if (success) {
                // Remove the suggestion from the list
                setSuggestions(prev => prev.filter((_, i) => i !== selectedIndex));
                
                // If no more suggestions, complete
                if (suggestions.length === 1 && onComplete) {
                    setTimeout(onComplete, 1000);
                }
            } else {
                setError('Failed to create reminder');
            }
        } catch (err) {
            console.error('Error creating reminder:', err);
            setError(err instanceof Error ? err.message : 'Failed to create reminder');
        } finally {
            setCreatingReminder(null);
        }
    };

    if (!imageUri && !processing && suggestions.length === 0) {
        return null;
    }

    return (
        <>
            <Dialog 
                open={imageUri !== null || processing || suggestions.length > 0}
                onClose={onComplete}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxHeight: '90vh',
                    }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pb: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'primary.main',
                    color: 'white'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '1.5rem' }}>📸</Typography>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                            Smart Image Processing
                        </Typography>
                    </Box>
                    <IconButton onClick={onComplete} size="small" sx={{ color: 'white' }}>
                        ✕
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ pt: 3, pb: 2 }}>
                    {processing && (
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            gap: 2, 
                            py: 4 
                        }}>
                            <CircularProgress size={48} thickness={4} />
                            <Typography variant="h6" color="primary">
                                Analyzing image...
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Extracting text and detecting dates
                            </Typography>
                        </Box>
                    )}

                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ 
                                mb: 2,
                                borderRadius: 2,
                                '& .MuiAlert-message': { width: '100%' }
                            }}
                            onClose={() => setError(null)}
                        >
                            {error}
                        </Alert>
                    )}

                    {extractedText && (
                        <Card 
                            sx={{ 
                                mb: 3,
                                borderRadius: 2,
                                bgcolor: 'grey.50',
                                border: '1px solid',
                                borderColor: 'grey.200'
                            }}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Typography sx={{ fontSize: '1.2rem' }}>📝</Typography>
                                    <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                                        Extracted Text
                                    </Typography>
                                </Box>
                                <Divider sx={{ my: 1 }} />
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        whiteSpace: 'pre-wrap',
                                        maxHeight: '150px',
                                        overflow: 'auto',
                                        p: 1,
                                        bgcolor: 'white',
                                        borderRadius: 1,
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {extractedText}
                                </Typography>
                            </CardContent>
                        </Card>
                    )}

                    {suggestions.length > 0 && (
                        <Box>
                            <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1, 
                                mb: 2,
                                p: 2,
                                bgcolor: 'success.50',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'success.200'
                            }}>
                                <Typography sx={{ fontSize: '1.5rem' }}>✅</Typography>
                                <Typography variant="h6" color="success.dark" fontWeight={700}>
                                    Found {suggestions.length} Event{suggestions.length > 1 ? 's' : ''}!
                                </Typography>
                            </Box>
                            
                            <Stack spacing={2}>
                                {suggestions.map((suggestion, index) => (
                                    <Card 
                                        key={index} 
                                        sx={{ 
                                            borderRadius: 2,
                                            border: '2px solid',
                                            borderColor: 'primary.light',
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                boxShadow: 4,
                                                borderColor: 'primary.main',
                                                transform: 'translateY(-2px)'
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                                <Typography sx={{ fontSize: '2rem' }}>📅</Typography>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'primary.dark' }}>
                                                        {suggestion.title}
                                                    </Typography>
                                                    <Chip 
                                                        label={suggestion.formattedDate} 
                                                        color="primary" 
                                                        size="medium"
                                                        sx={{ 
                                                            fontWeight: 600,
                                                            fontSize: '0.875rem',
                                                            mb: 1
                                                        }}
                                                    />
                                                    {suggestion.needsTimeConfirmation && (
                                                        <Chip 
                                                            label="⚠️ Time needs confirmation" 
                                                            color="warning" 
                                                            size="small"
                                                            sx={{ ml: 1, fontWeight: 600 }}
                                                        />
                                                    )}
                                                </Box>
                                            </Box>
                                            
                                            {suggestion.body && (
                                                <Typography 
                                                    variant="body2" 
                                                    color="text.secondary" 
                                                    sx={{ 
                                                        mb: 2,
                                                        p: 1.5,
                                                        bgcolor: 'grey.50',
                                                        borderRadius: 1,
                                                        borderLeft: '3px solid',
                                                        borderColor: 'primary.main'
                                                    }}
                                                >
                                                    {suggestion.body}
                                                </Typography>
                                            )}
                                            
                                            <Button
                                                variant="contained"
                                                size="large"
                                                onClick={() => openConfirmDialog(suggestion, index)}
                                                disabled={creatingReminder !== null}
                                                fullWidth
                                                sx={{
                                                    py: 1.5,
                                                    fontWeight: 700,
                                                    fontSize: '1rem',
                                                    textTransform: 'none',
                                                    borderRadius: 2,
                                                    boxShadow: 2,
                                                    '&:hover': {
                                                        boxShadow: 4
                                                    }
                                                }}
                                            >
                                                {creatingReminder === index ? (
                                                    <>
                                                        <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                                                        Creating Reminder...
                                                    </>
                                                ) : (
                                                    <>
                                                        ⏰ Set Reminder / Alarm
                                                    </>
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {!processing && suggestions.length === 0 && extractedText && (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                No events or dates detected
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                The image doesn't contain recognizable date or time information
                            </Typography>
                        </Box>
                    )}
                </DialogContent>

                {!processing && (
                    <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                        <Button 
                            variant="outlined" 
                            onClick={onComplete}
                            fullWidth
                            size="large"
                            sx={{
                                py: 1.5,
                                fontWeight: 600,
                                textTransform: 'none',
                                borderRadius: 2
                            }}
                        >
                            {suggestions.length > 0 ? 'Skip & Close' : 'Close'}
                        </Button>
                    </DialogActions>
                )}
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                    }
                }}
            >
                <DialogTitle sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    fontWeight: 700,
                    textAlign: 'center'
                }}>
                    ⏰ Confirm Reminder Details
                </DialogTitle>

                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={3}>
                        <TextField
                            fullWidth
                            label="Event Title"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2
                                }
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Date"
                            type="date"
                            value={confirmedDate}
                            onChange={(e) => setConfirmedDate(e.target.value)}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2
                                }
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Time"
                            type="time"
                            value={confirmedTime}
                            onChange={(e) => setConfirmedTime(e.target.value)}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            helperText="Please confirm the time (24-hour format)"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2
                                }
                            }}
                        />

                        <Box>
                            <Typography variant="subtitle2" gutterBottom fontWeight={600} color="text.primary">
                                Reminder Type
                            </Typography>
                            <ToggleButtonGroup
                                value={reminderType}
                                exclusive
                                onChange={(_, value) => value && setReminderType(value)}
                                fullWidth
                                sx={{ mt: 1 }}
                            >
                                <ToggleButton 
                                    value="notification"
                                    sx={{
                                        py: 1.5,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        '&.Mui-selected': {
                                            bgcolor: 'primary.main',
                                            color: 'white',
                                            '&:hover': {
                                                bgcolor: 'primary.dark'
                                            }
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <Typography sx={{ fontSize: '1.5rem' }}>🔔</Typography>
                                        <Typography variant="body2" fontWeight={600}>Notification</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Silent reminder
                                        </Typography>
                                    </Box>
                                </ToggleButton>
                                <ToggleButton 
                                    value="alarm"
                                    sx={{
                                        py: 1.5,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        '&.Mui-selected': {
                                            bgcolor: 'error.main',
                                            color: 'white',
                                            '&:hover': {
                                                bgcolor: 'error.dark'
                                            }
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <Typography sx={{ fontSize: '1.5rem' }}>⏰</Typography>
                                        <Typography variant="body2" fontWeight={600}>Alarm</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            With sound
                                        </Typography>
                                    </Box>
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        {selectedSuggestion?.body && (
                            <Box sx={{ 
                                p: 2, 
                                bgcolor: 'grey.50', 
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'grey.200'
                            }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    NOTES
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    {selectedSuggestion.body}
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                    <Button
                        onClick={() => setConfirmDialogOpen(false)}
                        variant="outlined"
                        sx={{
                            flex: 1,
                            py: 1.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmAndCreate}
                        variant="contained"
                        color="success"
                        sx={{
                            flex: 1,
                            py: 1.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 700,
                            boxShadow: 2
                        }}
                    >
                        ✓ Create Reminder
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default SharedImageProcessor;
