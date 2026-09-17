import React, { useEffect, useState } from 'react';

const getWeatherIconAndLabel = (code) => {
    if (code === 0) return { icon: '☀️', symbol: 'wb_sunny', label: 'Soleggiato', color: '#F59E0B' };
    if ([1, 2].includes(code)) return { icon: '🌤️', symbol: 'partly_cloudy_day', label: 'Poco Nuvoloso', color: '#38BDF8' };
    if (code === 3) return { icon: '☁️', symbol: 'cloud', label: 'Coperto', color: '#94A3B8' };
    if ([45, 48].includes(code)) return { icon: '🌫️', symbol: 'foggy', label: 'Nebbia', color: '#94A3B8' };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { icon: '🌧️', symbol: 'rainy', label: 'Pioggia', color: '#0284C7' };
    if ([95, 96, 99].includes(code)) return { icon: '🌩️', symbol: 'thunderstorm', label: 'Temporale', color: '#6366F1' };
    return { icon: '🌡️', symbol: 'thermostat', label: 'Meteo', color: '#64748B' };
};

const WeatherBadge = ({ latitude, longitude, city, variant = 'card' }) => {
    const [weather, setWeather] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!latitude || !longitude) {
            setIsLoading(false);
            return;
        }
        let isMounted = true;

        (async () => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe/Rome`;
                const res = await fetch(url);
                const data = await res.json();

                if (isMounted && data.daily) {
                    const code = data.daily.weathercode[0];
                    const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
                    const minTemp = Math.round(data.daily.temperature_2m_min[0]);
                    const rainProb = Array.isArray(data.daily.precipitation_probability_max)
                        ? data.daily.precipitation_probability_max[0]
                        : null;
                    const info = getWeatherIconAndLabel(code);
                    setWeather({ ...info, maxTemp, minTemp, rainProb });
                }
            } catch {
                if (isMounted) setWeather(null);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        })();

        return () => { isMounted = false; };
    }, [latitude, longitude]);

    // Compact pill badge variant (for backwards compatibility if needed)
    if (variant === 'compact') {
        if (isLoading) return (
            <div className="weather-badge-loading">
                <span>⏳</span>
                <span>Meteo...</span>
            </div>
        );
        if (!weather) return null;
        return (
            <div className="weather-badge" title={`${weather.label}: ${weather.maxTemp}°C / ${weather.minTemp}°C`}>
                <span className="weather-badge-icon">{weather.icon}</span>
                <span>{weather.label} {weather.maxTemp}°C</span>
            </div>
        );
    }

    // Sidebar card variant (default)
    if (isLoading) {
        return (
            <div className="details-sidebar-card sidebar-weather-card">
                <div className="details-card-header">
                    <span className="material-symbols-rounded" style={{ color: '#0284C7' }}>wb_sunny</span>
                    <h2>Meteo{city ? ` · ${city}` : ''}</h2>
                </div>
                <div className="details-card-body" style={{ padding: '1.25rem' }}>
                    <div className="sidebar-weather-loading">
                        <span className="spinner-weather" />
                        <span>Caricamento previsioni meteo...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!weather) return null;

    return (
        <div className="details-sidebar-card sidebar-weather-card">
            <div className="details-card-header">
                <span className="material-symbols-rounded" style={{ color: weather.color || '#0284C7' }}>
                    {weather.symbol || 'wb_sunny'}
                </span>
                <h2>Meteo{city ? ` · ${city}` : ''}</h2>
            </div>
            <div className="details-card-body" style={{ padding: '1.25rem' }}>
                <div className="sidebar-weather-content">
                    <div className="sidebar-weather-main">
                        <span className="sidebar-weather-emoji" role="img" aria-label={weather.label}>
                            {weather.icon}
                        </span>
                        <div className="sidebar-weather-temp-group">
                            <span className="sidebar-weather-temp-main">{weather.maxTemp}°C</span>
                            <span className="sidebar-weather-condition">{weather.label}</span>
                        </div>
                    </div>

                    <div className="sidebar-weather-stats">
                        <div className="sidebar-weather-stat-item">
                            <span className="material-symbols-rounded" style={{ color: '#EF4444', fontSize: 17 }}>arrow_upward</span>
                            <span>Max <strong>{weather.maxTemp}°C</strong></span>
                        </div>
                        <div className="sidebar-weather-stat-sep" aria-hidden="true" />
                        <div className="sidebar-weather-stat-item">
                            <span className="material-symbols-rounded" style={{ color: '#3B82F6', fontSize: 17 }}>arrow_downward</span>
                            <span>Min <strong>{weather.minTemp}°C</strong></span>
                        </div>
                    </div>

                    {weather.rainProb != null && (
                        <div className="sidebar-weather-rain">
                            <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#0284C7' }}>water_drop</span>
                            <span>Probabilità pioggia: <strong>{weather.rainProb}%</strong></span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WeatherBadge;
