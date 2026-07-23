'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ClipLoader } from 'react-spinners';
import toast from 'react-hot-toast';
import { getBackendUrl } from '@/lib/api-config';
import { getCookie } from '@/lib/auth';

const CAMPAIGN_TYPES = ['Connector', 'Messenger', 'First Connections', 'Other DMU', 'AI Campaign'] as const;
const CAMPAIGN_CONTENTS = [
  'Job change', 'LinkedIn group', 'First connections', 'Location',
  'Multiple interactions', 'No LinkedIn group', 'GPT', 'Event', 'Other', 'Empty Connector',
] as const;

interface Profile {
  id: string;
  name: string;
}

interface CreateCampaignModalProps {
  isOpen: boolean;
  profiles: Profile[];
  userUuid: string;
  selectedCustomers: string[];
  onClose: () => void;
  onCreated: () => void;
}

interface MessageRow {
  message_content: string;
  message_delay: string;
}

interface CampaignOption {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  campaign_name: '',
  campaign_type: '',
  campaign_content: '',
  campaign_sector: '',
  campaign_company_attribute: '',
  campaign_persona: '',
  requests_per_day: '',
  start_date: '',
  live: 'false',
};

const EMPTY_MESSAGE: MessageRow = { message_content: '', message_delay: '' };

const MSG_PLACEHOLDERS = ['*first_name*', '*last_name*', '*company_name*', '*job_title*', '*linkedin_group*'];

