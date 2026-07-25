'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface Action {
    id: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    danger?: boolean; // For destructive actions
}

interface ActionsDropdownProps {
    trigger: ReactNode; // The button/element that triggers the dropdown
    actions: Action[];
    title?: string;
    align?: 'left' | 'right';
}

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({ 
    trigger, 
    actions, 
    title = 'ACTIONS',
    align = 'right' 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleActionClick = (action: Action) => {
        action.onClick();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger */}
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div 
                    className={`absolute top-full mt-2 w-48 bg-white border border-stroke rounded-lg shadow-lg z-50 animate-fade-in ${
                        align === 'right' ? 'right-0' : 'left-0'
                    }`}
                >
                    {/* Header */}
                    {title && (
                        <div className="px-4 pt-3">
                            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                                {title}
                            </p>
                        </div>
                    )}

                    {/* Actions List */}
                    <div className="py-2">
                        {actions.map((action) => (
                            <button
                                key={action.id}
                                onClick={() => handleActionClick(action)}
                                className={`w-full px-4 py-1.5 flex items-center gap-3 text-xs tracking-wide transition-colors cursor-pointer ${
                                    action.danger 
                                        ? 'text-red-600 hover:bg-red-50' 
                                        : 'text-text-heading hover:bg-neutral-50'
                                }`}
                            >
                                <span className="flex-shrink-0">{action.icon}</span>
                                <span className="font-medium">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActionsDropdown;