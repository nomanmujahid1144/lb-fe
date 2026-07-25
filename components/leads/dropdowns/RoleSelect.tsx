'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon } from '@/components/Icons';

const ROLES = [
    'Business Development Manager',
    'CTO',
    'Chief Executive Officer',
    'Enterprise Account Manager',
    'Operations Manager',
    'Product Lead',
    'Sales Director',
    'Head of Partnerships',
    'VP Marketing'
];

interface RoleSelectProps {
    selectedRole: string;
    onSelect: (role: string) => void;
    onReset: () => void;
}

const RoleSelect: React.FC<RoleSelectProps> = ({ selectedRole, onSelect, onReset }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredRoles = ROLES.filter(role =>
        role.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

    // Show selected role when not searching
    const displayValue = isOpen ? searchQuery : selectedRole;

    return (
        <div className="mb-6" ref={dropdownRef}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-text-heading">Role</h4>
                <button 
                    onClick={() => {
                        onReset();
                        setSearchQuery('');
                    }}
                    className="text-xs text-icon-linkedin hover:text-icon-linkedin/95 cursor-pointer transition-colors font-medium"
                >
                    Reset
                </button>
            </div>

            {/* Search Input */}
            <div className="relative">
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                    type="text"
                    placeholder="Search roles"
                    value={displayValue}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-neutral-200 bg-neutral-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-icon-linkedin/20 focus:border-icon-linkedin"
                />

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute top-full mt-2 w-full bg-white border border-stroke rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto animate-fade-in">
                        {filteredRoles.length > 0 ? (
                            <>
                                <div className="px-3 py-2 border-b border-neutral-100 sticky top-0 bg-white">
                                    <p className="text-xs font-semibold text-text-heading flex items-center gap-1">
                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                            <path d="M11.6667 3.5L5.25 9.91667L2.33333 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Select a role
                                    </p>
                                </div>
                                {filteredRoles.map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => {
                                            onSelect(role);
                                            setIsOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className="w-full px-3 py-2 text-sm text-text-heading hover:bg-neutral-50 transition-colors text-left"
                                    >
                                        {role}
                                    </button>
                                ))}
                            </>
                        ) : (
                            <div className="px-3 py-4 text-sm text-neutral-400 text-center">
                                No roles found
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoleSelect;