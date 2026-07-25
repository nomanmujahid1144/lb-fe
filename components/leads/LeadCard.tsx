'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CardCounterIcon, LinkedinIcon, PencilEditIcon, SidebarLeftIcon, TimeLineListIcon, ShareExportIcon } from '../Icons';
import Image from 'next/image';
import MoveToDropdown from './MoveToDropdown';

interface LeadCardProps {
    id: string;
    name: string;
    title: string;
    company: string;
    chatterDate?: string;
    internalDate?: string;
    sentiment: string;
    avatars?: string[];
    linkedinUrl?: string;
    lastLinkedinDate?: string;
    index?: number;
    currentColumnId?: string;
    allColumns?: { id: string; title: string }[];
    onMove?: (cardId: string, targetColumnId: string) => void;
    onLeadClick?: (lead: any) => void;
    phaseColor?: string;
}

const formatDate = (date: string): string => {
    if (!date || date === 'N/A') return 'N/A';
    const d = new Date(date + 'T00:00:00');
    if (isNaN(d.getTime())) return date;
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
};

const LeadCard: React.FC<LeadCardProps> = ({
    id,
    name,
    title,
    company,
    chatterDate,
    internalDate,
    sentiment,
    avatars = [],
    linkedinUrl,
    lastLinkedinDate,
    index = 0,
    currentColumnId,
    allColumns = [],
    onMove,
    onLeadClick,
    phaseColor,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        animationDelay: `${index * 50}ms`,
    };

    // Short note — stored in localStorage, independent of timeline notes
    const [shortNote, setShortNote] = useState<string>(() => {
        try { return localStorage.getItem(`nova-short-note-${id}`) || ''; } catch { return ''; }
    });
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteInput, setNoteInput] = useState(shortNote);

    const handleNoteSave = () => {
        setShortNote(noteInput);
        try { localStorage.setItem(`nova-short-note-${id}`, noteInput); } catch {}
        setIsEditingNote(false);
    };

    const handleMove = (targetColumnId: string) => {
        if (onMove) onMove(id, targetColumnId);
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if (isDragging) return;
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input') || target.closest('a')) return;
        if (onLeadClick) {
            const phaseName = allColumns.find(col => col.id === currentColumnId)?.title || '';
            onLeadClick({
                id, name, title, company, chatterDate, internalDate, sentiment,
                phase: phaseName,
                phaseColor: phaseColor || '',
                email: `${name.split(' ')[0].toLowerCase()}@${company.toLowerCase().replace(' ', '')}.com`,
                phone: '(+31) 610887057',
                crmStatus: 'Not yet',
                linkedinUrl: linkedinUrl || '',
            });
        }
    };

    const getSentimentStyle = (sentiment: string): string => {
        if (sentiment.startsWith('POS')) return 'bg-sentiment-positive text-sentiment-positive-dark';
        if (sentiment.startsWith('NEG')) return 'bg-sentiment-negative text-sentiment-negative-dark';
        if (sentiment.includes('DMU')) return 'bg-sentiment-dmu text-sentiment-dmu-dark';
        return 'bg-sentiment-neutral text-sentiment-neutral-dark';
    };

    const handleIconClick = (e: React.MouseEvent, tab: string) => {
        e.stopPropagation();
        if (isDragging) return;
        if (onLeadClick) {
            const phaseName = allColumns.find(col => col.id === currentColumnId)?.title || '';
            onLeadClick({
                id, name, title, company, chatterDate, internalDate, sentiment,
                phase: phaseName,
                phaseColor: phaseColor || '',
                email: `${name.split(' ')[0].toLowerCase()}@${company.toLowerCase().replace(' ', '')}.com`,
                phone: '(+31) 610887057',
                crmStatus: 'Not yet',
                initialTab: tab,
                linkedinUrl: linkedinUrl || '',
            });
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={handleCardClick}
            className="bg-card-bg rounded-lg border-none transition-all duration-200 hover:shadow-md animate-fade-in touch-none select-none cursor-pointer"
        >
            {/* Header: Name + LinkedIn */}
            <div className='px-5 pt-6'>
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                        <h4 className="flex items-center text-sm font-semibold text-icon-linkedin gap-1 transition-colors">
                            {name}
                            <a
                                href={linkedinUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e: any) => e.stopPropagation()}
                            >
                                <LinkedinIcon size={12} />
                            </a>
                        </h4>
                        <div className='mt-1.5 text-xs text-text w-3/4'>
                            <p>{title} at <span className="font-medium">{company}</span></p>
                        </div>
                    </div>
                </div>

                {/* Dates */}
                {(lastLinkedinDate || chatterDate || internalDate) && (
                    <div className="space-y-1 text-xs text-text pt-3.5 py-2.5">
                        {lastLinkedinDate && (
                            <p>Last message date: <span>{formatDate(lastLinkedinDate)}</span></p>
                        )}
                        {chatterDate && (
                            <p>Chatter task date: <span>{formatDate(chatterDate)}</span></p>
                        )}
                        {internalDate && (
                            <p>Internal task date: <span>{formatDate(internalDate)}</span></p>
                        )}
                    </div>
                )}

                {/* Sentiment Badge */}
                <div className='pb-10'>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSentimentStyle(sentiment)}`}>
                        Chat sentiment: {sentiment}
                    </span>
                </div>
            </div>

            {/* Footer: Short Note + Action Icons on same row */}
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-stroke gap-2">

                {/* Short Note — left side */}
                <div
                    className="relative group/note flex items-center gap-1.5 flex-1 min-w-0 cursor-text"
                    onClick={(e) => { e.stopPropagation(); setIsEditingNote(true); setNoteInput(shortNote); }}
                >
                    <PencilEditIcon size={12} className="text-neutral-400 flex-shrink-0" />
                    {isEditingNote ? (
                        <input
                            autoFocus
                            type="text"
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNoteSave();
                                if (e.key === 'Escape') { setIsEditingNote(false); setNoteInput(shortNote); }
                            }}
                            onBlur={handleNoteSave}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Short note..."
                            className="flex-1 text-xs text-text-heading bg-transparent border-b border-icon-linkedin focus:outline-none placeholder:text-neutral-400 py-0.5 min-w-0"
                        />
                    ) : (
                        <>
                            <span className={`text-xs truncate ${shortNote ? 'text-text' : 'text-neutral-400'}`}>
                                {shortNote || 'Short note...'}
                            </span>
                            {/* Full note tooltip — only when text is long */}
                            {shortNote.length > 20 && (
                                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-stroke rounded-xl shadow-lg p-3 opacity-0 group-hover/note:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                                    <p className="text-xs text-text-heading leading-relaxed">{shortNote}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Action Icons — right side */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Move to dropdown - Mobile only */}
                    {currentColumnId && allColumns.length > 0 && onMove && (
                        <MoveToDropdown
                            currentColumnId={currentColumnId}
                            allColumns={allColumns}
                            onMove={handleMove}
                        />
                    )}

                    <button
                        className='cursor-pointer text-icon-linkedin hidden md:block'
                        title="Send to CRM"
                        onClick={(e) => handleIconClick(e, 'All')}
                    >
                        <ShareExportIcon size={20} />
                    </button>
                    <button
                        className='cursor-pointer text-icon-linkedin hidden md:block'
                        title="View details"
                        onClick={(e) => handleIconClick(e, 'All')}
                    >
                        <SidebarLeftIcon size={20} />
                    </button>
                    <button
                        className='cursor-pointer text-icon-linkedin hidden md:block'
                        title="Notes"
                        onClick={(e) => handleIconClick(e, 'Notes')}
                    >
                        <PencilEditIcon size={20} />
                    </button>
                    <div className="relative flex group">
                        <button
                            className='cursor-pointer text-icon-linkedin'
                            onClick={(e) => handleIconClick(e, 'LinkedIn Messages')}
                        >
                            <CardCounterIcon size={20} />
                        </button>
                        {/* Tooltip - shows last LinkedIn received message */}
                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-white border border-stroke rounded-xl shadow-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                            <p className="text-2xs font-semibold text-text-heading mb-1">Last LinkedIn message received</p>
                            <p className="text-2xs text-text leading-relaxed line-clamp-3">
                                Anna, bedankt. Wat kan je voor ons betekenen qua lead generatie? Wij zijn een importeur en distributeur van Huawei solar products and solutions. Gr. Ivo
                            </p>
                        </div>
                    </div>
                    <button
                        className='cursor-pointer text-icon-linkedin hidden md:block'
                        title="Chatter Tasks"
                        onClick={(e) => handleIconClick(e, 'Chatter Tasks')}
                    >
                        <TimeLineListIcon size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeadCard;