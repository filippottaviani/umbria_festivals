import axios from 'axios';

const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:8000/api/v1/festivals`;
};

const API_URL = getApiUrl();

const getAdminHeaders = () => {
    const key = (typeof window !== 'undefined' && localStorage.getItem('admin_api_key')) || 'sagra_umbra_admin_secret_key_2026';
    return { 'X-Admin-API-Key': key };
};

export const fetchFestivals = async (province = '') => {
    try {
        const url = province ? `${API_URL}/?province=${province}` : `${API_URL}/`;
        const response = await axios.get(url);
        return response.data;
    } catch (restErr) {
        // Fallback to Firestore offline persistence cache if API is offline
        try {
            const { getFestivalsFromFirestore } = await import('./firestore');
            const fsData = await getFestivalsFromFirestore();
            if (fsData && fsData.length > 0) {
                return province ? fsData.filter(f => f.province === province) : fsData;
            }
        } catch (e) {
            // Silently fall through to throw original REST error
        }
        throw restErr;
    }
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
    try {
        const response = await axios.post(`${API_URL}/${festivalId}/reviews`, reviewData);
        // Also replicate review to Firestore in background
        import('./firestore').then(m => m.addReviewToFirestore(festivalId, reviewData)).catch(() => {});
        return response.data;
    } catch (restErr) {
        // Attempt posting directly to Firestore if backend is unreachable
        try {
            const { addReviewToFirestore } = await import('./firestore');
            return await addReviewToFirestore(festivalId, reviewData);
        } catch {
            throw restErr;
        }
    }
};

export const submitFestivalInfo = async (submissionData) => {
    try {
        const response = await axios.post(`${API_URL}/submit-info`, submissionData);
        // Mirror submission to Firestore
        import('./firestore').then(m => m.submitFestivalToFirestore(submissionData)).catch(() => {});
        return response.data;
    } catch (restErr) {
        try {
            const { submitFestivalToFirestore } = await import('./firestore');
            return await submitFestivalToFirestore(submissionData);
        } catch {
            throw restErr;
        }
    }
};

export const fetchAdminSubmissions = async () => {
    const response = await axios.get(`${API_URL}/admin/submissions`, {
        headers: getAdminHeaders()
    });
    return response.data;
};

export const createFestival = async (data) => {
    const response = await axios.post(`${API_URL}/`, data, {
        headers: getAdminHeaders()
    });
    return response.data;
};

export const updateFestival = async (id, data) => {
    const response = await axios.put(`${API_URL}/${id}`, data, {
        headers: getAdminHeaders()
    });
    return response.data;
};

export const uploadFestivalPoster = async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/${id}/poster`, formData, {
        headers: {
            ...getAdminHeaders(),
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const uploadDishImage = async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/${id}/dish-image`, formData, {
        headers: {
            ...getAdminHeaders(),
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const uploadReviewPhoto = async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/${id}/reviews/photos`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const deleteFestival = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, {
        headers: getAdminHeaders()
    });
    return response.data;
};

export const getImageUrl = (url, fallback = '') => {
    if (!url) return fallback;
    if (url.startsWith('/uploads/')) {
        const apiBase = API_URL.replace(/\/api\/v1\/festivals.*$/, '');
        return `${apiBase}${url}`;
    }
    return url;
};