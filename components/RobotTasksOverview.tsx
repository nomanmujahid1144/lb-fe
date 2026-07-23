'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ClipLoader } from 'react-spinners';
import { getBackendUrl } from '@/lib/api-config';
import { getCookie } from '@/lib/auth';

interface User {
    uuid: string;
    type: string;
}

interface RobotTasksOverviewProps {
    user: User;
}

export default function RobotTasksOverview({ user }: RobotTasksOverviewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Data & loading
    const [data, setData] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    // Filter states
    const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
    const [datePreset, setDatePreset] = useState<string>('Today');
    const [dateError, setDateError] = useState<string>('');
    const [pausedFilter, setPausedFilter] = useState<string>('active');
    const [stepFilter, setStepFilter] = useState<number[]>([]);
    const [taskTypeFilter, setTaskTypeFilter] = useState<string[]>([]);
    const [allStepsSelected, setAllStepsSelected] = useState(true);
    const [allTypesSelected, setAllTypesSelected] = useState(true);
    const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());

    // Table UI states
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [sortField, setSortField] = useState<'done_count' | 'not_done_count' | 'total_count' | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [subSortField, setSubSortField] = useState<'done_count' | 'not_done_count' | 'total_count' | null>(null);
    const [subSortDir, setSubSortDir] = useState<'asc' | 'desc'>('desc');
    const [subView, setSubView] = useState<'step' | 'task_type'>('step');

    // Auto-load on mount (today's data, active profiles)
    useEffect(() => {
        fetchData(dateFrom, dateTo, pausedFilter, stepFilter, taskTypeFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async (
        from: string,
        to: string,
        paused: string,
        steps: number[],
        taskTypes: string[],
    ) => {
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) return;

        const savedScrollLeft = scrollRef.current?.scrollLeft ?? 0;
        setLoading(true);

        const body: any = { userUuid: user.uuid };
        if (from) body.robotTasksDateFrom = from;
        if (to)   body.robotTasksDateTo   = to;
        if (paused) body.robotTasksPausedFilter = paused;
        
        // Send step filter OR task type filter based on current subView
        if (subView === 'step' && steps.length > 0) {
            body.robotTasksStepFilter = steps;
        } else if (subView === 'task_type' && taskTypes.length > 0) {
            body.robotTasksTaskTypeFilter = taskTypes;
        }

        try {
            const res = await fetch(`${backendUrl}/api/master-database/robot-tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            setData(result.data || []);
            setTotal(result.total ?? result.meta?.totalRecords ?? result.data?.length ?? 0);
            setExpandedRows(new Set());
            requestAnimationFrame(() => {
                if (scrollRef.current) scrollRef.current.scrollLeft = savedScrollLeft;
            });
        } catch {
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    const isDateRangeValid = !dateFrom || !dateTo || dateFrom <= dateTo;

    const handleApply = () => {
        if (!isDateRangeValid) {
            setDateError('Begin date must be the same as or before the end date');
            return;
        }

        setDateError('');
        fetchData(dateFrom, dateTo, pausedFilter, stepFilter, taskTypeFilter);
    };

    const handlePreset = (label: string, from: string, to: string) => {
        setDateFrom(from);
        setDateTo(to);
        setDatePreset(label);
        setDateError('');
        setExpandedRows(new Set());
        fetchData(from, to, pausedFilter, stepFilter, taskTypeFilter);
    };

    const DATE_PRESETS = [
        { label: 'Today', getRange: (): [string, string] => { const t = new Date().toISOString().slice(0, 10); return [t, t]; } },
        { label: 'This Week', getRange: (): [string, string] => {
            const now = new Date();
            const day = now.getDay() || 7;
            const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
            const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
            return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)];
        }},
        { label: 'Last Week', getRange: (): [string, string] => {
            const now = new Date();
            const day = now.getDay() || 7;
            const mon = new Date(now); mon.setDate(now.getDate() - day - 6);
            const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
            return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)];
        }},
        { label: 'This Month', getRange: (): [string, string] => {
            const now = new Date();
            const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
            const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
            return [first, last];
        }},
        { label: 'All Time', getRange: (): [string, string] => ['', ''] },
    ];

    const STEP_FILTER_OPTIONS = [
        { step: 1, label: 'Step 1 - Connection Accepted' },
        { step: 2, label: 'Step 2 - Chat Scrapes' },
        { step: 3, label: 'Step 3 - Connection Request' },
        { step: 4, label: 'Step 4 - Follow-up' },
        { step: 5, label: 'Step 5 - Revoke' },
    ];

    const TASK_TYPE_FILTER_OPTIONS = [
        { value: 'Connection Accepted (Step 1)', label: 'Revoke connection request (connection accepted)' },
        { value: 'Connection Request', label: 'Connection Request' },
        { value: 'Send follow-up 1', label: 'Send follow-up 1' },
        { value: 'Send follow-up 2', label: 'Send follow-up 2' },
        { value: 'Send follow-up 3', label: 'Send follow-up 3' },
        { value: 'Send follow-up 4', label: 'Send follow-up 4' },
        { value: 'Send follow-up 1 (messenger)', label: 'Send follow-up 1 (messenger)' },
        { value: 'Send follow-up 2 (messenger)', label: 'Send follow-up 2 (messenger)' },
        { value: 'Send follow-up 3 (messenger)', label: 'Send follow-up 3 (messenger)' },
        { value: 'Send follow-up 4 (messenger)', label: 'Send follow-up 4 (messenger)' },
        { value: 'Revoke connection request (Step 5)', label: 'Revoke connection request (revoked)' },
    ];

    const STEP_GROUPS = [
        { step: 1, label: 'Step 1 – Connection Accepted', types: ['Connection Accepted (Step 1)'] },
        { step: 2, label: 'Step 2 - Chat Scraper', types: ['Chat Scraper'] },
        { step: 3, label: 'Step 3 – Connection Request', types: ['Connection Request'] },
        { step: 4, label: 'Step 4 – Follow-Up', types: ['Send follow-up 1','Send follow-up 2','Send follow-up 3','Send follow-up 4','Send follow-up 1 (messenger)','Send follow-up 2 (messenger)','Send follow-up 3 (messenger)','Send follow-up 4 (messenger)'] },
        { step: 5, label: 'Step 5 – Revoke', types: ['Revoke connection request (Step 5)'] },
    ];

    const TASK_TYPE_ORDER = [
        'Connection Accepted (Step 1)',
        'Chat Scraper',
        'Connection Request',
        'Send follow-up 1','Send follow-up 2','Send follow-up 3','Send follow-up 4',
        'Send follow-up 1 (messenger)','Send follow-up 2 (messenger)','Send follow-up 3 (messenger)','Send follow-up 4 (messenger)',
        'Revoke connection request (Step 5)',
    ];

    const sortValue = (r: any, field: typeof sortField) => {
        if (field === 'done_count') return (r.done_count || 0) + (r.chat_scrape_count || 0);
        if (field === 'total_count') return (r.total_count || 0) + (r.chat_scrape_count || 0);
        return (field ? r[field] : 0) || 0;
    };
    const sortedData = sortField
        ? [...data].sort((a, b) =>
            sortDir === 'desc'
                ? sortValue(b, sortField) - sortValue(a, sortField)
                : sortValue(a, sortField) - sortValue(b, sortField)
          )
        : data;

    return (
        <div>
            {/* Filters */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 flex flex-wrap gap-x-6 gap-y-4 items-end">

                {/* Date Range */}
                <div className="flex flex-col gap-2 min-w-0">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Range</span>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                            {DATE_PRESETS.map(({ label, getRange }) => (
                                <button
                                    key={label}
                                    onClick={() => { const [from, to] = getRange(); handlePreset(label, from, to); }}
                                    className={`px-2.5 py-1 text-xs font-medium border rounded-md transition-colors ${
                                        datePreset === label
                                            ? 'bg-[#364570] border-[#364570] text-white'
                                            : 'bg-white border-gray-300 text-gray-600 hover:bg-[#364570] hover:border-[#364570] hover:text-white'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <span className="text-gray-300 select-none">|</span>
                        <div className="flex items-center gap-1.5">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => { setDateFrom(e.target.value); setDatePreset(''); }}
                                className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#364570] bg-white"
                            />
                            <span className="text-xs text-gray-400">→</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => { setDateTo(e.target.value); setDatePreset(''); setDateError(''); }}
                                className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#364570] bg-white"
                            />
                        </div>
                        {dateError && (
                            <p className="text-xs text-red-600 mt-1">{dateError}</p>
                        )}
                    </div>
                </div>

                <div className="hidden sm:block self-stretch w-px bg-gray-200" />

                {/* Profile Status */}
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Profile Status</span>
                    <select
                        value={pausedFilter}
                        onChange={e => setPausedFilter(e.target.value)}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#364570] bg-white"
                    >
                        <option value="">All profiles</option>
                        <option value="active">Active only</option>
                        <option value="paused">Paused only</option>
                    </select>
                </div>

                {/* Extension Step / Task Type multi-select (switches based on subView) */}
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {subView === 'step' ? 'Extension Step' : 'Task Type'}
                    </span>
                    <div className="relative w-[280px]">
                        <div
                            className={`border border-gray-300 rounded-md bg-white cursor-pointer flex items-center justify-between px-2.5 py-1.5 hover:bg-gray-50 ${expandedFilters.has('filter') ? 'rounded-b-none border-b-0' : ''}`}
                            onClick={() => setExpandedFilters(prev => {
                                const next = new Set(prev);
                                if (next.has('filter')) next.delete('filter'); else next.add('filter');
                                return next;
                            })}
                        >
                            <span className="text-xs text-gray-700 truncate">
                                {subView === 'step' 
                                    ? (allStepsSelected ? 'All steps' : stepFilter.length > 0 ? `${stepFilter.length} selected` : 'None selected')
                                    : (allTypesSelected ? 'All types' : taskTypeFilter.length > 0 ? `${taskTypeFilter.length} selected` : 'None selected')
                                }
                            </span>
                            <svg
                                className={`w-3.5 h-3.5 text-gray-400 transition-transform ml-2 shrink-0 ${expandedFilters.has('filter') ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                style={{ pointerEvents: 'none' }}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                        {expandedFilters.has('filter') && subView === 'step' && (
                            <div className="absolute top-full left-0 z-50 w-full border border-gray-300 border-t-0 rounded-b-md bg-white shadow-lg p-2 flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer hover:text-gray-900 border-b border-gray-100 pb-1.5 mb-0.5">
                                    <input
                                        type="checkbox"
                                        checked={allStepsSelected}
                                        onChange={() => {
                                            if (allStepsSelected) {
                                                setAllStepsSelected(false);
                                            } else {
                                                setAllStepsSelected(true);
                                                setStepFilter([]);
                                            }
                                        }}
                                        className="accent-[#364570]"
                                    />
                                    All steps
                                </label>
                                {STEP_FILTER_OPTIONS.map(option => (
                                    <label key={option.step} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-gray-900">
                                        <input
                                            type="checkbox"
                                            checked={allStepsSelected || stepFilter.includes(option.step)}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    if (!allStepsSelected) {
                                                        const next = [...stepFilter, option.step];
                                                        if (next.length === STEP_FILTER_OPTIONS.length) {
                                                            setAllStepsSelected(true);
                                                            setStepFilter([]);
                                                        } else {
                                                            setStepFilter(next);
                                                        }
                                                    }
                                                } else {
                                                    const base = allStepsSelected ? STEP_FILTER_OPTIONS.map(o => o.step) : stepFilter;
                                                    setAllStepsSelected(false);
                                                    setStepFilter(base.filter(s => s !== option.step));
                                                }
                                            }}
                                            className="accent-[#364570]"
                                        />
                                        {option.label}
                                    </label>
                                ))}
                                {!allStepsSelected && (
                                    <button
                                        onClick={() => { setAllStepsSelected(true); setStepFilter([]); }}
                                        className="text-xs text-gray-400 hover:text-gray-600 text-left mt-1"
                                    >
                                        Clear selection
                                    </button>
                                )}
                            </div>
                        )}
                        {expandedFilters.has('filter') && subView === 'task_type' && (
                            <div className="absolute top-full left-0 z-50 w-full border border-gray-300 border-t-0 rounded-b-md bg-white shadow-lg p-2 flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer hover:text-gray-900 border-b border-gray-100 pb-1.5 mb-0.5">
                                    <input
                                        type="checkbox"
                                        checked={allTypesSelected}
                                        onChange={() => {
                                            if (allTypesSelected) {
                                                setAllTypesSelected(false);
                                            } else {
                                                setAllTypesSelected(true);
                                                setTaskTypeFilter([]);
                                            }
                                        }}
                                        className="accent-[#364570]"
                                    />
                                    All types
                                </label>
                                {TASK_TYPE_FILTER_OPTIONS.map(option => (
                                    <label key={option.value} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-gray-900">
                                        <input
                                            type="checkbox"
                                            checked={allTypesSelected || taskTypeFilter.includes(option.value)}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    if (!allTypesSelected) {
                                                        const next = [...taskTypeFilter, option.value];
                                                        if (next.length === TASK_TYPE_FILTER_OPTIONS.length) {
                                                            setAllTypesSelected(true);
                                                            setTaskTypeFilter([]);
                                                        } else {
                                                            setTaskTypeFilter(next);
                                                        }
                                                    }
                                                } else {
                                                    const base = allTypesSelected ? TASK_TYPE_FILTER_OPTIONS.map(o => o.value) : taskTypeFilter;
                                                    setAllTypesSelected(false);
                                                    setTaskTypeFilter(base.filter(t => t !== option.value));
                                                }
                                            }}
                                            className="accent-[#364570]"
                                        />
                                        {option.label}
                                    </label>
                                ))}
                                {!allTypesSelected && (
                                    <button
                                        onClick={() => { setAllTypesSelected(true); setTaskTypeFilter([]); }}
                                        className="text-xs text-gray-400 hover:text-gray-600 text-left mt-1"
                                    >
                                        Clear selection
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="hidden sm:block self-stretch w-px bg-gray-200" />

                {/* Detail View */}
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detail View</span>
                    <div className="flex items-center rounded-md border border-gray-300 overflow-hidden">
                        <button
                            onClick={() => setSubView('step')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                subView === 'step' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >By Extension Step</button>
                        <div className="w-px self-stretch bg-gray-300" />
                        <button
                            onClick={() => setSubView('task_type')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                subView === 'task_type' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >By Task Type</button>
                    </div>
                </div>

                {/* Apply button */}
                <div className="flex flex-col gap-2 sm:ml-auto">
                    <span className="text-xs font-semibold text-transparent select-none uppercase tracking-wide">.</span>
                    <button
                        onClick={handleApply}
                        disabled={!isDateRangeValid}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${isDateRangeValid ? 'bg-[#364570] text-white hover:bg-[#2a3654]' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                        Apply Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <ClipLoader size={24} color="#364570" />
                </div>
            ) : data.length > 0 ? (
                <>
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">Total Profiles:</span>
                        <span className="text-xs font-semibold text-[#364570]">{total.toLocaleString()}</span>
                    </div>
                    <div className="bg-white shadow-md rounded-lg overflow-hidden">
                        <div ref={scrollRef} className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-420px)]">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-2 py-2 w-8"></th>
                                        <th className="px-2 py-2 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                                        <th className="px-2 py-2 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Customer(s)</th>
                                        <th className="px-2 py-2 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        {(['done_count', 'not_done_count', 'total_count'] as const).map((field) => {
                                            const label = field === 'done_count' ? 'Done' : field === 'not_done_count' ? 'Not Done' : 'Total';
                                            const color = field === 'done_count' ? 'text-emerald-600' : field === 'not_done_count' ? 'text-orange-500' : 'text-gray-500';
                                            const isActive = sortField === field;
                                            return (
                                                <th
                                                    key={field}
                                                    onClick={() => {
                                                        if (sortField === field) {
                                                            setSortDir(d => d === 'desc' ? 'asc' : 'desc');
                                                        } else {
                                                            setSortField(field);
                                                            setSortDir('desc');
                                                        }
                                                    }}
                                                    className={`px-2 py-2 text-right text-sm font-medium uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 ${color}`}
                                                >
                                                    <span className="inline-flex items-center justify-end gap-1">
                                                        {label}
                                                        <span className="flex flex-col leading-none">
                                                            <svg className={`w-2.5 h-2.5 ${isActive && sortDir === 'asc' ? 'opacity-100' : 'opacity-25'}`} viewBox="0 0 10 6" fill="currentColor"><path d="M5 0L10 6H0z"/></svg>
                                                            <svg className={`w-2.5 h-2.5 ${isActive && sortDir === 'desc' ? 'opacity-100' : 'opacity-25'}`} viewBox="0 0 10 6" fill="currentColor"><path d="M5 6L0 0H10z"/></svg>
                                                        </span>
                                                    </span>
                                                </th>
                                            );
                                        })}
                                        <th className="px-2 py-2 text-right text-sm font-medium text-purple-600 uppercase tracking-wider">Earnings</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {sortedData.map((row, index) => {
                                        const rowKey = row.profile_id || String(index);
                                        const isExpanded = expandedRows.has(rowKey);
                                        const hasDetail = (
                                            (subView === 'step' && stepFilter.length !== 1) || 
                                            (subView === 'task_type' && taskTypeFilter.length !== 1)
                                        ) && row.task_types && row.task_types.length > 0;
                                        return (
                                            <React.Fragment key={rowKey}>
                                                <tr className={`hover:bg-gray-50 ${row.paused ? 'opacity-70' : ''}`}>
                                                    <td className="px-2 py-2 text-center">
                                                        {hasDetail && (
                                                            <button
                                                                onClick={() => setExpandedRows(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(rowKey)) next.delete(rowKey); else next.add(rowKey);
                                                                    return next;
                                                                })}
                                                                className="text-gray-400 hover:text-gray-700 transition-colors"
                                                                title={isExpanded ? 'Collapse' : 'Expand task types'}
                                                            >
                                                                <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2 text-sm text-gray-900 whitespace-nowrap font-medium">
                                                        {row.profile_name || row.profile_id}
                                                        {row.start_date && (() => {
                                                            const start = new Date(row.start_date);
                                                            const diffDays = Math.floor((Date.now() - start.getTime()) / 86400000);
                                                            return diffDays >= 0 && diffDays <= 31
                                                                ? <span className="ml-1 text-xs font-normal text-amber-600">(opwarming)</span>
                                                                : null;
                                                        })()}
                                                    </td>
                                                    <td className="px-2 py-2 text-sm text-gray-600 whitespace-nowrap">{row.customer_names || '—'}</td>
                                                    <td className="px-2 py-2 whitespace-nowrap">
                                                        {row.paused
                                                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Paused</span>
                                                            : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                                                        }
                                                    </td>
                                                    <td className="px-2 py-2 text-base text-right text-emerald-700 font-semibold">{(row.done_count + (row.chat_scrape_count || 0)).toLocaleString()}</td>
                                                    <td className="px-2 py-2 text-base text-right text-orange-600 font-semibold">{row.not_done_count.toLocaleString()}</td>
                                                    <td className="px-2 py-2 text-base text-right font-semibold text-gray-900">{(row.total_count + (row.chat_scrape_count || 0)).toLocaleString()}</td>
                                                    <td className="px-2 py-2 text-base text-right text-purple-700 font-semibold">€{((row.done_count + (row.chat_scrape_count || 0)) * 0.03).toFixed(2)}</td>
                                                </tr>
                                                {isExpanded && hasDetail && (
                                                    <tr className="bg-gray-50">
                                                        <td colSpan={8} className="px-6 py-0">
                                                            {subView === 'step' ? (() => {
                                                                const stepRows = STEP_GROUPS.map(sg => {
                                                                    if (sg.step === 2) {
                                                                        const cnt = row.chat_scrape_count || 0;
                                                                        return { label: sg.label, done_count: cnt, not_done_count: 0, total_count: cnt, is_chat: true };
                                                                    }
                                                                    const matched = row.task_types.filter((tt: any) => sg.types.includes(tt.task_type));
                                                                    const done = matched.reduce((s: number, tt: any) => s + tt.done_count, 0);
                                                                    const notDone = matched.reduce((s: number, tt: any) => s + tt.not_done_count, 0);
                                                                    return { label: sg.label, done_count: done, not_done_count: notDone, total_count: done + notDone, is_chat: false };
                                                                });
                                                                return (
                                                                    <table className="w-full my-2 border border-gray-200 rounded text-xs">
                                                                        <thead>
                                                                            <tr className="bg-gray-100">
                                                                                <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Extension Step</th>
                                                                                <th className="px-3 py-1.5 text-right text-xs font-medium text-emerald-600 uppercase tracking-wider">Done</th>
                                                                                <th className="px-3 py-1.5 text-right text-xs font-medium text-orange-500 uppercase tracking-wider">Not Done</th>
                                                                                <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                                                <th className="px-3 py-1.5 text-right text-xs font-medium text-purple-600 uppercase tracking-wider">Earnings</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-100 bg-white">
                                                                            {stepRows.map((sr, i) => (
                                                                                <tr key={i} className={`hover:bg-gray-50 ${sr.is_chat ? 'bg-blue-50' : ''}`}>
                                                                                    <td className={`px-3 py-1.5 ${sr.is_chat ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{sr.label}</td>
                                                                                    <td className={`px-3 py-1.5 text-right text-base font-semibold ${sr.is_chat ? 'text-blue-600' : 'text-emerald-700'}`}>{sr.done_count.toLocaleString()}</td>
                                                                                    <td className="px-3 py-1.5 text-right text-base text-orange-600 font-semibold">{sr.not_done_count > 0 ? sr.not_done_count.toLocaleString() : '—'}</td>
                                                                                    <td className={`px-3 py-1.5 text-right text-base font-semibold ${sr.is_chat ? 'text-blue-600' : 'text-gray-900'}`}>{sr.total_count.toLocaleString()}</td>
                                                                                    <td className="px-3 py-1.5 text-right text-base text-purple-700 font-semibold">€{(sr.done_count * 0.03).toFixed(2)}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                        <tfoot className="bg-gray-100 border-t border-gray-300">
                                                                            <tr>
                                                                                <td className="px-3 py-1.5 text-xs font-bold text-gray-600 uppercase">Total</td>
                                                                                <td className="px-3 py-1.5 text-right text-base text-emerald-700 font-bold">{(row.done_count + (row.chat_scrape_count || 0)).toLocaleString()}</td>
                                                                                <td className="px-3 py-1.5 text-right text-base text-orange-600 font-bold">{row.not_done_count.toLocaleString()}</td>
                                                                                <td className="px-3 py-1.5 text-right text-base text-gray-900 font-bold">{(row.total_count + (row.chat_scrape_count || 0)).toLocaleString()}</td>
                                                                                <td className="px-3 py-1.5 text-right text-base text-purple-700 font-bold">€{((row.done_count + (row.chat_scrape_count || 0)) * 0.03).toFixed(2)}</td>
                                                                            </tr>
                                                                        </tfoot>
                                                                    </table>
                                                                );
                                                            })() : (
                                                                <table className="w-full my-2 border border-gray-200 rounded text-xs">
                                                                    <thead>
                                                                        <tr className="bg-gray-100">
                                                                            <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Type</th>
                                                                            {(['done_count', 'not_done_count', 'total_count'] as const).map((field) => {
                                                                                const label = field === 'done_count' ? 'Done' : field === 'not_done_count' ? 'Not Done' : 'Total';
                                                                                const color = field === 'done_count' ? 'text-emerald-600' : field === 'not_done_count' ? 'text-orange-500' : 'text-gray-500';
                                                                                const isActive = subSortField === field;
                                                                                return (
                                                                                    <th
                                                                                        key={field}
                                                                                        onClick={() => {
                                                                                            if (subSortField === field) {
                                                                                                setSubSortDir(d => d === 'desc' ? 'asc' : 'desc');
                                                                                            } else {
                                                                                                setSubSortField(field);
                                                                                                setSubSortDir('desc');
                                                                                            }
                                                                                        }}
                                                                                        className={`px-3 py-1.5 text-right text-xs font-medium uppercase tracking-wider cursor-pointer select-none hover:bg-gray-200 ${color}`}
                                                                                    >
                                                                                        <span className="inline-flex items-center justify-end gap-1">
                                                                                            {label}
                                                                                            <span className="flex flex-col leading-none">
                                                                                                <svg className={`w-2 h-2 ${isActive && subSortDir === 'asc' ? 'opacity-100' : 'opacity-25'}`} viewBox="0 0 10 6" fill="currentColor"><path d="M5 0L10 6H0z"/></svg>
                                                                                                <svg className={`w-2 h-2 ${isActive && subSortDir === 'desc' ? 'opacity-100' : 'opacity-25'}`} viewBox="0 0 10 6" fill="currentColor"><path d="M5 6L0 0H10z"/></svg>
                                                                                            </span>
                                                                                        </span>
                                                                                    </th>
                                                                                );
                                                                            })}
                                                                            <th className="px-3 py-1.5 text-right text-xs font-medium text-purple-600 uppercase tracking-wider">Earnings</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100 bg-white">
                                                                        {[...row.task_types].sort((a: any, b: any) => {
                                                                            if (subSortField) {
                                                                                const av = subSortField === 'total_count' ? a.done_count + a.not_done_count : a[subSortField];
                                                                                const bv = subSortField === 'total_count' ? b.done_count + b.not_done_count : b[subSortField];
                                                                                return subSortDir === 'desc' ? bv - av : av - bv;
                                                                            }
                                                                            const ai = TASK_TYPE_ORDER.indexOf(a.task_type);
                                                                            const bi = TASK_TYPE_ORDER.indexOf(b.task_type);
                                                                            return (ai === -1 ? TASK_TYPE_ORDER.length : ai) - (bi === -1 ? TASK_TYPE_ORDER.length : bi);
                                                                        }).map((tt: any, i: number) => {
                                                                            // Transform display label based on view mode
                                                                            let displayLabel = tt.task_type;
                                                                            if (subView === 'task_type') {
                                                                                if (tt.task_type === 'Connection Accepted (Step 1)') {
                                                                                    displayLabel = 'Revoke connection request (accepted)';
                                                                                } else if (tt.task_type === 'Revoke connection request (Step 5)') {
                                                                                    displayLabel = 'Revoke connection request (revoked)';
                                                                                }
                                                                            }
                                                                            
                                                                            return (
                                                                            <tr key={i} className="hover:bg-gray-50">
                                                                                <td className="px-3 py-1.5 text-gray-700">{displayLabel}</td>
                                                                                <td className="px-3 py-1.5 text-right text-base text-emerald-700 font-semibold">{tt.done_count.toLocaleString()}</td>
                                                                                <td className="px-3 py-1.5 text-right text-base text-orange-600 font-semibold">{tt.task_type === 'Connection Accepted (Step 1)' ? '—' : tt.not_done_count.toLocaleString()}</td>
                                                                                <td className="px-3 py-1.5 text-right text-base text-gray-900 font-semibold">{tt.task_type === 'Connection Accepted (Step 1)' ? tt.done_count.toLocaleString() : (tt.done_count + tt.not_done_count).toLocaleString()}</td>
                                                                                <td className="px-3 py-1.5 text-right text-base text-purple-700 font-semibold">€{(tt.done_count * 0.03).toFixed(2)}</td>
                                                                            </tr>
                                                                            );
                                                                        })}
                                                                        {(row.chat_scrape_count || 0) > 0 && (
                                                                            <tr className="hover:bg-gray-50 border-t border-blue-100 bg-blue-50">
                                                                                <td className="px-3 py-1.5 text-blue-700 font-medium">Step 2 - Chat Scraper</td>
                                                                                <td className="px-3 py-1.5 text-right text-base text-blue-600 font-semibold">{(row.chat_scrape_count || 0).toLocaleString()}</td>
                                                                                <td className="px-3 py-1.5 text-right text-base text-gray-400">—</td>
                                                                                <td className="px-3 py-1.5 text-right text-base text-blue-600 font-semibold">{(row.chat_scrape_count || 0).toLocaleString()}</td>
                                                                                <td className="px-3 py-1.5 text-right text-base text-purple-700 font-semibold">€{((row.chat_scrape_count || 0) * 0.03).toFixed(2)}</td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                    <tfoot className="bg-gray-100 border-t border-gray-300">
                                                                        <tr>
                                                                            <td className="px-3 py-1.5 text-xs font-bold text-gray-600 uppercase">Total</td>
                                                                            <td className="px-3 py-1.5 text-right text-base text-emerald-700 font-bold">{(row.done_count + (row.chat_scrape_count || 0)).toLocaleString()}</td>
                                                                            <td className="px-3 py-1.5 text-right text-base text-orange-600 font-bold">{row.not_done_count.toLocaleString()}</td>
                                                                            <td className="px-3 py-1.5 text-right text-base text-gray-900 font-bold">{(row.total_count + (row.chat_scrape_count || 0)).toLocaleString()}</td>
                                                                            <td className="px-3 py-1.5 text-right text-base text-purple-700 font-bold">€{((row.done_count + (row.chat_scrape_count || 0)) * 0.03).toFixed(2)}</td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="sticky bottom-0 bg-gray-100 border-t-2 border-gray-300">
                                    <tr>
                                        <td className="px-2 py-2 w-8" />
                                        <td className="px-2 py-2 text-sm font-bold text-gray-700 uppercase tracking-wide" colSpan={3}>Totals ({data.length} profiles)</td>
                                        <td className="px-2 py-2 text-base text-right text-emerald-700 font-bold">
                                            {data.reduce((s, r) => s + (r.done_count || 0) + (r.chat_scrape_count || 0), 0).toLocaleString()}
                                        </td>
                                        <td className="px-2 py-2 text-base text-right text-orange-600 font-bold">
                                            {data.reduce((s, r) => s + (r.not_done_count || 0), 0).toLocaleString()}
                                        </td>
                                        <td className="px-2 py-2 text-base text-right text-gray-900 font-bold">
                                            {data.reduce((s, r) => s + (r.total_count || 0) + (r.chat_scrape_count || 0), 0).toLocaleString()}
                                        </td>
                                        <td className="px-2 py-2 text-base text-right text-purple-700 font-bold">
                                            €{(data.reduce((s, r) => s + (r.done_count || 0) + (r.chat_scrape_count || 0), 0) * 0.03).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm">No data yet. Select a date range and click <strong>Apply</strong>.</p>
                </div>
            )}
        </div>
    );
}
