import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Tu configuración de Firebase, tomada de tu archivo .env.local
const firebaseConfig = {
  apiKey: "AIzaSyBU_5vqubUEJ9gmJLQb0Wuy_BEcSqj2gVI",
  authDomain: "mi-artflow-app.firebaseapp.com",
  projectId: "mi-artflow-app",
  storageBucket: "mi-artflow-app.firebasestorage.app",
  messagingSenderId: "644491567943",
  appId: "1:644491567943:web:9c8a178113f0499b92a262"
};

// Inicializamos Firebase UNA SOLA VEZ
const app = initializeApp(firebaseConfig);

// Exportamos los servicios que vamos a usar en toda la aplicación
export const db = getFirestore(app);
export const auth = getAuth(app);