// src/popup/components/common/button.tsx
import React from 'react';

interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'icon';
    disabled?: boolean;
    onClick?: () => void;
    children: React.ReactNode;
    className?: string;
}

const Button = ({ 
    variant = 'primary', 
    disabled = false, 
    onClick, 
    children,
    className = ''
}: ButtonProps) => {
    const baseStyles = 'flex items-center justify-center font-medium transition-opacity';
    
    const variantStyles = {
        primary: 'bg-red-600 text-white rounded-full px-4 h-9 hover:opacity-90',
        secondary: 'bg-gray-100 text-gray-800 rounded-full px-4 h-9 hover:bg-gray-200',
        icon: 'bg-transparent p-1 rounded-full hover:bg-gray-100 w-8 h-8'
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variantStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {children}
        </button>
    );
};

export default Button;