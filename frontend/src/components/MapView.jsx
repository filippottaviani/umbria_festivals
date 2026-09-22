import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ForkRating from './ForkRating';
import { getImageUrl } from '../services/api';
import { TOWN_FALLBACKS, isOngoing, fmtDate } from '../constants';

const UMBRIA_BOUNDS = [
    [42.36, 11.90], // Sud-Ovest
    [43.60, 13.05], // Nord-Est
];

// Component to handle map pan/zoom triggers from parent
function MapController({ selectedFestival, resetTrigger, userCoords, markersRef }) {
    const map = useMap();

    // Recenter to selected festival
    useEffect(() => {
        if (selectedFestival && selectedFestival.latitude && selectedFestival.longitude) {
            map.flyTo([selectedFestival.latitude, selectedFestival.longitude], 12.5, {
                animate: true,
                duration: 0.9
            });
            // Automatically open popup if marker ref exists
            const marker = markersRef.current[selectedFestival.id];
            if (marker) {
                setTimeout(() => {
                    try {
                        marker.openPopup();
                    } catch {
                        // ignore if unmounted
                    }
                }, 350);
            }
        }
    }, [selectedFestival, map, markersRef]);

    // Recenter to Umbria overview
    useEffect(() => {
        if (resetTrigger > 0) {
            map.flyToBounds(UMBRIA_BOUNDS, {
                animate: true,
                duration: 1.0,
                padding: [30, 30]
            });
        }
    }, [resetTrigger, map]);

    return null;
}

// Track zoom level for clustering calculation
function MapEventsHandler({ onZoomChange }) {
    const map = useMapEvents({
        zoomend() {
            onZoomChange(map.getZoom());
        }
    });
    return null;
}

