// utils/leadsTransformer.ts

import type { Prospect, KanbanColumn, KanbanCard } from '@/types/leads/leads.types';

// Default columns — always show in this exact order
export const DEFAULT_LEAD_PHASES: KanbanColumn[] = [
    { id: 'status-check', title: 'Status Check', count: 0, color: 'bg-yellow-100', isVertical: false, cards: [] },
    { id: 'in-process', title: 'In process', count: 0, color: 'bg-purple-100', isVertical: false, cards: [] },
    { id: 'meeting-planned', title: 'Meeting planned', count: 0, color: 'bg-green-100', isVertical: false, cards: [] },
    { id: 'meeting-interesting', title: 'Meeting interesting', count: 0, color: 'bg-blue-100', isVertical: false, cards: [] },
    { id: 'meeting-not-interesting', title: 'Meeting not interesting', count: 0, color: 'bg-red-100', isVertical: false, cards: [] },
    // Vertical (collapsed) columns
    { id: 'completed', title: 'Completed', count: 0, color: 'bg-neutral-100', isVertical: true, cards: [] },
    { id: 'interesting-later', title: 'Interesting later', count: 0, color: 'bg-neutral-100', isVertical: true, cards: [] },
    { id: 'not-interesting-company', title: 'Not interesting - company', count: 0, color: 'bg-neutral-100', isVertical: true, cards: [] },
    { id: 'not-interesting-dmu', title: 'Not interesting - DMU', count: 0, color: 'bg-neutral-100', isVertical: true, cards: [] },
    { id: 'not-interesting-other', title: 'Not interesting - other', count: 0, color: 'bg-neutral-100', isVertical: true, cards: [] },
    { id: 'other-dmu', title: 'Other DMU', count: 0, color: 'bg-orange-100', isVertical: true, cards: [] },
    { id: 'unknown', title: 'Unknown', count: 0, color: 'bg-yellow-100', isVertical: true, cards: [] },
    // Last main column
    { id: 'chatter-task', title: 'Chatter task', count: 0, color: 'bg-blue-100', isVertical: false, cards: [] },
];

// Maps lead_phase (set by user via drag & drop) to column id
const LEAD_PHASE_TO_COLUMN_ID: Record<string, string> = {
    'In process': 'in-process',
    'Meeting planned': 'meeting-planned',
    'Meeting interesting': 'meeting-interesting',
    'Meeting not interesting': 'meeting-not-interesting',
    'Not interesting - company': 'not-interesting-company',
    'Not interesting - DMU': 'not-interesting-dmu',
    'Not interesting - other': 'not-interesting-other',
    'Completed': 'completed',
    'Interesting later': 'interesting-later',
    'Other DMU': 'other-dmu',
    'Unknown': 'unknown',
};

// Maps prospect_status (set by robot/automation) to column id
// Used when lead_phase is null (not yet manually assigned)
const STATUS_TO_COLUMN_ID: Record<string, string> = {
    // Status Check — just connected or needs review
    'Check': 'status-check',
    'Checked': 'status-check',
    'Connected': 'status-check',
    'First connection': 'status-check',
    'Connection requested': 'status-check',
    // In process — follow-ups sent
    'Awaiting reply': 'in-process',
    'First follow-up sent': 'in-process',
    'First messenger follow-up sent': 'in-process',
    'Second follow-up sent': 'in-process',
    'Second messenger follow-up sent': 'in-process',
    'Third follow-up sent': 'in-process',
    'Third messenger follow-up sent': 'in-process',
    'Fourth follow-up sent': 'in-process',
    'Fourth messenger follow-up sent': 'in-process',
    // Completed / other
    'Completed': 'completed',
    'Bounced': 'unknown',
    'Revoked': 'unknown',
    'Unknown': 'unknown',
};

const getSentiment = (tags: Prospect['tags_relation']): string => {
    if (!tags || tags.length === 0) return 'Neutral';
    return tags[0].tag_name || 'Neutral';
};

export const toKanbanCard = (prospect: Prospect, phaseColor: string): KanbanCard => ({
    id: String(prospect.campaign_prospect_id),
    name: `${prospect.first_name} ${prospect.last_name}`.trim(),
    title: prospect.job_title || '',
    company: prospect.company_name || '',
    chatterDate: prospect.chatter_note?.[0]?.date ?? undefined,
    internalDate: undefined,
    lastLinkedinDate: prospect.last_prospect_message_date
        ? String(prospect.last_prospect_message_date)
        : undefined,
    sentiment: getSentiment(prospect.tags_relation),
    linkedinUrl: prospect.linkedin_url || '',
    phase: prospect.lead_phase || prospect.prospect_status || 'Unknown',
    phaseColor,
    avatars: [],
    prospect,
});

// Initial empty columns — board renders immediately with these
export const getEmptyColumns = (): KanbanColumn[] =>
    DEFAULT_LEAD_PHASES.map(col => ({ ...col, cards: [], count: 0 }));

// Resolve which column a prospect belongs to
const resolveColumnId = (prospect: Prospect): string => {
    // 1. If lead_phase is set by user — use that
    if (prospect.lead_phase) {
        return LEAD_PHASE_TO_COLUMN_ID[prospect.lead_phase] || 'unknown';
    }

    // 2. Check if prospect has chatter notes — goes to Chatter task column
    if (prospect.chatter_note && Array.isArray(prospect.chatter_note) && prospect.chatter_note.length > 0) {
        return 'chatter-task';
    }

    // 3. Fall back to prospect_status
    const status = prospect.prospect_status || '';
    return STATUS_TO_COLUMN_ID[status] || 'unknown';
};

// Merges a batch of prospects into existing columns — used for streaming
export const mergeProspectsIntoColumns = (
    existingColumns: KanbanColumn[],
    newProspects: Prospect[]
): KanbanColumn[] => {
    // Deep clone existing columns
    const columns = existingColumns.map(col => ({ ...col, cards: [...col.cards] }));

    newProspects.forEach(prospect => {
        const columnId = resolveColumnId(prospect);
        const column = columns.find(col => col.id === columnId);

        if (column) {
            const card = toKanbanCard(prospect, column.color);
            column.cards.push(card);
            column.count = column.cards.length;
        }
    });

    return columns;
};

// Full conversion (used when all data is available at once)
export const prospectsToKanbanColumns = (prospects: Prospect[]): KanbanColumn[] => {
    return mergeProspectsIntoColumns(getEmptyColumns(), prospects);
};