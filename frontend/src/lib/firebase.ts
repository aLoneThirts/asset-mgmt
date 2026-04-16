import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

function cleanEnv(value: string | undefined) {
  return value?.trim() || undefined;
}

const firebaseConfig = {
  apiKey:            cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain:        cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId:         cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket:     cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId:             cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID),
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
