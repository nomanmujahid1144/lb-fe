// ============================================================
// data/home/transformers/dashboard.ts
// ============================================================
// Pure transformer functions — no imports from the JSON here.
// All data is passed in as arguments from mockData.ts.
// When Luuk integrates the real API, only mockData.ts changes.
// ============================================================

import { StatCard, QuickAction, Activity } from '@/types/home';

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ApiCampaignProspect {
  id: number;
  campaign: number;
  prospect: number;
  job_title: string;
  prospect_status: string;
  lead_phase: string;
  date_connection_requested: string | null;
  date_connected: string | null;
  date_replied: string | null;
  date_positive_tag: string | null;
  stop_outreach: boolean;
  blacklisted: boolean;
  crm: boolean;
  tags: string;
  email_sent: boolean;
  linked_in_group: number;
  tags_relation: unknown[];
  tasks: unknown[];
  placeholders: unknown[];
  lead_note: string | null;
  chatter_note: unknown[];
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
  city: string;
  country: string;
  industry_company: string;
}

// ─── Status groups ────────────────────────────────────────────────────────────
//
// prospect_status is the authoritative source — NOT the date fields.
// Date fields in the mock data are inconsistent (some records have date_replied
// set but status says "Not connected", and vice versa).
//
// CONNECTED: person accepted the connection request
const CONNECTED_STATUSES = [
  'Connected',
  'Awaiting reply',
  'First connection',
  'Replied',
  'In conversation',
  'Completed',
];

