// utils/leadsTransformer.ts

import type { Prospect, KanbanColumn, KanbanCard } from '@/types/leads/leads.types';

// Lead phase → Kanban column color mapping
const PHASE_COLORS: Record<string, string> = {
    'Meeting planned':          'bg-green-100',
    'Meeting interesting':      'bg-green-100',
    'Meeting not interesting':  'bg-red-100',
    'In process':               'bg-purple-100',
    'Not interesting - company':'bg-neutral-100',
    'Not interesting - DMU':    'bg-neutral-100',
    'Not interesting - other':  'bg-neutral-100',
    'Completed':                'bg-blue-100',
    'Unknown':                  'bg-yellow-100',
    'Interesting later':        'bg-yellow-100',
    'Other DMU':                'bg-orange-100',
};

const DEFAULT_COLOR = 'bg-yellow-100';

// Determines the sentiment label from tags
const getSentiment = (tags: Prospect['tags_relation']): string => {
    if (!tags || tags.length === 0) return 'Neutral';
    const tag = tags[0];
    return tag.tag_name || 'Neutral';
};

// Converts a prospect to a Kanban card
const toKanbanCard = (prospect: Prospect): KanbanCard => ({
    id: prospect.campaign_prospect_id,
    name: `${prospect.first_name} ${prospect.last_name}`.trim(),
    title: prospect.job_title || '',
    company: prospect.company_name || '',
    chatterDate: prospect.chatter_note?.[0]?.date ?? undefined,
    internalDate: undefined,
    lastLinkedinDate: prospect.last_prospect_message_date ?? undefined,
    sentiment: getSentiment(prospect.tags_relation),
    linkedinUrl: prospect.linkedin_url || '',
    phase: prospect.lead_phase || 'Unknown',
    phaseColor: PHASE_COLORS[prospect.lead_phase || ''] || DEFAULT_COLOR,
    avatars: [],
    prospect,
});

// Converts an array of prospects to Kanban columns grouped by lead_phase
export const prospectsToKanbanColumns = (prospects: Prospect[]): KanbanColumn[] => {
    // Group prospects by lead_phase
    const phaseMap = new Map<string, Prospect[]>();

    prospects.forEach(prospect => {
        const phase = prospect.lead_phase || 'Unknown';
        if (!phaseMap.has(phase)) {
            phaseMap.set(phase, []);
        }
        phaseMap.get(phase)!.push(prospect);
    });

    // Convert to KanbanColumn array
    const columns: KanbanColumn[] = [];

    phaseMap.forEach((phaseProspects, phase) => {
        columns.push({
            id: phase.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            title: phase,
            count: phaseProspects.length,
            color: PHASE_COLORS[phase] || DEFAULT_COLOR,
            isVertical: false,
            cards: phaseProspects.map(toKanbanCard),
        });
    });

    return columns;
};