'use client';

import React, { useState, useRef } from 'react';
import DropdownWrapper from './DropdownWrapper';
import { FilterIcon } from '@/components/Icons';
import DateRangePicker from './DateRangePicker';
import CompanySelect from './CompanySelect';
import RoleSelect from './RoleSelect';
import LeadPhaseSelect from './LeadPhaseSelect';
import SentimentSelect from './SentimentSelect';
import CrmSelect from './CrmSelect';
import ContactDetailsSelect from './ContactDetailsSelect';
import InternalTaskSelect from './InternalTaskSelect';
import BlacklistSelect from './BlacklistSelect';

interface FilterState {
    lastMessageFrom: string;
    lastMessageTo: string;
    internalTaskFrom: string;
    internalTaskTo: string;
    company: string;
    role: string;
    leadPhases: string[];
    sentiments: string[];
    crm: string;
    contactDetails: string;
    internalTask: string;
    blacklist: string;
}

interface FilterDropdownProps {
    onFilterApply: (filters: FilterState) => void;
}

const getToday = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

const getDateRange = (type: 'today' | 'week' | 'month') => {
    const today = new Date();
    const from = new Date();

    if (type === 'today') {
        return { from: getToday(), to: getToday() };
    } else if (type === 'week') {
        from.setDate(today.getDate() - 7);
    } else if (type === 'month') {
        from.setMonth(today.getMonth() - 1);
    }

    return {
        from: from.toISOString().split('T')[0],
        to: getToday()
    };
};

