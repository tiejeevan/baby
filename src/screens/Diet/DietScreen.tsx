import React, { useState, useEffect } from "react";
import {
    Box, Typography, Button, TextField, Select, MenuItem,
    Card, CardContent, LinearProgress, Chip,
    Snackbar, Alert, Paper, FormControl,
    Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { useLiveQuery } from "dexie-react-hooks";
import { dbHelpers } from "../../services/database";
import { geminiService } from "../../services/gemini";
import type { DailyDietPlan, WaterLog } from "../../types";

const DietScreen: React.FC = () => {
    // State
    const [view, setView] = useState<'plan' | 'ask' | 'settings'>('plan');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [todayPlan, setTodayPlan] = useState<DailyDietPlan | null>(null);
    const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
    const [question, setQuestion] = useState("");
    const [aiResponse, setAiResponse] = useState("");

    // Preference State (for editing)
    const [dietType, setDietType] = useState('standard');
    const [allergyInput, setAllergyInput] = useState('');
    const [allergies, setAllergies] = useState<string[]>([]);
    const [dislikeInput, setDislikeInput] = useState('');
    const [dislikes, setDislikes] = useState<string[]>([]);

    // Add Meal State
    const [showAddMeal, setShowAddMeal] = useState(false);
    const [newMeal, setNewMeal] = useState({
        type: 'breakfast',
        name: '',
        description: '',
        calories: '',
        nutrients: {
            protein: '',
            carbs: '',
            fats: '',
            iron: '',
            calcium: '',
            folate: ''
        }
    });


    // Database Queries
    const preferences = useLiveQuery(() => dbHelpers.getDietPreference());

    // Effects
    useEffect(() => {
        // Load API Key (In real app, fetch from secure place or assume logic)
        // Here we just initialize empty or mock
        // If a key is saved, load it
    }, []);

    useEffect(() => {
        loadTodayPlan();
        loadWater();
    }, []);

    useEffect(() => {
        if (preferences) {
            setDietType(preferences.dietType);
            setAllergies(preferences.allergies || []);
            setDislikes(preferences.dislikes || []);
        }
    }, [preferences]);

    const loadTodayPlan = async () => {
        const today = new Date().toISOString().split('T')[0];
        const plan = await dbHelpers.getDailyPlan(today);
        setTodayPlan(plan || null);
    };

    const loadWater = async () => {
        const today = new Date().toISOString().split('T')[0];
        const logs = await dbHelpers.getWaterLogs(today);
        setWaterLogs(logs);
    };

    // Actions
    // Actions
    const savePreferences = async () => {
        const newPrefs = {
            dietType: dietType as any,
            allergies,
            dislikes,
            calorieGoal: 2000,
            waterGoal: 2500,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (preferences?.id) {
            await dbHelpers.updateDietPreference(preferences.id, newPrefs);
        } else {
            await dbHelpers.saveDietPreference(newPrefs);
        }
        setMessage("Profile Saved! 🥗");
    };

    const handleGenerate = async () => {
        // Ensure we have the latest prefs or save current state
        let currentPrefs = preferences;
        if (!currentPrefs) {
            // Save what's in the form state first
            await savePreferences();
            currentPrefs = await dbHelpers.getDietPreference();
        }

        if (!currentPrefs) return; // Should not happen

        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        try {
            const plan = await geminiService.generateDietPlan(today, currentPrefs);
            if (plan) {
                await dbHelpers.saveDailyPlan(plan);
                setTodayPlan(plan);
                setMessage("Dynamic Diet Plan Generated!");
            } else {
                setMessage("Failed to generate. Check connection.");
            }
        } catch (e) {
            console.error(e);
            setMessage("Error generating plan.");
        } finally {
            setLoading(false);
        }
    };

    const handleWaterAdd = async (amount: number) => {
        const today = new Date().toISOString().split('T')[0];
        await dbHelpers.addWaterLog({
            date: today,
            amount,
            timestamp: new Date().toISOString()
        });
        loadWater();
    };

    const handleAsk = async () => {
        if (!question) return;
        setLoading(true);
        const ans = await geminiService.askNutritionQuestion(question);
        setAiResponse(ans);
        setLoading(false);
    };

    const handleAddMeal = async () => {
        if (!newMeal.name || !newMeal.type) {
            setMessage("Please enter at least a name and type.");
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        let currentPlan = todayPlan;

        // If no plan for today, create one
        if (!currentPlan) {
            currentPlan = {
                date: today,
                meals: [],
                totalCalories: 0,
                waterIntake: 0,
                generatedByAI: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }

        const mealToAdd = {
            id: crypto.randomUUID(),
            type: newMeal.type as any,
            name: newMeal.name,
            description: newMeal.description,
            calories: newMeal.calories ? parseInt(newMeal.calories) : 0,
            nutrients: {
                protein: newMeal.nutrients.protein ? parseFloat(newMeal.nutrients.protein) : 0,
                carbs: newMeal.nutrients.carbs ? parseFloat(newMeal.nutrients.carbs) : 0,
                fats: newMeal.nutrients.fats ? parseFloat(newMeal.nutrients.fats) : 0,
                iron: newMeal.nutrients.iron ? parseFloat(newMeal.nutrients.iron) : 0,
                calcium: newMeal.nutrients.calcium ? parseFloat(newMeal.nutrients.calcium) : 0,
                folate: newMeal.nutrients.folate ? parseFloat(newMeal.nutrients.folate) : 0,
            },
            ingredients: [],
            completed: false
        };

        const updatedMeals = [...currentPlan.meals, mealToAdd];
        const updatedPlan = {
            ...currentPlan,
            meals: updatedMeals,
            totalCalories: (currentPlan.totalCalories || 0) + (mealToAdd.calories || 0),
            updatedAt: new Date().toISOString()
        };

        await dbHelpers.saveDailyPlan(updatedPlan);
        setTodayPlan(updatedPlan);
        setMessage("Meal Added! 🥗");
        setShowAddMeal(false);
        setNewMeal({    // Reset form
            type: 'breakfast',
            name: '',
            description: '',
            calories: '',
            nutrients: { protein: '', carbs: '', fats: '', iron: '', calcium: '', folate: '' }
        });
    };

    const totalWater = waterLogs.reduce((sum, log) => sum + log.amount, 0);
    const waterGoal = preferences?.waterGoal || 2500;
    const waterProgress = Math.min((totalWater / waterGoal) * 100, 100);

    return (
        <Box sx={{ p: 2, pb: 10, bgcolor: '#f8f9fa', minHeight: '100vh' }}>
            {/* Header */}
            <Typography variant="h5" fontWeight="bold" color="primary.main" gutterBottom>
                Healthy Mama Diet 🥑
            </Typography>

            {/* Navigation Tabs (Pseudo) */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3, overflowX: 'auto', pb: 1 }}>
                {['Plan', 'Ask AI', 'Settings'].map((tab) => (
                    <Chip
                        key={tab}
                        label={tab}
                        onClick={() => setView(tab.toLowerCase().split(' ')[0] as any)}
                        color={view === tab.toLowerCase().split(' ')[0] ? 'primary' : 'default'}
                        variant={view === tab.toLowerCase().split(' ')[0] ? 'filled' : 'outlined'}
                    />
                ))}
            </Box>

            {/* PLAN VIEW */}
            {view === 'plan' && (
                <Box>
                    {/* Water Tracker */}
                    <Card sx={{ mb: 3, borderRadius: 3, overflow: 'visible' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold">Hydration 💧</Typography>
                                <Typography variant="body2" color="text.secondary">{totalWater}/{waterGoal} ml</Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={waterProgress}
                                sx={{ height: 10, borderRadius: 5, bgcolor: '#e0f7fa', '& .MuiLinearProgress-bar': { bgcolor: '#00bcd4' } }}
                            />
                            <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center' }}>
                                <Button variant="outlined" size="small" onClick={() => handleWaterAdd(250)}>+250ml</Button>
                                <Button variant="outlined" size="small" onClick={() => handleWaterAdd(500)}>+500ml</Button>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Today's Meal Plan or Setup Wizard */}
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                        Today's Menu
                    </Typography>

                    {!preferences ? (
                        <Card sx={{ borderRadius: 3, border: '1px dashed #bdbdbd', bgcolor: '#f5f5f5' }}>
                            <CardContent sx={{ textAlign: 'center', py: 4 }}>
                                <Typography variant="h6" gutterBottom>Welcome to AI Diet! 🥗</Typography>
                                <Typography color="text.secondary" paragraph>
                                    Let's personalize your meal plans. Tell us about your diet type, allergies, and dislikes.
                                </Typography>
                                <Button
                                    variant="contained"
                                    onClick={() => setView('settings')}
                                    sx={{ borderRadius: 4, px: 4 }}
                                >
                                    Setup My Profile
                                </Button>
                            </CardContent>
                        </Card>
                    ) : !todayPlan ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography color="text.secondary" paragraph>
                                No plan for today yet.
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={handleGenerate}
                                disabled={loading}
                                sx={{ borderRadius: 4, textTransform: 'none' }}
                            >
                                {loading ? 'Cooking...' : '✨ Create AI Plan'}
                            </Button>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {todayPlan.meals.map((meal, index) => (
                                <Card key={index} sx={{ borderRadius: 3, borderLeft: '4px solid', borderColor: getMealColor(meal.type), position: 'relative' }}>
                                    <Chip
                                        label={meal.type.toUpperCase()}
                                        size="small"
                                        sx={{
                                            position: 'absolute', top: 12, right: 12,
                                            bgcolor: getMealColor(meal.type, true),
                                            color: getMealColor(meal.type),
                                            fontWeight: 'bold', fontSize: '0.65rem'
                                        }}
                                    />
                                    <CardContent sx={{ pb: '16px !important', pt: 3 }}>
                                        <Typography variant="subtitle1" fontWeight="bold" sx={{ pr: 6 }}>
                                            {meal.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                            {meal.calories} kcal
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                            {meal.description}
                                        </Typography>
                                        {meal.ingredients && meal.ingredients.length > 0 && (
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                                                🥗 <b>Ingredients:</b> {meal.ingredients.join(', ')}
                                            </Typography>
                                        )}
                                        {meal.nutrients && (
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                                {meal.nutrients.protein ? <Chip label={`Protein: ${meal.nutrients.protein}g`} size="small" variant="outlined" /> : null}
                                                {meal.nutrients.carbs ? <Chip label={`Carbs: ${meal.nutrients.carbs}g`} size="small" variant="outlined" /> : null}
                                                {meal.nutrients.fats ? <Chip label={`Fats: ${meal.nutrients.fats}g`} size="small" variant="outlined" /> : null}
                                                {meal.nutrients.iron ? <Chip label={`Iron: ${meal.nutrients.iron}mg`} size="small" color="secondary" variant="outlined" /> : null}
                                                {meal.nutrients.folate ? <Chip label={`Folate: ${meal.nutrients.folate}mcg`} size="small" color="secondary" variant="outlined" /> : null}
                                                {meal.nutrients.calcium ? <Chip label={`Calcium: ${meal.nutrients.calcium}mg`} size="small" color="secondary" variant="outlined" /> : null}
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}

                    {/* Add Custom Meal Button - Always Visible if Plan exists or user prefers manual */}
                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => setShowAddMeal(true)}
                        sx={{ mt: 2, mb: 2, borderStyle: 'dashed', borderWidth: 2 }}
                    >
                        + Add Custom Meal
                    </Button>

                    <Box sx={{ mt: 4, textAlign: 'center' }}>
                        <Button
                            variant="text"
                            color="error"
                            size="small"
                            onClick={async () => {
                                if (window.confirm("Are you sure? This will delete your diet profile, saved plans, and water logs. You will need to setup your profile again.")) {
                                    await dbHelpers.resetDietData();
                                    setTodayPlan(null);
                                    setWaterLogs([]);
                                    setMessage("Diet data reset.");
                                }
                            }}
                        >
                            Reset All Data
                        </Button>
                    </Box>
                </Box>
            )}

            {/* ASK AI VIEW */}
            {view === 'ask' && (
                <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Food Safety & Advice</Typography>

                    <TextField
                        fullWidth
                        placeholder='"Can I eat sushi?" or "Foods for iron"'
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        sx={{ mb: 2, bgcolor: 'white' }}
                    />
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleAsk}
                        disabled={loading || !question}
                        sx={{ mb: 3, borderRadius: 2 }}
                    >
                        {loading ? 'Consulting Nutritionist...' : 'Ask Expert'}
                    </Button>

                    {aiResponse && (
                        <Paper sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                            <Typography variant="body1">{aiResponse}</Typography>
                        </Paper>
                    )}

                    <Box sx={{ mt: 4 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>Try asking:</Typography>
                        {['Can I drink coffee?', 'Best snacks for nausea?', 'Is shrimp safe?'].map(q => (
                            <Chip
                                key={q}
                                label={q}
                                onClick={() => setQuestion(q)}
                                sx={{ mr: 1, mb: 1 }}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            {/* SETTINGS VIEW */}
            {view === 'settings' && (
                <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Diet Profile</Typography>

                    <Card sx={{ mb: 3, p: 2, borderRadius: 3 }}>
                        <Typography variant="subtitle2" gutterBottom fontWeight="bold">Diet Type</Typography>
                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                            <Select
                                value={dietType}
                                onChange={(e) => setDietType(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="standard">Standard (No Restrictions)</MenuItem>
                                <MenuItem value="vegetarian">Vegetarian</MenuItem>
                                <MenuItem value="vegan">Vegan</MenuItem>
                                <MenuItem value="pescatarian">Pescatarian</MenuItem>
                                <MenuItem value="gluten_free">Gluten Free</MenuItem>
                                <MenuItem value="keto">Keto</MenuItem>
                                <MenuItem value="paleo">Paleo</MenuItem>
                            </Select>
                        </FormControl>

                        <Typography variant="subtitle2" gutterBottom fontWeight="bold">Allergies</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                            {allergies.map(a => (
                                <Chip
                                    key={a} label={a} size="small" onDelete={() => setAllergies(allergies.filter(x => x !== a))}
                                    color="error" variant="outlined"
                                />
                            ))}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <TextField
                                size="small" fullWidth placeholder="Add allergy (e.g. Nuts)"
                                value={allergyInput} onChange={e => setAllergyInput(e.target.value)}
                            />
                            <Button variant="outlined" onClick={() => {
                                if (allergyInput) { setAllergies([...allergies, allergyInput]); setAllergyInput(''); }
                            }}>+</Button>
                        </Box>

                        <Typography variant="subtitle2" gutterBottom fontWeight="bold">Dislikes</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                            {dislikes.map(d => (
                                <Chip
                                    key={d} label={d} size="small" onDelete={() => setDislikes(dislikes.filter(x => x !== d))}
                                    color="default" variant="outlined"
                                />
                            ))}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                size="small" fullWidth placeholder="Add dislike (e.g. Mushrooms)"
                                value={dislikeInput} onChange={e => setDislikeInput(e.target.value)}
                            />
                            <Button variant="outlined" onClick={() => {
                                if (dislikeInput) { setDislikes([...dislikes, dislikeInput]); setDislikeInput(''); }
                            }}>+</Button>
                        </Box>
                    </Card>

                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        onClick={async () => {
                            await savePreferences();
                        }}
                        sx={{ borderRadius: 3, fontWeight: 'bold', mb: 3 }}
                    >
                        Save Profile
                    </Button>
                </Box>
            )}

            {/* Notifications */}
            <Snackbar open={!!message} autoHideDuration={3000} onClose={() => setMessage('')}>
                <Alert severity="info" onClose={() => setMessage('')}>{message}</Alert>
            </Snackbar>

            {/* Add Meal Dialog */}
            <Dialog open={showAddMeal} onClose={() => setShowAddMeal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Custom Meal 🥗</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl fullWidth size="small">
                            <Select
                                value={newMeal.type}
                                onChange={(e) => setNewMeal({ ...newMeal, type: e.target.value })}
                            >
                                <MenuItem value="breakfast">Breakfast</MenuItem>
                                <MenuItem value="lunch">Lunch</MenuItem>
                                <MenuItem value="dinner">Dinner</MenuItem>
                                <MenuItem value="snack">Snack</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Food Name"
                            fullWidth
                            size="small"
                            value={newMeal.name}
                            onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                        />
                        <TextField
                            label="Notes / Description"
                            fullWidth
                            multiline
                            rows={2}
                            size="small"
                            value={newMeal.description}
                            onChange={(e) => setNewMeal({ ...newMeal, description: e.target.value })}
                        />
                        <TextField
                            label="Calories (kcal)"
                            type="number"
                            fullWidth
                            size="small"
                            value={newMeal.calories}
                            onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                        />

                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1 }}>Nutrients & Vitamins</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField label="Protein (g)" type="number" fullWidth size="small"
                                value={newMeal.nutrients.protein}
                                onChange={(e) => setNewMeal({ ...newMeal, nutrients: { ...newMeal.nutrients, protein: e.target.value } })}
                            />
                            <TextField label="Carbs (g)" type="number" fullWidth size="small"
                                value={newMeal.nutrients.carbs}
                                onChange={(e) => setNewMeal({ ...newMeal, nutrients: { ...newMeal.nutrients, carbs: e.target.value } })}
                            />
                            <TextField label="Fats (g)" type="number" fullWidth size="small"
                                value={newMeal.nutrients.fats}
                                onChange={(e) => setNewMeal({ ...newMeal, nutrients: { ...newMeal.nutrients, fats: e.target.value } })}
                            />
                            <TextField label="Iron (mg)" type="number" fullWidth size="small"
                                value={newMeal.nutrients.iron}
                                onChange={(e) => setNewMeal({ ...newMeal, nutrients: { ...newMeal.nutrients, iron: e.target.value } })}
                            />
                            <TextField label="Calcium (mg)" type="number" fullWidth size="small"
                                value={newMeal.nutrients.calcium}
                                onChange={(e) => setNewMeal({ ...newMeal, nutrients: { ...newMeal.nutrients, calcium: e.target.value } })}
                            />
                            <TextField label="Folate (mcg)" type="number" fullWidth size="small"
                                value={newMeal.nutrients.folate}
                                onChange={(e) => setNewMeal({ ...newMeal, nutrients: { ...newMeal.nutrients, folate: e.target.value } })}
                            />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowAddMeal(false)}>Cancel</Button>
                    <Button onClick={handleAddMeal} variant="contained" disabled={!newMeal.name}>Add Meal</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

// Helper for UI colors
const getMealColor = (type: string, bg = false) => {
    switch (type) {
        case 'breakfast': return bg ? '#fff3e0' : '#ff9800';
        case 'lunch': return bg ? '#e8f5e9' : '#4caf50';
        case 'dinner': return bg ? '#e3f2fd' : '#2196f3';
        case 'snack': return bg ? '#f3e5f5' : '#9c27b0';
        default: return '#757575';
    }
};

export default DietScreen;
