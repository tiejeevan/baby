import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import BottomNav from './BottomNav';
import BackgroundAnimation from '../Theme/BackgroundAnimation';
import './AppLayout.css';

const AppLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const getTitle = () => {
        switch (location.pathname) {
            case '/': return 'My Journey';
            case '/timeline': return 'Our Story'; // Or "Timeline"
            case '/calendar': return 'Calendar';
            case '/settings': return 'Settings';
            default: return 'Baby Tracker';
        }
    };

    const isSettingsPage = location.pathname === '/settings';

    return (
        <div className="app-layout">
            <BackgroundAnimation />
            <header className="app-header">
                <h1>{getTitle()}</h1>
                {!isSettingsPage && (
                    <button className="header-icon-btn" onClick={() => navigate('/settings')}>
                        <Settings className="settings-icon" size={24} strokeWidth={2.5} />
                    </button>
                )}
            </header>
            <main className={`main-content ${isSettingsPage ? 'no-nav' : ''}`}>
                <Outlet />
            </main>
            {!isSettingsPage && <BottomNav />}
        </div>
    );
};

export default AppLayout;
