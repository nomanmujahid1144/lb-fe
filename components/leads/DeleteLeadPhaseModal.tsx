'use client';

import React from 'react';
import Modal from '../Modal';

interface DeleteLeadPhaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    phaseName: string;
}

const DeleteLeadPhaseModal: React.FC<DeleteLeadPhaseModalProps> = ({
    isOpen, onClose, onConfirm, phaseName
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Delete lead phase"
            maxWidth="sm"
            showCloseButton={true}
            zIndex={9999}
        >
            <p className="text-sm text-text mb-2">
                Are you sure you want to delete <span className="font-semibold text-text-heading">"{phaseName}"</span>?
            </p>
            <p className="text-sm text-text mb-6">
                All leads in this phase will not be deleted but will lose their phase assignment.
            </p>

            <div className="flex items-center justify-end gap-3">
                <button
                    onClick={onClose}
                    className="px-6 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-all"
                >
                    Delete
                </button>
            </div>
        </Modal>
    );
};

export default DeleteLeadPhaseModal;