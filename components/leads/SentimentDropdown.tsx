'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowDownIcon } from '../Icons';

interface SentimentDropdownProps {
    currentSentiment: string;
    onSentimentChange: (newSentiment: string) => void;
}

const SENTIMENTS = [
    'Other DMU',
    'NEG not interested',
    'Neutral',
    'POS interested in follow-up',
    'POS interested later',
    'POS maybe interested',
];

// Helper function to get sentiment color classes
const getSentimentColors = (sentiment: string) => {
    if (sentiment.startsWith('POS')) {
        return {
            bg: 'bg-sentiment-positive',
            border: 'border-sentiment-positive-dark/20',
            text: 'text-sentiment-positive-dark/50',
            textDark: 'text-sentiment-positive-dark',
            hover: 'hover:bg-green-200'
        };
    } else if (sentiment.startsWith('NEG')) {
        return {
            bg: 'bg-sentiment-negative',
            border: 'border-sentiment-negative-dark/20',
            text: 'text-sentiment-negative-dark/50',
            textDark: 'text-sentiment-negative-dark',
            hover: 'hover:bg-red-200'
        };
    } else if (sentiment.includes('DMU')) {
        return {
            bg: 'bg-sentiment-dmu',
            border: 'border-sentiment-dmu-dark/20',
            text: 'text-sentiment-dmu-dark/50',
            textDark: 'text-sentiment-dmu-dark',
            hover: 'hover:bg-yellow-200'
        };
    } else {
        return {
            bg: 'bg-sentiment-neutral',
            border: 'border-sentiment-neutral-dark/20',
            text: 'text-sentiment-neutral-dark/50',
            textDark: 'text-sentiment-neutral-dark',
            hover: 'hover:bg-yellow-100'
        };
    }
};

const SentimentDropdown: React.FC<SentimentDropdownProps> = ({
    currentSentiment,
    onSentimentChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSentimentSelect = (sentiment: string) => {
        onSentimentChange(sentiment);
        setIsOpen(false);
    };

    const colors = getSentimentColors(currentSentiment);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`px-3 py-1.5 border ${colors.border} ${colors.bg} ${colors.text} text-xs font-medium rounded-full flex items-center gap-2 ${colors.hover} transition-colors cursor-pointer`}
            >
                Sentiment: <span className={colors.textDark}>{currentSentiment}</span>
                <ArrowDownIcon size={9} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-60 bg-white border border-stroke rounded-xl shadow-lg z-50 animate-fade-in py-2">
                    {SENTIMENTS.map((sentiment) => (
                        <button
                            key={sentiment}
                            onClick={() => handleSentimentSelect(sentiment)}
                            className={`w-full px-4 py-2 text-xs text-left transition-colors cursor-pointer ${sentiment === currentSentiment
                                    ? 'font-medium'
                                    : 'hover:bg-neutral-50'
                                }`}
                        >
                            {sentiment}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SentimentDropdown;