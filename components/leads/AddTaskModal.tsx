'use client';

import React, { useState, useRef, useEffect } from 'react';
import Modal from '../Modal';
import { AtRateIcon, CalendarIcon } from '../Icons';
import { toast } from '@/lib/toast';

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (task: { title: string; note: string; dueDate: string; assignTo: string }) => void;
}

const ASSIGN_OPTIONS = ['chatter', 'internal'];

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [assignTo, setAssignTo] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const assignRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (assignRef.current && !assignRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        if (showSuggestions) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSuggestions]);

    const handleAssignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAssignTo(e.target.value);
        setShowSuggestions(true);
    };

    const filteredOptions = ASSIGN_OPTIONS.filter(option =>
        option.toLowerCase().includes(assignTo.toLowerCase())
    );

    const handleSuggestionSelect = (option: string) => {
        setAssignTo(option);
        setShowSuggestions(false);
    };

    const formatDisplayDate = (value: string): string => {
        if (!value) return '';
        const date = new Date(value + 'T00:00:00');
        return `${date.getDate()}-${date.toLocaleString('en-US', { month: 'short' })}-${date.getFullYear()}`;
    };

    const handleSubmit = () => {
        if (title.trim()) {
            onSubmit({ title, note, dueDate, assignTo });
            toast.success('Task created successfully');
            setTitle('');
            setNote('');
            setDueDate('');
            setAssignTo('');
            onClose();
        }
    };

    const handleCancel = () => {
        setTitle('');
        setNote('');
        setDueDate('');
        setAssignTo('');
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleCancel}
            title="Add Task"
            maxWidth="md"
            showCloseButton={true}
            zIndex={9999}
        >
            {/* Title Input */}
            <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium text-text-heading mb-2">
                    Title
                </label>
                <input
                    type="text"
                    placeholder="Task description..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-neutral-200 rounded-lg text-sm text-text-heading placeholder:text-neutral-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary-button"
                />
            </div>

            {/* Note Input (Optional) */}
            <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium text-text-heading mb-2">
                    Note (optional)
                </label>
                <textarea
                    placeholder="Additional notes..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 border border-neutral-200 rounded-lg text-sm text-text-heading placeholder:text-neutral-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary-button resize-none"
                />
            </div>

            {/* Due Date Picker */}
            <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-medium text-text-heading mb-2">
                    Due date
                </label>
                <div
                    className="relative cursor-pointer"
                    onClick={() => dateInputRef.current?.showPicker()}
                >
                    <CalendarIcon
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none z-10"
                    />
                    <div className="w-full px-3 md:px-4 py-2.5 md:py-3 !pl-9 border border-neutral-200 rounded-lg text-sm">
                        <span className={dueDate ? 'text-text-heading' : 'text-neutral-400'}>
                            {dueDate ? formatDisplayDate(dueDate) : 'Pick a date'}
                        </span>
                    </div>
                    <input
                        ref={dateInputRef}
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="sr-only"
                    />
                </div>
            </div>

            {/* Assign to Chatter or Internal Task */}
            <div className="mb-4 md:mb-6">
                <label className="block text-xs md:text-sm font-medium text-text-heading mb-2">
                    Assign to chatter or internal task
                </label>
                <div className="relative" ref={assignRef}>
                    <input
                        type="text"
                        value={assignTo}
                        onChange={handleAssignChange}
                        onFocus={() => setShowSuggestions(true)}
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 !pl-9 border border-neutral-200 rounded-lg text-sm text-text-heading placeholder:text-neutral-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary-button"
                    />
                    <AtRateIcon className='absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none' size={16} />

                    {showSuggestions && filteredOptions.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-stroke rounded-lg shadow-lg z-50 animate-fade-in py-1">
                            {filteredOptions.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onMouseDown={() => handleSuggestionSelect(option)}
                                    className="w-full px-4 py-2 text-sm text-text-heading text-left hover:bg-neutral-50 transition-colors"
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
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
                    disabled={!title.trim()}
                    className="w-full sm:w-auto px-4 md:px-6 py-2.5 bg-primary-button text-white text-sm font-medium rounded-lg hover:enabled:bg-primary-button/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Create Task
                </button>
            </div>
        </Modal>
    );
};

export default AddTaskModal;