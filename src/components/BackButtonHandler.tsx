import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Toast } from '@capacitor/toast';

const BackButtonHandler = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const lastBackPressTime = useRef(0);

    useEffect(() => {
        let listener: any;

        const setupListener = async () => {
            listener = await CapacitorApp.addListener('backButton', () => {
                // Check if we are at the root level
                if (location.pathname === '/' || location.pathname === '/home') {
                    const now = Date.now();
                    if (now - lastBackPressTime.current < 2000) {
                        // Exit the app
                        CapacitorApp.exitApp();
                    } else {
                        // First press: Show toast
                        lastBackPressTime.current = now;
                        Toast.show({
                            text: 'Press back again to exit',
                            duration: 'short',
                        });
                    }
                } else {
                    // Navigate back
                    navigate(-1);
                }
            });
        };

        setupListener();

        return () => {
            if (listener) {
                listener.remove();
            }
        };
    }, [location, navigate]); // Re-attach listener when location changes to capture current location

    return null;
};

export default BackButtonHandler;
