import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1/festivals';

export const fetchFestivals = async (province = '') => {
    const url = province ? `${API_URL}/?province=${province}` : `${API_URL}/`;
    const response = await axios.get(url);
    return response.data;
};

export const fetchNearbyFestivals = async (latitude, longitude, radiusKm = 20) => {
    const response = await axios.get(`${API_URL}/nearby`, {
        params: { latitude, longitude, radius_km: radiusKm }
    });
    return response.data;
};