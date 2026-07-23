'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ClipLoader } from 'react-spinners';
import toast from 'react-hot-toast';
import { getBackendUrl } from '@/lib/api-config';
import { getCookie } from '@/lib/auth';

interface ExistingList {
  id: number;
  name: string;
  item_count: number;
}

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  // IDs of selected companies (company DB ids, not company_id strings)
  selectedCompanyIds: number[];
  // The customer this list belongs to (customer name string, used to look up lists)
  selectedCustomers: string[];
  userUuid: string;
  sourceTab: 'companies' | 'ai_analysis';
  aiPromptId?: number | null;
  // Available customers to pick from when no customer is pre-selected (e.g. AI Analysis tab)
  availableCustomers?: Array<{ value: string; label: string }>;
}

export default function AddToListModal({
  isOpen,
  onClose,
  selectedCompanyIds,
  selectedCustomers,
  userUuid,
  sourceTab,
  aiPromptId,
  availableCustomers,
}: AddToListModalProps) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [existingLists, setExistingLists] = useState<ExistingList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [excludeBlacklisted, setExcludeBlacklisted] = useState(true);
  const [saving, setSaving] = useState(false);
  const [internalCustomer, setInternalCustomer] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  // Remembers a list created in 'new' mode, so a retry after a partial
  // failure adds to that same list instead of creating a duplicate one.
  const createdListIdRef = useRef<number | null>(null);

  const backendUrl = getBackendUrl();

  // Effective customer: pre-selected (companies tab) or picked inside modal (AI analysis tab)
  const effectiveCustomer = selectedCustomers[0] || internalCustomer;

  useEffect(() => {
    if (!isOpen) return;
    setMode('existing');
    setSelectedListId(null);
    setNewListName('');
    setNewListDescription('');
    setExcludeBlacklisted(true);
    setInternalCustomer('');
    setCustomerDropdownOpen(false);
    createdListIdRef.current = null;
  }, [isOpen]);

  // Fetch lists whenever the effective customer is resolved
  useEffect(() => {
    if (!isOpen || !effectiveCustomer) return;
    fetchExistingLists();
  }, [isOpen, effectiveCustomer]);

  const resolveCustomerId = async (nameOrId: string | number): Promise<number | null> => {
    if (typeof nameOrId === 'number') return nameOrId;
    const numericId = Number(nameOrId);
    if (!isNaN(numericId) && numericId > 0) return numericId;
    // It's a customer name — look up the numeric ID
    const token = getCookie('token');
    const res = await fetch(
      `${backendUrl}/api/customers?filters[customer_name][$eq]=${encodeURIComponent(nameOrId)}&pagination[pageSize]=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.id ?? null;
  };

  const fetchExistingLists = async () => {
    const customer = selectedCustomers[0] || internalCustomer;
    if (!customer) return;
    setListsLoading(true);
    try {
      const token = getCookie('token');
      const customerId = await resolveCustomerId(customer);
      if (!customerId) {
        setExistingLists([]);
        setMode('new');
        return;
      }
      const res = await fetch(`${backendUrl}/api/company-lists/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customer_id: customerId }),
      });
      if (!res.ok) throw new Error('Failed to load lists');
      const data = await res.json();
      setExistingLists(data.data || []);
      // Auto-switch to new if no existing lists
      if ((data.data || []).length === 0) setMode('new');
    } catch {
      toast.error('Could not load existing lists');
    } finally {
      setListsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedCompanyIds.length === 0) return;
    if (mode === 'existing' && !selectedListId) {
      toast.error('Please select a list');
      return;
    }
    if (mode === 'new' && !newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    setSaving(true);
    const token = getCookie('token');

    try {
      let listId = selectedListId;

      // Create new list first if needed. On a retry after a partial failure,
      // reuse the list created in the previous attempt — never create a duplicate.
      if (mode === 'new' && createdListIdRef.current !== null) {
        listId = createdListIdRef.current;
      } else if (mode === 'new') {
        const effectiveCust = selectedCustomers[0] || internalCustomer;
        const resolvedId = effectiveCust
          ? await resolveCustomerId(effectiveCust)
          : null;
        if (!resolvedId) {
          toast.error('Could not resolve customer');
          setSaving(false);
          return;
        }
        const createRes = await fetch(`${backendUrl}/api/company-lists/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: newListName.trim(),
            description: newListDescription.trim() || null,
            customer_id: resolvedId,
            ai_prompt_id: sourceTab === 'ai_analysis' ? aiPromptId : null,
          }),
        });
        if (!createRes.ok) throw new Error('Failed to create list');
        const createData = await createRes.json();
        listId = createData.data.id;
        createdListIdRef.current = listId;
      }

      // Add companies to the list
      const addRes = await fetch(`${backendUrl}/api/company-lists/${listId}/items/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          company_ids: selectedCompanyIds,
          exclude_blacklisted: excludeBlacklisted,
        }),
      });
      if (!addRes.ok) throw new Error('Failed to add companies');
      const addData = await addRes.json();
      const { added, failed, queued, skipped_duplicate, skipped_blacklisted } = addData.data;

      if (queued > 0) {
        // Large addition — runs on the background worker.
        toast.success(
          `${queued} companies are being added in the background — this takes a few minutes for large lists. Refresh the list to see progress.`,
          { duration: 8000 }
        );
        onClose();
        return;
      }

      if (failed > 0) {
        // Keep the modal open: clicking Add again retries only the failed
        // ones — companies already in the list are skipped by the backend.
        toast.error(
          `${added} added, ${failed} failed — click Add again to retry the rest (companies already in the list are skipped).`,
          { duration: 8000 }
        );
        return;
      }

      const parts: string[] = [];
      if (added > 0) parts.push(`${added} added`);
      if (skipped_duplicate > 0) parts.push(`${skipped_duplicate} already in list`);
      if (skipped_blacklisted > 0) parts.push(`${skipped_blacklisted} blacklisted skipped`);
      toast.success(parts.join(' · ') || 'Done');

      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Add to List</h2>
        <p className="text-xs text-gray-500 mb-4">
          Adding <span className="font-semibold text-gray-700">{selectedCompanyIds.length}</span> compan{selectedCompanyIds.length !== 1 ? 'ies' : 'y'} to a list
          {effectiveCustomer && <span> for customer <span className="font-semibold">{effectiveCustomer}</span></span>}.
        </p>

        {/* Customer picker — shown when no customer is pre-selected (e.g. AI Analysis tab) */}
        {selectedCustomers.length === 0 && availableCustomers && availableCustomers.length > 0 && (
          <div className="mb-4" ref={customerDropdownRef}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Customer <span className="text-red-500">*</span></label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCustomerDropdownOpen(o => !o)}
                onBlur={e => { if (!customerDropdownRef.current?.contains(e.relatedTarget as Node)) setCustomerDropdownOpen(false); }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#364570] bg-white flex items-center justify-between"
              >
                <span className={internalCustomer ? 'text-gray-900' : 'text-gray-400'}>
                  {internalCustomer ? (availableCustomers.find(c => c.value === internalCustomer)?.label ?? internalCustomer) : 'Select a customer…'}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${customerDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {customerDropdownOpen && (
                <ul className="absolute z-50 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
                  <li>
                    <button type="button" className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
                      onMouseDown={() => { setInternalCustomer(''); setSelectedListId(null); setExistingLists([]); setCustomerDropdownOpen(false); }}>
                      Select a customer…
                    </button>
                  </li>
                  {availableCustomers.map(c => (
                    <li key={c.value}>
                      <button type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${internalCustomer === c.value ? 'font-semibold text-[#364570]' : 'text-gray-700'}`}
                        onMouseDown={() => { setInternalCustomer(c.value); setSelectedListId(null); setExistingLists([]); setCustomerDropdownOpen(false); }}>
                        {c.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Mode tabs */}
        <div className="flex border border-gray-200 rounded-lg mb-4 overflow-hidden">
          <button
            type="button"
            onClick={() => setMode('existing')}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${mode === 'existing' ? 'bg-[#364570] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Add to existing list
          </button>
          <button
            type="button"
            onClick={() => setMode('new')}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${mode === 'new' ? 'bg-[#364570] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Create new list
          </button>
        </div>

        {mode === 'existing' && (
          <div className="mb-4">
            {listsLoading ? (
              <div className="flex justify-center py-6"><ClipLoader size={24} color="#364570" /></div>
            ) : existingLists.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No existing lists for this customer. Create a new one.</p>
            ) : (
              <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {existingLists.map(list => (
                  <label key={list.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="list"
                      value={list.id}
                      checked={selectedListId === list.id}
                      onChange={() => setSelectedListId(list.id)}
                      className="accent-[#364570]"
                    />
                    <span className="flex-1 text-sm text-gray-800">{list.name}</span>
                    <span className="text-xs text-gray-400">{list.item_count} companies</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'new' && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">List name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="e.g. Q2 Target Companies"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={newListDescription}
                onChange={e => setNewListDescription(e.target.value)}
                rows={2}
                placeholder="Optional description…"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570] resize-none"
              />
            </div>
          </div>
        )}

        {/* Blacklist filter */}
        <label className="flex items-center gap-2 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeBlacklisted}
            onChange={e => setExcludeBlacklisted(e.target.checked)}
            className="accent-[#364570]"
          />
          <span className="text-xs text-gray-600">Exclude blacklisted companies</span>
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || selectedCompanyIds.length === 0 || !effectiveCustomer}
            className="px-4 py-2 text-sm font-medium bg-[#364570] text-white rounded-md hover:bg-[#2d3a5e] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving && <ClipLoader size={14} color="#fff" />}
            {saving ? 'Adding…' : 'Add to List'}
          </button>
        </div>
      </div>
    </div>
  );
}
