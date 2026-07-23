'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ClipLoader } from 'react-spinners';
import toast from 'react-hot-toast';
import { getBackendUrl } from '@/lib/api-config';
import { getCookie } from '@/lib/auth';
import {
  TabType,
  FieldDef,
  EnumOptions,
  FIELDS_BY_TAB,
  FieldInput,
  EMPTY_ENUM_OPTIONS,
  getCachedEnumOptions,
  setCachedEnumOptions,
} from './EditRowModal';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface BulkEditModalProps {
  isOpen: boolean;
  tabType: TabType;
  selectedIds: Set<number>;
  userUuid: string;
  onClose: () => void;
  onSaved: (changes: Record<string, any>) => void;
  /** When set, shows an AI field token group in the placeholder section */
  aiPromptName?: string;
  /** Fields available from the selected AI prompt (used as {{ai:field}} tokens) */
  aiFieldTokens?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get bulk-editable fields for a tab
// ─────────────────────────────────────────────────────────────────────────────

function getBulkEditableFields(tabType: TabType): FieldDef[] {
  const fields = FIELDS_BY_TAB[tabType] || [];
  return fields.filter(f => {
    if (f.readOnly) return false;
    if (f.noBulkEdit) return false;
    // For prospects, exclude company fields — different prospects can share
    // the same company, so bulk-editing company fields is too dangerous.
    if (tabType === 'prospects' && f.key.startsWith('company.')) return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function BulkEditModal({
  isOpen,
  tabType,
  selectedIds,
  userUuid,
  onClose,
  onSaved,
  aiPromptName,
  aiFieldTokens = [],
}: BulkEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [enabledFields, setEnabledFields] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [enumOptions, setEnumOptions] = useState<EnumOptions>(
    getCachedEnumOptions() ?? EMPTY_ENUM_OPTIONS
  );

  // Placeholder section state (only used for unassigned_prospects)
  const [placeholderName, setPlaceholderName] = useState('');
  const [placeholderValue, setPlaceholderValue] = useState('');
  const placeholderInputRef = useRef<HTMLInputElement>(null);
  const [isSavingPlaceholder, setIsSavingPlaceholder] = useState(false);

  const placeholderVariableGroups = [
    {
      label: 'Prospect',
      color: 'text-blue-700',
      chipStyle: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100',
      tokens: [
        { token: '{{first_name}}', label: 'First Name' },
        { token: '{{last_name}}', label: 'Last Name' },
        { token: '{{email}}', label: 'Email' },
        { token: '{{phone}}', label: 'Phone' },
        { token: '{{linkedin_url}}', label: 'LinkedIn URL' },
        { token: '{{birthday}}', label: 'Birthday' },
      ],
    },
    {
      label: 'Prospect Info',
      color: 'text-purple-700',
      chipStyle: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200 hover:bg-purple-100',
      tokens: [
        { token: '{{job_title}}', label: 'Job Title' },
        { token: '{{persona_areas}}', label: 'Persona Areas' },
        { token: '{{persona_levels}}', label: 'Persona Levels' },
        { token: '{{persona_level}}', label: 'Persona Level' },
        { token: '{{persona_category}}', label: 'Persona Category' },
        { token: '{{job_change}}', label: 'Job Change' },
      ],
    },
    {
      label: 'Company',
      color: 'text-emerald-700',
      chipStyle: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100',
      tokens: [
        { token: '{{company_name}}', label: 'Company Name' },
        { token: '{{company_city}}', label: 'City' },
        { token: '{{company_country}}', label: 'Country' },
        { token: '{{company_industry}}', label: 'Industry' },
        { token: '{{company_size_range}}', label: 'Size Range' },
        { token: '{{company_website}}', label: 'Website' },
        { token: '{{company_provincie}}', label: 'Provincie' },
        { token: '{{company_business_type}}', label: 'Business Type' },
      ],
    },
    ...(aiPromptName && aiFieldTokens.length > 0 ? [{
      label: `AI: ${aiPromptName}`,
      color: 'text-amber-700',
      chipStyle: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100',
      tokens: aiFieldTokens.map(field => ({ token: `{{ai:${field}}}`, label: field })),
    }] : []),
  ];
  const fields = getBulkEditableFields(tabType);

  // Group fields by section
  const sections = fields.reduce((acc, field) => {
    if (!acc[field.section]) acc[field.section] = [];
    acc[field.section].push(field);
    return acc;
  }, {} as Record<string, FieldDef[]>);

  // Fetch enum options if not cached
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
      .catch(() => {});
  }, []);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setEnabledFields(new Set());
      setEditValues({});
      setPlaceholderName('');
      setPlaceholderValue('');
    }
  }, [isOpen]);

  // Toggle a field on/off for bulk editing
  const toggleField = (key: string) => {
    setEnabledFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setEditValues(prev => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
      } else {
        next.add(key);
        const field = fields.find(f => f.key === key);
        if (field) {
          const defaultVal =
            field.type === 'boolean'
              ? false
              : field.type === 'number'
                ? null
                : null;
          setEditValues(prev => ({ ...prev, [key]: defaultVal }));
        }
      }
      return next;
    });
  };

  // Toggle all fields in a section
  const toggleSection = (sectionFields: FieldDef[], enable: boolean) => {
    setEnabledFields(prev => {
      const next = new Set(prev);
      for (const f of sectionFields) {
        if (enable) {
          next.add(f.key);
          if (!(f.key in editValues)) {
            setEditValues(prev => ({
              ...prev,
              [f.key]: f.type === 'boolean' ? false : null,
            }));
          }
        } else {
          next.delete(f.key);
          setEditValues(prev => {
            const copy = { ...prev };
            delete copy[f.key];
            return copy;
          });
        }
      }
      return next;
    });
  };

  const handleSavePlaceholder = useCallback(async () => {
    if (!placeholderName.trim()) {
      toast('Placeholder name is required', { icon: 'ℹ️' });
      return;
    }
    if (!placeholderValue.trim()) {
      toast('Value is required', { icon: 'ℹ️' });
      return;
    }
    const resolvedPlaceholderValue = placeholderValue.trim();
    try {
      setIsSavingPlaceholder(true);
      const backendUrl = getBackendUrl();
      const token = getCookie('token');
      if (!token) { toast.error('Authentication token not found'); return; }
      const response = await fetch(`${backendUrl}/api/master-database/bulk-set-placeholder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userUuid,
          tabType,
          ids: Array.from(selectedIds),
          placeholderName: placeholderName.trim(),
          placeholderValue: resolvedPlaceholderValue,
          ...(aiPromptName ? { aiPromptName } : {}),
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Request failed with status ${response.status}`);
      }
      const result = await response.json();
      toast.success(`Placeholder set on ${result.updatedCount ?? selectedIds.size} record(s)`);
      onSaved({});
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to set placeholder: ${msg}`);
    } finally {
      setIsSavingPlaceholder(false);
    }
  }, [placeholderName, placeholderValue, selectedIds, tabType, userUuid, onSaved]);

  const handleSave = useCallback(async () => {
    if (enabledFields.size === 0) {
      toast('No fields selected for update', { icon: 'ℹ️' });
      return;
    }

    const changes: Record<string, any> = {};
    Array.from(enabledFields).forEach(key => {
      changes[key] = editValues[key] ?? null;
    });

    // Extra warning when stop_outreach is being set to true
    if (changes.stop_outreach === true) {
      const confirmed = window.confirm(
        `⚠️ You are about to stop outreach for ${selectedIds.size} prospect(s).\n\nThis will:\n• Set Stop Outreach to Yes\n• Set Prospect Status to Revoked\n• Close all open tasks for these prospects\n\nThis action cannot be easily undone. Continue?`
      );
      if (!confirmed) return;
    }

    try {
      setIsSaving(true);
      const backendUrl = getBackendUrl();
      const token = getCookie('token');
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      const response = await fetch(
        `${backendUrl}/api/master-database/bulk-update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userUuid,
            tabType,
            ids: Array.from(selectedIds),
            changes,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          err?.error?.message || `Request failed with status ${response.status}`
        );
      }

      const result = await response.json();
      toast.success(
        `Successfully updated ${result.updatedCount ?? selectedIds.size} record(s)`
      );
      onSaved(changes);
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Bulk update failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }, [enabledFields, editValues, selectedIds, tabType, userUuid, onSaved, onClose]);

  if (!isOpen) return null;

  const titleLabel = {
    companies: 'Companies',
    prospects: 'Prospects',
    campaigns: 'Campaigns',
    blacklist: 'Blacklist Entries',
  }[tabType];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Bulk Edit {titleLabel}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedIds.size} record(s) selected — Toggle fields you want to
              update
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {Object.entries(sections).map(([sectionName, sectionFields]) => {
            const allEnabled = sectionFields.every(f =>
              enabledFields.has(f.key)
            );
            const someEnabled = sectionFields.some(f =>
              enabledFields.has(f.key)
            );

            return (
              <div key={sectionName}>
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {sectionName}
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionFields, !allEnabled)}
                    className="text-[10px] font-medium text-[#364570] hover:text-[#2a3654] transition-colors"
                  >
                    {allEnabled ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="space-y-2">
                  {sectionFields.map(field => {
                    const isEnabled = enabledFields.has(field.key);
                    return (
                      <div
                        key={field.key}
                        className={`flex items-start gap-3 p-2 rounded-md transition-colors ${
                          isEnabled
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer mt-1 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => toggleField(field.key)}
                            className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]"
                          />
                          <span
                            className={`text-xs font-medium min-w-[140px] ${
                              isEnabled ? 'text-gray-900' : 'text-gray-500'
                            }`}
                          >
                            {field.label}
                          </span>
                        </label>
                        <div className="flex-1 min-w-0">
                          {isEnabled ? (
                            <>
                              <FieldInput
                                field={field}
                                value={editValues[field.key]}
                                onChange={val =>
                                  setEditValues(prev => ({
                                    ...prev,
                                    [field.key]: val,
                                  }))
                                }
                                enumOptions={enumOptions}
                              />
                              {field.key === 'persona_category' && enumOptions.persona_category.length > 0 && (() => {
                                const typed = (editValues[field.key] ?? '').toLowerCase();
                                const filtered = enumOptions.persona_category.filter(val =>
                                  !typed || val.toLowerCase().includes(typed)
                                );
                                return filtered.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {filtered.map(val => (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => setEditValues(prev => ({ ...prev, [field.key]: val }))}
                                        className={`px-2 py-0.5 rounded text-[10px] transition-colors border ${
                                          editValues[field.key] === val
                                            ? 'bg-[#364570] text-white border-[#364570]'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                                        }`}
                                      >
                                        {val}
                                      </button>
                                    ))}
                                  </div>
                                ) : null;
                              })()}
                            </>
                          ) : (
                            <div className="px-2 py-1 text-xs text-gray-400 italic">
                              Toggle to set value
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Placeholder section — unassigned_prospects and prospects */}
          {(tabType === 'unassigned_prospects' || tabType === 'prospects') && (
            <div>
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Placeholders</h3>
              </div>
              <div className="space-y-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={placeholderName}
                      onChange={e => setPlaceholderName(e.target.value)}
                      placeholder="e.g. top_100"
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#364570]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Value</label>
                    <input
                      ref={placeholderInputRef}
                      type="text"
                      value={placeholderValue}
                      onChange={e => setPlaceholderValue(e.target.value)}
                      placeholder="e.g. 83 or {{first_name}}"
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#364570]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {placeholderVariableGroups.map(group => (
                    <div key={group.label}>
                      <span className={`block text-xs font-semibold mb-1 ${group.color}`}>{group.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {group.tokens.map(({ token }) => (
                          <button
                            key={token}
                            type="button"
                            onMouseDown={e => {
                              e.preventDefault(); // keep focus + selection in the input
                              const input = placeholderInputRef.current;
                              const start = input?.selectionStart ?? placeholderValue.length;
                              const end = input?.selectionEnd ?? placeholderValue.length;
                              const next = placeholderValue.slice(0, start) + token + placeholderValue.slice(end);
                              setPlaceholderValue(next);
                              requestAnimationFrame(() => {
                                input?.setSelectionRange(start + token.length, start + token.length);
                              });
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${group.chipStyle}`}
                          >
                            {token}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePlaceholder}
                    disabled={isSavingPlaceholder || !placeholderName.trim()}
                    className="px-4 py-1.5 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSavingPlaceholder ? <ClipLoader size={12} color="#fff" /> : null}
                    Set Placeholder on {selectedIds.size} Record(s)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-500">
            {enabledFields.size} field(s) will be updated on{' '}
            {selectedIds.size} record(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || enabledFields.size === 0}
              className="px-4 py-1.5 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? <ClipLoader size={12} color="#fff" /> : null}
              Apply to {selectedIds.size} Record(s)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