export default function CreateCampaignModal({
  isOpen, profiles, userUuid, selectedCustomers, onClose, onCreated,
}: CreateCampaignModalProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [messages, setMessages] = useState<MessageRow[]>([{ ...EMPTY_MESSAGE }]);
  const [profileId, setProfileId] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedMsgIdx, setFocusedMsgIdx] = useState<number | null>(null);
  const msgRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  const insertMsgPlaceholder = (ph: string) => {
    if (focusedMsgIdx === null) return;
    const el = msgRefs.current[focusedMsgIdx];
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const current = messages[focusedMsgIdx].message_content;
    const newVal = current.slice(0, start) + ph + current.slice(end);
    updateMessage(focusedMsgIdx, 'message_content', newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ph.length, start + ph.length);
    });
  };

  // Copy-from-campaign state
  const [profileCampaigns, setProfileCampaigns] = useState<CampaignOption[]>([]);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [selectedCopyCampaignId, setSelectedCopyCampaignId] = useState('');
  const [copyLoading, setCopyLoading] = useState(false);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  const filteredCampaigns = useMemo(() => {
    const q = campaignSearch.trim().toLowerCase();
    if (!q) return profileCampaigns;
    return profileCampaigns.filter(c => c.name.toLowerCase().includes(q));
  }, [profileCampaigns, campaignSearch]);

  // Fetch campaigns for the selected profile whenever it changes
  useEffect(() => {
    if (!profileId || !userUuid || selectedCustomers.length === 0) {
      setProfileCampaigns([]);
      setSelectedCopyCampaignId('');
      setCampaignSearch('');
      return;
    }
    const backendUrl = getBackendUrl();
    const token = getCookie('token');
    if (!token) return;

    setCampaignsLoading(true);
    fetch(`${backendUrl}/api/master-database/prospect-campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userUuid, selectedCustomers, selectedProfileIds: [profileId] }),
    })
      .then(r => r.json())
      .then(data => {
        setProfileCampaigns((data.campaigns || []).map((c: any) => ({ id: String(c.id), name: c.name })));
        setSelectedCopyCampaignId('');
        setCampaignSearch('');
      })
      .catch(() => setProfileCampaigns([]))
      .finally(() => setCampaignsLoading(false));
  }, [profileId]);

  const handleCopyContent = async () => {
    if (!selectedCopyCampaignId) { toast.error('Select a campaign to copy from'); return; }
    const backendUrl = getBackendUrl();
    const token = getCookie('token');
    if (!token) { toast.error('Authentication token not found'); return; }

    setCopyLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/master-database/campaign-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userUuid, campaignId: selectedCopyCampaignId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Request failed with status ${res.status}`);
      }
      const data = await res.json();
      const copied: MessageRow[] = (data.messages || []).map((m: any) => ({
        message_content: m.message_content ?? '',
        message_delay: m.message_delay != null ? String(m.message_delay) : '',
      }));
      if (copied.length === 0) {
        toast.error('That campaign has no messages to copy');
        return;
      }
      setMessages(copied);
      toast.success(`Copied ${copied.length} message(s) from campaign`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Copy failed: ${msg}`);
    } finally {
      setCopyLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ ...EMPTY_FORM });
    setMessages([{ ...EMPTY_MESSAGE }]);
    setProfileId('');
    setProfileCampaigns([]);
    setSelectedCopyCampaignId('');
    setCampaignSearch('');
    onClose();
  };

  const addMessage = () => setMessages(ms => [...ms, { ...EMPTY_MESSAGE }]);
  const removeMessage = (idx: number) => setMessages(ms => ms.filter((_, i) => i !== idx));
  const updateMessage = (idx: number, field: keyof MessageRow, value: string) =>
    setMessages(ms => ms.map((m, i) => i === idx ? { ...m, [field]: value } : m));

  // AI Campaigns only use the connection request message; replies are handled
  // by chatters (with AI suggestions) instead of scheduled follow-ups.
  const isAiCampaign = form.campaign_type === 'AI Campaign';
  const visibleMessages = isAiCampaign ? messages.slice(0, 1) : messages;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) { toast.error('Please select a profile'); return; }
    if (!form.campaign_name.trim()) { toast.error('Campaign name is required'); return; }
    if (!form.campaign_type) { toast.error('Campaign type is required'); return; }
    const rpd = parseInt(form.requests_per_day, 10);
    if (isNaN(rpd) || rpd < 0 || rpd > 100) { toast.error('Requests per day must be between 0 and 100'); return; }

    for (let i = 0; i < visibleMessages.length; i++) {
      if (visibleMessages[i].message_delay === '') { toast.error(`Message ${i + 1}: delay is required`); return; }
    }

    const followUpMessages = visibleMessages
      .map(m => ({ message_content: m.message_content.trim(), message_delay: parseInt(m.message_delay, 10) || 0 }));

    setSaving(true);
    try {
      const backendUrl = getBackendUrl();
      const token = getCookie('token');
      const res = await fetch(`${backendUrl}/api/master-database/create-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userUuid,
          profileId,
          followUpMessages,
          campaignData: {
            campaign_name: form.campaign_name.trim(),
            campaign_type: form.campaign_type,
            campaign_content: form.campaign_content || null,
            campaign_sector: form.campaign_sector.trim() || null,
            campaign_company_attribute: form.campaign_company_attribute.trim() || null,
            campaign_persona: form.campaign_persona.trim() || null,
            requests_per_day: rpd,
            start_date: form.start_date || null,
            live: form.live === 'true',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error?.message || 'Failed to create campaign');
        return;
      }
      toast.success('Campaign created successfully');
      handleClose();
      onCreated();
    } catch (err) {
      console.error('Create campaign error:', err);
      toast.error('Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = 'w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#364570] bg-white';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-0.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">New Campaign</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none">&times;</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-4 py-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">

            {/* Profile */}
            <div className="col-span-2">
              <label className={labelClass}>Profile <span className="text-red-500">*</span></label>
              {profiles.length === 0 ? (
                <div className="text-xs text-gray-400 italic py-1">No profiles available for selected customer(s)</div>
              ) : (
                <select className={inputClass} value={profileId} onChange={e => setProfileId(e.target.value)} required>
                  <option value="">— Select profile —</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Campaign Name */}
            <div className="col-span-2">
              <label className={labelClass}>Campaign Name <span className="text-red-500">*</span></label>
              <input
                className={inputClass}
                type="text"
                value={form.campaign_name}
                onChange={e => setForm(f => ({ ...f, campaign_name: e.target.value }))}
                placeholder="e.g. Q2 Outreach - IT Managers NL"
                required
              />
            </div>

            {/* Live */}
            <div>
              <label className={labelClass}>Live</label>
              <select className={inputClass} value={form.live} onChange={e => setForm(f => ({ ...f, live: e.target.value }))}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                className={inputClass}
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>

            {/* Requests per Day */}
            <div>
              <label className={labelClass}>Requests / Day <span className="text-red-500">*</span></label>
              <input
                className={inputClass}
                type="number"
                min={0}
                max={100}
                value={form.requests_per_day}
                onChange={e => setForm(f => ({ ...f, requests_per_day: e.target.value }))}
                placeholder="e.g. 20"
                required
              />
            </div>

            {/* Persona */}
            <div>
              <label className={labelClass}>Persona</label>
              <input
                className={inputClass}
                type="text"
                value={form.campaign_persona}
                onChange={e => setForm(f => ({ ...f, campaign_persona: e.target.value }))}
                placeholder="e.g. IT Manager"
              />
            </div>

            {/* Campaign Type */}
            <div>
              <label className={labelClass}>Type <span className="text-red-500">*</span></label>
              <select className={inputClass} value={form.campaign_type} onChange={e => setForm(f => ({ ...f, campaign_type: e.target.value }))} required>
                <option value="">— Select type —</option>
                {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Campaign Content */}
            <div>
              <label className={labelClass}>Content</label>
              <select className={inputClass} value={form.campaign_content} onChange={e => setForm(f => ({ ...f, campaign_content: e.target.value }))}>
                <option value="">— None —</option>
                {CAMPAIGN_CONTENTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Sector */}
            <div>
              <label className={labelClass}>Sector</label>
              <input
                className={inputClass}
                type="text"
                value={form.campaign_sector}
                onChange={e => setForm(f => ({ ...f, campaign_sector: e.target.value }))}
                placeholder="e.g. IT"
              />
            </div>

            {/* Company Attribute */}
            <div>
              <label className={labelClass}>Company Attribute</label>
              <input
                className={inputClass}
                type="text"
                value={form.campaign_company_attribute}
                onChange={e => setForm(f => ({ ...f, campaign_company_attribute: e.target.value }))}
                placeholder="e.g. SME"
              />
            </div>

          </div>

          {/* ── Copy from Campaign ── */}
          <div className="mt-4 border border-gray-200 rounded p-3 bg-gray-50">
            <span className="text-xs font-semibold text-gray-700">Copy Messages from Campaign</span>
            {!profileId ? (
              <p className="text-xs text-gray-400 italic mt-1.5">Select a profile first to load campaigns.</p>
            ) : campaignsLoading ? (
              <div className="flex items-center gap-2 mt-2">
                <ClipLoader size={12} color="#364570" />
                <span className="text-xs text-gray-500">Loading campaigns…</span>
              </div>
            ) : profileCampaigns.length === 0 ? (
              <p className="text-xs text-gray-400 italic mt-1.5">No campaigns found for this profile.</p>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1">
                  <input
                    className={inputClass}
                    type="text"
                    placeholder="Search campaign…"
                    value={campaignSearch}
                    onChange={e => {
                      setCampaignSearch(e.target.value);
                      setSelectedCopyCampaignId('');
                    }}
                    list="copy-campaign-list"
                  />
                  <datalist id="copy-campaign-list">
                    {filteredCampaigns.map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
                <button
                  type="button"
                  disabled={copyLoading || (!selectedCopyCampaignId && !filteredCampaigns.find(c => c.name === campaignSearch))}
                  onClick={() => {
                    const match = filteredCampaigns.find(c => c.name === campaignSearch);
                    if (match) setSelectedCopyCampaignId(match.id);
                    // Use already-set selectedCopyCampaignId or the freshly found match
                    const idToUse = selectedCopyCampaignId || match?.id;
                    if (!idToUse) { toast.error('Select a campaign to copy from'); return; }
                    const backendUrl = getBackendUrl();
                    const token = getCookie('token');
                    if (!token) { toast.error('Authentication token not found'); return; }
                    setCopyLoading(true);
                    fetch(`${backendUrl}/api/master-database/campaign-messages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ userUuid, campaignId: idToUse }),
                    })
                      .then(r => r.json())
                      .then(data => {
                        const copied: MessageRow[] = (data.messages || []).map((m: any) => ({
                          message_content: m.message_content ?? '',
                          message_delay: m.message_delay != null ? String(m.message_delay) : '',
                        }));
                        if (copied.length === 0) { toast.error('That campaign has no messages to copy'); return; }
                        setMessages(copied);
                        toast.success(`Copied ${copied.length} message(s)`);
                      })
                      .catch(() => toast.error('Copy failed'))
                      .finally(() => setCopyLoading(false));
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-[#364570] rounded hover:bg-[#2a3654] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  {copyLoading && <ClipLoader size={10} color="#fff" />}
                  Copy Content
                </button>
              </div>
            )}
          </div>

          {/* ── Follow-up Messages ── */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-700">Messages</span>
              {!isAiCampaign && (
                <button
                  type="button"
                  onClick={addMessage}
                  className="text-xs text-[#364570] hover:underline font-medium"
                >
                  + Add message
                </button>
              )}
            </div>
            {isAiCampaign && (
              <p className="text-xs text-gray-500 italic mb-1.5">
                AI Campaign: only the connection request message is used. After acceptance or a reply, chatters follow up with AI suggestions instead of scheduled follow-ups.
              </p>
            )}
            <div className="space-y-2">
              {visibleMessages.map((msg, idx) => (
                <div key={idx} className="border border-gray-200 rounded p-2.5 bg-gray-50 relative">
                  {visibleMessages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMessage(idx)}
                      className="absolute top-1.5 right-2 text-gray-400 hover:text-red-500 text-sm leading-none"
                    >
                      &times;
                    </button>
                  )}
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Message {idx + 1}</span>
                  </div>
                  <div className="mb-2">
                    <label className={labelClass}>Content</label>
                    {focusedMsgIdx === idx && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {MSG_PLACEHOLDERS.map(ph => (
                          <button
                            key={ph}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); insertMsgPlaceholder(ph); }}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-[#364570]/40 text-[#364570] bg-white hover:bg-[#364570] hover:text-white transition-colors font-mono"
                          >
                            {ph}
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      ref={el => { msgRefs.current[idx] = el; }}
                      className={`${inputClass} resize-none`}
                      rows={3}
                      value={msg.message_content}
                      onFocus={() => setFocusedMsgIdx(idx)}
                      onBlur={() => setFocusedMsgIdx(null)}
                      onChange={e => updateMessage(idx, 'message_content', e.target.value)}
                      placeholder="Message text…"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Delay (days after previous)</label>
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={msg.message_delay}
                      onChange={e => updateMessage(idx, 'message_delay', e.target.value)}
                      placeholder="e.g. 7"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#364570] rounded-md hover:bg-[#2a3654] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {saving && <ClipLoader size={12} color="#fff" />}
            {saving ? 'Creating…' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
