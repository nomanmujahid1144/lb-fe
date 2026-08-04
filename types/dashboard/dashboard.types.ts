// types/dashboard/dashboard.types.ts

export interface DashboardUser {
    id: number;
    username: string;
    email: string;
    uuid: string;
    type: 'Admin' | 'Customer' | 'Manager' | 'Backoffice' | 'Chatter';
    customers: DashboardCustomer[];
}

export interface DashboardCustomer {
    id: number;
    customer_name: string;
    profiles: DashboardProfile[];
}

export interface DashboardProfile {
    id: number;
    profile_name: string;
    campaigns?: DashboardCampaign[];
}

export interface DashboardCampaign {
    id: number;
    campaign_name: string;
    live: boolean;
}

export interface DashboardStats {
    totalCustomers: number;
    totalProfiles: number;
    uniqueLiveCampaignsCount: number;
    followUpCount: number;
    customers: DashboardCustomer[];
}