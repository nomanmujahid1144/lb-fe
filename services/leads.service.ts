// services/leads.service.ts

import { apiClient } from '@/utils/apiClient';
import { API_CONFIG } from '@/config/api.config';
import type {
    ProspectsRequest,
    ProspectsResponse,
} from '@/types/leads/leads.types';

export const leadsService = {
    // POST /api/all-prospects
    // Returns paginated prospects with filters
    getProspects: (body: ProspectsRequest) =>
        apiClient.post<ProspectsResponse>(
            API_CONFIG.ENDPOINTS.LEADS.ALL_PROSPECTS,
            body
        ),

    // GET /api/content-type-builder/content-types/api::campaign-prospect.campaign-prospect
    // Returns lead phase enum values from Strapi schema
    getLeadPhaseOptions: () =>
        apiClient.get<any>(
            API_CONFIG.ENDPOINTS.LEADS.LEAD_PHASE_OPTIONS,
        ),

    // POST /api/data-senders/lead_phase
    // Updates lead phase for a prospect
    updateLeadPhase: (payload: {
        prospect_id: string;
        campaign_prospect_id: string;
        lead_phase: string;
        lead_note?: string;
        date: string;
    }) =>
        apiClient.post<{ message: string }>(
            API_CONFIG.ENDPOINTS.BACKOFFICE.PROCESS,
            payload
        ),
};