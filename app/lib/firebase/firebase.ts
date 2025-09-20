// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// Note: Firebase Web API keys are not secrets. They should be restricted in GCP.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBC62vsKGQqdgpyC9RugoHEfh9UcRi2SMA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "one-cup-eng.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "one-cup-eng",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "one-cup-eng.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "615807178262",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:615807178262:web:9a96a5f0d94ae628d74737",
};

// Initialize Firebase (guard against double init)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// IMPORTANT: For the new domain 1cupenglish.com to work with Firebase Auth and reCAPTCHA
// You MUST add it as an Authorized Domain in the Firebase Console:
// 1. Go to Firebase Console -> Authentication -> Settings -> Authorized Domains
// 2. Add 1cupenglish.com to the list
// 3. Also make sure 1cupenglish.com is added in the reCAPTCHA settings in Google Cloud Console

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "asia-northeast3");
