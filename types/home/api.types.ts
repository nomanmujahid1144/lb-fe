export interface ApiUser {
  id: number;
  username: string;
  email: string;
  type: 'Admin' | 'Customer' | 'Backoffice' | 'Chatter' | 'Manager';
  confirmed: boolean;
  blocked: boolean;
  customers: number[];
}

export interface ApiCampaignProspect {
  id: number;
  campaign: number;
  prospect: number;
  job_title: string;
  prospect_status: string;
  lead_phase: string;
  date_positive_tag: string | null;
  date_connected: string | null;
  date_connection_requested: string | null;
  date_replied: string | null;
  stop_outreach: boolean;
  blacklisted: boolean;
  crm: boolean;
  tags: string;
  email_sent: boolean;
}

export interface ApiProspect {
  id: number;
  first_name: string;
  last_name: string;
  linkedin_url: string;
  email: string;
  company_id: number;
  prospect_id: string;
}

export interface ApiCompany {
  id: number;
  name: string;
  linkedin_url: string;
}

export interface ApiProfileProspect {
  id: number;
  profile: number;
  prospect: number;
  date_connected: string;
  blacklisted: boolean;
}

export interface ApiData {
  users: ApiUser[];
  campaign_prospects: ApiCampaignProspect[];
  prospects: ApiProspect[];
  companies: ApiCompany[];
  profile_prospects: ApiProfileProspect[];
}