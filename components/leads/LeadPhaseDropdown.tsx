'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowDownIcon, PlusIcon } from '../Icons';

interface LeadPhaseDropdownProps {
    currentPhase: string;
    currentPhaseColor: string;
    allPhases: { id: string; title: string; color: string }[];
    onPhaseChange: (newPhase: string, newColor: string) => void;
    onAddPhaseClick: () => void;
}

const LeadPhaseDropdown: React.FC<LeadPhaseDropdownProps> = ({
    currentPhase,
    currentPhaseColor,
    allPhases,
    onPhaseChange,
    onAddPhaseClick,
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

    const handlePhaseSelect = (phase: { id: string; title: string; color: string }) => {
        onPhaseChange(phase.title, phase.color);
        setIsOpen(false);
    };

    // Helper function to extract hex color from bg-[#hex] or return as-is if already hex
    const getHexColor = (color: string): string => {
        if (color.startsWith('#')) return color;
        const match = color.match(/bg-\[([#A-Fa-f0-9]+)\]/);
        return match ? match[1] : color;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-3 py-1.5 border border-primary-button/20 bg-primary-button/20 text-primary-button/50 text-xs font-medium rounded-full flex items-center gap-2 hover:bg-blue-200 transition-colors cursor-pointer"
            >
                Leadphase: <span className='text-primary-button'>{currentPhase}</span>
                <ArrowDownIcon size={9} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-60 bg-white border border-stroke rounded-xl shadow-lg z-50 animate-fade-in py-2">
                    {allPhases.map((phase) => (
                        <div 
                            key={phase.id} 
                            className='flex justify-start items-center gap-3 px-4 py-2 hover:bg-neutral-50 transition-colors cursor-pointer'
                            onClick={() => handlePhaseSelect(phase)}
                        >
                            <span
                                style={{ backgroundColor: getHexColor(phase.color) }}
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                aria-label={`${phase.title} color`}
                            />
                            <span
                                className={`text-xs text-left flex-1 ${
                                    phase.title === currentPhase
                                        ? 'font-medium'
                                        : ''
                                }`}
                            >
                                {phase.title}
                            </span>
                        </div>
                    ))}

                    {/* Add New Phase */}
                    <button
                        onClick={() => {
                            onAddPhaseClick();
                            setIsOpen(false);
                        }}
                        className='w-full px-4 py-2.5 flex justify-start items-center gap-2 cursor-pointer text-xs text-left text-neutral-400 hover:bg-neutral-50 transition-colors mt-1 pt-3'
                    >
                        <span className="border border-dashed border-neutral-400 rounded-full flex items-center justify-center w-4 h-4">
                            <PlusIcon size={10} />
                        </span>
                        Add a new lead phase
                    </button>
                </div>
            )}
        </div>
    );
};

export default LeadPhaseDropdown;