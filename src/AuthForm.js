import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, linkWithCredential, EmailAuthProvider } from 'firebase/auth';
import { CatIcon } from './components/CatIcon';

const AuthForm = ({ auth, user }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            // If the user is anonymous, link the accounts
            if (user && user.isAnonymous) {
                const credential = GoogleAuthProvider.credentialFromResult(result);
                await linkWithCredential(user, credential);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 to-rose-100 dark:from-gray-900 dark:via-purple-900 dark:to-slate-800 p-4">
            <div className="w-full max-w-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 space-y-6">
                <div className="text-center">
                    <CatIcon className="mx-auto h-12 w-12 text-primary" />
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {isLogin ? 'Bienvenida de Nuevo' : 'Crea tu Cuenta'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {isLogin ? 'Ingresa para continuar tu flujo creativo.' : 'Únete para empezar a organizar tu arte.'}
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleAuthAction}>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo Electrónico" required className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500" />
                    <button type="submit" className="w-full py-2 px-4 bg-pink-600 text-white rounded-md hover:bg-pink-700 font-semibold">{isLogin ? 'Ingresar' : 'Registrarse'}</button>
                </form>

                {error && <p className="text-center text-sm text-red-500">{error}</p>}

                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-600" /></div>
                    <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">O continúa con</span></div>
                </div>

                <button onClick={handleGoogleSignIn} className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <svg className="w-5 h-5 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                        <path fill="#4285F4" d="M24 9.5c3.2 0 5.8 1.4 7.6 3.1l5.8-5.8C34.4 3.4 29.6 1 24 1 14.9 1 7.4 6.6 4 14.5l6.9 5.3C12.5 13.2 17.8 9.5 24 9.5z"></path>
                        <path fill="#34A853" d="M46.2 25.4c0-1.7-.2-3.4-.5-5H24v9.3h12.5c-.5 3-2.1 5.6-4.6 7.3l6.5 5c3.8-3.5 6-8.7 6-14.6z"></path>
                        <path fill="#FBBC05" d="M10.9 28.3c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-6.9-5.3C1.5 17.6 0 22.5 0 28.3s1.5 10.7 3.9 14.8l6.9-5.3c-.5-1.5-.8-3.1-.8-4.8z"></path>
                        <path fill="#EA4335" d="M24 47.5c5.6 0 10.4-1.8 13.8-5l-6.5-5c-1.9 1.3-4.3 2-6.8 2-6.2 0-11.5-3.7-13.1-8.8l-6.9 5.3C7.4 41.4 14.9 47.5 24 47.5z"></path>
                    </svg>
                    Google
                </button>

                <p className="text-center text-sm">
                    <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                        {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthForm;
