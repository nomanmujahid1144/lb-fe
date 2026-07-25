'use client';

import { ArrowDownIcon, PlusIcon } from '@/components/Icons';
import React, { useState, useRef, useEffect } from 'react';

interface LeadPhase {
    id: string;
    label: string;
}

const LEAD_PHASES: LeadPhase[] = [
    { id: 'needs-review', label: 'Lead needs to be reviewed' },
    { id: 'follow-up-myself', label: 'Will follow up myself' },
    { id: 'leadblocks-follow-up', label: 'LeadBlocks can follow up' },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'meeting-planned', label: 'Meeting planned' },
    { id: 'archived', label: 'Archived' }
];

interface LeadPhaseSelectProps {
    selectedPhases: string[];
    onToggle: (phaseId: string) => void;
    onReset: () => void;
}

const LeadPhaseSelect: React.FC<LeadPhaseSelectProps> = ({
    selectedPhases,
    onToggle,
    onReset
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    return (
        <div className="mb-6" ref={dropdownRef}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-text-heading">Lead Phase</h4>
                <button
                    onClick={onReset}
                    className="text-xs text-icon-linkedin hover:text-icon-linkedin/95 cursor-pointer transition-colors font-medium"
                >
                    Reset
                </button>
            </div>

            {/* Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-neutral-200 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors text-left"
                >
                    <span className={selectedPhases.length > 0 ? 'text-text-heading' : 'text-neutral-400'}>
                        {selectedPhases.length > 0
                            ? `${selectedPhases.length} selected`
                            : 'Select a lead phase'
                        }
                    </span>
                    <span className='p-2.5 bg-neutral-200/50 rounded-lg'>
                        <ArrowDownIcon size={10} rotate={isOpen} />
                    </span>
                </button>

                {isOpen && (
                    <div className="absolute top-full mt-2 w-full bg-white border border-stroke rounded-lg shadow-lg z-50 animate-fade-in">
                        {/* Header */}
                        <div className="px-3 py-2.5 border-b border-neutral-100">
                            <p className="text-sm font-semibold text-text-heading">Select a lead phase</p>
                        </div>

                        {/* Checkboxes */}
                        <div className="py-2">
                            {LEAD_PHASES.map((phase) => (
                                <label
                                    key={phase.id}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedPhases.includes(phase.id)}
                                        onChange={() => onToggle(phase.id)}
                                        className="custom-checkbox"
                                    />
                                    <span className="text-sm text-text-heading">{phase.label}</span>
                                </label>
                            ))}
                        </div>

                        {/* Add new phase link */}
                        <div className="px-3 py-2.5 border-t border-neutral-100">
                            <button
                                // onClick={onClick}
                                className="justify-center border-stroke group text-xs text-neutral-500 hover:text-neutral-700 transition-colors flex items-center gap-1.5"
                                aria-label="Add new lead phase"
                            >
                                <span className='h-4 w-4 shrink-0 border border-dashed flex justify-center items-center rounded-lg border-stroke'>
                                    <PlusIcon
                                        size={8}
                                        className="text-stroke stroke-2"
                                    />
                                </span>
                                Add a new lead phase
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="px-3 py-3 border-t border-neutral-100 flex gap-2">
                            <button
                                onClick={() => {
                                    onReset();
                                    setIsOpen(false);
                                }}
                                className="flex-1 px-4 py-2 text-sm font-medium cursor-pointer text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 px-4 py-2 text-sm font-medium cursor-pointer text-white bg-icon-linkedin hover:enabled:bg-icon-linkedin/95 rounded-lg transition-colors"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeadPhaseSelect;