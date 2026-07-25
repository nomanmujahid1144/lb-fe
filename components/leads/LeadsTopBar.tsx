'use client';

import React from 'react';
import { GridViewIcon, ListViewIcon, SearchIcon, ResetIcon } from '../Icons';
import SortByDropdown from './dropdowns/SortByDropdown';
import FilterDropdown from './dropdowns/FilterDropdown';
import LeadPhaseTopBarDropdown from './dropdowns/LeadPhaseTopBarDropdown';

interface FilterState {
    lastMessageFrom: string;
    lastMessageTo: string;
    internalTaskFrom: string;
    internalTaskTo: string;
    company: string;
    role: string;
    leadPhases: string[];
    sentiments: string[];
}

interface LeadsTopBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedSort: string;
    onSortChange: (sort: string) => void;
    viewMode?: 'grid' | 'list';
    onViewModeChange?: (mode: 'grid' | 'list') => void;
    onFilterChange: (filters: FilterState) => void;
    activeLeadPhases: string[];
    onLeadPhaseToggle: (phaseId: string) => void;
    onLeadPhaseReset: () => void;
    activeFilters: FilterState;
}

const EMPTY_FILTERS: FilterState = {
    lastMessageFrom: '',
    lastMessageTo: '',
    internalTaskFrom: '',
    internalTaskTo: '',
    company: '',
    role: '',
    leadPhases: [],
    sentiments: []
};

const LeadsTopBar: React.FC<LeadsTopBarProps> = ({
    searchQuery,
    onSearchChange,
    selectedSort,
    onSortChange,
    viewMode = 'grid',
    onViewModeChange,
    onFilterChange,
    activeLeadPhases,
    onLeadPhaseToggle,
    onLeadPhaseReset,
    activeFilters,
}) => {
    const hasActiveFilters =
        activeLeadPhases.length > 0 ||
        searchQuery.length > 0 ||
        activeFilters.sentiments.length > 0 ||
        activeFilters.leadPhases.length > 0 ||
        !!activeFilters.company ||
        !!activeFilters.role ||
        !!activeFilters.lastMessageFrom ||
        !!activeFilters.lastMessageTo ||
        !!activeFilters.internalTaskFrom ||
        !!activeFilters.internalTaskTo;

    const handleResetAll = () => {
        onLeadPhaseReset();
        onSearchChange('');
        onFilterChange(EMPTY_FILTERS);
    };

    return (
        <>
            {/* Mobile Layout */}
            <div className="md:hidden mb-6">

                {/* Row 1: Leads + Sort + Filter + Lead Phase */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-text-breadcrumb whitespace-nowrap">Leads</span>
                    <SortByDropdown
                        selectedSort={selectedSort}
                        onSortChange={onSortChange}
                    />
                    <FilterDropdown onFilterApply={onFilterChange} />
                    <div className="whitespace-nowrap">
                        <LeadPhaseTopBarDropdown
                            selectedPhases={activeLeadPhases}
                            onToggle={onLeadPhaseToggle}
                            onReset={onLeadPhaseReset}
                        />
                    </div>
                </div>

                {/* Row 2: Search + Reset + View Toggle */}
                <div className="flex items-center gap-2 mb-4">
                    {/* Search — takes all remaining space */}
                    <div className="relative flex-1">
                        <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm text-text-heading border border-stroke rounded-lg pl-10 pr-4 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-button/20"
                        />
                    </div>

                    {/* Reset Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={handleResetAll}
                            title="Reset all filters"
                            className="flex items-center justify-center w-9 h-9 flex-shrink-0 bg-neutral-300/70 hover:bg-neutral-400/70 rounded-xl transition-colors"
                        >
                            <ResetIcon size={16} className="text-white" />
                        </button>
                    )}

                    {/* View Toggle */}
                    {onViewModeChange && (
                        <div className="flex items-center border border-stroke rounded-lg flex-shrink-0">
                            <button
                                onClick={() => onViewModeChange('list')}
                                className={`p-2 rounded-l-lg transition-colors ${viewMode === 'list' ? 'bg-stroke' : 'hover:bg-neutral-50'}`}
                            >
                                <ListViewIcon size={18} className={viewMode === 'list' ? 'text-black' : 'text-text-heading'} />
                            </button>
                            <button
                                onClick={() => onViewModeChange('grid')}
                                className={`p-2 rounded-r-lg transition-colors ${viewMode === 'grid' ? 'bg-stroke' : 'hover:bg-neutral-50'}`}
                            >
                                <GridViewIcon size={18} className={viewMode === 'grid' ? 'text-black' : 'text-text-heading'} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex md:items-center md:justify-between gap-4 mb-6 animate-fade-in">
                {/* Left: Title + Buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-sm text-text-breadcrumb">Leads</h1>

                    {/* Sort Dropdown */}
                    <SortByDropdown
                        selectedSort={selectedSort}
                        onSortChange={onSortChange}
                    />

                    {/* Filter Dropdown */}
                    <FilterDropdown onFilterApply={onFilterChange} />

                    {/* Lead Phase Dropdown */}
                    <LeadPhaseTopBarDropdown
                        selectedPhases={activeLeadPhases}
                        onToggle={onLeadPhaseToggle}
                        onReset={onLeadPhaseReset}
                    />

                    {/* Search Input */}
                    <div className="w-96">
                        <div className="relative">
                            <SearchIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search by company name, lead name or URL"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full px-3 py-2 text-sm text-text-heading border border-stroke rounded-lg pl-10 pr-4 placeholder:text-neutral-400 hover:bg-neutral-50 hover:border-stroke/85 transition-all focus:outline-none focus:ring-2 focus:ring-primary-button/20"
                            />
                        </div>
                    </div>

                    {/* Reset All Filters Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={handleResetAll}
                            title="Reset all filters"
                            className="flex items-center justify-center w-9 h-9 bg-neutral-300/70 hover:bg-neutral-400/70 rounded-xl transition-colors"
                        >
                            <ResetIcon size={16} className="text-white" />
                        </button>
                    )}

                </div>

                {/* View Toggle */}
                {onViewModeChange && (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center border border-stroke rounded-lg">
                            <button
                                onClick={() => onViewModeChange('list')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                                    ? 'bg-stroke text-primary'
                                    : 'hover:bg-neutral-50 text-text-heading hover:text-neutral-600'
                                    }`}
                            >
                                <ListViewIcon size={22} className={viewMode === 'list' ? 'text-black' : ''} />
                            </button>
                            <button
                                onClick={() => onViewModeChange('grid')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                                    ? 'bg-stroke text-primary'
                                    : 'hover:bg-neutral-50 text-text-heading hover:text-neutral-600'
                                    }`}
                            >
                                <GridViewIcon size={22} className={viewMode === 'grid' ? 'text-black' : ''} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default LeadsTopBar;