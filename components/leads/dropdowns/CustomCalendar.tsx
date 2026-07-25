'use client';

import React, { useState } from 'react';
import { DoublePrevIcon, DoubleNextIcon } from '@/components/Icons';

interface CustomCalendarProps {
    selectedDate: string;
    onSelect: (date: string) => void;
    onClose: () => void;
    rangeStart?: string;
    rangeEnd?: string;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({ 
    selectedDate, 
    onSelect, 
    onClose,
    rangeStart,
    rangeEnd
}) => {
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (selectedDate) {
            return new Date(selectedDate);
        }
        return new Date();
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (number | null)[] = [];

        // Previous month's trailing days
        for (let i = 0; i < startingDayOfWeek; i++) {
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            days.push(prevMonthLastDay - startingDayOfWeek + i + 1);
        }

        // Current month's days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        // Next month's leading days
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push(i);
        }

        return { days, startingDayOfWeek, daysInMonth };
    };

    const { days, startingDayOfWeek, daysInMonth } = getDaysInMonth(currentMonth);

    const getDateObject = (day: number | null, isPrevMonth: boolean, isNextMonth: boolean) => {
        if (day === null) return null;
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        if (isPrevMonth) {
            return new Date(year, month - 1, day);
        } else if (isNextMonth) {
            return new Date(year, month + 1, day);
        } else {
            return new Date(year, month, day);
        }
    };

    const isToday = (day: number | null, isPrevMonth: boolean, isNextMonth: boolean) => {
        const checkDate = getDateObject(day, isPrevMonth, isNextMonth);
        if (!checkDate) return false;
        
        const today = new Date();
        return checkDate.toDateString() === today.toDateString();
    };

    const isRangeStart = (day: number | null, isPrevMonth: boolean, isNextMonth: boolean) => {
        if (!rangeStart) return false;
        const checkDate = getDateObject(day, isPrevMonth, isNextMonth);
        if (!checkDate) return false;
        
        const start = new Date(rangeStart);
        return checkDate.toDateString() === start.toDateString();
    };

    const isRangeEnd = (day: number | null, isPrevMonth: boolean, isNextMonth: boolean) => {
        if (!rangeEnd) return false;
        const checkDate = getDateObject(day, isPrevMonth, isNextMonth);
        if (!checkDate) return false;
        
        const end = new Date(rangeEnd);
        return checkDate.toDateString() === end.toDateString();
    };

    const isInRange = (day: number | null, isPrevMonth: boolean, isNextMonth: boolean) => {
        if (!rangeStart || !rangeEnd) return false;
        
        const checkDate = getDateObject(day, isPrevMonth, isNextMonth);
        if (!checkDate) return false;
        
        const start = new Date(rangeStart);
        const end = new Date(rangeEnd);
        
        // Only mark as "in range" if it's strictly between start and end (not including endpoints)
        return checkDate > start && checkDate < end;
    };

    const handleDateClick = (day: number | null, isPrevMonth: boolean, isNextMonth: boolean) => {
        if (day === null) return;

        const selectedDate = getDateObject(day, isPrevMonth, isNextMonth);
        if (!selectedDate) return;

        const dateString = selectedDate.toISOString().split('T')[0];
        onSelect(dateString);
        onClose();
    };

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    return (
        <div className="w-64 bg-white rounded-lg shadow-lg border border-stroke">
            <div className='p-4'>
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                    <button
                        onClick={previousMonth}
                        className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                        <DoublePrevIcon size={16} className="text-text-heading" />
                    </button>

                    <h3 className="text-sm font-semibold text-text-heading">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>

                    <button
                        onClick={nextMonth}
                        className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                        <DoubleNextIcon size={16} className="text-text-heading" />
                    </button>
                </div>

                {/* Day Names */}
                <div className="grid grid-cols-7">
                    {dayNames.map(day => (
                        <div key={day} className="text-center text-sm font-bold text-text-heading py-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7">
                    {days.map((day, index) => {
                        const isPrevMonth = index < startingDayOfWeek;
                        const isNextMonth = index >= startingDayOfWeek + daysInMonth;
                        const isTodayDate = isToday(day, isPrevMonth, isNextMonth);
                        const isStartDate = isRangeStart(day, isPrevMonth, isNextMonth);
                        const isEndDate = isRangeEnd(day, isPrevMonth, isNextMonth);
                        const inRange = isInRange(day, isPrevMonth, isNextMonth);

                        return (
                            <button
                                key={index}
                                onClick={() => handleDateClick(day, isPrevMonth, isNextMonth)}
                                className={`
                                    h-7 text-xs transition-colors relative
                                    ${isPrevMonth || isNextMonth ? 'text-neutral-300' : 'text-text-heading'}
                                    ${isStartDate || isEndDate ? 'bg-calendar-picker text-white font-semibold rounded-lg z-10' : ''}
                                    ${inRange && !isStartDate && !isEndDate ? 'bg-neutral-50' : ''}
                                    ${!isStartDate && !isEndDate && !inRange && isTodayDate ? 'bg-calendar-picker text-white rounded-lg font-semibold' : ''}
                                    ${!isStartDate && !isEndDate && !inRange && !isTodayDate ? 'hover:bg-neutral-100 rounded-lg' : ''}
                                `}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>
            {/* Clear Button */}
            <button
                onClick={() => {
                    onSelect('');
                    onClose();
                }}
                className="w-full mt-1 py-2.5 cursor-pointer border-t border-stroke text-xs font-semibold text-text-heading transition-colors"
            >
                Clear
            </button>
        </div>
    );
};

export default CustomCalendar;