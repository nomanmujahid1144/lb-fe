'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import LeadCard from './LeadCard';
import { DoubleArrowIcon, DotsHorizontalViewMoreIcon } from '../Icons';

interface KanbanColumnProps {
    id: string;
    title: string;
    count: number;
    color?: string;
    cards?: any[];
    isVertical?: boolean;
    allColumns?: { id: string; title: string }[];
    onMoveCard?: (cardId: string, targetColumnId: string) => void;
    onLeadClick?: (lead: any) => void;
    onEditPhase?: (columnId: string) => void;
    onDeletePhase?: (columnId: string) => void;
    onMoveColumnLeft?: (columnId: string) => void;
    onMoveColumnRight?: (columnId: string) => void;
    isCollapsed?: boolean;
    onToggleCollapse?: (columnId: string, collapsed: boolean) => void;
    overCardId?: string | null;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
    id, title, count, color = 'bg-neutral-100', cards = [],
    isVertical = false, allColumns = [], onMoveCard, onLeadClick,
    onEditPhase, onDeletePhase, onMoveColumnLeft, onMoveColumnRight,
    isCollapsed = false, onToggleCollapse, overCardId
}) => {

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);


    // Make this column a drop zone
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    // Helper function to truncate title for vertical display
    const getTruncatedTitle = (text: string, maxLength: number = 20) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Vertical column layout (In Progress, Meeting Planned, Archived)
    if (isVertical) {
        // Collapsed vertical state
        if (isCollapsed) {
            return (
                <div className="w-16 shrink-0 flex flex-col items-center justify-between bg-card-bg h-64 transition-all duration-500 ease-in-out">
                    {/* Top: Count Badge + Vertical Text */}
                    <div className="flex flex-col items-center gap-3 pt-4">
                        <span className={`px-2 py-1 ${color} text-neutral-700 text-xs font-semibold rounded-full`}>
                            {count}
                        </span>
                        <h3
                            className="text-sm font-medium text-text-heading whitespace-nowrap"
                            style={{
                                writingMode: 'vertical-rl',
                                textOrientation: 'mixed'
                            }}
                            title={title}
                        >
                            {getTruncatedTitle(title, 15)}
                        </h3>
                    </div>

                    {/* Bottom: Expand Icon */}
                    <div className="pb-4">
                        <button
                            onClick={() => onToggleCollapse?.(id, false)}
                            className="cursor-pointer rotate-90 hover:scale-110 transition-transform"
                            aria-label="Expand column"
                        >
                            <DoubleArrowIcon size={22} isCollapsed={false} />
                        </button>
                    </div>
                </div>
            );
        }

        // Expanded vertical state
        return (
            <div className="w-80 shrink-0 p-2 transition-all duration-700 ease-out animate-slide-in-right">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-4">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 ${color} text-neutral-700 text-xs font-semibold rounded-full`}>
                            {count}
                        </span>
                        <h3 className="text-md font-medium text-text-heading">{title}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Collapse Button */}
                        <button
                            onClick={() => onToggleCollapse?.(id, true)}
                            className="cursor-pointer hover:bg-neutral-100 p-1 rounded-lg transition-all"
                            aria-label="Collapse column"
                        >
                            <DoubleArrowIcon size={22} isCollapsed={false} />
                        </button>

                        {/* Menu Button */}
                        <div className="relative" ref={menuRef}>
                            <button
                                className="cursor-pointer hover:bg-neutral-100 p-1 rounded-lg transition-all"
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                            >
                                <DotsHorizontalViewMoreIcon size={22} />
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-stroke rounded-xl shadow-lg z-50 animate-fade-in py-1">
                                    <button
                                        onClick={() => { onMoveColumnLeft?.(id); setIsMenuOpen(false); }}
                                        className="w-full px-4 py-2 text-sm text-text-heading text-left hover:bg-neutral-50 transition-colors flex items-center gap-2"
                                    >
                                        ← Move left
                                    </button>
                                    <button
                                        onClick={() => { onMoveColumnRight?.(id); setIsMenuOpen(false); }}
                                        className="w-full px-4 py-2 text-sm text-text-heading text-left hover:bg-neutral-50 transition-colors flex items-center gap-2"
                                    >
                                        → Move right
                                    </button>
                                    <div className="my-1 border-t border-stroke" />
                                    <button
                                        onClick={() => { onEditPhase?.(id); setIsMenuOpen(false); }}
                                        className="w-full px-4 py-2 text-sm text-text-heading text-left hover:bg-neutral-50 transition-colors"
                                    >
                                        Edit phase
                                    </button>
                                    <button
                                        onClick={() => { onDeletePhase?.(id); setIsMenuOpen(false); }}
                                        className="w-full px-4 py-2 text-sm text-primary text-left hover:bg-neutral-50 transition-colors"
                                    >
                                        Delete phase
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Column Content - DROPPABLE */}
                <div
                    ref={setNodeRef}
                    className={`space-y-3 overflow-y-auto min-h-[300px] animate-fade-in transition-colors rounded-lg p-2 ${isOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
                        }`}
                    style={{ animationDuration: '500ms', animationDelay: '200ms' }}
                >
                    {cards.length > 0 ? (
                        cards.map((card, index) => (
                            <div key={card.id} className="relative">
                                {overCardId === card.id && (
                                    <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-primary-button rounded-full z-20 animate-fade-in" />
                                )}
                                <LeadCard
                                    {...card}
                                    index={index}
                                    currentColumnId={id}
                                    allColumns={allColumns}
                                    onMove={onMoveCard}
                                    onLeadClick={onLeadClick} // Add this
                                    phaseColor={color} // Add this
                                />
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-card-bg rounded-lg border-none">
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-3 text-neutral-200">
                                <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
                                <path d="M16 20H32M16 28H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <p className="text-sm text-neutral-400 font-medium">No leads</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Horizontal column - COLLAPSED STATE
    if (isCollapsed) {
        return (
            <div className="w-16 shrink-0 flex flex-col items-center justify-between bg-card-bg h-64 transition-all duration-500 ease-in-out overflow-hidden">
                {/* Top: Count Badge + Vertical Text */}
                <div className="flex flex-col items-center gap-3 pt-4 animate-fade-in">
                    <span className={`px-2 py-1 ${color} text-neutral-700 text-xs font-semibold rounded-full`}>
                        {count}
                    </span>
                    <h3
                        className="text-sm font-medium text-text-heading whitespace-nowrap"
                        style={{
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed'
                        }}
                        title={title}
                    >
                        {getTruncatedTitle(title, 15)}
                    </h3>
                </div>

                {/* Bottom: Expand Icon */}
                <div className="pb-4">
                    <button
                        onClick={() => onToggleCollapse?.(id, false)}
                        className="cursor-pointer rotate-90 hover:scale-110 transition-transform"
                        aria-label="Expand column"
                    >
                        <DoubleArrowIcon size={22} isCollapsed={false} />
                    </button>
                </div>
            </div>
        );
    }

    // Horizontal column - EXPANDED STATE
    return (
        <div className="w-80 shrink-0 p-1 transition-all duration-700 ease-out animate-slide-in-right">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 ${color} text-neutral-700 text-xs font-semibold rounded-full`}>
                        {count}
                    </span>
                    <h3 className="text-md font-medium text-text-heading">{title}</h3>
                </div>

                <div className="flex items-center gap-1">
                    {/* Collapse Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse?.(id, true);
                        }}
                        className="cursor-pointer hover:bg-neutral-100 p-1 rounded-lg transition-all"
                        aria-label="Collapse column"
                    >
                        <DoubleArrowIcon size={22} isCollapsed={false} />
                    </button>

                    {/* Menu Button */}
                    <div className="relative" ref={menuRef}>
                        <button
                            className="cursor-pointer hover:bg-neutral-100 p-1 rounded-lg transition-all"
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                        >
                            <DotsHorizontalViewMoreIcon size={22} />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-stroke rounded-xl shadow-lg z-50 animate-fade-in py-1">
                                <button
                                    onClick={() => { onMoveColumnLeft?.(id); setIsMenuOpen(false); }}
                                    className="w-full px-4 py-2 text-sm text-text-heading text-left hover:bg-neutral-50 transition-colors flex items-center gap-2"
                                >
                                    ← Move left
                                </button>
                                <button
                                    onClick={() => { onMoveColumnRight?.(id); setIsMenuOpen(false); }}
                                    className="w-full px-4 py-2 text-sm text-text-heading text-left hover:bg-neutral-50 transition-colors flex items-center gap-2"
                                >
                                    → Move right
                                </button>
                                <div className="my-1 border-t border-stroke" />
                                <button
                                    onClick={() => { onEditPhase?.(id); setIsMenuOpen(false); }}
                                    className="w-full px-4 py-2 text-sm text-text-heading text-left hover:bg-neutral-50 transition-colors"
                                >
                                    Edit phase
                                </button>
                                <button
                                    onClick={() => { onDeletePhase?.(id); setIsMenuOpen(false); }}
                                    className="w-full px-4 py-2 text-sm text-primary text-left hover:bg-neutral-50 transition-colors"
                                >
                                    Delete phase
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Column Content - DROPPABLE with staggered fade in */}
            <div
                ref={setNodeRef}
                className={`space-y-3 overflow-y-auto min-h-[300px] animate-fade-in transition-colors rounded-lg p-2 ${isOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
                    }`}
                style={{ animationDuration: '500ms', animationDelay: '200ms' }}
            >
                {cards.length > 0 ? (
                    cards.map((card, index) => (
                        <div key={card.id} className="relative">
                            {overCardId === card.id && (
                                <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-primary-button rounded-full z-20 animate-fade-in" />
                            )}
                            <LeadCard
                                key={card.id}
                                {...card}
                                index={index}
                                currentColumnId={id}
                                allColumns={allColumns}
                                onMove={onMoveCard}
                                onLeadClick={onLeadClick}
                                phaseColor={color}
                            />
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 bg-card-bg">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-3 text-neutral-200">
                            <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
                            <path d="M16 20H32M16 28H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <p className="text-sm text-neutral-400 font-medium">No leads</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KanbanColumn;