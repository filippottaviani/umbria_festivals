import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CATS } from '../constants';

const MapView = ({ festivals }) => {
    const currentDate = new Date();

    const isFestivalOngoing = (festival) => {
        const startDate = new Date(festival.start_date);
        const endDate = new Date(festival.end_date);
        return startDate <= currentDate && currentDate <= endDate;
    };

    return (
        <div className="map-container-wrapper">
            <MapContainer center={[42.9380, 12.6216]} zoom={9} className="festival-map">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                {festivals.map((festival) => {
                    const isOngoing = isFestivalOngoing(festival);
                    const sourceUrl = festival.source_url || festival.link || festival.source || '#';

                    return (
                        <CircleMarker
                            key={festival.id}
                            center={[festival.latitude, festival.longitude]}
                            radius={isOngoing ? 10 : 8}
                            color="var(--color-primary)"
                            weight={isOngoing ? 3 : 2}
                            fillColor="var(--color-accent)"
                            fillOpacity={1}
                        >
                            <Popup className="ticket-popup">
                                <div className="ticket-header"></div>
                                <div className="ticket-body">
                                    <h3>{festival.name}</h3>
                                    <p className="location">{festival.city} ({festival.province})</p>
                                    <p className="date-stamp">{festival.start_date} / {festival.end_date}</p>
                                    <a className="source-link" href={sourceUrl} target="_blank" rel="noreferrer">
                                        Fonte Ufficiale
                                    </a>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default MapView;