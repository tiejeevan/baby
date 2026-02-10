import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, ScrollText, Calendar } from 'lucide-react';
import './BottomNav.css';

const BottomNav: React.FC = () => {
    const navigate = useNavigate();

    const handleNavigation = (path: string) => {
        // Force re-render by navigating with a timestamp
        navigate(path, { state: { timestamp: Date.now() } });
    };

    return (
        <nav className="bottom-nav">
            <NavLink 
                to="/" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
                end
                onClick={(e) => {
                    e.preventDefault();
                    handleNavigation('/');
                }}
            >
                <div className="icon-container">
                    <Home size={24} strokeWidth={2.5} />
                </div>
                <span className="nav-label">Home</span>
            </NavLink>

            <NavLink 
                to="/timeline" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                    e.preventDefault();
                    handleNavigation('/timeline');
                }}
            >
                <div className="icon-container">
                    <ScrollText size={24} strokeWidth={2.5} />
                </div>
                <span className="nav-label">Timeline</span>
            </NavLink>

            <NavLink 
                to="/calendar" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                    e.preventDefault();
                    handleNavigation('/calendar');
                }}
            >
                <div className="icon-container">
                    <Calendar size={24} strokeWidth={2.5} />
                </div>
                <span className="nav-label">Calendar</span>
            </NavLink>
        </nav>
    );
};

export default BottomNav;
