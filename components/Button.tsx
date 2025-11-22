import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "font-bold rounded transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900";
  
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-700 shadow-[0_0_10px_rgba(5,150,105,0.4)]",
    secondary: "bg-slate-700 hover:bg-slate-600 text-gray-200 border border-slate-600",
    danger: "bg-red-600 hover:bg-red-500 text-white border border-red-700 shadow-[0_0_10px_rgba(220,38,38,0.4)]",
    outline: "bg-transparent border-2 border-emerald-600 text-emerald-500 hover:bg-emerald-900/30",
  };

  const sizes = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};