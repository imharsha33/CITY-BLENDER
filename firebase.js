// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// Web app Firebase configuration read securely from environment variables
const firebaseConfig = {
    apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "city-blender-8f2cc.firebaseapp.com",
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "city-blender-8f2cc",
    storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "city-blender-8f2cc.firebasestorage.app",
    messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "1037424996798",
    appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:1037424996798:web:1a8464ea30514d22c689ef",
    measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-2NYCBWMV8P"
};

let app = null;
let analytics = null;

if (firebaseConfig.apiKey) {
    try {
        app = initializeApp(firebaseConfig);
        isSupported().then((supported) => {
            if (supported) analytics = getAnalytics(app);
        }).catch(() => {});
    } catch (e) {
        console.warn("Firebase initialization skipped:", e);
    }
}

export { app, analytics };
