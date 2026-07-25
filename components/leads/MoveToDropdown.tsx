'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowDownIcon } from '../Icons';

interface MoveToDropdownProps {
    currentColumnId: string;
    allColumns: { id: string; title: string }[];
    onMove: (targetColumnId: string) => void;
}

const MoveToDropdown: React.FC<MoveToDropdownProps> = ({ 
    currentColumnId, 
    allColumns, 
    onMove 
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

    // Filter out current column
    const availableColumns = allColumns.filter(col => col.id !== currentColumnId);

    return (
        <div className="relative md:hidden" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="cursor-pointer text-icon-linkedin flex items-center gap-1"
                title="Move to"
            >
                <span className="text-xs">Move</span>
                <ArrowDownIcon size={10} rotate={isOpen} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-stroke rounded-lg shadow-lg z-50 animate-fade-in">
                    <div className="px-3 py-2 border-b border-neutral-100">
                        <p className="text-xs font-semibold text-text-heading">Move to</p>
                    </div>
                    <div className="py-1">
                        {availableColumns.map((column) => (
                            <button
                                key={column.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMove(column.id);
                                    setIsOpen(false);
                                }}
                                className="w-full px-3 py-2 text-sm text-text-heading hover:bg-neutral-50 transition-colors text-left"
                            >
                                {column.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MoveToDropdown;