'use client';

import React, { ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
    showCloseButton?: boolean;
    closeOnBackdropClick?: boolean;
    zIndex?: number; // Add this prop
}

const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    maxWidth = 'md',
    showCloseButton = true,
    closeOnBackdropClick = true,
    zIndex = 50 // Default z-index
}) => {
    if (!isOpen) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        full: 'max-w-full'
    };

    const handleBackdropClick = () => {
        if (closeOnBackdropClick) {
            onClose();
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 animate-fade-in"
                style={{ zIndex: zIndex }}
                onClick={handleBackdropClick}
            />

            {/* Modal */}
            <div 
                className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full ${maxWidthClasses[maxWidth]} md:px-4 px-2 animate-scale-in`}
                style={{ zIndex: zIndex + 1 }}
            >
                <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-6 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    {(title || showCloseButton) && (
                        <div className="flex items-center justify-between mb-6">
                            {title && (
                                <h2 className="text-xl font-semibold text-text-heading">{title}</h2>
                            )}
                            {showCloseButton && (
                                <button
                                    onClick={onClose}
                                    className="text-neutral-400 hover:text-neutral-600 transition-colors ml-auto"
                                    aria-label="Close modal"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    <div>
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Modal;