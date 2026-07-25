'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowDownIcon, SearchIcon } from '@/components/Icons';

const COMPANIES = [
    'TM Induction Heating',
    'Cohesity',
    'b futurist',
    'TechFlow BV',
    'GreenGrid Solutions',
    'DataPulse AI',
    'CloudNine SaaS',
    'LogiPort NL',
    'FinBridge'
];

interface CompanySelectProps {
    selectedCompany: string;
    onSelect: (company: string) => void;
    onReset: () => void;
}

const CompanySelect: React.FC<CompanySelectProps> = ({ selectedCompany, onSelect, onReset }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredCompanies = COMPANIES.filter(company =>
        company.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

    return (
        <div className="mb-6" ref={dropdownRef}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-text-heading">Company</h4>
                <button
                    onClick={() => {
                        onReset();
                        setSearchQuery('');
                    }}
                    className="text-xs text-icon-linkedin hover:text-icon-linkedin/95 cursor-pointer transition-colors font-medium"
                >
                    Reset
                </button>
            </div>

            {/* Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-neutral-200 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors text-left"
                >
                    <span className={selectedCompany ? 'text-text-heading' : 'text-neutral-400'}>
                        {selectedCompany || 'Select a company'}
                    </span>
                    <span className='p-2.5 bg-neutral-200/50 rounded-lg'>
                        <ArrowDownIcon size={10} rotate={isOpen} />
                    </span>
                </button>

                {isOpen && (
                    <div className="absolute top-full mt-2 w-full bg-white border border-stroke rounded-lg shadow-lg z-50 max-h-64 overflow-hidden animate-fade-in">
                        {/* Search */}
                        <div className="p-3 border-b border-neutral-100">
                            <div className="relative">
                                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Search a company"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Options */}
                        <div className="max-h-48 overflow-y-auto">
                            {filteredCompanies.length > 0 ? (
                                <>
                                    <div className="px-3 py-2 border-b border-neutral-100">
                                        <p className="text-xs font-semibold text-text-heading flex items-center gap-1">
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                <path d="M11.6667 3.5L5.25 9.91667L2.33333 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Select a company
                                        </p>
                                    </div>
                                    {filteredCompanies.map((company) => (
                                        <button
                                            key={company}
                                            onClick={() => {
                                                onSelect(company);
                                                setIsOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="w-full px-3 py-2 text-sm text-text-heading hover:bg-neutral-50 transition-colors text-left"
                                        >
                                            {company}
                                        </button>
                                    ))}
                                </>
                            ) : (
                                <div className="px-3 py-4 text-sm text-neutral-400 text-center">
                                    No companies found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanySelect;