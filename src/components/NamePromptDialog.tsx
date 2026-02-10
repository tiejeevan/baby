import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Typography,
} from '@mui/material';

interface NamePromptDialogProps {
    open: boolean;
    onSave: (firstName: string, lastName: string) => void;
}

const NamePromptDialog: React.FC<NamePromptDialogProps> = ({ open, onSave }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [errors, setErrors] = useState({ firstName: false, lastName: false });

    const handleSave = () => {
        const newErrors = {
            firstName: !firstName.trim(),
            lastName: !lastName.trim(),
        };

        setErrors(newErrors);

        if (!newErrors.firstName && !newErrors.lastName) {
            onSave(firstName.trim(), lastName.trim());
        }
    };

    return (
        <Dialog
            open={open}
            maxWidth="xs"
            fullWidth
            disableEscapeKeyDown
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    p: 1,
                }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: '2rem' }}>👋</span>
                    <Typography variant="h6" fontWeight="bold">
                        Welcome!
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Please tell us your name to personalize your experience
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="First Name"
                        value={firstName}
                        onChange={(e) => {
                            setFirstName(e.target.value);
                            setErrors({ ...errors, firstName: false });
                        }}
                        error={errors.firstName}
                        helperText={errors.firstName ? 'First name is required' : ''}
                        fullWidth
                        autoFocus
                        variant="outlined"
                    />
                    <TextField
                        label="Last Name"
                        value={lastName}
                        onChange={(e) => {
                            setLastName(e.target.value);
                            setErrors({ ...errors, lastName: false });
                        }}
                        error={errors.lastName}
                        helperText={errors.lastName ? 'Last name is required' : ''}
                        fullWidth
                        variant="outlined"
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    fullWidth
                    sx={{
                        borderRadius: 2,
                        py: 1.5,
                        textTransform: 'none',
                        fontWeight: 600,
                    }}
                >
                    Continue
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default NamePromptDialog;
