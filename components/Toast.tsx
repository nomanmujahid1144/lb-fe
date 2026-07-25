import React from 'react';
import { CircularCheckMarkIcon } from './Icons';

interface CustomToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
}

const CustomToast: React.FC<CustomToastProps> = ({ message, type = 'success' }) => {
    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CircularCheckMarkIcon size={20} className="text-green-600" />;
            case 'error':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-red-600">
                        <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
                        <path d="M15 9l-6 6m0-6l6 6" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                );
            case 'info':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-blue-600">
                        <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
                        <path d="M12 16v-4m0-4h.01" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex items-center gap-3 bg-white border border-stroke rounded-xl px-5 py-3.5 shadow-lg">
            {getIcon()}
            <span className="text-sm font-medium text-text-heading">
                {message}
            </span>
        </div>
    );
};

export default CustomToast;