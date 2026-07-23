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

interface AddToProspectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** customer_prospect IDs of selected rows (unassigned prospects tab) */
  selectedCustomerProspectIds: number[];
  /** campaign_prospect IDs of selected rows (prospects/campaigns tab) — backend resolves to customer_prospect_ids */
  campaignProspectIds?: number[];
  /** Customer name strings (one per customer, used to scope lists) */
  selectedCustomers: string[];
}

export default function AddToProspectListModal({
  isOpen,
  onClose,
  selectedCustomerProspectIds,
  campaignProspectIds,
  selectedCustomers,
}: AddToProspectListModalProps) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [existingLists, setExistingLists] = useState<ExistingList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [excludeBlacklisted, setExcludeBlacklisted] = useState(false);
  const [saving, setSaving] = useState(false);
  // Remembers a list created in 'new' mode, so a retry after a partial
  // failure adds to that same list instead of creating a duplicate one.
  const createdListIdRef = useRef<number | null>(null);

  const backendUrl = getBackendUrl();
  const effectiveCustomer = selectedCustomers[0] || '';

  useEffect(() => {
    if (!isOpen) return;
    setMode('existing');
    setSelectedListId(null);
    setNewListName('');
    setNewListDescription('');
    setExcludeBlacklisted(false);
    createdListIdRef.current = null;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !effectiveCustomer) return;
    fetchExistingLists();
  }, [isOpen, effectiveCustomer]);

  const resolveCustomerId = async (nameOrId: string | number): Promise<number | null> => {
    if (typeof nameOrId === 'number') return nameOrId;
    const numericId = Number(nameOrId);
    if (!isNaN(numericId) && numericId > 0) return numericId;
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
    if (!effectiveCustomer) return;
    setListsLoading(true);
    try {
      const token = getCookie('token');
      const customerId = await resolveCustomerId(effectiveCustomer);
      if (!customerId) {
        setExistingLists([]);
        setMode('new');
        return;
      }
      const res = await fetch(`${backendUrl}/api/prospect-lists/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customer_id: customerId }),
      });
      if (!res.ok) throw new Error('Failed to load lists');
      const data = await res.json();
      setExistingLists(data.data || []);
      if ((data.data || []).length === 0) setMode('new');
    } catch {
      toast.error('Could not load existing lists');
    } finally {
      setListsLoading(false);
    }
  };

  const usingCampaignIds = !!(campaignProspectIds && campaignProspectIds.length > 0);
  const effectiveCount = usingCampaignIds ? campaignProspectIds!.length : selectedCustomerProspectIds.length;

  const handleSubmit = async () => {
    if (effectiveCount === 0) return;
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

      // On a retry after a partial failure, reuse the list created in the
      // previous attempt — never create a duplicate.
      if (mode === 'new' && createdListIdRef.current !== null) {
        listId = createdListIdRef.current;
      } else if (mode === 'new') {
        const resolvedId = effectiveCustomer ? await resolveCustomerId(effectiveCustomer) : null;
        if (!resolvedId) {
          toast.error('Could not resolve customer');
          setSaving(false);
          return;
        }
        const createRes = await fetch(`${backendUrl}/api/prospect-lists/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: newListName.trim(),
            description: newListDescription.trim() || null,
            customer_id: resolvedId,
          }),
        });
        if (!createRes.ok) throw new Error('Failed to create list');
        const createData = await createRes.json();
        listId = createData.data.id;
        createdListIdRef.current = listId;
      }

      const addRes = await fetch(`${backendUrl}/api/prospect-lists/${listId}/items/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(
          usingCampaignIds
            ? { campaign_prospect_ids: campaignProspectIds, exclude_blacklisted: excludeBlacklisted }
            : { customer_prospect_ids: selectedCustomerProspectIds, exclude_blacklisted: excludeBlacklisted }
        ),
      });
      if (!addRes.ok) throw new Error('Failed to add prospects');
      const addData = await addRes.json();
      const { added, failed, queued, skipped_duplicate, skipped_blacklisted, skipped_no_customer_record } = addData.data;

      if (queued > 0) {
        // Large addition — runs on the background worker.
        toast.success(
          `${queued} prospects are being added in the background — this takes a few minutes for large lists. Refresh the list to see progress.`,
          { duration: 8000 }
        );
        onClose();
        return;
      }

      if (failed > 0) {
        // Keep the modal open: clicking Add again retries only the failed
        // ones — prospects already in the list are skipped by the backend.
        toast.error(
          `${added} added, ${failed} failed — click Add again to retry the rest (prospects already in the list are skipped).`,
          { duration: 8000 }
        );
        return;
      }

      const parts: string[] = [];
      if (added > 0) parts.push(`${added} added`);
      if (skipped_duplicate > 0) parts.push(`${skipped_duplicate} already in list`);
      if (skipped_blacklisted > 0) parts.push(`${skipped_blacklisted} blacklisted skipped`);
      if (skipped_no_customer_record > 0) parts.push(`${skipped_no_customer_record} not linked to customer`);
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
        <h2 className="text-base font-semibold text-gray-900 mb-1">Add to Prospect List</h2>
        <p className="text-xs text-gray-500 mb-4">
          Adding{' '}
          <span className="font-semibold text-gray-700">{effectiveCount}</span>{' '}
          prospect{effectiveCount !== 1 ? 's' : ''} to a list
          {effectiveCustomer && (
            <span>
              {' '}for customer <span className="font-semibold">{effectiveCustomer}</span>
            </span>
          )}
          .
        </p>

        {/* Mode tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode('existing')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'existing' ? 'bg-white text-[#364570] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Existing List
          </button>
          <button
            onClick={() => setMode('new')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'new' ? 'bg-white text-[#364570] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            New List
          </button>
        </div>

        {/* Existing list selector */}
        {mode === 'existing' && (
          <div className="mb-4">
            {listsLoading ? (
              <div className="flex justify-center py-4">
                <ClipLoader size={20} color="#364570" />
              </div>
            ) : existingLists.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No prospect lists found for this customer.</p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {existingLists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
                      selectedListId === list.id
                        ? 'border-[#364570] bg-[#364570]/5 text-[#364570]'
                        : 'border-gray-200 hover:border-[#364570]/40 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-sm font-medium">{list.name}</span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">{list.item_count} prospects</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* New list form */}
        {mode === 'new' && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                List name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="e.g. Q2 Target Prospects"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={newListDescription}
                onChange={e => setNewListDescription(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570] resize-none"
              />
            </div>
          </div>
        )}

        {/* Exclude blacklisted toggle */}
        <label className="flex items-center gap-2 text-xs text-gray-600 mb-5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excludeBlacklisted}
            onChange={e => setExcludeBlacklisted(e.target.checked)}
            className="accent-[#364570]"
          />
          Skip blacklisted prospects
        </label>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              saving ||
              effectiveCount === 0 ||
              (mode === 'existing' && !selectedListId) ||
              (mode === 'new' && !newListName.trim())
            }
            className="px-4 py-2 text-sm font-medium bg-[#364570] text-white rounded-md hover:bg-[#2d3a5e] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving && <ClipLoader size={14} color="#fff" />}
            {saving ? 'Adding…' : `Add ${effectiveCount} Prospect${effectiveCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
