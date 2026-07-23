'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClipLoader } from 'react-spinners';
import toast from 'react-hot-toast';
import { getBackendUrl } from '@/lib/api-config';
import { getCookie } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TabType = 'companies' | 'prospects' | 'campaigns' | 'blacklist' | 'unassigned_prospects';

interface EditRowModalProps {
  isOpen: boolean;
  tabType: TabType;
  rowData: any;
  userUuid: string;
  /** Active customer filter — scopes the "All with this name" placeholder delete */
  selectedCustomers?: string[];
  onClose: () => void;
  onSaved: (updatedRow?: any) => void;
}

// Field definition: label, db field name, input type, section
export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'datetime' | 'url' | 'enum';
  /** Key into the fetched EnumOptions map — only for type 'enum' */
  enumKey?: keyof EnumOptions;
  nullable?: boolean;   // whether the enum/boolean can be null/blank
  readOnly?: boolean;
  /** If true, this field is excluded from the bulk edit modal */
  noBulkEdit?: boolean;
  section: string;
}

/** Shape returned by GET /api/master-database/edit-enum-options */
export interface EnumOptions {
  prospect_status: string[];
  lead_phase: string[];
  campaign_type: string[];
  campaign_content: string[];
  comparison_type: string[];
  persona_category: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Field Definitions per tab
// ─────────────────────────────────────────────────────────────────────────────

const COMPANY_FIELDS: FieldDef[] = [
  { key: 'company_id',        label: 'Company ID',        type: 'text',     noBulkEdit: true, section: 'Company Info' },
  { key: 'name',              label: 'Name',              type: 'text',     noBulkEdit: true, section: 'Company Info' },
  { key: 'description',       label: 'Description',       type: 'textarea', noBulkEdit: true, section: 'Company Info' },
  { key: 'website_url',       label: 'Website',           type: 'url',      noBulkEdit: true, section: 'Company Info' },
  { key: 'linkedin_url',      label: 'LinkedIn',          type: 'url',      noBulkEdit: true, section: 'Company Info' },
  { key: 'industry_company',  label: 'Industry',          type: 'text',     section: 'Company Info' },
  { key: 'business_type',     label: 'Business Type',     type: 'text',     section: 'Company Info' },
  { key: 'country',           label: 'Country',           type: 'text',     section: 'Company Info' },
  { key: 'provincie',         label: 'Province',          type: 'text',     section: 'Company Info' },
  { key: 'city',              label: 'City',              type: 'text',     section: 'Company Info' },
  { key: 'size',              label: 'Size',              type: 'number',   section: 'Company Info' },
  { key: 'size_range',        label: 'Size Range',        type: 'text',     section: 'Company Info' },
  // company_customers table
  { key: 'blacklisted',       label: 'Blacklisted',       type: 'boolean',  nullable: false, section: 'Customer Info' },
  { key: 'scraping_name',     label: 'Scraping Name',     type: 'textarea', section: 'Customer Info' },
  { key: 'customers',         label: 'Customers',         type: 'text',     readOnly: true,  section: 'Customer Info' },
  { key: 'created_at',        label: 'Created At',        type: 'date',     readOnly: true,  section: 'Meta' },
];

const PROSPECT_FIELDS: FieldDef[] = [
  // prospects table
  { key: 'prospect_id',                label: 'Prospect ID',          type: 'text',     noBulkEdit: true, section: 'Personal Info' },
  { key: 'first_name',                 label: 'First Name',           type: 'text',     noBulkEdit: true, section: 'Personal Info' },
  { key: 'last_name',                  label: 'Last Name',            type: 'text',     noBulkEdit: true, section: 'Personal Info' },
  { key: 'email',                      label: 'Email',                type: 'text',     noBulkEdit: true, section: 'Personal Info' },
  { key: 'phone',                      label: 'Phone',                type: 'text',     noBulkEdit: true, section: 'Personal Info' },
  { key: 'birthday',                   label: 'Birthday',             type: 'text',     noBulkEdit: true, section: 'Personal Info' },
  { key: 'linkedin_url',               label: 'LinkedIn URL',         type: 'url',      noBulkEdit: true, section: 'Personal Info' },
  // campaign_prospects table
  { key: 'campaign_name',              label: 'Campaign',             type: 'text',     readOnly: true,  section: 'Campaign Info' },
  { key: 'prospect_status',            label: 'Prospect Status',      type: 'enum',     enumKey: 'prospect_status', nullable: true,  section: 'Campaign Info' },
  { key: 'job_title',                  label: 'Job Title',            type: 'textarea',                              section: 'Campaign Info' },
  { key: 'lead_phase',                 label: 'Lead Phase',           type: 'enum',     enumKey: 'lead_phase',      nullable: true,  section: 'Campaign Info' },
  { key: 'scraping_name',              label: 'Scraping Name',        type: 'textarea',                              section: 'Campaign Info' },
  { key: 'date_connected',             label: 'Date Connected',       type: 'date', nullable: true,  section: 'Campaign Info' },
  { key: 'date_connection_requested',  label: 'Date Conn. Requested', type: 'date', nullable: true,  section: 'Campaign Info' },
  { key: 'date_replied',               label: 'Date Replied',         type: 'date', nullable: true,  section: 'Campaign Info' },
  { key: 'date_positive_tag',          label: 'Date Positive Tag',    type: 'date', nullable: true,  section: 'Campaign Info' },
  { key: 'stop_outreach',              label: 'Stop Outreach',        type: 'boolean',  nullable: true,  section: 'Campaign Info' },
  { key: 'email_sent',                 label: 'Email Sent',           type: 'boolean',  nullable: false, section: 'Campaign Info' },
  { key: 'blacklisted',                label: 'Blacklisted',          type: 'boolean',  nullable: false, section: 'Campaign Info' },
  { key: 'crm',                        label: 'CRM',                  type: 'boolean',  nullable: false, section: 'Campaign Info' },
  { key: 'linkedin_group_name',        label: 'LinkedIn Group',       type: 'text',     readOnly: true,  section: 'Campaign Info' },
  // persona fields (auto-classified are read-only; category is manual)
  { key: 'persona_areas',               label: 'Persona Areas',        type: 'text',     readOnly: true,  noBulkEdit: true, section: 'Persona' },
  { key: 'persona_levels',              label: 'Persona Levels',       type: 'text',     readOnly: true,  noBulkEdit: true, section: 'Persona' },
  { key: 'persona_level',               label: 'Persona Level',        type: 'text',     readOnly: true,  noBulkEdit: true, section: 'Persona' },
  { key: 'persona_category',            label: 'Persona Category',     type: 'text',                                        section: 'Persona' },
  // companies table
  { key: 'company.name',              label: 'Company Name',         type: 'text',     section: 'Company' },
  { key: 'company.company_id',        label: 'Company ID',           type: 'text',     section: 'Company' },
  { key: 'company.website_url',       label: 'Company Website',      type: 'url',      section: 'Company' },
  { key: 'company.linkedin_url',      label: 'Company LinkedIn',     type: 'url',      section: 'Company' },
  { key: 'company.city',              label: 'Company City',         type: 'text',     section: 'Company' },
  { key: 'company.size',              label: 'Company Size',         type: 'number',   section: 'Company' },
  { key: 'company.size_range',        label: 'Company Size Range',   type: 'text',     section: 'Company' },
  { key: 'company.industry_company',  label: 'Company Industry',     type: 'text',     section: 'Company' },
  { key: 'company.business_type',     label: 'Business Type',        type: 'text',     section: 'Company' },
  { key: 'company.country',           label: 'Company Country',      type: 'text',     section: 'Company' },
  { key: 'company.provincie',         label: 'Company Province',     type: 'text',     section: 'Company' },
];

const CAMPAIGN_FIELDS: FieldDef[] = [
  { key: 'campaign_name',              label: 'Campaign Name',     type: 'text',    noBulkEdit: true, section: 'Campaign Info' },
  { key: 'campaign_type',              label: 'Type',              type: 'enum',    enumKey: 'campaign_type',    nullable: false, section: 'Campaign Info' },
  { key: 'campaign_content',           label: 'Content',           type: 'enum',    enumKey: 'campaign_content', nullable: true,  section: 'Campaign Info' },
  { key: 'campaign_sector',            label: 'Sector',            type: 'text',    section: 'Campaign Info' },
  { key: 'campaign_company_attribute', label: 'Company Attribute', type: 'text',    section: 'Campaign Info' },
  { key: 'campaign_persona',           label: 'Persona',           type: 'text',    section: 'Campaign Info' },
  { key: 'requests_per_day',           label: 'Requests/Day',      type: 'number',  section: 'Campaign Info' },
  { key: 'start_date',                 label: 'Start Date',        type: 'date',    nullable: true,  section: 'Campaign Info' },
  { key: 'live',                       label: 'Live',              type: 'boolean', nullable: false, section: 'Campaign Info' },
  { key: 'stop_follow_up',             label: 'Stop Follow-Up',    type: 'boolean', nullable: false, section: 'Campaign Info' },
  { key: 'profile_name',               label: 'Profile',           type: 'text',    readOnly: true,  section: 'Profile' },
];

const BLACKLIST_FIELDS: FieldDef[] = [
  { key: 'field_target',   label: 'Field Target',    type: 'text', section: 'Blacklist Entry' },
  { key: 'comparison_type', label: 'Comparison Type', type: 'enum', enumKey: 'comparison_type', nullable: false, section: 'Blacklist Entry' },
  { key: 'value',          label: 'Value',           type: 'text', section: 'Blacklist Entry' },
];

const UNASSIGNED_PROSPECT_FIELDS: FieldDef[] = [
  // prospects table
  { key: 'prospect_id',        label: 'Prospect ID',      type: 'text',     noBulkEdit: true, section: 'Personal Info' },
  { key: 'first_name',         label: 'First Name',       type: 'text',     noBulkEdit: true, section: 'Personal Info' },
  { key: 'last_name',          label: 'Last Name',        type: 'text',     noBulkEdit: true, section: 'Personal Info' },
  { key: 'email',              label: 'Email',            type: 'text',     noBulkEdit: true, section: 'Personal Info' },
  { key: 'phone',              label: 'Phone',            type: 'text',     noBulkEdit: true, section: 'Personal Info' },
  { key: 'linkedin_url',       label: 'LinkedIn URL',     type: 'url',      noBulkEdit: true, section: 'Personal Info' },
  // customer_prospects table
  { key: 'job_title',          label: 'Job Title',        type: 'textarea',                    section: 'Customer Prospect' },
  { key: 'scraping_name',      label: 'Scraping Name',    type: 'textarea',                    section: 'Customer Prospect' },
  { key: 'blacklisted',        label: 'Blacklisted',      type: 'boolean',  nullable: false,   section: 'Customer Prospect' },
  { key: 'persona_category',   label: 'Persona Category', type: 'text',                        section: 'Customer Prospect' },
  // persona fields (auto-classified are read-only)
  { key: 'persona_areas',      label: 'Persona Areas',    type: 'text',     readOnly: true, noBulkEdit: true, section: 'Persona' },
  { key: 'persona_levels',     label: 'Persona Levels',   type: 'text',     readOnly: true, noBulkEdit: true, section: 'Persona' },
  { key: 'persona_level',      label: 'Persona Level',    type: 'text',     readOnly: true, noBulkEdit: true, section: 'Persona' },
  // company fields (read-only context)
  { key: 'company.name',              label: 'Company Name',       type: 'text', readOnly: true, noBulkEdit: true, section: 'Company' },
  { key: 'company.city',              label: 'Company City',       type: 'text', readOnly: true, noBulkEdit: true, section: 'Company' },
  { key: 'company.size_range',        label: 'Company Size Range', type: 'text', readOnly: true, noBulkEdit: true, section: 'Company' },
  { key: 'company.industry_company',  label: 'Company Industry',   type: 'text', readOnly: true, noBulkEdit: true, section: 'Company' },
  { key: 'company.country',           label: 'Company Country',    type: 'text', readOnly: true, noBulkEdit: true, section: 'Company' },
];

export const FIELDS_BY_TAB: Record<TabType, FieldDef[]> = {
  companies: COMPANY_FIELDS,
  prospects: PROSPECT_FIELDS,
  campaigns: CAMPAIGN_FIELDS,
  blacklist: BLACKLIST_FIELDS,
  unassigned_prospects: UNASSIGNED_PROSPECT_FIELDS,
};

const ENDPOINT_BY_TAB: Record<TabType, string> = {
  companies: 'update-company',
  prospects: 'update-prospect',
  campaigns: 'update-campaign',
  blacklist: 'update-blacklist-entry',
  unassigned_prospects: 'update-unassigned-prospect',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get nested value from path like "company.name"
// ─────────────────────────────────────────────────────────────────────────────
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc != null ? acc[key] : null), obj);
}

