'use client';

import React, { useRef, useEffect } from 'react';

interface DropdownWrapperProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    triggerRef?: React.RefObject<HTMLElement | null>;
}

const DropdownWrapper: React.FC<DropdownWrapperProps> = ({ 
    isOpen, 
    onClose, 
    children,
    triggerRef 
}) => {
    const desktopDropdownRef = useRef<HTMLDivElement>(null);
    const mobileDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            
            // Check both mobile and desktop refs
            const clickedInsideMobile = mobileDropdownRef.current?.contains(target);
            const clickedInsideDesktop = desktopDropdownRef.current?.contains(target);
            const clickedTrigger = triggerRef?.current?.contains(target);
            
            // If clicked outside all of these, close
            if (!clickedInsideMobile && !clickedInsideDesktop && !clickedTrigger) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
            // Prevent body scroll on mobile when dropdown is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen) return null;

    return (
        <>
            {/* Mobile: Fixed Modal (centered) */}
            <div className="sm:hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
                <div 
                    ref={mobileDropdownRef}
                    className="bg-white border border-neutral-200 rounded-lg shadow-xl w-full max-w-sm animate-fade-in"
                    style={{ animationDuration: '200ms' }}
                >
                    {children}
                </div>
            </div>

            {/* Desktop: Normal Dropdown */}
            <div 
                ref={desktopDropdownRef}
                className="hidden sm:block absolute top-full left-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 animate-fade-in"
                style={{ animationDuration: '200ms' }}
            >
                {children}
            </div>
        </>
    );
};

export default DropdownWrapper;