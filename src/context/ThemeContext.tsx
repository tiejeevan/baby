import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'day' | 'dark' | 'boy' | 'girl';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    isNight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem('app-theme');
        return (saved as Theme) || 'day';
    });

    const [isNight, setIsNight] = useState(false);

    useEffect(() => {
        // Save theme to localStorage
        localStorage.setItem('app-theme', theme);

        // Apply theme data attribute to html element
        document.documentElement.setAttribute('data-theme', theme);

        // Optional: Also set class on body for specific styling if needed
        document.body.className = `theme-${theme}`;

    }, [theme]);

    useEffect(() => {
        // Check if it is night time (e.g., after 6 PM or before 6 AM)
        const checkTime = () => {
            const hour = new Date().getHours();
            setIsNight(hour < 6 || hour >= 18);
        };

        checkTime();
        const interval = setInterval(checkTime, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isNight }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