// REPLIED: person replied (always a subset of CONNECTED — Replied ≤ Connected ✅)
const REPLIED_STATUSES = [
  'Replied',
  'In conversation',
  'Completed',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (firstName: string, lastName: string): string =>
  `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();

// Format ISO date string → DD-MM-YY (Dutch format)
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const day   = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year  = String(date.getFullYear()).slice(2);
  return `${day}-${month}-${year}`;
};

// ─── computeStats ─────────────────────────────────────────────────────────────
//
// Total Requests → all campaign_prospects (all have date_connection_requested)
// Connected      → prospect_status in CONNECTED_STATUSES
// Replied        → prospect_status in REPLIED_STATUSES  (always ≤ Connected ✅)
// Positive       → date_positive_tag !== null
//
// Percentages (Laura's corrected formula):
//   Connected% = Connected / Total Requests × 100
//   Replied%   = Replied   / Connected      × 100
//   Positive%  = Positive  / Replied        × 100

export function computeStats(campaignProspects: ApiCampaignProspect[]): StatCard[] {
  const totalRequests  = campaignProspects.length;
  const totalConnected = campaignProspects.filter(cp => CONNECTED_STATUSES.includes(cp.prospect_status)).length;
  const totalReplied   = campaignProspects.filter(cp => REPLIED_STATUSES.includes(cp.prospect_status)).length;
  const totalPositive  = campaignProspects.filter(cp => cp.date_positive_tag !== null).length;

  const connectedPct = totalRequests  > 0 ? Math.round((totalConnected / totalRequests)  * 100) : 0;
  const repliedPct   = totalConnected > 0 ? Math.round((totalReplied   / totalConnected) * 100) : 0;
  const positivePct  = totalReplied   > 0 ? Math.round((totalPositive  / totalReplied)   * 100) : 0;

  return [
    {
      id: '1',
      label: 'Total Requests Sent',
      value: totalRequests,
      icon: 'users',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
    },
    {
      id: '2',
      label: 'Connected',
      value: totalConnected,
      percentage: connectedPct,
      icon: 'link',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
    },
    {
      id: '3',
      label: 'Replied',
      value: totalReplied,
      percentage: repliedPct,
      icon: 'message',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
    },
    {
      id: '4',
      label: 'Positive',
      value: totalPositive,
      percentage: positivePct,
      icon: 'thumbsup',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
    },
  ];
}

// ─── computeQuickActions ──────────────────────────────────────────────────────

export function computeQuickActions(
  totalLeads: number,
  totalProspects: number,
  totalChats: number
): QuickAction[] {
  return [
    {
      id: '1',
      title: 'View Statistics',
      description: 'Analyze your campaign performance',
      icon: 'chart',
      buttonText: 'Open Statistics',
      variant: 'default',
      bgColor: 'bg-white',
    },
    {
      id: '2',
      title: 'Manage Leads',
      description: `${totalLeads} leads need attention`,
      icon: 'users-group',
      buttonText: 'Check Leads',
      variant: 'primary',
      bgColor: 'bg-red-50',
    },
    {
      id: '3',
      title: 'Full database',
      description: `${totalProspects} prospects in your list`,
      icon: 'user-list',
      buttonText: 'View Prospects',
      variant: 'default',
      bgColor: 'bg-white',
    },
    {
      id: '4',
      title: 'Private Chats',
      description: `${totalChats} conversations available`,
      icon: 'chat',
      buttonText: 'View Chats',
      variant: 'default',
      bgColor: 'bg-white',
    },
  ];
}

// ─── computeActivities ────────────────────────────────────────────────────────
//
// Activity type priority (each cp maps to ONE type only):
//   1. new_lead        → lead_phase === 'In process'
//   2. meeting_booked  → lead_phase === 'Meeting planned'
//                        AND prospect_status in CONNECTED_STATUSES
//                        (skip if not connected — meeting can't be booked without connecting)
//   3. message_replied → prospect_status in REPLIED_STATUSES
//                        AND date_replied !== null
//                        (skip if no actual reply date — status may be stale mock data)
//   4. phase_changed   → lead_phase in ['Closed won', 'Closed lost', 'Negotiation']
//
// Timestamp rules:
//   new_lead        → date_connection_requested (when the request was sent)
//   meeting_booked  → date_replied ?? date_connected (most recent meaningful date)
//   message_replied → date_replied (must exist — enforced by guard above)
//   phase_changed   → date_connected ?? date_connection_requested
//
// Badge for phase_changed:
//   → cp.tags if non-empty, otherwise lead_phase itself (never prospect_status)
//
// Sorted by date_connection_requested desc. Returns top 10.

export function computeActivities(
  campaignProspects: ApiCampaignProspect[],
  prospects: ApiProspect[],
  companies: ApiCompany[]
): Activity[] {
  const prospectMap = new Map(prospects.map(p => [p.id, p]));
  const companyMap  = new Map(companies.map(c => [c.id, c]));

  const sorted = [...campaignProspects].sort((a, b) =>
    (b.date_connection_requested ?? '').localeCompare(a.date_connection_requested ?? '')
  );

  const activities: Activity[] = [];

  for (const cp of sorted) {
    const prospect = prospectMap.get(cp.prospect);
    if (!prospect) continue;

    const company      = companyMap.get(prospect.company_id);
    const userName     = `${prospect.first_name} ${prospect.last_name}`;
    const userInitials = getInitials(prospect.first_name, prospect.last_name);
    const linkedinUrl  = prospect.linkedin_url ?? '';

    // 1. new_lead
    if (cp.lead_phase === 'In process') {
      activities.push({
        id: String(cp.id),
        type: 'new_lead',
        userName,
        userInitials,
        timestamp: formatDate(cp.date_connection_requested),
        details: {
          position:     cp.job_title,
          company:      company?.name ?? '',
          chatterDate:  formatDate(cp.date_connected),
          internalDate: formatDate(cp.date_positive_tag),
        },
        socials: { linkedin: linkedinUrl },
      });

    // 2. meeting_booked — only if actually connected (can't book without connecting)
    } else if (
      cp.lead_phase === 'Meeting planned' &&
      CONNECTED_STATUSES.includes(cp.prospect_status)
    ) {
      activities.push({
        id: String(cp.id),
        type: 'meeting_booked',
        userName,
        userInitials,
        timestamp: formatDate(cp.date_replied ?? cp.date_connected),
        details: {},
        socials: { linkedin: linkedinUrl },
      });

    // 3. message_replied — only if date_replied actually exists (guard against stale status)
    } else if (
      REPLIED_STATUSES.includes(cp.prospect_status) &&
      cp.date_replied !== null
    ) {
      activities.push({
        id: String(cp.id),
        type: 'message_replied',
        userName,
        userInitials,
        timestamp: formatDate(cp.date_replied),
        details: { platform: 'LinkedIn' },
        socials: { linkedin: linkedinUrl },
      });

    // 4. phase_changed — badge shows tags if available, otherwise the lead_phase itself
    } else if (['Closed won', 'Closed lost', 'Negotiation'].includes(cp.lead_phase)) {
      activities.push({
        id: String(cp.id),
        type: 'phase_changed',
        userName,
        userInitials,
        timestamp: formatDate(cp.date_connected ?? cp.date_connection_requested),
        details: {
          phase:  cp.lead_phase,
          status: cp.tags || undefined, // only show badge if tags has a real value
        },
        socials: { linkedin: linkedinUrl },
      });
    }
  }

  return activities.slice(0, 10);
}