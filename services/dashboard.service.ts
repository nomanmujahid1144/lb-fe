// services/dashboard.service.ts

import { apiClient } from '@/utils/apiClient';
import { API_CONFIG } from '@/config/api.config';
import type { DashboardStats } from '@/types/dashboard/dashboard.types';

export const dashboardService = {
    // GET /api/dashboard
    // Returns: { totalCustomers, totalProfiles, uniqueLiveCampaignsCount, followUpCount, customers }
    getStats: () =>
        apiClient.get<DashboardStats>(API_CONFIG.ENDPOINTS.DASHBOARD.STATS),
};