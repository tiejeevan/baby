import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import AppLayout from './components/Layout/AppLayout';
import HomeScreen from './screens/Home/HomeScreen';
import TimelineScreen from './screens/Timeline/TimelineScreen';
import CalendarScreen from './screens/Calendar/CalendarScreen';
import ChatScreen from './screens/Chat/ChatScreen';
import SettingsScreen from './screens/Settings/SettingsScreen';
import OnboardingScreen from './screens/Onboarding/OnboardingScreen';
import DietScreen from './screens/Diet/DietScreen';
import { notificationService } from './services/notifications';
import { storageService } from './services/storage';
import { dbHelpers } from './services/database';
import ReminderPlugin from './plugins/reminder-plugin';
import BackButtonHandler from './components/BackButtonHandler';
import './styles/global.css';
import './styles/themes.css';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const [initialized, setInitialized] = useState(false);
  const config = useLiveQuery(() => dbHelpers.getPregnancyConfig());

  useEffect(() => {
    // Initialize services
    const initializeApp = async () => {
      try {
        // Request notification permissions
        await notificationService.initialize();

        // Create notification channel for Android
        await notificationService.createNotificationChannel();

        // Register notification action types (snooze/dismiss)
        await notificationService.registerActionTypes();

        // Request exact alarm permission (Android 12+)
        try {
          const permissionStatus = await ReminderPlugin.checkPermissions();
          if (!permissionStatus.canScheduleExactAlarms) {
            // Show explanation to user
            const userConfirmed = window.confirm(
              'This app needs permission to schedule exact alarms for reminders.\n\n' +
              'You will be taken to Settings where you need to:\n' +
              '1. Find "Baby Tracker" in the list\n' +
              '2. Enable "Alarms & reminders"\n\n' +
              'This ensures your medication and exercise reminders work reliably.'
            );

            if (userConfirmed) {
              console.log('Requesting exact alarm permission...');
              await ReminderPlugin.requestExactAlarmPermission();

              // Give user time to grant permission, then check again
              setTimeout(async () => {
                const newStatus = await ReminderPlugin.checkPermissions();
                if (newStatus.canScheduleExactAlarms) {
                  alert('✅ Permission granted! Your reminders will now work reliably.');
                } else {
                  alert('⚠️ Permission not granted. Reminders may not work when the app is closed.');
                }
              }, 2000);
            }
          }
        } catch (error) {
          console.error('Failed to request exact alarm permission:', error);
        }

        // Initialize photo storage
        await storageService.initializeStorage();

        setInitialized(true);
        console.log('App initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setInitialized(true); // Still allow app to run
      }
    };

    initializeApp();
  }, []);

  if (!initialized) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '1.25rem',
        color: '#6b7280'
      }}>
        Loading...
      </div>
    );
  }

  // Show onboarding if no config exists
  if (!config) {
    return <OnboardingScreen onComplete={() => {/* Config will be set, triggering re-render */ }} />;
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <BackButtonHandler />
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomeScreen />} />
            <Route path="timeline" element={<TimelineScreen />} />
            <Route path="calendar" element={<CalendarScreen />} />
            <Route path="chat" element={<ChatScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="diet" element={<DietScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
