import React from 'react';

const ShieldDisplay = ({ shield, size = 'normal' }) => {
  const isImage = typeof shield === 'string' && (shield.startsWith('data:') || shield.startsWith('http'));
  const sizeClasses = { 'small': isImage ? 'w-10 h-10' : 'text-xl', 'normal': isImage ? 'w-16 h-16' : 'text-2xl', 'large': isImage ? 'w-20 h-20' : 'text-2xl' };
  if (isImage) return <img src={shield} alt="Escudo" className={`${sizeClasses[size]} object-contain drop-shadow-lg`} />;
  return <span className={`${sizeClasses[size]} inline-block text-center`} style={{lineHeight: 1}}>{shield || '🛡️'}</span>;
};

export default ShieldDisplay;
