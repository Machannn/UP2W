// INISIALISASI FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB0h60Mo9eDzhoobgHETjqJo4m_QG_rsqs",
  authDomain: "monitoring-k3l-24eb5.firebaseapp.com",
  projectId: "monitoring-k3l-24eb5",
  storageBucket: "monitoring-k3l-24eb5.firebasestorage.app",
  messagingSenderId: "264914059362",
  appId: "1:264914059362:web:9e8f6e8e1002322048913b",
  measurementId: "G-WFQHL8TF1G"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);