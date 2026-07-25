'use client';

import React, { useState, useRef } from 'react';
import { DotsVerticleViewMoreIcon, LinkedinBoldIcon, PencilEditIcon } from '../Icons';
import AddLeadPhaseButton from './AddLeadPhaseButton';

interface Card {
    id: string;
    name: string;
    title: string;
    company: string;
    chatterDate?: string;
    internalDate?: string;
    lastLinkedinDate?: string;
    sentiment: string;
    avatars?: string[];
    linkedinUrl?: string;
    phase?: string;
    phaseColor?: string;
}

interface Column {
    id: string;
    title: string;
    color: string;
    cards: Card[];
}

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

interface ListViewProps {
    columns: Column[];
    searchQuery: string;
    selectedSort: string;
    activeFilters: FilterState;
    onAddPhaseClick: () => void;
    onLeadClick: (lead: any) => void;
}

interface ColumnDef {
    id: string;
    label: string;
    span: number;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
    { id: 'name', label: 'Name', span: 2 },
    { id: 'company', label: 'Company', span: 1 },
    { id: 'leadPhase', label: 'Lead Phase', span: 2 },
    { id: 'sentiment', label: 'Sentiment', span: 2 },
    { id: 'dates', label: 'Dates', span: 2 },
    { id: 'lastMessage', label: 'Last Message Received', span: 2 },
    { id: 'shortNote', label: 'Short Note', span: 2 },
    { id: 'actions', label: '', span: 1 },
];

