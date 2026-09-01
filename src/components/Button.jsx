import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) => {
  const variants = { 
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50", 
    secondary: "bg-blue-700 hover:bg-blue-600 text-white", 
    danger: "bg-red-600 hover:bg-red-500 text-white", 
    outline: "border border-blue-600 text-blue-300 hover:bg-blue-800" 
  };
  
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

export default Button;
