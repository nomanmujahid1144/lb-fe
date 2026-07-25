'use client';

import React, { useState, useRef } from 'react';
import DropdownWrapper from './DropdownWrapper';
import { ArrowDownIcon, TickCorrectIcon } from '@/components/Icons';

const LEAD_PHASES = [
    { id: 'needs-review', label: 'Lead needs to be reviewed' },
    { id: 'follow-up-myself', label: 'Will follow up myself' },
    { id: 'leadblocks-follow-up', label: 'LeadBlocks can follow up' },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'meeting-planned', label: 'Meeting planned' },
    { id: 'archived', label: 'Archived' },
];

interface LeadPhaseTopBarDropdownProps {
    selectedPhases: string[];
    onToggle: (phaseId: string) => void;
    onReset: () => void;
}

const LeadPhaseTopBarDropdown: React.FC<LeadPhaseTopBarDropdownProps> = ({
    selectedPhases,
    onToggle,
    onReset,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const label = selectedPhases.length > 0
        ? `Lead Phase (${selectedPhases.length})`
        : 'Lead Phase';

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-all ${
                    selectedPhases.length > 0
                        ? 'text-icon-linkedin border-icon-linkedin/30 bg-icon-linkedin/5'
                        : 'text-text-breadcrumb border-stroke hover:bg-neutral-50 hover:border-stroke/85'
                }`}
            >
                <span>{label}</span>
                <ArrowDownIcon size={12} />
            </button>

            <DropdownWrapper isOpen={isOpen} onClose={() => setIsOpen(false)} triggerRef={triggerRef}>
                <div className="w-64 py-2">
                    <div className="px-4 py-2 border-b border-neutral-100 flex items-center justify-between">
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Lead Phase</p>
                        {selectedPhases.length > 0 && (
                            <button
                                onClick={onReset}
                                className="text-xs text-icon-linkedin hover:text-icon-linkedin/80 cursor-pointer transition-colors"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                    <div className="py-1">
                        {LEAD_PHASES.map((phase) => (
                            <button
                                key={phase.id}
                                onClick={() => onToggle(phase.id)}
                                className="w-full flex items-center justify-between px-4 py-2 text-sm text-text-heading hover:bg-neutral-50 transition-colors"
                            >
                                <span>{phase.label}</span>
                                {selectedPhases.includes(phase.id) && (
                                    <TickCorrectIcon size={14} className="text-icon-linkedin" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </DropdownWrapper>
        </div>
    );
};

export default LeadPhaseTopBarDropdown;