import React from 'react';

const Confetti = ({ message }) => {
  const confettiPieces = Array.from({ length: 150 }).map((_, index) => {
    // Genera una trayectoria de explosión aleatoria
    const xEnd = `${Math.random() * 200 - 100}vw`;
    const yEnd = `${Math.random() * 200 - 100}vh`;
    const duration = `${Math.random() * 2 + 3}s`;
    const delay = `${Math.random() * 0.2}s`;

    const colors = ['#f472b6', '#a78bfa', '#3b82f6', '#facc15', '#4ade80'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const style = {
      '--x-end': xEnd,
      '--y-end': yEnd,
      animation: `confetti-explode ${duration} ease-out ${delay} forwards`,
      backgroundColor: color,
      width: `${Math.random() * 8 + 6}px`,
      height: `${Math.random() * 15 + 8}px`,
      left: '50%',
      top: '50%',
      position: 'absolute',
      transform: 'rotate(' + (Math.random() * 360) + 'deg)',
    };

    return <div key={index} style={style} className="confetti-piece"></div>;
  });

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-50">
      {confettiPieces}
      {message && (
        <div 
          className="absolute top-1/2 left-1/2 bg-pink-500/90 backdrop-blur-sm text-center p-6 rounded-2xl shadow-2xl"
          style={{ animation: `zoom-in-fade 0.5s ease-out forwards` }}
        >
          <p className="text-2xl font-bold text-blue-200">{message}</p>
        </div>
      )}
    </div>
  );
};

export default Confetti;

