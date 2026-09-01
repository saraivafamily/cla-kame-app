import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ targetDateStr }) => {
  const [timeLeft, setTimeLeft] = useState('Calculando...');

  useEffect(() => {
    if (!targetDateStr) return;
    
    // Tratamento universal de data para não bugar no iOS/Safari
    const safeDateStr = targetDateStr.includes('T') ? targetDateStr : `${targetDateStr}T00:00:00`;
    const target = new Date(safeDateStr).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('🔥 INICIADO 🔥');
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      setTimeLeft(d > 0 ? `${d}d ${timeStr}` : timeStr);
    };

    updateTimer(); 
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  return <span className="font-mono font-black tracking-widest">{timeLeft}</span>;
};

export default CountdownTimer;
