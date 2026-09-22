/**
 * Firebase Firestore Service for Sagra Umbra
 * Implements Modular SDK v9/v11 with offline persistence, real-time synchronization,
 * and seamless fallback to FastAPI REST API.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    initializeFirestore,
    getFirestore,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    persistentLocalCache,
    persistentMultipleTabManager
} from 'firebase/firestore';

// Configuration: can be overridden via environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-sagra-umbra-placeholder",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sagra-umbra.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sagra-umbra",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sagra-umbra.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

let app = null;
let db = null;
let firestoreInitialized = false;

export function getFirestoreDb() {
    if (db) return db;

    try {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

        // Try initializing with robust offline persistence
        try {
            db = initializeFirestore(app, {
                localCache: persistentLocalCache({
                    tabManager: persistentMultipleTabManager()
                })
            });
        } catch {
            // Fallback to standard getFirestore if already initialized
            db = getFirestore(app);
        }

        firestoreInitialized = true;
        return db;
    } catch (err) {
        console.warn('Firestore initialization deferred or unavailable:', err?.message || err);
        return null;
    }
}

/**
 * Fetch all festivals from Firestore with offline cache support
 */
export async function getFestivalsFromFirestore() {
    const database = getFirestoreDb();
    if (!database) return null;

    try {
        const festivalsCol = collection(database, 'festivals');
        const q = query(festivalsCol, orderBy('start_date', 'asc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        const results = [];
        snapshot.forEach(docSnap => {
            results.push({ id: docSnap.id, ...docSnap.data() });
        });
        return results;
    } catch (err) {
        console.warn('Firestore fetch failed, falling back:', err?.message || err);
        return null;
    }
}

/**
 * Real-time listener for festivals list
 * @param {Function} onUpdate - callback receiving array of festivals
 * @returns {Function} unsubscribe function
 */
export function subscribeFestivals(onUpdate) {
    const database = getFirestoreDb();
    if (!database) return () => {};

    try {
        const festivalsCol = collection(database, 'festivals');
        const q = query(festivalsCol, orderBy('start_date', 'asc'));

        return onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            onUpdate(list);
        }, (error) => {
            console.warn('Firestore festival listener error:', error);
        });
    } catch (err) {
        console.warn('Cannot subscribe to Firestore festivals:', err);
        return () => {};
    }
}

/**
 * Real-time listener for reviews of a specific festival
 * @param {string|number} festivalId
 * @param {Function} onUpdate - callback receiving array of reviews
 * @returns {Function} unsubscribe function
 */
export function subscribeReviews(festivalId, onUpdate) {
    const database = getFirestoreDb();
    if (!database || !festivalId) return () => {};

    try {
        const reviewsCol = collection(database, 'reviews');
        const q = query(
            reviewsCol,
            where('festival_id', '==', String(festivalId)),
            orderBy('created_at', 'desc'),
            limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach(docSnap => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            onUpdate(list);
        }, (error) => {
            console.warn('Firestore review listener error:', error);
        });
    } catch (err) {
        console.warn('Cannot subscribe to Firestore reviews:', err);
        return () => {};
    }
}

/**
 * Add a user review to Firestore
 * @param {string|number} festivalId
 * @param {{ author: string, rating: number, comment?: string }} reviewData
 */
export async function addReviewToFirestore(festivalId, reviewData) {
    const database = getFirestoreDb();
    if (!database) throw new Error('Firestore not initialized');

    const reviewsCol = collection(database, 'reviews');
    const docRef = await addDoc(reviewsCol, {
        festival_id: String(festivalId),
        author: reviewData.author || 'Anonimo',
        rating: Number(reviewData.rating) || 5,
        comment: reviewData.comment || '',
        created_at: serverTimestamp()
    });

    return { id: docRef.id, ...reviewData };
}

/**
 * Submit a festival suggestion to Firestore submissions collection
 * @param {Object} data - festival form fields
 */
export async function submitFestivalToFirestore(data) {
    const database = getFirestoreDb();
    if (!database) throw new Error('Firestore not initialized');

    const submissionsCol = collection(database, 'submissions');
    const docRef = await addDoc(submissionsCol, {
        ...data,
        status: 'pending',
        submitted_at: serverTimestamp()
    });

    return { id: docRef.id, status: 'pending' };
}
