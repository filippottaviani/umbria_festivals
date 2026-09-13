import React, { useEffect, useState } from 'react';

const getWeatherIconAndLabel = (code) => {
    if (code === 0) return { icon: '☀️', label: 'Soleggiato' };
    if ([1, 2].includes(code)) return { icon: '🌤️', label: 'Poco Nuvoloso' };
    if (code === 3) return { icon: '☁️', label: 'Coperto' };
    if ([45, 48].includes(code)) return { icon: '🌫️', label: 'Nebbia' };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { icon: '🌧️', label: 'Pioggia' };
    if ([95, 96, 99].includes(code)) return { icon: '🌩️', label: 'Temporale' };
    return { icon: '🌡️', label: 'Meteo' };
};

const WeatherBadge = ({ latitude, longitude }) => {
    const [weather, setWeather] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!latitude || !longitude) return;
        let isMounted = true;

        (async () => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe/Rome`;
                const res = await fetch(url);
                const data = await res.json();

                if (isMounted && data.daily) {
                    const code = data.daily.weathercode[0];
                    const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
                    const minTemp = Math.round(data.daily.temperature_2m_min[0]);
                    const { icon, label } = getWeatherIconAndLabel(code);
                    setWeather({ icon, label, maxTemp, minTemp });
                }
            } catch {
                if (isMounted) setWeather(null);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        })();

        return () => { isMounted = false; };
    }, [latitude, longitude]);

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
};

export default WeatherBadge;
