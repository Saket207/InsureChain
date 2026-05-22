import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyACW3-A60Y0Rzox__XEBwgGcSFKMzzpfDE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "insurechain-2d763.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://insurechain-2d763-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "insurechain-2d763",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "insurechain-2d763.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "463548601595",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:463548601595:web:89534ba8a877b3f1520c5e",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-6BXY5VM6Q9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth & Firestore with Long Polling to prevent "client offline" errors
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export default app;
