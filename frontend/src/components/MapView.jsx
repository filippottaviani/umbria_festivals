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
        <div>
            <MapContainer center={[42.9380, 12.6216]} zoom={9} style={{ height: '560px', width: '100%', borderRadius: '4px', border: '1px solid var(--line)', zIndex: 0 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                
                {festivals.map(festival => {
                    const catHex = CATS[festival.cat]?.hex || '#8C6E4F';
                    const ongoing = isOngoing(festival);
                    
                    return (
                        <CircleMarker 
                            key={festival.id} 
                            center={[festival.latitude, festival.longitude]}
                            radius={ongoing ? 9 : 7}
                            color="#fff"
                            weight={ongoing ? 2 : 1}
                            fillColor={catHex}
                            fillOpacity={0.92}
                        >
                            <Popup>
                                <strong>{festival.name}</strong><br />
                                {festival.city} ({festival.province})<br />
                                {festival.start_date} → {festival.end_date}
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
            
            <div className="legend">
                {Object.values(CATS).map(c => (
                    <span key={c.label}>
                        <span className="dot" style={{ background: c.hex }}></span>{c.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default MapView;