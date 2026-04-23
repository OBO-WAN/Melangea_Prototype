import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDukA-CZ3eJneTOajslMoDx-E8rWbFkrxw",
  authDomain: "newsletter-35ff2.firebaseapp.com",
  projectId: "newsletter-35ff2",
  storageBucket: "newsletter-35ff2.firebasestorage.app",
  messagingSenderId: "649210069998",
  appId: "1:649210069998:web:e63de8aa2e76b60ffe84ff",
  measurementId: "G-HVTSZPG0MM",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.firebaseApp = app;
window.firestoreDb = db;