const getInitials = (name: string): string => {
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const getHexColor = (color: string): string => {
    if (color.startsWith('#')) return color;
    const match = color.match(/bg-\[([#A-Fa-f0-9]+)\]/);
    if (match) return match[1];
    const colorMap: { [key: string]: string } = {
        'bg-yellow-100': '#FFECB6',
        'bg-blue-100': '#D5E6FF',
        'bg-neutral-100': '#F3F4F6',
        'bg-green-100': '#DCFFD2',
        'bg-purple-100': '#ECE1FF',
        'bg-pink-100': '#FFD9EC',
    };
    return colorMap[color] || '#F3F4F6';
};

const getSentimentColor = (sentiment: string) => {
    if (sentiment.startsWith('POS')) return 'bg-sentiment-positive text-sentiment-positive-dark';
    if (sentiment.startsWith('NEG')) return 'bg-sentiment-negative text-sentiment-negative-dark';
    if (sentiment.includes('DMU')) return 'bg-sentiment-dmu text-sentiment-dmu-dark';
    return 'bg-sentiment-neutral text-sentiment-neutral-dark';
};

const formatDate = (date: string | undefined): string => {
    if (!date || date === 'N/A') return 'N/A';
    const d = new Date(date + 'T00:00:00');
    if (isNaN(d.getTime())) return date;
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
};

const isDateInRange = (dateStr: string | undefined, fromDate: string, toDate: string): boolean => {
    if (!dateStr || dateStr === 'N/A') return true;
    if (!fromDate && !toDate) return true;
    try {
        const date = new Date(dateStr);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
    } catch {
        return true;
    }
};

const LAST_RECEIVED_MESSAGES: Record<string, string> = {
    '1': 'Dag Anna, bedankt voor je bericht. Wat kan je voor ons betekenen qua lead generatie? Wij zijn een importeur van Huawei solar products.',
    '2': 'Hi, thanks for reaching out! We are always looking for new lead generation strategies. Let\'s connect.',
    '3': 'Interesting approach. We\'d love to hear more about how you help B2B companies in the tech space.',
    '4': 'Anna, bedankt. Wat kan je voor ons betekenen qua lead generatie? Wij zijn een importeur en distributeur van Huawei solar products and solutions. Gr. Ivo',
    '5': 'Thank you for the message. Could you share more details about your service?',
};

const ListView: React.FC<ListViewProps> = ({
    columns,
    searchQuery,
    selectedSort,
    activeFilters,
    onAddPhaseClick,
    onLeadClick
}) => {
    const [colOrder, setColOrder] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('nova-listview-col-order');
            return saved ? JSON.parse(saved) : DEFAULT_COLUMNS.map(c => c.id);
        } catch {
            return DEFAULT_COLUMNS.map(c => c.id);
        }
    });

    const [dragColId, setDragColId] = useState<string | null>(null);
    const [dragOverColId, setDragOverColId] = useState<string | null>(null);
    const [animatingColId, setAnimatingColId] = useState<string | null>(null);
    const dragColRef = useRef<string | null>(null);

    const orderedCols = colOrder
        .map(id => DEFAULT_COLUMNS.find(c => c.id === id))
        .filter(Boolean) as ColumnDef[];

    const handleColDragStart = (e: React.DragEvent, colId: string) => {
        if (colId === 'actions') return;
        dragColRef.current = colId;
        setDragColId(colId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleColDragOver = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        if (colId === 'actions' || colId === dragColRef.current) return;
        setDragOverColId(colId);
    };

    const handleColDrop = (e: React.DragEvent, targetColId: string) => {
        e.preventDefault();
        if (!dragColRef.current || targetColId === 'actions') return;
        const from = dragColRef.current;
        const newOrder = [...colOrder];
        const fromIdx = newOrder.indexOf(from);
        const toIdx = newOrder.indexOf(targetColId);
        if (fromIdx === -1 || toIdx === -1) return;
        newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, from);
        setColOrder(newOrder);
        setAnimatingColId(from);
        setTimeout(() => setAnimatingColId(null), 400);
        try { localStorage.setItem('nova-listview-col-order', JSON.stringify(newOrder)); } catch { }
        setDragColId(null);
        setDragOverColId(null);
        dragColRef.current = null;
    };

    const handleColDragEnd = () => {
        setDragColId(null);
        setDragOverColId(null);
        dragColRef.current = null;
    };

    const allCards = columns.flatMap(column =>
        column.cards.map(card => ({ ...card, phase: column.title, phaseColor: column.color }))
    );

    const filteredCards = allCards.filter(card => {
        if (searchQuery) {
            const search = searchQuery.toLowerCase();
            if (!card.name.toLowerCase().includes(search) &&
                !card.company.toLowerCase().includes(search) &&
                !card.title.toLowerCase().includes(search)) return false;
        }
        if (activeFilters.lastMessageFrom || activeFilters.lastMessageTo) {
            if (!isDateInRange(card.chatterDate, activeFilters.lastMessageFrom, activeFilters.lastMessageTo)) return false;
        }
        if (activeFilters.internalTaskFrom || activeFilters.internalTaskTo) {
            if (!isDateInRange(card.internalDate, activeFilters.internalTaskFrom, activeFilters.internalTaskTo)) return false;
        }
        if (activeFilters.company && !card.company.toLowerCase().includes(activeFilters.company.toLowerCase())) return false;
        if (activeFilters.role && !card.title.toLowerCase().includes(activeFilters.role.toLowerCase())) return false;
        if (activeFilters.leadPhases.length > 0) {
            const cardColumn = columns.find(col => col.cards.some(c => c.id === card.id));
            if (cardColumn && !activeFilters.leadPhases.includes(cardColumn.id)) return false;
        }
        if (activeFilters.sentiments.length > 0) {
            if (!activeFilters.sentiments.some(s => card.sentiment.toLowerCase().includes(s.toLowerCase()))) return false;
        }
        return true;
    });

    const sortedCards = [...filteredCards].sort((a, b) => {
        switch (selectedSort) {
            case 'name': return a.name.localeCompare(b.name);
            case 'company': return a.company.localeCompare(b.company);
            case 'sentiment': return a.sentiment.localeCompare(b.sentiment);
            case 'date-desc': {
                const aT = a.chatterDate && a.chatterDate !== 'N/A' ? new Date(a.chatterDate).getTime() : 0;
                const bT = b.chatterDate && b.chatterDate !== 'N/A' ? new Date(b.chatterDate).getTime() : 0;
                return bT - aT;
            }
            case 'date-asc': {
                const aT = a.chatterDate && a.chatterDate !== 'N/A' ? new Date(a.chatterDate).getTime() : 0;
                const bT = b.chatterDate && b.chatterDate !== 'N/A' ? new Date(b.chatterDate).getTime() : 0;
                return aT - bT;
            }
            default: return 0;
        }
    });

    const renderCell = (col: ColumnDef, card: Card) => {
        switch (col.id) {
            case 'name':
                return (
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-neutral-600">{getInitials(card.name)}</span>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1">
                                <span className="text-sm font-semibold text-icon-linkedin truncate">{card.name}</span>
                                <a
                                    href={card.linkedinUrl || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <LinkedinBoldIcon size={12} className="flex-shrink-0 text-calendar-picker" />
                                </a>
                            </div>
                            <p className="text-xs text-neutral-500 truncate">{card.title}</p>
                        </div>
                    </div>
                );
            case 'company':
                return <span className="text-sm text-text-heading truncate">{card.company}</span>;
            case 'leadPhase':
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getHexColor(card.phaseColor || '') }} />
                        <span className="text-sm text-text-heading truncate">{card.phase}</span>
                    </div>
                );
            case 'sentiment':
                return (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full truncate ${getSentimentColor(card.sentiment)}`}>
                        {card.sentiment}
                    </span>
                );
            case 'dates':
                return (
                    <div className="flex flex-col justify-center text-xs text-neutral-600 gap-0.5">
                        {card.lastLinkedinDate && <p className="truncate">Last msg: {formatDate(card.lastLinkedinDate)}</p>}
                        {card.chatterDate && <p className="truncate">Chat: {formatDate(card.chatterDate)}</p>}
                        {card.internalDate && <p className="truncate">Internal: {formatDate(card.internalDate)}</p>}
                        {!card.chatterDate && !card.internalDate && <p className="text-neutral-400">N/A</p>}
                    </div>
                );
            case 'lastMessage':
                return (
                    <p className="text-xs text-text line-clamp-2 leading-relaxed">
                        {LAST_RECEIVED_MESSAGES[card.id] || '—'}
                    </p>
                );
            case 'shortNote': {
                const ShortNoteCell = () => {
                    const [note, setNote] = useState(() => {
                        try { return localStorage.getItem(`nova-short-note-${card.id}`) || ''; } catch { return ''; }
                    });
                    const [isEditing, setIsEditing] = useState(false);
                    const [input, setInput] = useState(note);

                    const handleSave = () => {
                        setNote(input);
                        try { localStorage.setItem(`nova-short-note-${card.id}`, input); } catch { }
                        setIsEditing(false);
                    };

                    return (
                        <div
                            className="relative group/listnote flex items-center gap-1.5 w-full cursor-text"
                            onClick={(e) => { e.stopPropagation(); setIsEditing(true); setInput(note); }}
                        >
                            <PencilEditIcon size={12} className="text-neutral-400 flex-shrink-0" />
                            {isEditing ? (
                                <input
                                    autoFocus
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave();
                                        if (e.key === 'Escape') { setIsEditing(false); setInput(note); }
                                    }}
                                    onBlur={handleSave}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Short note..."
                                    className="flex-1 text-xs text-text-heading bg-transparent border-b border-icon-linkedin focus:outline-none placeholder:text-neutral-400 py-0.5 min-w-0"
                                />
                            ) : (
                                <>
                                    <span className={`text-xs truncate ${note ? 'text-text' : 'text-neutral-300'}`}>
                                        {note || 'Short note...'}
                                    </span>
                                    {note.length > 20 && (
                                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-stroke rounded-xl shadow-lg p-3 opacity-0 group-hover/listnote:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                                            <p className="text-xs text-text-heading leading-relaxed">{note}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                };
                return <ShortNoteCell />;
            }
            case 'actions':
                return (
                    <div className="flex justify-end">
                        <button
                            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <DotsVerticleViewMoreIcon size={18} />
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    const gridTemplate = orderedCols.map(c => `${c.span}fr`).join(' ');

    return (
        <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <div style={{ minWidth: '900px' }}>

                    {/* Table Header */}
                    <div
                        className="grid items-center gap-4 px-6 py-3 bg-neutral-50 border-b border-stroke text-xs font-semibold text-neutral-600 uppercase select-none transition-all duration-300"
                        style={{ gridTemplateColumns: gridTemplate }}
                    >
                        {orderedCols.map(col => (
                            <div
                                key={col.id}
                                draggable={col.id !== 'actions'}
                                onDragStart={(e) => handleColDragStart(e, col.id)}
                                onDragOver={(e) => handleColDragOver(e, col.id)}
                                onDrop={(e) => handleColDrop(e, col.id)}
                                onDragEnd={handleColDragEnd}
                                className={`flex items-center gap-1 transition-all duration-200 border-l-2 pl-1
                                    ${col.id !== 'actions' ? 'cursor-grab active:cursor-grabbing' : ''}
                                    ${dragColId === col.id ? 'opacity-40' : 'opacity-100'}
                                    ${dragOverColId === col.id && dragColId !== col.id
                                        ? 'text-icon-linkedin scale-105 border-icon-linkedin'
                                        : 'border-transparent'}
                                    ${animatingColId === col.id ? 'animate-scale-in' : ''}
                                `}
                            >
                                {col.id === 'leadPhase' ? (
                                    <div className="flex items-center gap-2">
                                        <span>{col.label}</span>
                                        <AddLeadPhaseButton onClick={onAddPhaseClick} variant="light" />
                                    </div>
                                ) : (
                                    <span>{col.label}</span>
                                )}
                                {col.id !== 'actions' && (
                                    <svg width="8" height="10" viewBox="0 0 8 10" fill="none" className="opacity-30 ml-0.5 flex-shrink-0">
                                        <path d="M2 1L2 9M6 1L6 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-stroke">
                        {sortedCards.length > 0 ? (
                            sortedCards.map((card) => (
                                <div
                                    key={card.id}
                                    onClick={() => onLeadClick(card)}
                                    className="grid gap-4 px-6 py-4 hover:bg-neutral-50 transition-all duration-300 cursor-pointer items-center"
                                    style={{ gridTemplateColumns: gridTemplate }}
                                >
                                    {orderedCols.map(col => (
                                        <div key={col.id} className="flex items-center min-w-0 transition-all duration-300">
                                            {renderCell(col, card)}
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-neutral-400">No leads found</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 py-2">
                {sortedCards.length > 0 ? (
                    sortedCards.map((card) => (
                        <div
                            key={card.id}
                            onClick={() => onLeadClick(card)}
                            className="bg-white rounded-xl border border-stroke cursor-pointer active:bg-neutral-50 transition-colors p-4 shadow-sm"
                        >
                            {/* Row 1: Avatar + Name + LinkedIn + Sentiment */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-semibold text-neutral-600">{getInitials(card.name)}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-semibold text-text-heading truncate">{card.name}</span>
                                            <a
                                                href={card.linkedinUrl || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <LinkedinBoldIcon size={12} className="flex-shrink-0 text-icon-linkedin" />
                                            </a>
                                        </div>
                                        <p className="text-xs text-neutral-500 truncate">{card.title} · {card.company}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-2xs font-medium rounded-full flex-shrink-0 ${getSentimentColor(card.sentiment)}`}>
                                    {card.sentiment}
                                </span>
                            </div>

                            {/* Row 2: Lead Phase */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getHexColor(card.phaseColor || '') }} />
                                <span className="text-xs text-neutral-500 truncate">{card.phase}</span>
                            </div>

                            {/* Row 3: Last Message Received */}
                            <div className="bg-neutral-50 rounded-lg p-2.5">
                                <p className="text-2xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Last message received</p>
                                <p className="text-xs text-text-heading line-clamp-2 leading-relaxed">
                                    {LAST_RECEIVED_MESSAGES[card.id] || '—'}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-neutral-400">No leads found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListView;