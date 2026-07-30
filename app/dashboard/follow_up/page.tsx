'use client';

import { useState } from 'react';
import LeadsTopBar from '@/components/leads/LeadsTopBar';
import ListView from '@/components/leads/ListView';
import AddLeadPhaseModal from '@/components/leads/AddLeadPhaseModal';
import dynamic from 'next/dynamic';
import { leadsColumns as initialLeadsColumns } from '@/data/leads/mockData';
import LeadProfileModal from '@/components/leads/LeadProfileModal';
import EditLeadPhaseModal from '@/components/leads/EditLeadPhaseModal';
import DeleteLeadPhaseModal from '@/components/leads/DeleteLeadPhaseModal';

// Define types...
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

// Add FilterState interface
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

const KanbanBoard = dynamic(() => import('@/components/leads/KanbanBoard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-neutral-400">Loading...</div>
    </div>
  ),
});

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState('date-desc');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [columns, setColumns] = useState<Column[]>(initialLeadsColumns);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('nova-collapsed-columns');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [editPhaseModalOpen, setEditPhaseModalOpen] = useState(false);
  const [deletePhaseModalOpen, setDeletePhaseModalOpen] = useState(false);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);

  // Add active filters state
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    lastMessageFrom: '',
    lastMessageTo: '',
    internalTaskFrom: '',
    internalTaskTo: '',
    company: '',
    role: '',
    leadPhases: ['needs-review', 'follow-up-myself', 'leadblocks-follow-up', 'in-progress', 'meeting-planned'],
    sentiments: []
  });

  // Handle add new phase...
  const handleAddPhase = (name: string, colorHex: string) => {
    const newColumn: Column = {
      id: `custom-${Date.now()}`,
      title: name,
      count: 0,
      color: `bg-[${colorHex}]`,
      isVertical: true,
      cards: []
    };
    setColumns([...columns, newColumn]);
  };

  const handleLeadClick = (lead: any) => {
    setSelectedLead({
      ...lead,
      email: `${lead.name.split(' ')[0].toLowerCase()}@${lead.company.toLowerCase().replace(' ', '')}.com`,
      phone: '(+31) 610887057',
      crmStatus: 'Not yet',
      initialTab: lead.initialTab || 'All'
    });
  };

  const handlePhaseChange = (leadId: string, newPhase: string, newPhaseColor: string) => {
    let sourceColumnId = '';
    let targetColumnId = '';
    let leadToMove: Card | null = null;

    for (const column of columns) {
      const lead = column.cards.find(card => card.id === leadId);
      if (lead) {
        sourceColumnId = column.id;
        leadToMove = lead;
        break;
      }
    }

    const targetColumn = columns.find(col => col.title === newPhase);
    if (targetColumn) {
      targetColumnId = targetColumn.id;
    }

    if (!leadToMove || !sourceColumnId || !targetColumnId) return;

    if (sourceColumnId === targetColumnId) {
      if (selectedLead) {
        setSelectedLead({
          ...selectedLead,
          phase: newPhase,
          phaseColor: newPhaseColor
        });
      }
      return;
    }

    setColumns(columns.map(col => {
      if (col.id === sourceColumnId) {
        return {
          ...col,
          cards: col.cards.filter(card => card.id !== leadId),
          count: col.cards.length - 1
        };
      }
      if (col.id === targetColumnId) {
        return {
          ...col,
          cards: [...col.cards, leadToMove],
          count: col.cards.length + 1
        };
      }
      return col;
    }));

    if (selectedLead) {
      setSelectedLead({
        ...selectedLead,
        phase: newPhase,
        phaseColor: newPhaseColor
      });
    }
  };

  const handleSentimentChange = (leadId: string, newSentiment: string) => {
    setColumns(columns.map(col => ({
      ...col,
      cards: col.cards.map(card =>
        card.id === leadId
          ? { ...card, sentiment: newSentiment }
          : card
      )
    })));

    if (selectedLead) {
      setSelectedLead({
        ...selectedLead,
        sentiment: newSentiment
      });
    }
  };

  // Handler for applying filters
  const handleFilterChange = (filters: FilterState) => {
    setActiveFilters(filters);
  };

  // Lead phase toggle for the top bar dropdown
  const handleLeadPhaseToggle = (phaseId: string) => {
    const updated = activeFilters.leadPhases.includes(phaseId)
      ? activeFilters.leadPhases.filter(id => id !== phaseId)
      : [...activeFilters.leadPhases, phaseId];
    setActiveFilters({ ...activeFilters, leadPhases: updated });
  };

  const handleLeadPhaseReset = () => {
    setActiveFilters({ ...activeFilters, leadPhases: ['needs-review', 'follow-up-myself', 'leadblocks-follow-up', 'in-progress', 'meeting-planned'] });
  };

  const handleToggleCollapse = (columnId: string, collapsed: boolean) => {
    setCollapsedColumns(prev => {
      const updated = { ...prev, [columnId]: collapsed };
      try {
        localStorage.setItem('nova-collapsed-columns', JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  const handleEditPhase = (columnId: string) => {
    setActivePhaseId(columnId);
    setEditPhaseModalOpen(true);
  };

  const handleDeletePhase = (columnId: string) => {
    setActivePhaseId(columnId);
    setDeletePhaseModalOpen(true);
  };

  const handleEditPhaseSubmit = (name: string, colorHex: string) => {
    setColumns(columns.map(col =>
      col.id === activePhaseId
        ? { ...col, title: name, color: `bg-[${colorHex}]` }
        : col
    ));
    setEditPhaseModalOpen(false);
    setActivePhaseId(null);
  };

  const handleDeletePhaseConfirm = () => {
    setColumns(columns.filter(col => col.id !== activePhaseId));
    setDeletePhaseModalOpen(false);
    setActivePhaseId(null);
  };

  const handleMoveColumnLeft = (columnId: string) => {
    const index = columns.findIndex(col => col.id === columnId);
    if (index <= 0) return;
    const newColumns = [...columns];
    [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
    setColumns(newColumns);
  };

  const handleMoveColumnRight = (columnId: string) => {
    const index = columns.findIndex(col => col.id === columnId);
    if (index >= columns.length - 1) return;
    const newColumns = [...columns];
    [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
    setColumns(newColumns);
  };

  return (
    <div className="min-h-screen px-4 md:px-6 lg:px-8 py-6">
      <LeadsTopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onFilterChange={handleFilterChange}
        activeLeadPhases={activeFilters.leadPhases}
        onLeadPhaseToggle={handleLeadPhaseToggle}
        onLeadPhaseReset={handleLeadPhaseReset}
        activeFilters={activeFilters}
      />

      {viewMode === 'grid' ? (
        <KanbanBoard
          searchQuery={searchQuery}
          selectedSort={selectedSort}
          activeFilters={activeFilters}
          columns={columns}
          setColumns={setColumns}
          onAddPhaseClick={() => setIsModalOpen(true)}
          onLeadClick={handleLeadClick}
          onEditPhase={handleEditPhase}
          onDeletePhase={handleDeletePhase}
          onMoveColumnLeft={handleMoveColumnLeft}
          onMoveColumnRight={handleMoveColumnRight}
          collapsedColumns={collapsedColumns}
          onToggleCollapse={handleToggleCollapse}
        />
      ) : (
        <ListView
          columns={columns}
          searchQuery={searchQuery}
          selectedSort={selectedSort}
          activeFilters={activeFilters}
          onAddPhaseClick={() => setIsModalOpen(true)}
          onLeadClick={handleLeadClick}
        />
      )}

      <AddLeadPhaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddPhase}
      />

      <LeadProfileModal
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        allPhases={columns.map(col => ({
          id: col.id,
          title: col.title,
          color: col.color
        }))}
        onAddPhaseClick={() => {
          setSelectedLead(null);
          setIsModalOpen(true);
        }}
        onPhaseChange={handlePhaseChange}
        onSentimentChange={handleSentimentChange}
        initialTab={selectedLead?.initialTab || 'All'}
      />

      <EditLeadPhaseModal
        isOpen={editPhaseModalOpen}
        onClose={() => { setEditPhaseModalOpen(false); setActivePhaseId(null); }}
        onSubmit={handleEditPhaseSubmit}
        initialName={columns.find(col => col.id === activePhaseId)?.title || ''}
        initialColor={columns.find(col => col.id === activePhaseId)?.color || ''}
      />

      <DeleteLeadPhaseModal
        isOpen={deletePhaseModalOpen}
        onClose={() => { setDeletePhaseModalOpen(false); setActivePhaseId(null); }}
        onConfirm={handleDeletePhaseConfirm}
        phaseName={columns.find(col => col.id === activePhaseId)?.title || ''}
      />

    </div>
  );
}