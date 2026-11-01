'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import LeadCard from './LeadCard';
import { DoubleArrowIcon, DotsHorizontalViewMoreIcon } from '../Icons';

const INITIAL_SIZE = 6;
const PAGE_SIZE = 10;

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
    isCompact?: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
    id, title, count, color = 'bg-neutral-100', cards = [],
    isVertical = false, allColumns = [], onMoveCard, onLeadClick,
    onEditPhase, onDeletePhase, onMoveColumnLeft, onMoveColumnRight,
    isCollapsed = false, onToggleCollapse, overCardId, isCompact = false,
}) => {

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(INITIAL_SIZE);
    const menuRef = useRef<HTMLDivElement>(null);

    // Reset pagination when cards change (new batch loaded)
    useEffect(() => {
        setVisibleCount(INITIAL_SIZE);
    }, [cards.length]);

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
    const { setNodeRef, isOver } = useDroppable({ id });

    // Helper function to truncate title for vertical display
    const getTruncatedTitle = (text: string, maxLength: number = 20) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Pagination helpers
    const visibleCards = cards.slice(0, visibleCount);
    const remaining = cards.length - visibleCount;
    const nextBatch = Math.min(remaining, PAGE_SIZE);
    const hasMore = remaining > 0;

    // ─── Reusable: dropdown menu items ───
    const renderDropdownMenu = () => (
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
    );

    // ─── Reusable: card list + show more button ───
    const renderCardList = () => (
        <>
            {visibleCards.length > 0 ? (
                visibleCards.map((card, index) => (
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
                            onLeadClick={onLeadClick}
                            phaseColor={color}
                            isCompact={isCompact}
                        />
                    </div>
                ))
            ) : (
                <div className="text-center py-4 bg-transparent rounded-xl border border-dashed border-gray-300/90">
                    <p className="text-sm text-neutral-400 font-light">No leads in this phase</p>
                </div>
            )}

            {hasMore && (
                <button
                    onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                    className="text-sm text-text-heading cursor-pointer font-normal text-center py-2 bg-transparent rounded-xl border border-dashed border-gray-300/90 w-full mt-1 transition-colors"
                >
                    Show {nextBatch} more ({remaining} left)
                </button>
            )}
        </>
    );

    // Vertical column layout (In Progress, Meeting Planned, Archived)
    if (isVertical) {
        // Collapsed vertical state
        if (isCollapsed) {
            return (
                <div className="w-14 shrink-0 flex flex-col items-center justify-between bg-card-bg h-64 rounded-xl border-dashed border border-gray-300/50">
                    {/* Top: Count Badge + Vertical Text */}
                    <div className="flex flex-col items-center gap-3 pt-4">
                        <span className={`px-2 py-1 ${color} text-neutral-700 text-xs font-semibold rounded-full`}>
                            {count}
                        </span>
                        <h3
                            className="text-sm font-medium text-text-heading whitespace-nowrap"
                            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
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
                            <DoubleArrowIcon size={18} isCollapsed={false} />
                        </button>
                    </div>
                </div>
            );
        }

        // Expanded vertical state
        return (
            <div className="w-80 shrink-0 p-2 h-fit bg-phase-blue/40 rounded-xl">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2">
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
                            <DoubleArrowIcon size={18} isCollapsed={false} />
                        </button>
                        {/* Menu Button */}
                        <div className="relative" ref={menuRef}>
                            <button
                                className="cursor-pointer hover:bg-neutral-100 p-1 rounded-lg transition-all"
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                            >
                                <DotsHorizontalViewMoreIcon size={22} />
                            </button>
                            {isMenuOpen && renderDropdownMenu()}
                        </div>
                    </div>
                </div>
                {/* Column Content - DROPPABLE */}
                <div
                    ref={setNodeRef}
                    className={`space-y-3 overflow-y-auto animate-fade-in transition-colors rounded-lg p-0.5 ${isOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}`}
                    style={{ animationDuration: '500ms', animationDelay: '200ms' }}
                >
                    {renderCardList()}
                </div>
            </div>
        );
    }

    // Horizontal column - COLLAPSED STATE
    if (isCollapsed) {
        return (
            <div className="w-14 shrink-0 flex flex-col items-center justify-between bg-card-bg h-64 rounded-xl border-dashed border border-gray-300/50 overflow-hidden">
                {/* Top: Count Badge + Vertical Text */}
                <div className="flex flex-col items-center gap-3 pt-3 animate-fade-in">
                    <span className={`px-2 py-1 ${color} text-neutral-700 text-xs font-semibold rounded-full`}>
                        {count}
                    </span>
                    <h3
                        className="text-sm font-medium text-text-heading whitespace-nowrap"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
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
                        <DoubleArrowIcon size={18} isCollapsed={false} />
                    </button>
                </div>
            </div>
        );
    }

    // Horizontal column - EXPANDED STATE
    return (
        <div className="w-80 shrink-0 p-2 h-fit bg-phase-blue/40 rounded-xl">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 ${color} text-neutral-700 text-xs font-semibold rounded-full`}>
                        {count}
                    </span>
                    <h3 className="text-md font-medium text-text-heading">{title}</h3>
                </div>
                <div className="flex items-center gap-1">
                    {/* Collapse Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(id, true); }}
                        className="cursor-pointer hover:bg-neutral-100 p-1 rounded-lg transition-all"
                        aria-label="Collapse column"
                    >
                        <DoubleArrowIcon size={18} isCollapsed={false} />
                    </button>
                    {/* Menu Button */}
                    <div className="relative" ref={menuRef}>
                        <button
                            className="cursor-pointer hover:bg-neutral-100 p-1 rounded-lg transition-all"
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                        >
                            <DotsHorizontalViewMoreIcon size={22} />
                        </button>
                        {isMenuOpen && renderDropdownMenu()}
                    </div>
                </div>
            </div>
            {/* Column Content - DROPPABLE with staggered fade in */}
            <div
                ref={setNodeRef}
                className={`space-y-3 overflow-y-auto animate-fade-in transition-colors rounded-lg p-0.5 ${isOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}`}
                style={{ animationDuration: '500ms', animationDelay: '200ms' }}
            >
                {renderCardList()}
            </div>
        </div>
    );
};

export default KanbanColumn;