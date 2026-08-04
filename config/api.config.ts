// config/api.config.ts

import env from './env';

export const API_CONFIG = {
    BASE_URL: env.BACKEND_URL,
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/auth/local',
            LOGOUT: '/api/auth/logout',
        },
        DASHBOARD: {
            STATS: '/api/dashboard',
        },
        LEADS: {
            ALL_PROSPECTS: '/api/all-prospects',
            LEAD_PHASE_OPTIONS: '/api/content-type-builder/content-types/api::campaign-prospect.campaign-prospect',
        },
        BACKOFFICE: {
            PROCESS: '/api/data-sender/lead-phase',
        },
        USERS: {
            BY_UUID: (uuid: string) => `/api/users/uuid/${uuid}`,
        },
    },
} as const;