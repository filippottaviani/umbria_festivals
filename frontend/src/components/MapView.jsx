import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const UMBRIA_CENTER = [42.9380, 12.6216];

const MapView = ({ festivals }) => {
    return (
        <MapContainer center={UMBRIA_CENTER} zoom={9} style={{ height: '600px', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />
            {festivals.map(festival => (
                <Marker key={festival.id} position={[festival.latitude, festival.longitude]}>
                    <Popup>
                        <strong>{festival.name}</strong><br />
                        {festival.city} ({festival.province})<br />
                        Start: {festival.start_date}<br />
                        End: {festival.end_date}<br />
                        <a href={festival.source_url} target="_blank" rel="noopener noreferrer">Source</a>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default MapView;