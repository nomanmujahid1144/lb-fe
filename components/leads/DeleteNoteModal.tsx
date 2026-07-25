'use client';

import React from 'react';
import Modal from '../Modal';

interface DeleteNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteNoteModal: React.FC<DeleteNoteModalProps> = ({ isOpen, onClose, onConfirm }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Delete Note"
            maxWidth="sm"
            showCloseButton={true}
            zIndex={9999}
        >
            <p className="text-sm text-text mb-6">
                Are you sure you want to delete this note? This action cannot be undone.
            </p>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
                <button
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 md:px-6 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors border border-stroke sm:border-0 rounded-lg sm:rounded-none"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="w-full sm:w-auto px-4 md:px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-all"
                >
                    Delete
                </button>
            </div>
        </Modal>
    );
};

export default DeleteNoteModal;