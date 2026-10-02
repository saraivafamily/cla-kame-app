import React from 'react';
import { Shield } from 'lucide-react';

const ShieldDisplay = ({ shield, frame, size = 'normal', className = '' }) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    normal: 'w-12 h-12',
    large: 'w-20 h-20',
    xl: 'w-32 h-32'
  };

  let frameStyle = {};
  let frameClasses = '';

  // 🌟 O SISTEMA DE AURAS QUE RESPEITA O RECORTE DO ESCUDO
  if (frame === 'frame_ouro') {
     frameClasses = 'scale-110 z-10';
     frameStyle = { filter: 'drop-shadow(0px 0px 8px rgba(251, 191, 36, 0.9)) drop-shadow(0px 0px 2px rgba(251, 191, 36, 1))' };
  } else if (frame === 'frame_diamante') {
     frameClasses = 'scale-125 z-10';
     frameStyle = { filter: 'drop-shadow(0px 0px 10px rgba(34, 211, 238, 0.9)) drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.8))' };
  } else if (frame === 'frame_fogo') {
     frameClasses = 'scale-125 z-10 animate-pulse';
     frameStyle = { filter: 'drop-shadow(0px 0px 12px rgba(239, 68, 68, 1)) drop-shadow(0px 0px 6px rgba(245, 158, 11, 0.8))' };
  }

  if (!shield) {
    return (
      <div className={`bg-blue-900/50 rounded-full flex items-center justify-center border border-blue-700/50 ${sizeClasses[size]} ${className}`}>
        <Shield className="text-blue-500/50" size={size === 'small' ? 16 : size === 'large' ? 40 : 24} />
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}>
      <img
        src={shield}
        alt="Escudo"
        style={frameStyle}
        className={`w-full h-full object-contain transition-all duration-300 ${frameClasses}`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = 'https://via.placeholder.com/150/1e3a8a/3b82f6?text=Escudo';
        }}
      />
    </div>
  );
};

export default ShieldDisplay;