import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-2 rounded-sm font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 text-sm";
  
  const variants = {
    primary: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50",
    secondary: "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700",
    outline: "border border-white text-white! hover:bg-white hover:text-black"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};