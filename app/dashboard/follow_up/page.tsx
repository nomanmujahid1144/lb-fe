'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeadsTopBar from '@/components/leads/LeadsTopBar';
import ListView from '@/components/leads/ListView';
import AddLeadPhaseModal from '@/components/leads/AddLeadPhaseModal';
import dynamic from 'next/dynamic';
import LeadProfileModal from '@/components/leads/LeadProfileModal';
import { getCookie } from '@/lib/auth';
import { safeLocalStorage } from '@/lib/storage';
import { leadsService } from '@/services/leads.service';
import { prospectsToKanbanColumns } from '@/utils/leadsTransformer';
import type { KanbanColumn } from '@/types/leads/leads.types';

interface User {
    id: number;
    username: string;
    email: string;
    uuid: string;
    type: string;
    customers: any[];
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

const KanbanBoard = dynamic(() => import('@/components/leads/KanbanBoard'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-neutral-400">Loading...</div>
        </div>
    ),
});

const DEFAULT_FILTERS: FilterState = {
    lastMessageFrom: '',
    lastMessageTo: '',
    internalTaskFrom: '',
    internalTaskTo: '',
    company: '',
    role: '',
    leadPhases: [],
    sentiments: [],
};

export default function LeadsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSort, setSelectedSort] = useState('date-desc');
    const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTERS);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [columns, setColumns] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem('nova-collapsed-columns');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const [editPhaseModalOpen, setEditPhaseModalOpen] = useState(false);
    const [deletePhaseModalOpen, setDeletePhaseModalOpen] = useState(false);
    const [activePhaseId, setActivePhaseId] = useState<string | null>(null);

    useEffect(() => { setIsMounted(true); }, []);

    useEffect(() => {
        if (!isMounted) return;

        const token = getCookie('token');
        const storedUser = safeLocalStorage.getParsedItem<User>('user');

        if (!token || !storedUser) {
            router.push('/auth/login');
            return;
        }

        setUser(storedUser);
        fetchLeads(storedUser.uuid, token);
    }, [isMounted, router]);

    const fetchLeads = async (userUuid: string, token: string) => {
        setIsLoading(true);
        try {
            const data = await leadsService.getProspects({
                userUuid,
                filters: {
                    profiles: [],
                    campaigns: [],
                    prospectStatuses: [
                        'Connected',
                        'Awaiting reply',
                        'First follow-up sent',
                        'Second follow-up sent',
                        'Third follow-up sent',
                        'Fourth follow-up sent',
                    ],
                    leadPhases: [],
                    sentiments: [],
                    crm: [],
                    contactDetails: [],
                    taskDueDates: [],
                    blacklisted: [],
                },
                page: 1,
                pageSize: 100,
                source: 'follow_up',
            });

            const kanbanColumns = prospectsToKanbanColumns(data.data || []);
            setColumns(kanbanColumns);
        } catch (error) {
            console.error('Failed to fetch leads:', error);
            setColumns([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeadClick = (lead: any) => {
        setSelectedLead({
            ...lead,
            initialTab: lead.initialTab || 'All',
        });
    };

    const handlePhaseChange = (leadId: string, newPhase: string, newPhaseColor: string) => {
        setColumns(prev => {
            let movedCard: any = null;
            let sourceColId = '';

            const updated = prev.map(col => {
                const card = col.cards.find(c => c.id === leadId);
                if (card) { movedCard = card; sourceColId = col.id; }
                return { ...col, cards: col.cards.filter(c => c.id !== leadId), count: col.cards.filter(c => c.id !== leadId).length };
            });

            const targetColIndex = updated.findIndex(col => col.title === newPhase);
            if (targetColIndex !== -1 && movedCard) {
                updated[targetColIndex].cards.push({ ...movedCard, phase: newPhase, phaseColor: newPhaseColor });
                updated[targetColIndex].count += 1;
            }

            return updated;
        });

        if (selectedLead) {
            setSelectedLead({ ...selectedLead, phase: newPhase, phaseColor: newPhaseColor });
        }
    };

    const handleSentimentChange = (leadId: string, newSentiment: string) => {
        setColumns(prev => prev.map(col => ({
            ...col,
            cards: col.cards.map(card => card.id === leadId ? { ...card, sentiment: newSentiment } : card),
        })));
        if (selectedLead) setSelectedLead({ ...selectedLead, sentiment: newSentiment });
    };

    const handleCrmChange = (leadId: string) => {
        if (selectedLead) setSelectedLead({ ...selectedLead, crmStatus: 'Sent' });
    };

    const handleFilterChange = (filters: FilterState) => setActiveFilters(filters);

    const handleLeadPhaseToggle = (phaseId: string) => {
        const updated = activeFilters.leadPhases.includes(phaseId)
            ? activeFilters.leadPhases.filter(id => id !== phaseId)
            : [...activeFilters.leadPhases, phaseId];
        setActiveFilters({ ...activeFilters, leadPhases: updated });
    };

    const handleLeadPhaseReset = () => setActiveFilters({ ...activeFilters, leadPhases: [] });

    const handleToggleCollapse = (columnId: string, collapsed: boolean) => {
        setCollapsedColumns(prev => {
            const updated = { ...prev, [columnId]: collapsed };
            try { localStorage.setItem('nova-collapsed-columns', JSON.stringify(updated)); } catch {}
            return updated;
        });
    };

    const handleEditPhase = (columnId: string) => { setActivePhaseId(columnId); setEditPhaseModalOpen(true); };
    const handleDeletePhase = (columnId: string) => { setActivePhaseId(columnId); setDeletePhaseModalOpen(true); };

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

    if (!isMounted || !user) return null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="animate-pulse text-neutral-400">Loading leads...</div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] px-4 md:px-6 lg:px-8 py-6">
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
                onSubmit={(name, colorHex) => {
                    const newColumn: KanbanColumn = {
                        id: `custom-${Date.now()}`,
                        title: name,
                        count: 0,
                        color: `bg-[${colorHex}]`,
                        isVertical: true,
                        cards: [],
                    };
                    setColumns([...columns, newColumn]);
                }}
            />

            <LeadProfileModal
                isOpen={!!selectedLead}
                onClose={() => setSelectedLead(null)}
                lead={selectedLead}
                allPhases={columns.map(col => ({ id: col.id, title: col.title, color: col.color }))}
                onAddPhaseClick={() => { setSelectedLead(null); setIsModalOpen(true); }}
                onPhaseChange={handlePhaseChange}
                onSentimentChange={handleSentimentChange}
                onCrmChange={handleCrmChange}
                initialTab={selectedLead?.initialTab || 'All'}
            />
        </div>
    );
}