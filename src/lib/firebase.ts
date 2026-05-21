import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3Hln_MAal-Jd9XWfvzTNxVM1yTGCo6U8",
  authDomain: "v-kanban.firebaseapp.com",
  projectId: "v-kanban",
  storageBucket: "v-kanban.firebasestorage.app",
  messagingSenderId: "352213506072",
  appId: "1:352213506072:web:1b21ad5c8c3656f1200b6d",
  measurementId: "G-MR17QBWX3H"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
