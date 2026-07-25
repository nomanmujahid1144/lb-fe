'use client';

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import AddLeadPhaseButton from './AddLeadPhaseButton';
import LeadCard from './LeadCard';

interface Card {
  id: string;
  name: string;
  title: string;
  company: string;
  chatterDate?: string;
  internalDate?: string;
  sentiment: string;
  avatars?: string[];
}

interface Column {
  id: string;
  title: string;
  count: number;
  color: string;
  isVertical: boolean;
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

interface KanbanBoardProps {
  searchQuery: string;
  selectedSort: string;
  activeFilters: FilterState;
  columns: Column[];
  setColumns: (columns: Column[]) => void;
  onAddPhaseClick: () => void;
  onLeadClick: (lead: any) => void;
  onEditPhase: (columnId: string) => void;
  onDeletePhase: (columnId: string) => void;
  onMoveColumnLeft: (columnId: string) => void;
  onMoveColumnRight: (columnId: string) => void;
  collapsedColumns: Record<string, boolean>;
  onToggleCollapse: (columnId: string, collapsed: boolean) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  searchQuery,
  selectedSort,
  activeFilters,
  columns,
  setColumns,
  onAddPhaseClick,
  onLeadClick,
  onEditPhase,
  onDeletePhase,
  onMoveColumnLeft,
  onMoveColumnRight,
  collapsedColumns,
  onToggleCollapse
}) => {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [overCardId, setOverCardId] = useState<string | null>(null);

  // Setup sensors - DESKTOP ONLY (no touch for mobile)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const cardId = active.id as string;

    for (const column of columns) {
      const card = column.cards.find(c => c.id === cardId);
      if (card) {
        setActiveCard(card);
        break;
      }
    }
  };

  // Handle drag over — track which card is being hovered
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverCardId(over ? over.id as string : null);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveCard(null);
    setOverCardId(null);

    if (!over) return;

    const cardId = active.id as string;
    const overId = over.id as string;

    let sourceColumn: Column | undefined;
    let sourceCard: Card | undefined;

    for (const col of columns) {
      const card = col.cards.find(c => c.id === cardId);
      if (card) {
        sourceColumn = col;
        sourceCard = card;
        break;
      }
    }

    if (!sourceColumn || !sourceCard) return;

    const targetColumn = columns.find(col => col.id === overId) ||
      columns.find(col => col.cards.some(c => c.id === overId));

    if (!targetColumn) return;

    if (sourceColumn.id === targetColumn.id) {
      const oldIndex = sourceColumn.cards.findIndex(c => c.id === cardId);
      const newIndex = targetColumn.cards.findIndex(c => c.id === overId);

      if (oldIndex === newIndex) return;

      setColumns(columns.map(col => {
        if (col.id === sourceColumn.id) {
          return {
            ...col,
            cards: arrayMove(col.cards, oldIndex, newIndex >= 0 ? newIndex : col.cards.length)
          };
        }
        return col;
      }));
    } else {
      const targetIndex = targetColumn.cards.findIndex(c => c.id === overId);

      setColumns(columns.map(col => {
        if (col.id === sourceColumn.id) {
          return {
            ...col,
            cards: col.cards.filter(c => c.id !== cardId),
            count: col.cards.length - 1
          };
        }
        if (col.id === targetColumn.id) {
          const newCards = [...col.cards];
          newCards.splice(targetIndex >= 0 ? targetIndex : newCards.length, 0, sourceCard);
          return {
            ...col,
            cards: newCards,
            count: newCards.length
          };
        }
        return col;
      }));
    }
  };

  // Handle move from dropdown (mobile)
  const handleMoveCard = (cardId: string, targetColumnId: string) => {
    let sourceColumn: Column | undefined;
    let card: Card | undefined;

    for (const col of columns) {
      const foundCard = col.cards.find(c => c.id === cardId);
      if (foundCard) {
        sourceColumn = col;
        card = foundCard;
        break;
      }
    }

    if (!sourceColumn || !card) return;

    const targetColumn = columns.find(col => col.id === targetColumnId);
    if (!targetColumn || sourceColumn.id === targetColumn.id) return;

    setColumns(columns.map(col => {
      if (col.id === sourceColumn.id) {
        return {
          ...col,
          cards: col.cards.filter(c => c.id !== cardId),
          count: col.cards.length - 1
        };
      }
      if (col.id === targetColumn.id) {
        return {
          ...col,
          cards: [...col.cards, card],
          count: col.cards.length + 1
        };
      }
      return col;
    }));
  };

  // Helper function to check if a date is within range
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

  // Filter and sort
  const processedColumns = useMemo(() => {
    return columns.map(column => {
      let cards = column.cards.filter(card => {
        if (searchQuery) {
          const search = searchQuery.toLowerCase();
          const matchesSearch = (
            card.name.toLowerCase().includes(search) ||
            card.company.toLowerCase().includes(search) ||
            card.title.toLowerCase().includes(search)
          );
          if (!matchesSearch) return false;
        }

        if (activeFilters.lastMessageFrom || activeFilters.lastMessageTo) {
          if (!isDateInRange(card.chatterDate, activeFilters.lastMessageFrom, activeFilters.lastMessageTo)) {
            return false;
          }
        }

        if (activeFilters.internalTaskFrom || activeFilters.internalTaskTo) {
          if (!isDateInRange(card.internalDate, activeFilters.internalTaskFrom, activeFilters.internalTaskTo)) {
            return false;
          }
        }

        if (activeFilters.company) {
          if (!card.company.toLowerCase().includes(activeFilters.company.toLowerCase())) {
            return false;
          }
        }

        if (activeFilters.role) {
          if (!card.title.toLowerCase().includes(activeFilters.role.toLowerCase())) {
            return false;
          }
        }

        if (activeFilters.leadPhases.length > 0) {
          if (!activeFilters.leadPhases.includes(column.id)) {
            return false;
          }
        }

        if (activeFilters.sentiments.length > 0) {
          const matchesSentiment = activeFilters.sentiments.some(sentiment =>
            card.sentiment.toLowerCase().includes(sentiment.toLowerCase())
          );
          if (!matchesSentiment) return false;
        }

        return true;
      });

      if (selectedSort && selectedSort !== 'none') {
        cards = [...cards].sort((a, b) => {
          switch (selectedSort) {
            case 'name': return a.name.localeCompare(b.name);
            case 'company': return a.company.localeCompare(b.company);
            case 'sentiment': return a.sentiment.localeCompare(b.sentiment);
            case 'date-desc':
              const parseDescA = a.chatterDate && a.chatterDate !== 'N/A' ? new Date(a.chatterDate).getTime() : 0;
              const parseDescB = b.chatterDate && b.chatterDate !== 'N/A' ? new Date(b.chatterDate).getTime() : 0;
              return parseDescB - parseDescA;
            case 'date-asc':
              const parseAscA = a.chatterDate && a.chatterDate !== 'N/A' ? new Date(a.chatterDate).getTime() : 0;
              const parseAscB = b.chatterDate && b.chatterDate !== 'N/A' ? new Date(b.chatterDate).getTime() : 0;
              return parseAscA - parseAscB;
            default: return 0;
          }
        });
      }

      return { ...column, cards, count: cards.length };
    });
  }, [columns, searchQuery, selectedSort, activeFilters]);

  const columnsForDropdown = columns.map(col => ({ id: col.id, title: col.title }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        <div className="overflow-x-auto pb-4">
          <div className="inline-flex gap-1 min-w-full">
            {processedColumns.map((column) => (
              <SortableContext
                key={column.id}
                items={column.cards.map(card => card.id)}
                strategy={verticalListSortingStrategy}
              >
                <KanbanColumn
                  id={column.id}
                  title={column.title}
                  count={column.count}
                  color={column.color}
                  cards={column.cards}
                  isVertical={column.isVertical}
                  allColumns={columnsForDropdown}
                  onMoveCard={handleMoveCard}
                  onLeadClick={onLeadClick}
                  onEditPhase={onEditPhase}
                  onDeletePhase={onDeletePhase}
                  onMoveColumnLeft={onMoveColumnLeft}
                  onMoveColumnRight={onMoveColumnRight}
                  isCollapsed={collapsedColumns[column.id] ?? false}
                  onToggleCollapse={onToggleCollapse}
                  overCardId={overCardId}
                />
              </SortableContext>
            ))}

            <AddLeadPhaseButton onClick={onAddPhaseClick} />
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="opacity-90 rotate-2 scale-105 cursor-grabbing shadow-2xl">
            <LeadCard {...activeCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;