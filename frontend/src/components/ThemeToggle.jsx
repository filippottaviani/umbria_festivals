import React, { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Passa al Tema Scuro' : 'Passa al Tema Chiaro'}
            aria-label="Cambia tema"
        >
            <span className="material-symbols-rounded">
                {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
        </button>
    );
}
