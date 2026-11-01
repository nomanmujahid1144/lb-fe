'use client';

import React from 'react';

interface AddLeadPhaseButtonProps {
    onClick: () => void;
    variant?: 'default' | 'light';
}

const AddLeadPhaseButton: React.FC<AddLeadPhaseButtonProps> = ({ onClick, variant = 'default' }) => {
    if (variant === 'light') return null;

    return (
        <div className="w-auto h-fit shrink-0 p-1.5 rounded-xl bg-phase-blue/40">
            <button
                onClick={onClick}
                className=" h-fit px-10 py-2 flex items-center justify-center border border-dashed border-gray-600 rounded-xl transition-colors cursor-pointer"
                aria-label="Add new lead phase"
            >
                <span className="text-sm font-normal text-icon-linkedin flex items-center gap-1.5">
                    <span className="text-lg">+</span>
                    Add lead phase
                </span>
            </button>
        </div>
    );
};

export default AddLeadPhaseButton;