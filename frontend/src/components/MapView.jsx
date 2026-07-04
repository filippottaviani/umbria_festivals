import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CATS } from '../constants';

const MapView = ({ festivals }) => {
    const today = new Date();

    const isOngoing = (festival) => {
        const start = new Date(festival.start_date);
        const end = new Date(festival.end_date);
        return start <= today && today <= end;
    };

    return (
        <div className="map-card">
            <MapContainer center={[42.9380, 12.6216]} zoom={9} className="festival-map">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />

                {festivals.map((festival) => {
                    const catHex = CATS[festival.cat]?.hex || '#8C6E4F';
                    const ongoing = isOngoing(festival);
                    const source = festival.source_url || festival.link || festival.source || '#';

                    return (
                        <CircleMarker
                            key={festival.id}
                            center={[festival.latitude, festival.longitude]}
                            radius={ongoing ? 9 : 7}
                            color="var(--color-primary)"
                            weight={ongoing ? 2.4 : 1.6}
                            fillColor={catHex}
                            fillOpacity={0.95}
                        >
                            <Popup>
                                <div className="popup-card">
                                    <div className="popup-eyebrow">{ongoing ? 'In corso' : 'In calendario'}</div>
                                    <h3>{festival.name}</h3>
                                    <p>{festival.city} · {festival.province}</p>
                                    <p className="popup-date">{festival.start_date} → {festival.end_date}</p>
                                    <a className="popup-link" href={source} target="_blank" rel="noreferrer">
                                        Apri la fonte
                                    </a>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>

            <div className="legend" aria-label="Legenda categorie">
                {Object.values(CATS).map((c) => (
                    <span key={c.label}>
                        <span className="dot" style={{ background: c.hex }}></span>{c.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default MapView;