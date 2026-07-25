'use client';

import React, { useState } from 'react';
import Modal from '../Modal';
import { toast } from '@/lib/toast';

interface AddNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (note: string) => void;
}

const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [note, setNote] = useState('');

    const handleSubmit = () => {
        if (note.trim()) {
            onSubmit(note);
            toast.success('Note added successfully');
            setNote('');
            onClose();
        }
    };

    const handleCancel = () => {
        setNote('');
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleCancel}
            title="Add Note"
            maxWidth="md"
            showCloseButton={true}
            zIndex={9999}
        >
            {/* Note Label */}
            <div className="mb-4 md:mb-6">
                <label className="block text-xs md:text-sm font-medium text-text-heading mb-2">
                    Note
                </label>
                <textarea
                    placeholder="Write your note here..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={5}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-neutral-200 rounded-lg text-sm text-text-heading placeholder:text-neutral-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary-button resize-none"
                />
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
                <button
                    onClick={handleCancel}
                    className="w-full sm:w-auto px-4 md:px-6 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors border border-stroke sm:border-0 rounded-lg sm:rounded-none"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!note.trim()}
                    className="w-full sm:w-auto px-4 md:px-6 py-2.5 bg-primary-button text-white text-sm font-medium rounded-lg hover:enabled:bg-primary-button/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Add Note
                </button>
            </div>
        </Modal>
    );
};

export default AddNoteModal;