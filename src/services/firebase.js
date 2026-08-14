import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBQK1cy5yAsiN_RlVgzujnl0vDkI14mQy8",
    authDomain: "amecatzz.firebaseapp.com",
    projectId: "amecatzz",
    storageBucket: "amecatzz.firebasestorage.app",
    messagingSenderId: "432779469154",
    appId: "1:432779469154:web:40f536d085a5eeb0a14c3b",
    measurementId: "G-PYEP2K8Z85"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
});

// Firestore transport warnings are useful during local development. Production
// listener failures still flow through each subscription's error callback.
setLogLevel(import.meta.env.DEV ? 'warn' : 'error');

// Safe export
export { app, auth, googleProvider, db };

// Local Preview Compatibility
if (typeof window !== 'undefined') {
    window.FirebaseService = { app, auth, googleProvider, db };
}
