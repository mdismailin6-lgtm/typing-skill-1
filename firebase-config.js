import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAc_XiE15_kC6RKwgrVCZVcYdOg6TjwPnM",
  authDomain: "typing-skill-f3d59.firebaseapp.com",
  projectId: "typing-skill-f3d59",
  storageBucket: "typing-skill-f3d59.firebasestorage.app",
  messagingSenderId: "858162740038",
  appId: "1:858162740038:web:f6b0564252e49cfc904347"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

enableIndexedDbPersistence(db).catch((err) => {
    console.log('Persistence error:', err);
});

export { db, auth };

export const COLLECTIONS = {
    TYPING_CONTENT: 'typing_content',
    TYPING_WORDS: 'typing_words',
    TYPING_SENTENCES: 'typing_sentences',
    USER_RESULTS: 'user_results'
};
