import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ScrollText, Calendar, Sparkles } from 'lucide-react';
import './BottomNav.css';

const BottomNav: React.FC = () => {
    return (
        <nav className="bottom-nav">
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                <div className="icon-container">
                    <Home size={24} strokeWidth={2.5} />
                </div>
                <span className="nav-label">Home</span>
            </NavLink>

            <NavLink to="/timeline" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <div className="icon-container">
                    <ScrollText size={24} strokeWidth={2.5} />
                </div>
                <span className="nav-label">Timeline</span>
            </NavLink>

            <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <div className="icon-container">
                    <Calendar size={24} strokeWidth={2.5} />
                </div>
                <span className="nav-label">Calendar</span>
            </NavLink>

            <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <div className="icon-container">
                    <Sparkles size={24} strokeWidth={2.5} />
                </div>
                <span className="nav-label">AI Chat</span>
            </NavLink>
        </nav>
    );
};

export default BottomNav;
