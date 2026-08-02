import axios from 'axios';

const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:8000/api/v1/festivals`;
};

const API_URL = getApiUrl();

export const fetchFestivals = async (province = '') => {
    const url = province ? `${API_URL}/?province=${province}` : `${API_URL}/`;
    const response = await axios.get(url);
    return response.data;
};

export const fetchFestivalById = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

export const fetchNearbyFestivals = async (latitude, longitude, radiusKm = 20) => {
    const response = await axios.get(`${API_URL}/search/nearby`, {
        params: { latitude, longitude, radius_km: radiusKm }
    });
    return response.data;
};

export const fetchReviews = async (festivalId) => {
    const response = await axios.get(`${API_URL}/${festivalId}/reviews`);
    return response.data;
};

export const postReview = async (festivalId, reviewData) => {
    const response = await axios.post(`${API_URL}/${festivalId}/reviews`, reviewData);
    return response.data;
};

export const submitFestivalInfo = async (submissionData) => {
    const response = await axios.post(`${API_URL}/submit-info`, submissionData);
    return response.data;
};

export const fetchAdminSubmissions = async () => {
    const response = await axios.get(`${API_URL}/admin/submissions`);
    return response.data;
};

export const updateFestival = async (id, data) => {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
};

export const uploadFestivalPoster = async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/${id}/poster`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const getImageUrl = (url, fallback = '') => {
    if (!url) return fallback;
    if (url.startsWith('/uploads/')) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        return `http://${hostname}:8000${url}`;
    }
    return url;
};