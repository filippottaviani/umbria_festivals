import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sagra_umbra_favorites';
const EVENT_NAME = 'sagra_favorites_updated';

export const getFavoriteIds = () => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const isFavorite = (id) => {
    if (!id) return false;
    const ids = getFavoriteIds();
    return ids.includes(String(id));
};

export const toggleFavorite = (id) => {
    if (!id || typeof window === 'undefined') return false;
    const strId = String(id);
    const ids = getFavoriteIds();
    const index = ids.indexOf(strId);
    let updated;
    let added = false;

    if (index >= 0) {
        updated = ids.filter(item => item !== strId);
        added = false;
    } else {
        updated = [...ids, strId];
        added = true;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.warn('Errore nel salvataggio dei preferiti in localStorage:', e);
    }

    window.dispatchEvent(new CustomEvent(EVENT_NAME, {
        detail: { favorites: updated, id: strId, isFavorite: added }
    }));

    return added;
};

export const clearFavorites = () => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT_NAME, {
        detail: { favorites: [] }
    }));
};

/**
 * React hook for consuming and reacting to favorite sagre changes across all components.
 */
export const useFavorites = () => {
    const [favorites, setFavorites] = useState(getFavoriteIds);

    useEffect(() => {
        const handleUpdate = () => {
            setFavorites(getFavoriteIds());
        };

        window.addEventListener(EVENT_NAME, handleUpdate);
        window.addEventListener('storage', handleUpdate);

        return () => {
            window.removeEventListener(EVENT_NAME, handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    const checkFavorite = useCallback((id) => {
        if (!id) return false;
        return favorites.includes(String(id));
    }, [favorites]);

    const toggle = useCallback((id) => {
        return toggleFavorite(id);
    }, []);

    return {
        favorites,
        count: favorites.length,
        isFavorite: checkFavorite,
        toggleFavorite: toggle,
        clearFavorites
    };
};
