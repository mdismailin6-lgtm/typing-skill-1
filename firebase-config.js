// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAc_XiE15_kC6RKwgrVCZVcYdOg6TjwPnM",
  authDomain: "typing-skill-f3d59.firebaseapp.com",
  projectId: "typing-skill-f3d59",
  storageBucket: "typing-skill-f3d59.firebasestorage.app",
  messagingSenderId: "858162740038",
  appId: "1:858162740038:web:f6b0564252e49cfc904347"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
        console.log('The current browser doesn\'t support persistence.');
    }
});

export { db, auth };

// Collections
export const COLLECTIONS = {
    TYPING_CONTENT: 'typing_content',
    TYPING_WORDS: 'typing_words',
    TYPING_SENTENCES: 'typing_sentences',
    TYPING_PARAGRAPHS: 'typing_paragraphs',
    USER_RESULTS: 'user_results'
};