// Format display value for view mode
function formatDisplayValue(value: any, field: FieldDef): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field.type === 'boolean') return value ? 'Yes' : 'No';
  if (field.type === 'datetime' && value) {
    try { return new Date(value).toLocaleString(); } catch { return String(value); }
  }
  if (Array.isArray(value)) return value.map((v: any) => v.customer_name || v).join(', ');
  return String(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Build save payload based on tab type
// ─────────────────────────────────────────────────────────────────────────────
function buildSavePayload(tabType: TabType, rowData: any, editValues: Record<string, any>, userUuid: string) {
  const getChanges = (fields: string[]) => {
    const changes: Record<string, any> = {};
    for (const key of fields) {
      if (key in editValues) {
        const original = getNestedValue(rowData, key);
        const edited = editValues[key];
        // Only include if changed
        if (String(original ?? '') !== String(edited ?? '')) {
          changes[key] = edited;
        }
      }
    }
    return changes;
  };

  switch (tabType) {
    case 'companies': {
      const companyChanges = getChanges(['company_id', 'name', 'description', 'website_url', 'linkedin_url',
        'industry_company', 'business_type', 'country', 'provincie', 'city', 'size', 'size_range',
        'blacklisted', 'scraping_name']);
      return {
        userUuid,
        companyId: rowData.id,
        companyCustomerId: rowData.company_customer_id ?? null,
        changes: companyChanges,
      };
    }
    case 'prospects': {
      const personalChanges = getChanges(['prospect_id', 'linkedin_url', 'first_name', 'last_name', 'email', 'phone', 'birthday']);
      const campaignChanges = getChanges(['job_title', 'prospect_status', 'date_connected', 'date_connection_requested',
        'date_replied', 'date_positive_tag', 'scraping_name', 'stop_outreach', 'lead_phase', 'email_sent', 'blacklisted', 'crm',
        'persona_category']);
      const companyFieldMap: Record<string, string> = {
        'company.name': 'name', 'company.company_id': 'company_id', 'company.website_url': 'website_url',
        'company.linkedin_url': 'linkedin_url', 'company.city': 'city', 'company.size': 'size',
        'company.size_range': 'size_range', 'company.industry_company': 'industry_company',
        'company.business_type': 'business_type', 'company.country': 'country', 'company.provincie': 'provincie',
      };
      const companyChanges: Record<string, any> = {};
      for (const [dotKey, dbKey] of Object.entries(companyFieldMap)) {
        if (dotKey in editValues) {
          const original = getNestedValue(rowData, dotKey);
          const edited = editValues[dotKey];
          if (String(original ?? '') !== String(edited ?? '')) {
            companyChanges[dbKey] = edited;
          }
        }
      }
      const changes = { ...personalChanges, ...campaignChanges };
      return {
        userUuid,
        campaignProspectId: rowData.id,
        prospectTableId: rowData.prospect_table_id ?? null,
        companyId: rowData.company?.id ?? null,
        changes,
        companyChanges: Object.keys(companyChanges).length > 0 ? companyChanges : undefined,
      };
    }
    case 'campaigns': {
      const campaignChanges = getChanges(['campaign_name', 'requests_per_day', 'campaign_type', 'campaign_content',
        'campaign_sector', 'campaign_company_attribute', 'campaign_persona', 'start_date', 'live', 'stop_follow_up']);
      // Follow-up message changes
      const followUpChanges: any[] = [];
      if (rowData.content && Array.isArray(rowData.content)) {
        for (const fu of rowData.content) {
          const fuEdit: any = { id: fu.id };
          let hasChange = false;
          for (const field of ['message_content', 'message_delay']) {
            const editKey = `followup_${fu.id}_${field}`;
            if (editKey in editValues) {
              if (String(fu[field] ?? '') !== String(editValues[editKey] ?? '')) {
                fuEdit[field] = editValues[editKey];
                hasChange = true;
              }
            }
          }
          if (hasChange) followUpChanges.push(fuEdit);
        }
      }
      return {
        userUuid,
        campaignId: rowData.id,
        changes: campaignChanges,
        followUpChanges: followUpChanges.length > 0 ? followUpChanges : undefined,
      };
    }
    case 'blacklist': {
      const changes = getChanges(['value', 'comparison_type', 'field_target']);
      return {
        userUuid,
        blacklistEntryId: rowData.id,
        changes,
      };
    }
    case 'unassigned_prospects': {
      const personalChanges = getChanges(['linkedin_url', 'first_name', 'last_name', 'email', 'phone']);
      const cupChanges = getChanges(['job_title', 'scraping_name', 'blacklisted', 'persona_category']);
      const changes = { ...personalChanges, ...cupChanges };
      return {
        userUuid,
        customerProspectId: rowData.id,
        prospectTableId: rowData.prospect_table_id ?? null,
        companyId: rowData.company?.id ?? null,
        changes,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Field Input Component
// ─────────────────────────────────────────────────────────────────────────────
// Convert a datetime string from the DB to the value format needed by <input type="datetime-local">
function toDatetimeLocal(val: any): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    // datetime-local needs "YYYY-MM-DDTHH:MM"
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export function FieldInput({
  field, value, onChange, enumOptions
}: {
  field: FieldDef;
  value: any;
  onChange: (val: any) => void;
  enumOptions: EnumOptions;
}) {
  const baseClass = 'w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white';

  if (field.type === 'boolean') {
    const isNullable = field.nullable !== false;
    return (
      <select
        className={baseClass}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={e => {
          const v = e.target.value;
          onChange(v === '' ? null : v === 'true');
        }}
      >
        {isNullable && <option value="">—</option>}
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (field.type === 'enum') {
    const isNullable = field.nullable !== false;
    const opts = field.enumKey ? (enumOptions[field.enumKey] ?? []) : [];
    return (
      <select
        className={baseClass}
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? null : e.target.value)}
      >
        {isNullable && <option value="">—</option>}
        {opts.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        className={`${baseClass} min-h-[60px] resize-y`}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      />
    );
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        className={baseClass}
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    );
  }

  if (field.type === 'datetime') {
    return (
      <div className="flex items-center gap-1">
        <input
          type="datetime-local"
          className={baseClass}
          value={toDatetimeLocal(value)}
          onChange={e => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        />
        {field.nullable !== false && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-gray-400 hover:text-red-500 px-1"
            title="Clear"
          >✕</button>
        )}
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <input
        type="date"
        className={baseClass}
        value={value ? String(value).substring(0, 10) : ''}
        onChange={e => onChange(e.target.value || null)}
      />
    );
  }

  return (
    <input
      type="text"
      className={baseClass}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton cache: enum options are the same for all rows, fetch once per session
// ─────────────────────────────────────────────────────────────────────────────
export const EMPTY_ENUM_OPTIONS: EnumOptions = {
  prospect_status: [], lead_phase: [], campaign_type: [], campaign_content: [], comparison_type: [], persona_category: [],
};
let cachedEnumOptions: EnumOptions | null = null;
export function getCachedEnumOptions(): EnumOptions | null { return cachedEnumOptions; }
export function setCachedEnumOptions(opts: EnumOptions): void { cachedEnumOptions = opts; }

// ─────────────────────────────────────────────────────────────────────────────
// Main Modal Component
// ─────────────────────────────────────────────────────────────────────────────
export default function EditRowModal({
  isOpen, tabType, rowData, userUuid, selectedCustomers, onClose, onSaved
}: EditRowModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [enumOptions, setEnumOptions] = useState<EnumOptions>(getCachedEnumOptions() ?? EMPTY_ENUM_OPTIONS);

  // ── Placeholder state (unassigned_prospects only) ──────────────────────
  type PlaceholderItem = { id: number; name: string; value: string };
  const [localPlaceholders, setLocalPlaceholders] = useState<PlaceholderItem[]>([]);
  const [editingPlId, setEditingPlId] = useState<number | null>(null);
  const [editingPlValue, setEditingPlValue] = useState('');
  const [savingPlId, setSavingPlId] = useState<number | null>(null);
  const [deletingPlId, setDeletingPlId] = useState<number | null>(null);
  const [deleteConfirmPlId, setDeleteConfirmPlId] = useState<number | null>(null);

  // Fetch enum options once (cached across modal opens)
  useEffect(() => {
    if (getCachedEnumOptions()) return;
    const token = getCookie('token');
    const backendUrl = getBackendUrl();
    if (!token || !backendUrl) return;
    fetch(`${backendUrl}/api/master-database/edit-enum-options`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => {
        const opts = json?.data as EnumOptions;
        if (opts) {
          setCachedEnumOptions(opts);
          setEnumOptions(opts);
        }
      })
      .catch(() => { /* silently fall back to empty arrays */ });
  }, []);
  // Reset state when opening a new row
  useEffect(() => {
    if (isOpen && rowData) {
      setIsEditing(false);
      setEditValues({});
      setLocalPlaceholders(rowData.placeholders ?? []);
      setEditingPlId(null);
      setEditingPlValue('');
      setDeleteConfirmPlId(null);
    }
  }, [isOpen, rowData]);

  const fields = FIELDS_BY_TAB[tabType] ?? [];

  // Group fields by section
  const sections = fields.reduce((acc, field) => {
    if (!acc[field.section]) acc[field.section] = [];
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, FieldDef[]>);

  const handleEditToggle = () => {
    if (!isEditing) {
      // Initialise edit values from current row data
      const initial: Record<string, any> = {};
      for (const field of fields) {
        if (!field.readOnly) {
          initial[field.key] = getNestedValue(rowData, field.key);
        }
      }
      // Also init follow-up fields for campaigns
      if (tabType === 'campaigns' && rowData?.content) {
        for (const fu of rowData.content) {
          initial[`followup_${fu.id}_message_content`] = fu.message_content;
          initial[`followup_${fu.id}_message_delay`] = fu.message_delay;
        }
      }
      setEditValues(initial);
    }
    setIsEditing(prev => !prev);
  };

  const handleCancel = () => {
    setEditValues({});
    setIsEditing(false);
  };

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const backendUrl = getBackendUrl();
      const token = getCookie('token');
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const payload = buildSavePayload(tabType, rowData, editValues, userUuid);

      // Extra warning when stop_outreach is being set to true on a prospect
      if (tabType === 'prospects' && (payload as any).changes?.stop_outreach === true) {
        const confirmed = window.confirm(
          `⚠️ You are about to stop outreach for this prospect.\n\nThis will:\n• Set Stop Outreach to Yes\n• Set Prospect Status to Revoked\n• Close all open tasks for this prospect\n\nThis action cannot be easily undone. Continue?`
        );
        if (!confirmed) {
          setIsSaving(false);
          return;
        }
      }

      // For campaigns: validate that no follow-up message_delay is being cleared
      if (tabType === 'campaigns') {
        for (const [key, val] of Object.entries(editValues)) {
          if (key.endsWith('_message_delay') && (val === '' || val === null || val === undefined)) {
            const idx = key.replace('followup_', '').replace('_message_delay', '');
            toast.error(`Message (id ${idx}): delay is required`);
            setIsSaving(false);
            return;
          }
        }
      }

      // Check if there are actually any changes
      const hasChanges =
        (payload as any).changes && Object.keys((payload as any).changes).length > 0 ||
        (payload as any).companyChanges && Object.keys((payload as any).companyChanges || {}).length > 0 ||
        (payload as any).followUpChanges && ((payload as any).followUpChanges || []).length > 0;

      if (!hasChanges) {
        toast('No changes to save', { icon: 'ℹ️' });
        setIsEditing(false);
        return;
      }

      const endpoint = ENDPOINT_BY_TAB[tabType];
      const response = await fetch(`${backendUrl}/api/master-database/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Request failed with status ${response.status}`);
      }

      const result = await response.json();
      toast.success('Changes saved successfully');
      setIsEditing(false);
      setEditValues({});

      // Merge updated fields back into the row object for optimistic UI
      const mergedRow = { ...rowData };
      for (const [key, val] of Object.entries(editValues)) {
        if (key.startsWith('followup_')) continue;
        if (key.includes('.')) {
          const [parent, child] = key.split('.');
          if (mergedRow[parent]) mergedRow[parent] = { ...mergedRow[parent], [child]: val };
        } else {
          mergedRow[key] = val;
        }
      }
      // Update follow-up content
      if (tabType === 'campaigns' && mergedRow.content) {
        mergedRow.content = mergedRow.content.map((fu: any) => {
          const mc = editValues[`followup_${fu.id}_message_content`];
          const md = editValues[`followup_${fu.id}_message_delay`];
          return { ...fu, message_content: mc !== undefined ? mc : fu.message_content, message_delay: md !== undefined ? md : fu.message_delay };
        });
      }

      onSaved(result.data ?? mergedRow);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to save: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }, [tabType, rowData, editValues, userUuid, onSaved]);

  // ── Placeholder helpers (unassigned_prospects + prospects) ──────────────
  const cupId: number | null = tabType === 'prospects'
    ? (rowData?.campaign_prospect_id ?? null)
    : (rowData?.customer_prospect_id ?? null);
  const backendBase = getBackendUrl();
  const authToken = getCookie('token');

  const callBulkSetPlaceholder = async (name: string, value: string) => {
    const res = await fetch(`${backendBase}/api/master-database/bulk-set-placeholder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ userUuid, tabType, ids: [cupId], placeholderName: name, placeholderValue: value }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Request failed ${res.status}`);
    }
    return res.json();
  };

  const handleSavePlaceholderEdit = async (pl: { id: number; name: string; value: string }) => {
    if (!editingPlValue.trim()) { toast('Value cannot be empty', { icon: 'ℹ️' }); return; }
    try {
      setSavingPlId(pl.id);
      await callBulkSetPlaceholder(pl.name, editingPlValue.trim());
      setLocalPlaceholders(prev => prev.map(p => p.name.toLowerCase().trim() === pl.name.toLowerCase().trim() ? { ...p, value: editingPlValue.trim() } : p));
      setEditingPlId(null);
      toast.success('Placeholder updated');
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : e}`);
    } finally { setSavingPlId(null); }
  };

  const handleDeletePlaceholder = async (pl: { id: number; name: string }, mode: 'single' | 'all') => {
    try {
      setDeletingPlId(pl.id);
      setDeleteConfirmPlId(null);
      const res = await fetch(`${backendBase}/api/master-database/delete-prospect-placeholder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userUuid, cupId, placeholderName: pl.name, mode, tabType, customerNames: selectedCustomers ?? [] }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `${res.status}`); }
      const newPlaceholders = mode === 'all'
        ? localPlaceholders.filter(p => p.name.toLowerCase().trim() !== pl.name.toLowerCase().trim())
        : localPlaceholders.filter(p => p.id !== pl.id);
      setLocalPlaceholders(newPlaceholders);
      onSaved({ ...rowData, placeholders: newPlaceholders });
      toast.success(mode === 'all' ? 'All placeholders with this name removed' : 'Placeholder removed');
    } catch (e) {
      toast.error(`Failed: ${e instanceof Error ? e.message : e}`);
    } finally { setDeletingPlId(null); }
  };

  if (!isOpen || !rowData) return null;

  const tabLabel = tabType.charAt(0).toUpperCase() + tabType.slice(1, -1); // e.g. "Companie" → fix:
  const titleLabel = { companies: 'Company', prospects: 'Prospect', campaigns: 'Campaign', blacklist: 'Blacklist Entry', unassigned_prospects: 'Unassigned Prospect' }[tabType];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{titleLabel} Details</h2>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={handleEditToggle}
                className="px-3 py-1.5 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? <ClipLoader size={12} color="#fff" /> : null}
                  Save Changes
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* Standard sections */}
          {Object.entries(sections).map(([sectionName, sectionFields]) => (
            <div key={sectionName}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pb-1 border-b border-gray-100">
                {sectionName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {sectionFields.map(field => {
                  const rawValue = getNestedValue(rowData, field.key);
                  const editValue = editValues[field.key];
                  const isEditable = isEditing && !field.readOnly;

                  return (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">
                        {field.label}
                        {field.readOnly && <span className="ml-1 text-gray-400 font-normal">(read only)</span>}
                      </label>
                      {isEditable ? (
                        <FieldInput
                          field={field}
                          value={editValue}
                          onChange={val => setEditValues(prev => ({ ...prev, [field.key]: val }))}
                          enumOptions={enumOptions}
                        />
                      ) : (
                        <div className={`px-2 py-1 text-xs rounded min-h-[26px] break-words ${field.readOnly ? 'bg-gray-50 text-gray-500' : 'bg-gray-50 text-gray-900'}`}>
                          {field.type === 'boolean' ? (
                            rawValue === null || rawValue === undefined
                              ? <span className="text-gray-400">—</span>
                              : rawValue
                                ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span>
                                : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">No</span>
                          ) : field.type === 'url' && rawValue ? (
                            <a href={rawValue} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {rawValue}
                            </a>
                          ) : (
                            formatDisplayValue(rawValue, field)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Follow-up messages for campaigns */}
          {tabType === 'campaigns' && rowData?.content && rowData.content.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pb-1 border-b border-gray-100">
                Follow-Up Messages
              </h3>
              <div className="space-y-3">
                {rowData.content.map((fu: any, idx: number) => (
                  <div key={fu.id} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                    <div className="text-xs font-medium text-gray-600 mb-2">Message {idx + 1}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Content</label>
                        {isEditing ? (
                          <textarea
                            className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white min-h-[60px] resize-y"
                            value={editValues[`followup_${fu.id}_message_content`] ?? ''}
                            onChange={e => setEditValues(prev => ({ ...prev, [`followup_${fu.id}_message_content`]: e.target.value }))}
                          />
                        ) : (
                          <div className="px-2 py-1 text-xs bg-white rounded border border-gray-100 whitespace-pre-wrap min-h-[26px]">
                            {fu.message_content || '—'}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Delay</label>
                        {isEditing ? (
                          <input
                            type="text"
                            className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            value={editValues[`followup_${fu.id}_message_delay`] ?? ''}
                            onChange={e => setEditValues(prev => ({ ...prev, [`followup_${fu.id}_message_delay`]: e.target.value }))}
                          />
                        ) : (
                          <div className="px-2 py-1 text-xs bg-white rounded border border-gray-100 min-h-[26px]">
                            {fu.message_delay || '—'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placeholders section — unassigned_prospects and prospects */}
          {(tabType === 'unassigned_prospects' || tabType === 'prospects') && (
            <div>
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Placeholders</h3>
              </div>

              {/* Existing placeholders */}
              <div className="space-y-1.5 mb-2">
                {localPlaceholders.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No placeholders yet.</p>
                )}
                {localPlaceholders.map(pl => (
                  <div key={pl.id} className="flex items-center gap-2 group">
                    <span className="text-[10px] font-semibold text-gray-500 w-28 shrink-0 truncate" title={pl.name}>{pl.name}</span>
                    {editingPlId === pl.id ? (
                      <>
                        <input
                          autoFocus
                          type="text"
                          value={editingPlValue}
                          onChange={e => setEditingPlValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSavePlaceholderEdit(pl); if (e.key === 'Escape') setEditingPlId(null); }}
                          className="flex-1 text-xs border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#364570]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePlaceholderEdit(pl)}
                          disabled={savingPlId === pl.id}
                          className="text-[10px] font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          {savingPlId === pl.id ? <ClipLoader size={10} color="#16a34a" /> : 'Save'}
                        </button>
                        <button type="button" onClick={() => setEditingPlId(null)} className="text-[10px] text-gray-400 hover:text-gray-600">Cancel</button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-xs bg-gray-50 border border-gray-100 rounded px-2 py-0.5 truncate" title={pl.value}>{pl.value || '—'}</span>
                        <button
                          type="button"
                          onClick={() => { setEditingPlId(pl.id); setEditingPlValue(pl.value); }}
                          className="text-[10px] text-gray-400 hover:text-[#364570] opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Edit value"
                        >
                          ✎
                        </button>
                        {deleteConfirmPlId === pl.id ? (
                          <>
                            <span className="text-[10px] text-gray-500 shrink-0">Delete:</span>
                            <button
                              type="button"
                              onClick={() => handleDeletePlaceholder(pl, 'single')}
                              disabled={deletingPlId === pl.id}
                              className="text-[10px] text-red-500 hover:text-red-700 font-medium shrink-0 disabled:opacity-50"
                            >
                              {deletingPlId === pl.id ? <ClipLoader size={10} color="#ef4444" /> : 'This one'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlaceholder(pl, 'all')}
                              disabled={deletingPlId === pl.id}
                              className="text-[10px] text-red-700 hover:text-red-900 font-medium shrink-0 disabled:opacity-50"
                            >
                              All with this name
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmPlId(null)}
                              className="text-[10px] text-gray-400 hover:text-gray-600 shrink-0"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmPlId(pl.id)}
                            disabled={deletingPlId === pl.id}
                            className="text-[10px] text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                            title="Remove placeholder"
                          >
                            ✕
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>


            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? <ClipLoader size={12} color="#fff" /> : null}
                Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