// Subcomponent to zoom into cluster when clicked
function ClusterItem({ item, map }) {
    const handleClick = () => {
        if (!item.festivals || item.festivals.length === 0) return;
        const bounds = L.latLngBounds(item.festivals.map(f => [f.latitude, f.longitude]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    };

    return (
        <CircleMarker
            center={[item.latitude, item.longitude]}
            radius={15 + Math.min(item.count * 2.5, 12)}
            pathOptions={{
                fillColor: '#7A2E39', // Sagrantino brand color
                fillOpacity: 0.92,
                color: '#FFFFFF',
                weight: 3
            }}
            eventHandlers={{
                click: handleClick
            }}
        >
            <Tooltip direction="center" permanent className="cluster-tooltip-label">
                <span className="cluster-count-badge">{item.count}</span>
            </Tooltip>
            <Popup>
                <div className="cluster-popup-card">
                    <div className="cluster-popup-header">
                        <span className="material-symbols-rounded">festival</span>
                        <strong>{item.count} Sagre in questa zona</strong>
                    </div>
                    <p className="cluster-popup-hint">Clicca sul cerchio per ingrandire la mappa o seleziona una sagra:</p>
                    <ul className="cluster-popup-list">
                        {item.festivals.slice(0, 6).map(f => (
                            <li key={f.id}>
                                <Link to={`/festival/${f.id}`} className="cluster-item-link">
                                    <strong>{f.name}</strong> ({f.city}) &rarr;
                                </Link>
                            </li>
                        ))}
                        {item.count > 6 && (
                            <li className="cluster-more-txt">+ altre {item.count - 6} sagre</li>
                        )}
                    </ul>
                </div>
            </Popup>
        </CircleMarker>
    );
}

const MapView = ({
    festivals = [],
    selectedFestival = null,
    onSelectFestival,
    userCoords = null,
    onLocateUser,
    isLocating = false
}) => {
    const [currentZoom, setCurrentZoom] = useState(9);
    const [resetTrigger, setResetTrigger] = useState(0);
    const markersRef = useRef({});

    const validFestivals = useMemo(() => {
        return festivals.filter(f => f.latitude && f.longitude);
    }, [festivals]);

    // Compute dynamic marker clusters depending on current map zoom level
    const clusteredItems = useMemo(() => {
        if (currentZoom >= 11) {
            return validFestivals.map(f => ({ type: 'single', festival: f }));
        }

        const gridSize = currentZoom <= 8 ? 0.38 : 0.16;
        const result = [];
        const visited = new Set();

        for (let i = 0; i < validFestivals.length; i++) {
            const base = validFestivals[i];
            if (visited.has(base.id)) continue;

            const group = [base];
            visited.add(base.id);

            for (let j = i + 1; j < validFestivals.length; j++) {
                const candidate = validFestivals[j];
                if (visited.has(candidate.id)) continue;

                if (
                    Math.abs(base.latitude - candidate.latitude) <= gridSize &&
                    Math.abs(base.longitude - candidate.longitude) <= gridSize
                ) {
                    group.push(candidate);
                    visited.add(candidate.id);
                }
            }

            if (group.length === 1) {
                result.push({ type: 'single', festival: base });
            } else {
                const avgLat = group.reduce((sum, f) => sum + f.latitude, 0) / group.length;
                const avgLon = group.reduce((sum, f) => sum + f.longitude, 0) / group.length;
                result.push({
                    type: 'cluster',
                    id: `cluster-${base.id}`,
                    latitude: avgLat,
                    longitude: avgLon,
                    festivals: group,
                    count: group.length
                });
            }
        }
        return result;
    }, [validFestivals, currentZoom]);

    return (
        <div className="map-view-wrapper">
            <MapContainer
                center={[42.9380, 12.6216]}
                zoom={9}
                className="festival-map-container"
                scrollWheelZoom={true}
            >
                {/* Clean OpenStreetMap tiles with custom contrast and dark-mode styling via CSS */}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={18}
                />

                <MapEventsHandler onZoomChange={setCurrentZoom} />
                <MapController
                    selectedFestival={selectedFestival}
                    resetTrigger={resetTrigger}
                    userCoords={userCoords}
                    markersRef={markersRef}
                />

                {/* User GPS location pulsing marker */}
                {userCoords && (
                    <>
                        <CircleMarker
                            center={[userCoords.latitude, userCoords.longitude]}
                            radius={8}
                            pathOptions={{
                                fillColor: '#2563EB',
                                fillOpacity: 0.95,
                                color: '#FFFFFF',
                                weight: 3
                            }}
                        >
                            <Tooltip direction="top" offset={[0, -8]}>
                                <strong>La tua posizione</strong>
                            </Tooltip>
                        </CircleMarker>
                        <CircleMarker
                            center={[userCoords.latitude, userCoords.longitude]}
                            radius={22}
                            pathOptions={{
                                fillColor: '#3B82F6',
                                fillOpacity: 0.2,
                                color: '#3B82F6',
                                weight: 1.5,
                                dashArray: '4, 4'
                            }}
                        />
                    </>
                )}

                {/* Clustered & Single Festival Markers */}
                {clusteredItems.map((item) => {
                    if (item.type === 'cluster') {
                        return <ClusterMarkerWrapper key={item.id} item={item} />;
                    }

                    const f = item.festival;
                    const ongoing = isOngoing(f);
                    const isSelected = selectedFestival?.id === f.id;
                    const fallbackPhoto = TOWN_FALLBACKS[f.city] || TOWN_FALLBACKS['Perugia'];
                    const imgSrc = getImageUrl(f.image_url, fallbackPhoto);

                    // Visual hierarchy by state:
                    // Selected: Amber #F59E0B
                    // Live today: Emerald #10B981
                    // Standard: Cypress #2A4B3C
                    let fillColor = '#2A4B3C';
                    let borderColor = '#FFFFFF';
                    let radius = 9;

                    if (ongoing) {
                        fillColor = '#10B981';
                        radius = 11;
                    }
                    if (isSelected) {
                        fillColor = '#F59E0B';
                        borderColor = '#1E2320';
                        radius = 13;
                    }

                    return (
                        <CircleMarker
                            key={f.id}
                            center={[f.latitude, f.longitude]}
                            radius={radius}
                            ref={(el) => {
                                if (el) markersRef.current[f.id] = el;
                                else delete markersRef.current[f.id];
                            }}
                            pathOptions={{
                                fillColor: fillColor,
                                fillOpacity: 0.95,
                                color: borderColor,
                                weight: isSelected ? 3.5 : 2.5
                            }}
                            eventHandlers={{
                                click: () => {
                                    if (onSelectFestival) onSelectFestival(f);
                                }
                            }}
                        >
                            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                                <div className="map-tooltip-content">
                                    <strong>{f.name}</strong>
                                    <span>{f.city} ({f.province})</span>
                                    {ongoing && <span className="tooltip-live-tag">In corso</span>}
                                </div>
                            </Tooltip>

                            <Popup className="festival-leaflet-popup">
                                <div className="map-popup-card">
                                    <div className="map-popup-img">
                                        <img src={imgSrc} alt={f.name} loading="lazy" />
                                        {ongoing && <span className="map-popup-badge live">In corso</span>}
                                        {f.province && (
                                            <span className="map-popup-badge prov">{f.province}</span>
                                        )}
                                    </div>
                                    <div className="map-popup-body">
                                        <div className="map-popup-category">
                                            <span className="material-symbols-rounded">restaurant</span>
                                            <span>{f.cat || 'Sagra tipica'}</span>
                                        </div>
                                        <h4>{f.name}</h4>
                                        <p className="map-popup-location">
                                            <span className="material-symbols-rounded">location_on</span>
                                            {f.city} ({f.province})
                                            {f.distance_km != null && (
                                                <strong className="popup-dist">· {f.distance_km} km</strong>
                                            )}
                                        </p>
                                        <p className="map-popup-date">
                                            <span className="material-symbols-rounded">calendar_today</span>
                                            {fmtDate(f.start_date)} – {fmtDate(f.end_date)}
                                        </p>

                                        {f.average_rating ? (
                                            <div className="map-popup-rating">
                                                <ForkRating rating={f.average_rating} size={14} activeColor="#F59E0B" />
                                                <span>{f.average_rating.toFixed(1)}</span>
                                            </div>
                                        ) : null}

                                        <Link to={`/festival/${f.id}`} className="map-popup-btn">
                                            Vedi Sagra Completa
                                            <span className="material-symbols-rounded">arrow_forward</span>
                                        </Link>
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>

            {/* FLOATING MAP HUD CONTROLS */}
            <div className="map-hud-controls">
                <button
                    type="button"
                    className="map-hud-btn"
                    onClick={() => setResetTrigger(prev => prev + 1)}
                    title="Inquadra tutta l'Umbria"
                    aria-label="Inquadra l'intera regione Umbria"
                >
                    <span className="material-symbols-rounded">travel_explore</span>
                    <span>Tutta l'Umbria</span>
                </button>

                {onLocateUser && (
                    <button
                        type="button"
                        className={`map-hud-btn ${userCoords ? 'active' : ''}`}
                        onClick={onLocateUser}
                        disabled={isLocating}
                        title="Trova le sagre più vicine a te"
                        aria-label="Geolocalizzazione sagre vicine"
                    >
                        <span className={`material-symbols-rounded ${isLocating ? 'spin-icon' : ''}`}>
                            {isLocating ? 'progress_activity' : 'near_me'}
                        </span>
                        <span>{userCoords ? 'Posizione attiva' : 'Vicino a me'}</span>
                    </button>
                )}

                <div className="map-hud-badge">
                    <span className="hud-badge-dot" />
                    <span><strong>{validFestivals.length}</strong> sagre sulla mappa</span>
                </div>
            </div>
        </div>
    );
};

// Helper to access Leaflet map context for cluster zoom click
function ClusterMarkerWrapper({ item }) {
    const map = useMap();
    return <ClusterItem item={item} map={map} />;
}

export default MapView;