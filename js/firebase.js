import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp, getDocs} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Substitui pelas tuas credenciais geradas na Consola do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCj-HB3-Zco6mfFsu3a5VusbrQEnKfsOTw",
  authDomain: "semaforo-ponte.firebaseapp.com",
  projectId: "semaforo-ponte",
  storageBucket: "semaforo-ponte.firebasestorage.app",
  messagingSenderId: "1093162373330",
  appId: "1:1093162373330:web:b84be8c8af1dc73d901d0b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp, getDocs };