'use client';

import React from 'react';
import { PlusIcon } from '../Icons';

interface AddLeadPhaseButtonProps {
    onClick: () => void;
    variant?: 'default' | 'light';
}

const AddLeadPhaseButton: React.FC<AddLeadPhaseButtonProps> = ({ onClick, variant = 'default' }) => {
    return (
        <button
            onClick={onClick}
            className={`h-6 w-6 shrink-0 flex items-center justify-center border-stroke rounded-full hover:bg-primary/5 transition-all group
                ${
                variant === 'light' 
                    ? 'border border-dashed' 
                    : 'border-2 border-dashed'
            }`}
            aria-label="Add new lead phase"
        >
            <PlusIcon 
                size={12} 
                className="text-stroke stroke-2"
            />
        </button>
    );
};

export default AddLeadPhaseButton;