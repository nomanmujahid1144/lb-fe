'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CalendarLeadIcon } from '@/components/Icons';
import CustomCalendar from './CustomCalendar';

interface DateRangePickerProps {
    label: string;
    fromDate: string;
    toDate: string;
    onFromChange: (date: string) => void;
    onToChange: (date: string) => void;
    onReset: () => void;
    onQuickSelect: (range: 'today' | 'week' | 'month') => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
    label,
    fromDate,
    toDate,
    onFromChange,
    onToChange,
    onReset,
    onQuickSelect
}) => {
    const [showFromCalendar, setShowFromCalendar] = useState(false);
    const [showToCalendar, setShowToCalendar] = useState(false);
    const fromRef = useRef<HTMLDivElement>(null);
    const toRef = useRef<HTMLDivElement>(null);

    const formatDisplayDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fromRef.current && !fromRef.current.contains(event.target as Node)) {
                setShowFromCalendar(false);
            }
            if (toRef.current && !toRef.current.contains(event.target as Node)) {
                setShowToCalendar(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-text-heading">{label}</h4>
                <button
                    onClick={onReset}
                    className="text-xs text-icon-linkedin hover:text-icon-linkedin/95 cursor-pointer transition-colors font-medium"
                >
                    Reset
                </button>
            </div>

            {/* Date Inputs */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                {/* From Date */}
                <div ref={fromRef}>
                    <label className="block text-xs text-neutral-500 mb-1.5">From</label>
                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowFromCalendar(!showFromCalendar);
                                setShowToCalendar(false);
                            }}
                            className="w-full px-3 py-2 text-sm cursor-pointer border border-neutral-200 bg-neutral-50 rounded-xl transition-all text-left flex items-center justify-between hover:bg-neutral-100"
                        >
                            <span className={fromDate ? 'text-text-heading' : 'text-neutral-400'}>
                                {fromDate ? formatDisplayDate(fromDate) : 'dd-mm-yyyy'}
                            </span>
                            <span className='p-2.5 bg-neutral-200/50 rounded-lg'>
                                <CalendarLeadIcon size={14} className="text-icon-linkedin" />
                            </span>
                        </button>

                        {/* Calendar Dropdown - Pass range for highlighting */}
                        {showFromCalendar && (
                            <div className="absolute top-full mt-2 z-50 animate-fade-in">
                                <CustomCalendar
                                    selectedDate={fromDate}
                                    onSelect={(date) => {
                                        onFromChange(date);
                                        setShowFromCalendar(false);
                                        // Auto-open To calendar after selecting From
                                        setTimeout(() => setShowToCalendar(true), 100);
                                    }}
                                    onClose={() => setShowFromCalendar(false)}
                                    rangeStart={fromDate}
                                    rangeEnd={toDate}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* To Date */}
                <div ref={toRef}>
                    <label className="block text-xs text-neutral-500 mb-1.5">To</label>
                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowToCalendar(!showToCalendar);
                                setShowFromCalendar(false);
                            }}
                            className="w-full px-3 py-2 cursor-pointer text-sm border border-neutral-200 bg-neutral-50 rounded-xl transition-all text-left flex items-center justify-between hover:bg-neutral-100"
                        >
                            <span className={toDate ? 'text-text-heading' : 'text-neutral-400'}>
                                {toDate ? formatDisplayDate(toDate) : 'dd-mm-yyyy'}
                            </span>
                            <span className='p-2.5 bg-neutral-200/50 rounded-lg'>
                                <CalendarLeadIcon size={14} className="text-icon-linkedin" />
                            </span>
                        </button>

                        {/* Calendar Dropdown - Pass range for highlighting */}
                        {showToCalendar && (
                            <div className="absolute top-full mt-2 z-50 animate-fade-in">
                                <CustomCalendar
                                    selectedDate={toDate}
                                    onSelect={onToChange}
                                    onClose={() => setShowToCalendar(false)}
                                    rangeStart={fromDate}
                                    rangeEnd={toDate}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Select Buttons */}
            <div className="flex gap-2.5">
                <button
                    onClick={() => onQuickSelect('today')}
                    className="flex-1 px-3 py-2 text-xs font-semibold cursor-pointer text-neutral-600 border border-stroke hover:bg-neutral-50 rounded-xl transition-colors"
                >
                    Today
                </button>
                <button
                    onClick={() => onQuickSelect('week')}
                    className="flex-1 px-3 py-2 text-xs font-semibold cursor-pointer text-neutral-600 border border-stroke hover:bg-neutral-50 rounded-xl transition-colors"
                >
                    Week
                </button>
                <button
                    onClick={() => onQuickSelect('month')}
                    className="flex-1 px-3 py-2 text-xs font-semibold cursor-pointer text-neutral-600 border border-stroke hover:bg-neutral-50 rounded-xl transition-colors"
                >
                    Month
                </button>
            </div>
        </div>
    );
};

export default DateRangePicker;