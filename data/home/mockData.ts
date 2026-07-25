// ============================================================
// data/home/mockData.ts
// ============================================================

import apiData from '@/data/mock-data.json';
import { computeStats, computeQuickActions, computeActivities } from '@/data/home/transformers/dashboard';
import type { ApiCampaignProspect, ApiProspect, ApiCompany } from '@/data/home/transformers/dashboard';

// ─── Interfaces for scoping ───────────────────────────────────────────────────

interface Customer {
  id: number;
  customer_name: string;
  lead_phase: string;
  profiles: number[];
  users: number[];
}

interface Profile {
  id: number;
  profile_name: string;
  customer: number;
  campaigns: number[];
  profile_prospects: number[];
  linked_in_chats: number[];
}

interface Campaign {
  id: number;
  campaign_name: string;
  live: boolean;
  profile: number;            // ← this is the correct foreign key to use
  campaign_prospects: number[];
}

// ─── Scope: Active customer ───────────────────────────────────────────────────
// In production: replace ACTIVE_CUSTOMER_ID with the id from JWT/session.

const ACTIVE_CUSTOMER_ID = 1; // Customer 1 = Acme Corp

const activeCustomer = (apiData.customers as Customer[]).find(
  c => c.id === ACTIVE_CUSTOMER_ID
)!;

// Step 1: Get profile IDs for this customer (from customer.profiles[])
const customerProfileIds: number[] = activeCustomer.profiles;

const customerProfiles = (apiData.profiles as Profile[]).filter(p =>
  customerProfileIds.includes(p.id)
);

// Step 2: Get campaigns by querying campaign.profile field
// ⚠️ Do NOT use profile.campaigns[] — it is incomplete in the JSON.
// The campaign owns the foreign key: campaign.profile === profile.id
const customerCampaigns = (apiData.campaigns as Campaign[]).filter(c =>
  customerProfileIds.includes(c.profile)
);

// Step 3: Get all campaign_prospect IDs from those campaigns
// Using Set to avoid duplicates (cp id 131 appears in campaigns 25 and 27)
const cpIdSet = new Set(customerCampaigns.flatMap(c => c.campaign_prospects));

const scopedCampaignProspects = (apiData.campaign_prospects as ApiCampaignProspect[]).filter(
  cp => cpIdSet.has(cp.id)
);

// Step 4: Counts for quick actions
// profile.profile_prospects[] and profile.linked_in_chats[] are reliable
const totalProspects = customerProfiles.reduce((sum, p) => sum + p.profile_prospects.length, 0);
const totalChats     = customerProfiles.reduce((sum, p) => sum + p.linked_in_chats.length, 0);

// ─── Current User ─────────────────────────────────────────────────────────────
// The display name shown in HeroBanner ("Welcome back, X") comes from
// customer.customer_name — NOT the user's username.
//
// Why: customer.users[] for customer 1 points to the Admin user (not a Customer-type user).
// The customer_name ("Acme Corp") is the correct label for this dashboard context.
// In production: activeCustomer will come directly from the auth session.
export const currentUserName = activeCustomer.customer_name;

// ─── Dashboard Data ───────────────────────────────────────────────────────────
export const statsData        = computeStats(scopedCampaignProspects);
export const quickActionsData = computeQuickActions(
  scopedCampaignProspects.length,
  totalProspects,
  totalChats
);
export const recentActivities = computeActivities(
  scopedCampaignProspects,
  apiData.prospects as ApiProspect[],
  apiData.companies as ApiCompany[]
);