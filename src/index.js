import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext'; // 👈 Se importa el proveedor de contexto
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Aquí renderizamos la aplicación
root.render(
  <React.StrictMode>
    {/* 👇 Aquí está la corrección: <App /> ahora está dentro de <AuthProvider> */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// Si quieres medir el rendimiento de tu aplicación, puedes pasar una función
// para registrar los resultados (por ejemplo: reportWebVitals(console.log))
// o enviarlos a un punto final de análisis. Más información: https://bit.ly/CRA-vitals
reportWebVitals();