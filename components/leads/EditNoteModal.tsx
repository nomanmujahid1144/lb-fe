'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { toast } from '@/lib/toast';

interface EditNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialContent: string;
    onSubmit: (content: string) => void;
}

const EditNoteModal: React.FC<EditNoteModalProps> = ({ isOpen, onClose, initialContent, onSubmit }) => {
    const [note, setNote] = useState(initialContent);

    useEffect(() => {
        setNote(initialContent);
    }, [initialContent]);

    const handleSubmit = () => {
        if (note.trim()) {
            onSubmit(note);
            toast.success('Note updated successfully');
            onClose();
        }
    };

    const handleCancel = () => {
        setNote(initialContent);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleCancel}
            title="Edit Note"
            maxWidth="md"
            showCloseButton={true}
            zIndex={9999}
        >
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
                    Update Note
                </button>
            </div>
        </Modal>
    );
};

export default EditNoteModal;