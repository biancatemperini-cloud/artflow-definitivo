// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
// Quita la importación de getAuth
// import { getAuth, onAuthStateChanged } from 'firebase/auth'; 
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase-config'; // 👈 Importa 'auth' desde tu config

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Ya no necesitas llamar a getAuth() aquí
        // const auth = getAuth(); 
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setUserId(user ? user.uid : null);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userId,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};