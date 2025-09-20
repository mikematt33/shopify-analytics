// Firebase Configuration
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCSHR5UWuVfKrkUnOIlxBpjEl5xQwADEBw",
  authDomain: "shopify-analytics-c7307.firebaseapp.com",
  projectId: "shopify-analytics-c7307",
  storageBucket: "shopify-analytics-c7307.firebasestorage.app",
  messagingSenderId: "856828773169",
  appId: "1:856828773169:web:66bef99aa152a098a52610",
  measurementId: "G-7PQX140S2N",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
