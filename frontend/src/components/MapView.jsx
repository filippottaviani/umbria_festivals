import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import ForkRating from './ForkRating';
import { getImageUrl } from '../services/api';

const TOWN_FALLBACKS = {
    'Perugia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Collegio_del_cambio%2C_Perugia_2023.jpg/1280px-Collegio_del_cambio%2C_Perugia_2023.jpg',
    'Assisi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/AssisiDec122023_03.jpg/1280px-AssisiDec122023_03.jpg',
    'Gubbio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Gubbio_Palazzo_Consoli_2016.jpg/1280px-Gubbio_Palazzo_Consoli_2016.jpg',
    'Foligno': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Foligno_Piazza_della_Repubblica.jpg/1280px-Foligno_Piazza_della_Repubblica.jpg',
    'Spoleto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Spoleto_Piazza_del_Duomo.jpg/1280px-Spoleto_Piazza_del_Duomo.jpg',
    'Norcia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Norcia_piazza_San_Benedetto.jpg/1280px-Norcia_piazza_San_Benedetto.jpg',
    'Orvieto': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Duomo_Orvieto.jpg/1280px-Duomo_Orvieto.jpg',
    'Narni': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Ponte_di_Augusto_a_Narni.jpg/1280px-Ponte_di_Augusto_a_Narni.jpg',
};

const isOngoing = (f) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const start = new Date(f.start_date);
    const end   = new Date(f.end_date); end.setHours(23,59,59,999);
    return start <= today && today <= end;
};

const fmtDate = (d) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day:'2-digit', month:'short' }) : '—';

function MapRecenter({ selectedFestival }) {
    const map = useMap();
    React.useEffect(() => {
        if (selectedFestival && selectedFestival.latitude && selectedFestival.longitude) {
            map.flyTo([selectedFestival.latitude, selectedFestival.longitude], 12, { animate: true, duration: 1.2 });
        }
    }, [selectedFestival, map]);
    return null;
}

const MapView = ({ festivals = [], selectedFestival = null, onSelectFestival }) => {
    const validFestivals = festivals.filter(f => f.latitude && f.longitude);

    return (
        <div className="map-view-wrapper">
            <MapContainer
                center={[42.9380, 12.6216]}
                zoom={9}
                className="festival-map-container"
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                <MapRecenter selectedFestival={selectedFestival} />

                <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
                    {validFestivals.map((f) => {
                        const ongoing = isOngoing(f);
                        const isSelected = selectedFestival?.id === f.id;
                        const fallbackPhoto = TOWN_FALLBACKS[f.city] || TOWN_FALLBACKS['Perugia'];
                        const imgSrc = getImageUrl(f.image_url, fallbackPhoto);

                        const fillColor = ongoing ? '#10B981' : '#2A4B3C';
                        const color = ongoing ? '#047857' : '#1E2320';
                        const radius = isSelected ? 12 : (ongoing ? 10 : 8);

                        return (
                            <CircleMarker
                                key={f.id}
                                center={[f.latitude, f.longitude]}
                                radius={radius}
                                pathOptions={{
                                    fillColor: fillColor,
                                    fillOpacity: 0.9,
                                    color: isSelected ? '#F59E0B' : color,
                                    weight: isSelected ? 4 : (ongoing ? 3 : 2)
                                }}
                                eventHandlers={{
                                    click: () => {
                                        if (onSelectFestival) onSelectFestival(f);
                                    }
                                }}
                            >
                                <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                                    <strong>{f.name}</strong> ({f.city})
                                </Tooltip>

                                <Popup className="festival-leaflet-popup">
                                    <div className="map-popup-card">
                                        <div className="map-popup-img">
                                            <img src={imgSrc} alt={f.name} />
                                            {ongoing && <span className="map-popup-badge live">In corso</span>}
                                        </div>
                                        <div className="map-popup-body">
                                            <h4>{f.name}</h4>
                                            <p className="map-popup-location">
                                                <span className="material-symbols-rounded">location_on</span>
                                                {f.city} ({f.province})
                                            </p>
                                            <p className="map-popup-date">
                                                <span className="material-symbols-rounded">calendar_today</span>
                                                {fmtDate(f.start_date)} – {fmtDate(f.end_date)}
                                            </p>

                                            {f.average_rating && (
                                                <div className="map-popup-rating">
                                                    <ForkRating rating={f.average_rating} size={14} activeColor="#F59E0B" />
                                                    <span>{f.average_rating.toFixed(1)}</span>
                                                </div>
                                            )}

                                            <Link to={`/festival/${f.id}`} className="map-popup-btn">
                                                Vedi Sagra
                                                <span className="material-symbols-rounded">arrow_forward</span>
                                            </Link>
                                        </div>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
};

export default MapView;