const FilterDropdown: React.FC<FilterDropdownProps> = ({ onFilterApply }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const [filters, setFilters] = useState<FilterState>({
        lastMessageFrom: '',
        lastMessageTo: '',
        internalTaskFrom: '',
        internalTaskTo: '',
        company: '',
        role: '',
        leadPhases: [],
        sentiments: [],
        crm: '',
        contactDetails: '',
        internalTask: '',
        blacklist: '',
    });

    const handleResetAll = () => {
        const emptyFilters = {
            lastMessageFrom: '',
            lastMessageTo: '',
            internalTaskFrom: '',
            internalTaskTo: '',
            company: '',
            role: '',
            leadPhases: [],
            sentiments: [],
            crm: '',
            contactDetails: '',
            internalTask: '',
            blacklist: '',
        };
        setFilters(emptyFilters);
        onFilterApply(emptyFilters); // Apply empty filters
    };

    const handleApplyFilters = () => {
        onFilterApply(filters); // Pass filters to parent
        setIsOpen(false);
    };

    const toggleLeadPhase = (phaseId: string) => {
        setFilters(prev => ({
            ...prev,
            leadPhases: prev.leadPhases.includes(phaseId)
                ? prev.leadPhases.filter(id => id !== phaseId)
                : [...prev.leadPhases, phaseId]
        }));
    };

    const toggleSentiment = (sentimentId: string) => {
        setFilters(prev => ({
            ...prev,
            sentiments: prev.sentiments.includes(sentimentId)
                ? prev.sentiments.filter(id => id !== sentimentId)
                : [...prev.sentiments, sentimentId]
        }));
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-text-breadcrumb border border-stroke rounded-lg hover:bg-neutral-50 hover:border-stroke/85 transition-all"
            >
                <span>Filter</span>
                <FilterIcon size={12} />
            </button>

            {/* Dropdown */}
            <DropdownWrapper isOpen={isOpen} onClose={() => setIsOpen(false)} triggerRef={triggerRef}>
                <div className="w-[90vw] sm:w-96 md:w-[28rem] max-h-[70vh] md:max-h-[600px] overflow-y-auto">
                    <div className="p-4 md:p-6">
                        {/* Date last message */}
                        <DateRangePicker
                            label="Date last message"
                            fromDate={filters.lastMessageFrom}
                            toDate={filters.lastMessageTo}
                            onFromChange={(date) => setFilters(prev => ({ ...prev, lastMessageFrom: date }))}
                            onToChange={(date) => setFilters(prev => ({ ...prev, lastMessageTo: date }))}
                            onReset={() => setFilters(prev => ({ ...prev, lastMessageFrom: '', lastMessageTo: '' }))}
                            onQuickSelect={(range) => {
                                const dates = getDateRange(range);
                                setFilters(prev => ({
                                    ...prev,
                                    lastMessageFrom: dates.from,
                                    lastMessageTo: dates.to
                                }));
                            }}
                        />

                        {/* Date internal task */}
                        <DateRangePicker
                            label="Date internal task"
                            fromDate={filters.internalTaskFrom}
                            toDate={filters.internalTaskTo}
                            onFromChange={(date) => setFilters(prev => ({ ...prev, internalTaskFrom: date }))}
                            onToChange={(date) => setFilters(prev => ({ ...prev, internalTaskTo: date }))}
                            onReset={() => setFilters(prev => ({ ...prev, internalTaskFrom: '', internalTaskTo: '' }))}
                            onQuickSelect={(range) => {
                                const dates = getDateRange(range);
                                setFilters(prev => ({
                                    ...prev,
                                    internalTaskFrom: dates.from,
                                    internalTaskTo: dates.to
                                }));
                            }}
                        />

                        {/* Company */}
                        <CompanySelect
                            selectedCompany={filters.company}
                            onSelect={(company) => setFilters(prev => ({ ...prev, company }))}
                            onReset={() => setFilters(prev => ({ ...prev, company: '' }))}
                        />

                        {/* Role */}
                        <RoleSelect
                            selectedRole={filters.role}
                            onSelect={(role) => setFilters(prev => ({ ...prev, role }))}
                            onReset={() => setFilters(prev => ({ ...prev, role: '' }))}
                        />

                        {/* Lead Phase */}
                        <LeadPhaseSelect
                            selectedPhases={filters.leadPhases}
                            onToggle={toggleLeadPhase}
                            onReset={() => setFilters(prev => ({ ...prev, leadPhases: [] }))}
                        />

                        {/* Sentiment */}
                        <SentimentSelect
                            selectedSentiments={filters.sentiments}
                            onToggle={toggleSentiment}
                            onReset={() => setFilters(prev => ({ ...prev, sentiments: [] }))}
                        />

                        {/* CRM */}
                        <CrmSelect
                            selectedCrm={filters.crm}
                            onSelect={(crm) => setFilters(prev => ({ ...prev, crm }))}
                            onReset={() => setFilters(prev => ({ ...prev, crm: '' }))}
                        />

                        {/* Contact Details */}
                        <ContactDetailsSelect
                            selectedContact={filters.contactDetails}
                            onSelect={(contactDetails) => setFilters(prev => ({ ...prev, contactDetails }))}
                            onReset={() => setFilters(prev => ({ ...prev, contactDetails: '' }))}
                        />

                        {/* Internal Task */}
                        <InternalTaskSelect
                            selectedTask={filters.internalTask}
                            onSelect={(internalTask) => setFilters(prev => ({ ...prev, internalTask }))}
                            onReset={() => setFilters(prev => ({ ...prev, internalTask: '' }))}
                        />

                        {/* Blacklisted */}
                        <BlacklistSelect
                            selectedBlacklist={filters.blacklist}
                            onSelect={(blacklist) => setFilters(prev => ({ ...prev, blacklist }))}
                            onReset={() => setFilters(prev => ({ ...prev, blacklist: '' }))}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                            onClick={handleResetAll}
                            className="flex-1 px-4 md:px-6 py-2.5 text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                        >
                            Reset All
                        </button>
                        <button
                            onClick={handleApplyFilters}
                            className="flex-1 px-4 md:px-6 py-2.5 text-sm font-medium text-white bg-icon-linkedin hover:enabled:bg-icon-linkedin/95 rounded-lg transition-colors"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            </DropdownWrapper>
        </div>
    );
};

export default FilterDropdown;