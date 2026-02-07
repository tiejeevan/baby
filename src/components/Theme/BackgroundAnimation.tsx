import React, { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import './BackgroundAnimation.css';

const BackgroundAnimation: React.FC = () => {
    const { theme } = useTheme();

    const stars = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.7 + 0.3
    })), []);

    const hearts = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        left: Math.random() * 90 + 5,
        delay: Math.random() * 15,
        duration: 15 + Math.random() * 15,
        size: Math.random() * 1.5 + 0.5
    })), []);

    const clouds = useMemo(() => Array.from({ length: 4 }).map((_, i) => ({
        id: i,
        top: Math.random() * 40 + 5,
        delay: Math.random() * -20, // Start randomly
        duration: 30 + Math.random() * 20,
        scale: Math.random() * 0.5 + 0.8
    })), []);

    const bubbles = useMemo(() => Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 8 + Math.random() * 10,
        size: Math.random() * 20 + 10
    })), []);

    if (theme === 'dark') {
        return (
            <div className="bg-anim-container stars-bg">
                {stars.map(star => (
                    <div
                        key={star.id}
                        className="star"
                        style={{
                            top: `${star.top}%`,
                            left: `${star.left}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            opacity: star.opacity,
                            animationDelay: `${star.delay}s`
                        }}
                    />
                ))}
                <div className="moon">🌙</div>
            </div>
        );
    }

    if (theme === 'boy') {
        return (
            <div className="bg-anim-container boy-bg">
                {bubbles.map(bubble => (
                    <div
                        key={bubble.id}
                        className="floating-bubble"
                        style={{
                            left: `${bubble.left}%`,
                            width: `${bubble.size}px`,
                            height: `${bubble.size}px`,
                            animationDelay: `${bubble.delay}s`,
                            animationDuration: `${bubble.duration}s`
                        }}
                    />
                ))}
                <div className="stork-icon">👶</div>
            </div>
        );
    }

    if (theme === 'girl') {
        return (
            <div className="bg-anim-container girl-bg">
                {hearts.map(heart => (
                    <div
                        key={heart.id}
                        className="floating-heart"
                        style={{
                            left: `${heart.left}%`,
                            animationDelay: `${heart.delay}s`,
                            animationDuration: `${heart.duration}s`,
                            fontSize: `${heart.size}rem`
                        }}
                    >❤️</div>
                ))}
                <div className="flower-bg">🌸</div>
            </div>
        );
    }

    // Default Day Theme
    return (
        <div className="bg-anim-container day-bg">
            <div className="sun">☀️</div>
            {clouds.map(cloud => (
                <div
                    key={cloud.id}
                    className="cloud"
                    style={{
                        top: `${cloud.top}%`,
                        animationDelay: `${cloud.delay}s`,
                        animationDuration: `${cloud.duration}s`,
                        transform: `scale(${cloud.scale})`
                    }}
                >☁️</div>
            ))}
        </div>
    );
};

export default BackgroundAnimation;
