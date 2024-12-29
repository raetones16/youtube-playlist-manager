// src/popup/components/common/toggle.tsx
import React from 'react';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    className?: string;
}

const Toggle = ({ 
    checked, 
    onChange, 
    disabled = false,
    label,
    className = ''
}: ToggleProps) => {
    return (
        <label className={`flex items-center cursor-pointer ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}>
            {label && (
                <span className="mr-2 text-gray-700">{label}</span>
            )}
            <div 
                className={`relative w-10 h-5 transition-colors duration-200 ease-in-out rounded-full ${
                    checked ? 'bg-red-600' : 'bg-gray-200'
                }`}
                onClick={() => !disabled && onChange(!checked)}
            >
                <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 transition-transform duration-200 ease-in-out transform bg-white rounded-full ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </div>
        </label>
    );
};

export default Toggle;