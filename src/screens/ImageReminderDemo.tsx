import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    Card, 
    CardContent, 
    TextField,
    Alert,
    CircularProgress 
} from '@mui/material';
import EntityExtractionPlugin from '../plugins/entity-extraction-plugin';
import ImageToReminderService from '../services/ImageToReminderService';

/**
 * Demo/Test component for Image to Reminder feature
 * Allows testing entity extraction without needing to share actual images
 */
const ImageReminderDemo: React.FC = () => {
    const [text, setText] = useState(
        'Doctor Appointment\nDate: March 20, 2026 at 2:30 PM\nLocation: 123 Main St\nPhone: 555-1234'
    );
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExtract = async () => {
        setProcessing(true);
        setError(null);
        setResult(null);

        try {
            const extractionResult = await EntityExtractionPlugin.extractEntities({ text });
            
            if (extractionResult.success) {
                const suggestions = ImageToReminderService.generateReminderSuggestions(
                    text,
                    extractionResult.dates
                );
                
                setResult({
                    ...extractionResult,
                    suggestions
                });
            } else {
                setError(extractionResult.error || 'Extraction failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setProcessing(false);
        }
    };

    const handleCreateReminder = async (suggestion: any) => {
        try {
            const success = await ImageToReminderService.createReminder(suggestion);
            if (success) {
                alert('Reminder created successfully!');
            } else {
                alert('Failed to create reminder');
            }
        } catch (err) {
            alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleDownloadModel = async () => {
        setProcessing(true);
        try {
            const result = await EntityExtractionPlugin.downloadModel();
            alert(result.message);
        } catch (err) {
            alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                Image to Reminder - Demo
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Test the entity extraction feature by entering text below. 
                The system will extract dates, addresses, phones, and other entities.
            </Typography>

            <Button 
                variant="outlined" 
                onClick={handleDownloadModel}
                disabled={processing}
                sx={{ mb: 2 }}
            >
                Download ML Model (First Time Only)
            </Button>

            <TextField
                label="Enter text with dates and information"
                multiline
                rows={6}
                fullWidth
                value={text}
                onChange={(e) => setText(e.target.value)}
                sx={{ mb: 2 }}
            />

            <Button
                variant="contained"
                onClick={handleExtract}
                disabled={processing || !text}
                fullWidth
                sx={{ mb: 3 }}
            >
                {processing ? (
                    <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Processing...
                    </>
                ) : (
                    'Extract Entities'
                )}
            </Button>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {result && (
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Extraction Results
                    </Typography>

                    {result.dates.length > 0 && (
                        <Card sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="subtitle1" gutterBottom>
                                    Dates Found: {result.dates.length}
                                </Typography>
                                {result.dates.map((date: any, index: number) => (
                                    <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                        <Typography variant="body2">
                                            <strong>Text:</strong> {date.text}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Formatted:</strong> {date.formatted}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Timestamp:</strong> {new Date(date.timestamp).toLocaleString()}
                                        </Typography>
                                    </Box>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {result.suggestions && result.suggestions.length > 0 && (
                        <Card sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="subtitle1" gutterBottom>
                                    Reminder Suggestions: {result.suggestions.length}
                                </Typography>
                                {result.suggestions.map((suggestion: any, index: number) => (
                                    <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                        <Typography variant="h6">
                                            {suggestion.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            {suggestion.formattedDate}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 2 }}>
                                            {suggestion.body}
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => handleCreateReminder(suggestion)}
                                        >
                                            Create Reminder
                                        </Button>
                                    </Box>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {result.addresses.length > 0 && (
                        <Card sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="subtitle1" gutterBottom>
                                    Addresses: {result.addresses.length}
                                </Typography>
                                {result.addresses.map((addr: any, index: number) => (
                                    <Typography key={index} variant="body2">
                                        • {addr.text}
                                    </Typography>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {result.phones.length > 0 && (
                        <Card sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="subtitle1" gutterBottom>
                                    Phone Numbers: {result.phones.length}
                                </Typography>
                                {result.phones.map((phone: any, index: number) => (
                                    <Typography key={index} variant="body2">
                                        • {phone.text}
                                    </Typography>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {result.emails.length > 0 && (
                        <Card sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="subtitle1" gutterBottom>
                                    Emails: {result.emails.length}
                                </Typography>
                                {result.emails.map((email: any, index: number) => (
                                    <Typography key={index} variant="body2">
                                        • {email.text}
                                    </Typography>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {result.urls.length > 0 && (
                        <Card sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="subtitle1" gutterBottom>
                                    URLs: {result.urls.length}
                                </Typography>
                                {result.urls.map((url: any, index: number) => (
                                    <Typography key={index} variant="body2">
                                        • {url.text}
                                    </Typography>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </Box>
            )}

            <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Sample Texts to Try:
                </Typography>
                <Typography variant="body2" component="div">
                    • "Doctor appointment on March 15, 2026 at 2:30 PM"<br/>
                    • "Vaccination due: April 20, 2026"<br/>
                    • "Meeting tomorrow at 3pm at 123 Main Street"<br/>
                    • "Call 555-1234 before next Tuesday"<br/>
                    • "Email: doctor@example.com for questions"
                </Typography>
            </Box>
        </Box>
    );
};

export default ImageReminderDemo;
