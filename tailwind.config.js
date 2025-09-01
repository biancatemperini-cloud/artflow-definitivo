/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#678CEC',      // Azul periwinkle
        secondary: '#D49BAE',    // Rosa malva  
        accent: '#BBCB50',       // Verde lima
        surface: '#FFFFFF',      // Blanco puro
        neutral: '#2A2D3A',      // Gris azulado oscuro
      }
    },
  },
  plugins: [],
}