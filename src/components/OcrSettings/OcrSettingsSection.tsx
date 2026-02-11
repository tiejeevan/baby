import React, { useState } from 'react';
import {
    Typography,
    Button,
    Box,
    Divider,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Chip,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import OcrPlugin from '../../plugins/ocr-plugin';
import type { OcrResult } from '../../plugins/ocr-plugin';

const OcrSettingsSection: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<OcrResult | null>(null);

    const handleScanCamera = async () => {
        setLoading(true);
        setResult(null);
        try {
            const ocrResult = await OcrPlugin.scanTextFromCamera();
            setResult(ocrResult);
        } catch (error) {
            setResult({
                success: false,
                text: '',
                error: String(error),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleScanGallery = async () => {
        setLoading(true);
        setResult(null);
        try {
            const ocrResult = await OcrPlugin.scanTextFromGallery();
            setResult(ocrResult);
        } catch (error) {
            setResult({
                success: false,
                text: '',
                error: String(error),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setResult(null);
    };

    return (
        <>
            <Typography variant="h5" fontWeight={700} gutterBottom>
                📸 Text Scanner (OCR)
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                Scan text from medical reports, prescriptions, appointment cards, or nutrition labels using your camera.
            </Typography>

            <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                    variant="contained"
                    startIcon={<CameraAltIcon />}
                    onClick={() => {
                        setOpen(true);
                        handleScanCamera();
                    }}
                    sx={{
                        flex: 1,
                        minWidth: 150,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                    }}
                >
                    Scan with Camera
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<PhotoLibraryIcon />}
                    onClick={() => {
                        setOpen(true);
                        handleScanGallery();
                    }}
                    sx={{
                        flex: 1,
                        minWidth: 150,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                    }}
                >
                    Scan from Gallery
                </Button>
            </Stack>

            {/* OCR Result Dialog */}
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3 },
                }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    📄 Scanned Text
                </DialogTitle>
                <DialogContent>
                    {loading && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                            <CircularProgress size={48} sx={{ mb: 2 }} />
                            <Typography variant="body2" color="text.secondary">
                                Processing image...
                            </Typography>
                        </Box>
                    )}

                    {!loading && result && (
                        <>
                            {result.success ? (
                                <Box>
                                    <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                                        Text extracted successfully!
                                    </Alert>

                                    {result.text ? (
                                        <>
                                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                                Detected Text:
                                            </Typography>
                                            <Box
                                                sx={{
                                                    bgcolor: 'background.default',
                                                    p: 2,
                                                    borderRadius: 2,
                                                    mb: 2,
                                                    maxHeight: 300,
                                                    overflow: 'auto',
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    component="pre"
                                                    sx={{
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                        fontFamily: 'monospace',
                                                        m: 0,
                                                    }}
                                                >
                                                    {result.text}
                                                </Typography>
                                            </Box>

                                            {result.blocks && result.blocks.length > 0 && (
                                                <>
                                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                                        Text Blocks:
                                                    </Typography>
                                                    <Stack spacing={1}>
                                                        {result.blocks.map((block, index) => (
                                                            <Chip
                                                                key={index}
                                                                label={block.text}
                                                                size="small"
                                                                sx={{
                                                                    height: 'auto',
                                                                    py: 1,
                                                                    '& .MuiChip-label': {
                                                                        whiteSpace: 'normal',
                                                                        textAlign: 'left',
                                                                    },
                                                                }}
                                                            />
                                                        ))}
                                                    </Stack>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                                            No text detected in the image. Try again with a clearer image.
                                        </Alert>
                                    )}
                                </Box>
                            ) : (
                                <Alert severity="error" sx={{ borderRadius: 2 }}>
                                    <Typography variant="body2">
                                        <strong>Error:</strong> {result.error || 'Failed to scan text'}
                                    </Typography>
                                </Alert>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Close
                    </Button>
                    {result?.success && result.text && (
                        <Button
                            variant="contained"
                            onClick={() => {
                                navigator.clipboard.writeText(result.text);
                                alert('Text copied to clipboard!');
                            }}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            Copy Text
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
};

export default OcrSettingsSection;
