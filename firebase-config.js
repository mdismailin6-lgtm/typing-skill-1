// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAc_XiE15_kC6RKwgrVCZVcYdOg6TjwPnM",
    authDomain: "typing-skill-f3d59.firebaseapp.com",
    projectId: "typing-skill-f3d59",
    storageBucket: "typing-skill-f3d59.firebasestorage.app",
    messagingSenderId: "858162740038",
    appId: "1:858162740038:web:f6b0564252e49cfc904347"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.log('The current browser doesn\'t support persistence.');
        }
    });

// Collections
const COLLECTIONS = {
    TYPING_CONTENT: 'typing_content',
    TYPING_WORDS: 'typing_words',
    TYPING_SENTENCES: 'typing_sentences',
    TYPING_PARAGRAPHS: 'typing_paragraphs',
    USER_RESULTS: 'user_results'
};

// Export for use in other files
window.db = db;
window.COLLECTIONS = COLLECTIONS;
