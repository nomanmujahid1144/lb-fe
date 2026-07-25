'use client';

import React, { useState } from 'react';
import Modal from '../Modal';

interface AddLeadPhaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, color: string) => void;
}

const COLORS = [
    { id: 1, hex: '#FFECB6', name: 'phase-yellow' },
    { id: 2, hex: '#D0C8FF', name: 'phase-purple' },
    { id: 3, hex: '#FFD9EC', name: 'phase-pink' },
    { id: 4, hex: '#DCFFD2', name: 'phase-green' },
    { id: 5, hex: '#ECE1FF', name: 'phase-lavender' },
    { id: 6, hex: '#D5E6FF', name: 'phase-blue' },
    { id: 7, hex: '#FAF5B3', name: 'phase-light-yellow' },
    { id: 8, hex: '#BFFFF9', name: 'phase-cyan' },
];

const AddLeadPhaseModal: React.FC<AddLeadPhaseModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [phaseName, setPhaseName] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);

    const handleSubmit = () => {
        if (phaseName.trim()) {
            onSubmit(phaseName, selectedColor);
            setPhaseName('');
            setSelectedColor(COLORS[0].hex);
            onClose();
        }
    };

    const handleCancel = () => {
        setPhaseName('');
        setSelectedColor(COLORS[0].hex);
        onClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleCancel}
            title="Add a new lead phase"
            maxWidth="md"
        >
            {/* Lead Phase Name Input */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-text-heading mb-2">
                    Lead Phase Name
                </label>
                <input
                    type="text"
                    placeholder="e.g. In progress"
                    value={phaseName}
                    onChange={(e) => setPhaseName(e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm text-text-heading placeholder:text-neutral-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary-button"
                />
            </div>

            {/* Color Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-text-heading mb-3">
                    Color
                </label>
                <div className="flex gap-3 flex-wrap">
                    {COLORS.map((color) => (
                        <button
                            key={color.id}
                            onClick={() => setSelectedColor(color.hex)}
                            style={{ backgroundColor: color.hex }}
                            className={`w-7 h-7 rounded-full transition-all ${
                                selectedColor === color.hex
                                    ? 'ring-2 ring-black ring-offset-2 scale-110'
                                    : 'hover:scale-105'
                            }`}
                            aria-label={`Select ${color.name} color`}
                        />
                    ))}
                </div>
            </div>

            {/* Preview */}
            <div className="mb-6">
                <p className="text-xs text-neutral-500 mb-2">Preview</p>
                <div className="flex items-center gap-2">
                    <span
                        className="px-3 py-1.5 text-xs font-semibold rounded-full text-neutral-700"
                        style={{ backgroundColor: selectedColor }}
                    >
                        {phaseName || 'Phase name'}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
                <button
                    onClick={handleCancel}
                    className="px-6 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!phaseName.trim()}
                    className="px-6 py-2.5 bg-primary-button text-white text-sm font-medium rounded-lg hover:enabled:bg-primary-button/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Create lead phase
                </button>
            </div>
        </Modal>
    );
};

export default AddLeadPhaseModal;