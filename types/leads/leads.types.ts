// types/leads/leads.types.ts

export interface LeadTag {
    id: string;
    tag_name: string;
    colour: string;
    is_standard: boolean;
}

export interface LeadNote {
    content: string;
    date: string;
    creator: string;
}

export interface Prospect {
    id: string;
    profile_name: string;
    prospect_status: string;
    first_name: string;
    last_name: string;
    job_title: string;
    phone: string;
    email: string;
    linkedin_url: string;
    campaign_name: string;
    campaign_type?: string;
    campaign_id?: string;
    prospect_id: string;
    profile_id: string;
    campaign_prospect_id: string;
    lead_note?: LeadNote;
    chatter_note?: LeadNote[];
    lead_phase?: string;
    tags_relation: LeadTag[];
    company_name?: string;
    date_connected?: string;
    date_replied?: string;
    date_positive_tag?: string;
    last_prospect_message_date?: string;
    crm?: boolean;
    blacklisted?: boolean;
    updatedAt?: string;
}

export interface ProspectsFilters {
    profiles: string[];
    campaigns: string[];
    prospectStatuses: string[];
    leadPhases: string[];
    sentiments: string[];
    crm: string[];
    contactDetails: string[];
    taskDueDates: string[];
    blacklisted: string[];
    linkedinUrl?: string;
    companyName?: string;
}

export interface ProspectsRequest {
    userUuid: string;
    filters: ProspectsFilters;
    page: number;
    pageSize: number;
    source: 'follow_up' | 'all_prospects';
}

export interface ProspectsResponse {
    data: Prospect[];
    meta: {
        total: number;
        page: number;
        pageSize: number;
    };
}

// Maps a prospect to a Kanban card
export interface KanbanCard {
    id: string;
    name: string;
    title: string;
    company: string;
    chatterDate?: string;
    internalDate?: string;
    lastLinkedinDate?: string;
    sentiment: string;
    linkedinUrl?: string;
    phase: string;
    phaseColor: string;
    avatars: string[];
    // Raw prospect data for modal
    prospect: Prospect;
}

export interface KanbanColumn {
    id: string;
    title: string;
    count: number;
    color: string;
    isVertical: boolean;
    cards: KanbanCard[];
}