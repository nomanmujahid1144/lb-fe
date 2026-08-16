'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import DOMPurify from 'dompurify';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ClipLoader } from 'react-spinners';
import { FiFileText, FiPlus, FiTrash2, FiSave, FiEdit } from 'react-icons/fi';
import Navigation from '@/components/layout/Navigation';
import { safeLocalStorage } from '@/lib/storage';
import { getCookie } from '@/lib/auth';
import { getBackendUrl } from '@/lib/api-config';
import toast, { Toaster } from 'react-hot-toast';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

interface User {
  id: number;
  username: string;
  email: string;
  customers: { id: number; uuid: string }[];
  uuid: string;
  type: string;
}

interface CustomerOption {
  id: number;
  customer_name: string;
  uuid: string;
}

type ChecklistItem = { label: string; checked: boolean; value?: string };

type ChecklistSection = {
  title: string;
  items: ChecklistItem[];
};

type ChecklistData = ChecklistSection[] | ChecklistItem[];

type BackgroundInformation = string | { columns: string[]; rows: string[][] } | null;

function normalizeBackgroundInformation(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'columns' in value && 'rows' in value) {
    const table = value as { columns: string[]; rows: string[][] };
    const rows = table.rows.map(row => `<tr>${row.map(cell => `<td>${String(cell || '')}</td>`).join('')}</tr>`).join('');
    const header = table.columns.map(col => `<th style="text-align:left;padding:8px;border:1px solid #d1d5db;background:#364570;color:#fff">${col}</th>`).join('');
    return `<table style="border-collapse:collapse;width:100%"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
  }
  return String(value);
}

interface CustomerSetup {
  id: number;
  title: string;
  setup_status: 'draft' | 'active' | 'archived';
  background_information: BackgroundInformation;
  data_segmentation_company: { columns: string[]; rows: string[][] } | null;
  data_segmentation_contact: { columns: string[]; rows: string[][] } | null;
  data_sources: string | null;
  checklist: ChecklistData | null;
  campaigns: { title: string; columns: string[]; rows: string[][] }[] | null;
  message_flow: { title: string; columns: string[]; rows: string[][] }[] | null;
  reply_templates: { columns: string[]; rows: string[][] } | null;
  other_dmu_campaign: { columns: string[]; rows: string[][] } | null;
  inactive_days: string[] | null;
  bi_weekly: string | null;
  final_checklist_checked: Partial<Record<FinalChecklistKey, boolean>> | null;
  notes_for_chatter: string | null;
}

type FinalChecklistKey = 'inactive_days' | 'bi_weekly';

type NoteItem = { id: string; author_type: string; author_name: string; text: string; created_at: string; section?: string };

// ── Reusable section wrapper ──────────────────────────────────────────────────
function Section({
  title, children, sectionKey, sectionNotes, user, onAddNote, onDeleteNote, noteSending,
}: {
  title: string; children: React.ReactNode;
  sectionKey?: string;
  sectionNotes?: NoteItem[];
  user?: { type?: string; username?: string } | null;
  onAddNote?: (section: string, text: string, onSuccess: () => void) => void;
  onDeleteNote?: (noteId: string) => void;
  noteSending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [localText, setLocalText] = useState('');
  const isAdmin = user?.type === 'Admin';
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close popup on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSubmit = () => {
    if (!localText.trim() || !onAddNote || !sectionKey) return;
    onAddNote(sectionKey, localText.trim(), () => { setLocalText(''); setOpen(false); });
  };

  const hasNotes = sectionNotes && sectionNotes.length > 0;

  const notesBalloons = hasNotes ? (
    <div className="space-y-3">
      {sectionNotes!.map(note => {
        const isAdminNote = note.author_type === 'Admin';
        const isOwn = note.author_name === user?.username;
        return (
          <div key={note.id} className="group relative inline-block max-w-[75%]">
            {/* Balloon */}
            <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed text-white ${isAdminNote ? 'bg-[#364570]' : 'bg-[#db2f43]'}`}>
              {note.text}
            </div>
            {/* Meta row */}
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
              <span className="font-medium text-gray-500">{note.author_name}</span>
              <span>·</span>
              <span>{new Date(note.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              {(user?.type === 'Admin' || isOwn) && onDeleteNote && (
                <button onClick={() => onDeleteNote(note.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                  <FiTrash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div>
      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="relative px-6 pt-5 pb-1">
          <h2 className={`text-base font-semibold text-[#364570] ${sectionKey && onAddNote ? (isAdmin ? 'pl-8' : 'pr-8') : ''}`}>{title}</h2>
          {sectionKey && onAddNote && (
            <div ref={wrapperRef} className={`absolute top-4 z-10 ${isAdmin ? 'left-4' : 'right-4'}`}>
              <button
                onClick={() => setOpen(o => !o)}
                title="Add note"
                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                  open
                    ? isAdmin ? 'bg-[#364570] text-white border-[#364570]' : 'bg-[#db2f43] text-white border-[#db2f43]'
                    : 'text-gray-400 border-gray-300 hover:bg-gray-100'
                }`}
              >
                <FiPlus className="w-3 h-3" />
              </button>
              {open && (
                <div className={`absolute top-8 z-20 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 p-3 ${isAdmin ? 'left-0' : 'right-0'}`}>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">{title}</p>
                  <textarea
                    value={localText}
                    onChange={e => setLocalText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                    rows={3}
                    placeholder="Write a note… (Enter to send)"
                    autoFocus
                    className={`w-full border rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 ${
                      isAdmin ? 'border-[#364570]/30 focus:ring-[#364570]' : 'border-[#db2f43]/30 focus:ring-[#db2f43]'
                    }`}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                    <button
                      onClick={handleSubmit}
                      disabled={noteSending || !localText.trim()}
                      className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${
                        isAdmin ? 'bg-[#364570] hover:bg-[#2d3a5e]' : 'bg-[#db2f43] hover:bg-[#c22537]'
                      }`}
                    >
                      {noteSending ? <ClipLoader size={10} color="#fff" /> : 'Send'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-6 pb-5 pt-2">{children}</div>
      </div>

      {/* Notes below card */}
      {hasNotes && (
        <div className="mt-2 px-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
          {notesBalloons}
        </div>
      )}
    </div>
  );
}

const PLACEHOLDERS = ['*first_name*', '*last_name*', '*company_name*', '*job_title*', '*linkedin_group*'] as const;

// ── Flexible table editor (adjustable columns + rows) ─────────────────────────
function FlexTableEditor({
  value,
  onChange,
  showPlaceholders = false,
}: {
  value: { columns: string[]; rows: string[][] } | null;
  onChange: (v: { columns: string[]; rows: string[][] }) => void;
  showPlaceholders?: boolean;
}) {
  const tbl = value ?? { columns: [], rows: [] };
  const [focusedCell, setFocusedCell] = useState<{ ri: number; ci: number } | null>(null);
  const taRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Auto-resize all textareas whenever table data changes (including initial load)
  useEffect(() => {
    Object.values(taRefs.current).forEach(el => {
      if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
    });
  }, [value]);

  const insertPlaceholder = (ph: string) => {
    if (!focusedCell) return;
    const key = `${focusedCell.ri}-${focusedCell.ci}`;
    const el = taRefs.current[key];
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const current = tbl.rows[focusedCell.ri][focusedCell.ci] ?? '';
    const newVal = current.slice(0, start) + ph + current.slice(end);
    setCell(focusedCell.ri, focusedCell.ci, newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
      el.setSelectionRange(start + ph.length, start + ph.length);
    });
  };

  const addColumn = () => {
    const columns = [...tbl.columns, ''];
    const rows = tbl.rows.map(r => [...r, '']);
    onChange({ columns, rows });
  };

  const removeColumn = (ci: number) => {
    const columns = tbl.columns.filter((_, i) => i !== ci);
    const rows = tbl.rows.map(r => r.filter((_, i) => i !== ci));
    onChange({ columns, rows });
  };

  const setColumnName = (ci: number, val: string) => {
    const columns = [...tbl.columns];
    columns[ci] = val;
    onChange({ ...tbl, columns });
  };

  const addRow = () => {
    onChange({ ...tbl, rows: [...tbl.rows, tbl.columns.map(() => '')] });
  };

  const removeRow = (ri: number) => {
    onChange({ ...tbl, rows: tbl.rows.filter((_, i) => i !== ri) });
  };

  const setCell = (ri: number, ci: number, val: string) => {
    const rows = tbl.rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? val : c) : r);
    onChange({ ...tbl, rows });
  };

  return (
    <div className="space-y-3">
      {/* Placeholder chips — shown when any cell is focused */}
      {showPlaceholders && focusedCell !== null && (
        <div className="flex flex-wrap gap-1.5 items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <span className="text-xs text-gray-400 mr-1 shrink-0">Insert:</span>
          {PLACEHOLDERS.map(ph => (
            <button
              key={ph}
              type="button"
              onMouseDown={e => { e.preventDefault(); insertPlaceholder(ph); }}
              className="text-xs px-2 py-0.5 rounded border border-[#364570]/40 text-[#364570] bg-white hover:bg-[#364570] hover:text-white transition-colors font-mono"
            >
              {ph}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          {tbl.columns.length > 0 && (
            <thead>
              <tr>
                {tbl.columns.map((col, ci) => (
                  <th key={ci} className="border border-gray-400 px-3 py-2 bg-gray-100 text-left">
                    <div className="flex items-center gap-1">
                      <input
                        className="w-full text-xs font-semibold text-[#364570] bg-transparent focus:outline-none py-0.5"
                        value={col}
                        placeholder="Column name"
                        onChange={e => setColumnName(ci, e.target.value)}
                      />
                      <button
                        onClick={() => removeColumn(ci)}
                        className="text-red-400 hover:text-red-600 shrink-0"
                        title="Remove column"
                      >
                        <FiTrash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="border border-gray-400 w-8 bg-gray-100" />
              </tr>
            </thead>
          )}
          <tbody>
            {tbl.rows.map((row, ri) => (
              <tr key={ri}>
                {tbl.columns.map((_, ci) => (
                  <td key={ci} className="border border-gray-300 px-3 py-1.5 align-top">
                    <textarea
                      ref={el => { taRefs.current[`${ri}-${ci}`] = el; }}
                      className="w-full text-sm text-gray-700 bg-transparent focus:outline-none resize-none overflow-hidden"
                      value={row[ci] ?? ''}
                      rows={1}
                      onFocus={e => {
                        setFocusedCell({ ri, ci });
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onBlur={() => setFocusedCell(null)}
                      onChange={e => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                        setCell(ri, ci, e.target.value);
                      }}
                    />
                  </td>
                ))}
                <td className="border border-gray-300 px-2 py-1.5 text-center">
                  <button onClick={() => removeRow(ri)} className="text-red-400 hover:text-red-600">
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button
          onClick={addColumn}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[#364570] text-[#364570] hover:bg-[#364570] hover:text-white transition-colors"
        >
          <FiPlus className="w-3 h-3" /> Add column
        </button>
        <button
          onClick={addRow}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <FiPlus className="w-3 h-3" /> Add row
        </button>
      </div>
    </div>
  );
}

// ── Multi-table editor (list of named tables) ─────────────────────────────────
type NamedTable = { title: string; columns: string[]; rows: string[][] };

function MultiTableEditor({
  value,
  onChange,
  showPlaceholders = false,
}: {
  value: NamedTable[] | null;
  onChange: (v: NamedTable[]) => void;
  showPlaceholders?: boolean;
}) {
  const tables = value ?? [];

  const addTable = () => {
    onChange([...tables, { title: '', columns: ['Campaign', 'Content'], rows: [['', '']] }]);
  };

  const removeTable = (ti: number) => {
    onChange(tables.filter((_, i) => i !== ti));
  };

  const updateTable = (ti: number, updated: NamedTable) => {
    onChange(tables.map((t, i) => i === ti ? updated : t));
  };

  return (
    <div className="space-y-6">
      {tables.map((tbl, ti) => (
        <div key={ti} className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 text-sm font-semibold border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#364570]/30 focus:border-[#364570] text-[#364570]"
              value={tbl.title}
              placeholder="Table title (e.g. Target Group 1)"
              onChange={e => updateTable(ti, { ...tbl, title: e.target.value })}
            />
            <button
              onClick={() => removeTable(ti)}
              className="text-red-400 hover:text-red-600 transition-colors shrink-0"
              title="Remove table"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
          <FlexTableEditor
            value={{ columns: tbl.columns, rows: tbl.rows }}
            onChange={v => updateTable(ti, { ...tbl, columns: v.columns, rows: v.rows })}
            showPlaceholders={showPlaceholders}
          />
        </div>
      ))}
      <button
        onClick={addTable}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[#364570] text-[#364570] hover:bg-[#364570] hover:text-white transition-colors"
      >
        <FiPlus className="w-3 h-3" /> Add table
      </button>
    </div>
  );
}

// ── Checklist editor ──────────────────────────────────────────────────────────
function normalizeChecklistData(value: ChecklistData | null): ChecklistSection[] {
  if (!value || !Array.isArray(value)) return [];
  if (value.length === 0) return [];
  const first = value[0] as ChecklistSection | ChecklistItem;
  if (first && typeof first === 'object' && 'title' in first) {
    return value as ChecklistSection[];
  }
  return [{ title: 'Checklist', items: value as ChecklistItem[] }];
}

function ChecklistSectionsEditor({
  value,
  onChange,
}: {
  value: ChecklistData | null;
  onChange: (v: ChecklistSection[]) => void;
}) {
  const sections = normalizeChecklistData(value);

  const setSections = (sections: ChecklistSection[]) => onChange(sections);

  const updateSection = (index: number, nextSection: ChecklistSection) => {
    const next = [...sections];
    next[index] = nextSection;
    setSections(next);
  };

  const addSection = () => {
    setSections([...sections, { title: 'New section', items: [{ label: '', checked: false, value: '' }] }]);
  };

  return (
    <div className="space-y-6">
      {sections.map((section, si) => (
        <div key={si} className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <input
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#364570]/30 focus:border-[#364570]"
              value={section.title}
              onChange={e => updateSection(si, { ...section, title: e.target.value })}
              placeholder="Section title"
            />
            <button
              type="button"
              onClick={() => setSections(sections.filter((_, index) => index !== si))}
              className="text-red-500 hover:text-red-700"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {section.items.map((item, ii) => (
              <div key={ii} className="grid grid-cols-[20px_1fr_1fr_20px] gap-x-2 items-center">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={e => {
                    const updatedItems = section.items.map((it, idx) => idx === ii ? { ...it, checked: e.target.checked } : it);
                    updateSection(si, { ...section, items: updatedItems });
                  }}
                  className="h-4 w-4 accent-[#364570]"
                />
                <input
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#364570]/30 focus:border-[#364570]"
                  value={item.label}
                  placeholder="Item description"
                  onChange={e => {
                    const updatedItems = section.items.map((it, idx) => idx === ii ? { ...it, label: e.target.value } : it);
                    updateSection(si, { ...section, items: updatedItems });
                  }}
                />
                <input
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#364570]/30 focus:border-[#364570] bg-blue-50/40"
                  value={item.value ?? ''}
                  placeholder="Optional note"
                  onChange={e => {
                    const updatedItems = section.items.map((it, idx) => idx === ii ? { ...it, value: e.target.value } : it);
                    updateSection(si, { ...section, items: updatedItems });
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const updatedItems = section.items.filter((_, idx) => idx !== ii);
                    updateSection(si, { ...section, items: updatedItems });
                  }}
                  className="text-red-400 hover:text-red-600 justify-self-center"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

          </div>
          <button
            type="button"
            onClick={() => updateSection(si, { ...section, items: [...section.items, { label: '', checked: false, value: '' }] })}
            className="mt-3 inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <FiPlus className="w-3 h-3" /> Add item
          </button>
        </div>
      ))}


      <button
        type="button"
        onClick={addSection}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <FiPlus className="w-3 h-3" /> Add section
      </button>
    </div>
  );
}

function ChecklistSectionView({
  value,
  onToggle,
}: {
  value: ChecklistData | null;
  onToggle?: (sectionIndex: number, itemIndex: number, checked: boolean) => void;
}) {
  const sections = normalizeChecklistData(value);
  if (sections.length === 0) return <p className="text-gray-400 italic text-sm">—</p>;

  return (
    <div className="space-y-6">
      {sections.map((section, si) => (
        <div key={si} className="space-y-3">
          {section.title && <h3 className="text-sm font-semibold text-[#364570]">{section.title}</h3>}
          <div className="grid grid-cols-[20px_1fr_1fr] gap-x-3 text-xs font-medium text-gray-500 pb-1 border-b border-gray-100">
            <span />
            <span>Item</span>
            <span>Note</span>
          </div>
          {section.items.map((item, ii) => (
            <div key={ii} className="grid grid-cols-[20px_1fr_1fr] gap-x-3 items-start py-1">
              <input
                type="checkbox"
                checked={item.checked}
                readOnly={!onToggle}
                disabled={!onToggle}
                onChange={onToggle ? e => onToggle(si, ii, e.target.checked) : undefined}
                className={`h-4 w-4 accent-[#364570] mt-1 ${onToggle ? 'cursor-pointer' : ''}`}
              />
              <span className="text-sm text-gray-700">{item.label}</span>
              <span className="text-sm text-gray-800 font-medium">{item.value ?? ''}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function NotesForChatterView({ value }: { value: string | null }) {
  if (!value) return <p className="text-gray-400 italic text-sm">—</p>;
  return <HtmlBlock value={value} />;
}

function FinalChecklistView({
  inactive_days,
  bi_weekly,
  checked,
  onToggle,
}: {
  inactive_days?: string[] | null;
  bi_weekly?: string | null;
  checked?: Partial<Record<FinalChecklistKey, boolean>> | null;
  onToggle?: (key: FinalChecklistKey, checked: boolean) => void;
}) {
  const items: ChecklistItem[] = [];
  const keys: FinalChecklistKey[] = [];
  if (inactive_days && inactive_days.length > 0) {
    items.push({ label: 'Inactive Days', checked: checked?.inactive_days ?? false, value: inactive_days.join(', ') });
    keys.push('inactive_days');
  }
  if (bi_weekly) {
    items.push({ label: 'Bi-weekly', checked: checked?.bi_weekly ?? false, value: bi_weekly });
    keys.push('bi_weekly');
  }

  if (items.length === 0) return <p className="text-gray-400 italic text-sm">—</p>;
  return (
    <ChecklistSectionView
      value={[{ title: '', items }]}
      onToggle={onToggle ? (_si, ii, c) => onToggle(keys[ii], c) : undefined}
    />
  );
}

function NotesForChatterEditor({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <RichTextEditor
      value={value ?? ''}
      onChange={onChange}
      placeholder="Add open notes for chatter..."
      minHeight="180px"
    />
  );
}

function FinalChecklistEditor({
  inactive_days,
  bi_weekly,
  checked,
  onChangeInactiveDays,
  onChangeBiWeekly,
  onToggleChecked,
}: {
  inactive_days?: string[] | null;
  bi_weekly?: string;
  checked?: Partial<Record<FinalChecklistKey, boolean>> | null;
  onChangeInactiveDays: (v: string[]) => void;
  onChangeBiWeekly: (v: string) => void;
  onToggleChecked: (key: FinalChecklistKey, checked: boolean) => void;
}) {
  const [inactiveLabel, setInactiveLabel] = useState('Inactive Days');
  const [biWeeklyLabel, setBiWeeklyLabel] = useState('Bi-weekly');

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="space-y-4">
        <div className="grid grid-cols-[20px_1fr_1fr] gap-x-2 items-center">
          <input
            type="checkbox"
            checked={checked?.inactive_days ?? false}
            onChange={e => onToggleChecked('inactive_days', e.target.checked)}
            className="h-4 w-4 accent-[#364570] cursor-pointer"
          />
          <input
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#364570]/30 focus:border-[#364570]"
            value={inactiveLabel}
            onChange={e => setInactiveLabel(e.target.value)}
            placeholder="Item description"
          />
          <input
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#364570]/30 focus:border-[#364570] bg-blue-50/40"
            value={inactive_days?.join(', ') ?? ''}
            placeholder="Holidays"
            onChange={e => onChangeInactiveDays(e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
          />
        </div>
        <div className="grid grid-cols-[20px_1fr_1fr] gap-x-2 items-center">
          <input
            type="checkbox"
            checked={checked?.bi_weekly ?? false}
            onChange={e => onToggleChecked('bi_weekly', e.target.checked)}
            className="h-4 w-4 accent-[#364570] cursor-pointer"
          />
          <input
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#364570]/30 focus:border-[#364570]"
            value={biWeeklyLabel}
            onChange={e => setBiWeeklyLabel(e.target.value)}
            placeholder="Item description"
          />
          <input
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#364570]/30 focus:border-[#364570] bg-blue-50/40"
            value={bi_weekly ?? ''}
            placeholder="Every 2 weeks, 30 minutes standard in the agenda"
            onChange={e => onChangeBiWeekly(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// ── View-mode components ──────────────────────────────────────────────────────
function HtmlBlock({ value }: { value: string | null }) {
  if (!value) return <p className="text-gray-400 italic text-sm">—</p>;
  return <div className="text-sm text-gray-700 ProseMirror" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} />;
}

function BackgroundInfoView({ value }: { value: BackgroundInformation }) {
  if (!value) return <p className="text-gray-400 italic text-sm">—</p>;
  if (typeof value === 'string') {
    return <HtmlBlock value={value} />;
  }
  return <FlexTableView value={value} />;
}

function FlexTableView({ value }: { value: { columns: string[]; rows: string[][] } | null }) {
  if (!value || value.columns.length === 0) return <p className="text-gray-400 italic text-sm">—</p>;
  return (
    <div className="overflow-x-auto">
      <table className="text-sm border-collapse">
        <thead>
          <tr>
            {value.columns.map((col, ci) => (
              <th key={ci} className="border border-gray-400 px-3 py-2 bg-[#364570] text-white text-left font-medium whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {value.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-gray-300 px-3 py-2 text-gray-700 align-top whitespace-pre-wrap min-w-[140px]">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MultiTableView({ value }: { value: NamedTable[] | null }) {
  if (!value || value.length === 0) return <p className="text-gray-400 italic text-sm">—</p>;
  return (
    <div className="space-y-6">
      {value.map((tbl, ti) => (
        <div key={ti}>
          {tbl.title && <h3 className="text-sm font-semibold text-[#364570] mb-2">{tbl.title}</h3>}
          <FlexTableView value={{ columns: tbl.columns, rows: tbl.rows }} />
        </div>
      ))}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

// ── DEFAULT form values (used when no setup exists yet) ───────────────────────
const DEFAULT_FORM: Partial<CustomerSetup> = {
  title: '',
  setup_status: 'draft',
  background_information: '<p><strong>Target Group</strong></p><p><strong>Main goal of the Campaign</strong></p><ul><li>What is a lead?</li><li>Expectations</li></ul><p><strong>Visibility / Content</strong></p>',
  data_segmentation_company: {
    columns: ['Criteria', 'Value'],
    rows: [
      ['Country', ''],
      ['Size in FTE', ''],
      ['Sector', ''],
      ['Sector groups', ''],
    ],
  },
  data_segmentation_contact: {
    columns: ['Persona', 'Role: broad/specific', 'Seniority', 'Keywords', 'Companies'],
    rows: [['', '', '', '', '']],
  },
  data_sources: '<p>For example:</p><ul><li>LinkedIn scraping / LinkedIn groups</li><li>External data sources (top X lists / certificates / networks)</li><li>LinkedIn searches on your own Sales Navigator or Recruiter account</li></ul>',
  inactive_days: ['Holidays'],
  bi_weekly: 'Every 2 weeks, 30 minutes standard in the agenda',
  checklist: [
    {
      title: 'Connecting LinkedIn profile',
      items: [
        { label: 'LinkedIn url(s)', checked: false },
        { label: 'WA group, connecting LinkedIn account to remote computer. Via 1-1.', checked: false },
        { label: 'WhatsApp phone number(s)', checked: false },
        { label: 'Is LinkedIn Premium purchased? (f.e. Career)', checked: false, value: 'https://premium.linkedin.com/careers/career' },
      ],
    },
    {
      title: 'Input Needed',
      items: [
        { label: 'LinkedIn Profile Analysis', checked: false, value: 'input Leadblocks' },
        { label: 'Compliance list', checked: false, value: 'Companies (if possible with domain), people (name + company)' },
        { label: 'Input for message flow needed for the next meeting', checked: false, value: 'Otherwise we will use the website to prepare' },
      ],
    },
  ],
  campaigns: [
    {
      title: 'Target Group 1',
      columns: ['Campaign', 'Connection Request', 'Follow-up 1', 'Follow-up 2', 'Follow-up 3'],
      rows: [
        ['LI group', 'LI group', 'Persona A', 'Persona A', "All-persona's"],
        ['Job change', 'Jobchange', '', '', ''],
        ['No LI group', 'No LI group', '', '', ''],
        ['Event', 'Event', '', '', ''],
      ],
    },
    {
      title: 'Target Group 2',
      columns: ['Campaign', 'Connection Request', 'Follow-up 1', 'Follow-up 2', 'Follow-up 3'],
      rows: [
        ['LI group', 'LI group', 'Persona B', 'Persona B', "All-persona's"],
        ['Job change', 'Jobchange', '', '', ''],
        ['No LI group', 'No LI group', '', '', ''],
      ],
    },
  ],
  message_flow: [
    {
      title: 'Connection Request',
      columns: ['Campaign', 'Content'],
      rows: [
        ['Jobchange <6m + 6-12m', "Hi *first_name*, I saw you changed roles, congratulations! Given your role, I think it would be interesting to connect!"],
        ['Jobchange 12-24m', "Hi *first_name*, I see that you changed roles a while ago. I assume that you are fully settled by now. Let's connect!"],
        ['LI group', "Hi *first_name*, I saw that you follow the LinkedIn group *linkedin_group*. We clearly have common interests. Let's connect!"],
        ['Event', "Hi *first_name*! I think you also attended [event], is that correct? I would love to connect!"],
      ],
    },
    {
      title: 'Follow-up',
      columns: ['Campaign', 'Content'],
      rows: [
        ['Follow-up 1 - Persona A', "Thanks for connecting, *first_name*. I'd like to share our best practices regarding LinkedIn Lead Generation with you..."],
        ['Follow-up 1 - Persona B', ''],
        ['Follow-up 2 - All persona', "I'd like to send you some information. See here: website"],
        ['Follow-up 3 - All persona', "Did you see my previous message, *first_name*?"],
      ],
    },
  ],
  other_dmu_campaign: {
    columns: ['Campaign', 'Content'],
    rows: [['', '']],
  },
  reply_templates: {
    columns: ['Topic', 'Content'],
    rows: [
      ['Standard', 'Feedback Klantnaam'],
      ['Not in target group', "Hi {first_name}, thanks for the response, then I misjudged that. Is there anyone else in the organization this might be of interest to?"],
      ['Not interested now', "Hi {first_name}, I understand that, no problem of course. When would it be relevant to get in touch again?"],
      ['End of conversation', "Okay {first_name}, totally fine of course. Let me know if anything changes."],
      ['Reminder', "Hi *firstname*, I thought I'd try one last time. If it's still relevant, please let me know."],
      ['Chase meeting', "Hi *firstname*, you recently indicated that XXX. I can't seem to get a hold of you anymore. Is it still of interest to you?"],
    ],
  },
  notes_for_chatter: '',
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CustomerSetupsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerUuid, setSelectedCustomerUuid] = useState('');
  const [setup, setSetup] = useState<CustomerSetup | null>(null);
  const [form, setForm] = useState<Partial<CustomerSetup>>({});
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [noCustomerLinked, setNoCustomerLinked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = user?.type === 'Admin' || user?.type === 'Manager' || user?.type === 'Customer';

  // Notes
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [noteSending, setNoteSending] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isMounted) return;
    const token = getCookie('token');
    const storedUser = safeLocalStorage.getParsedItem<User>('user');
    if (!token || !storedUser) { router.push('/auth/login'); return; }
    if (!['Admin', 'Customer', 'Manager', 'Chatter'].includes(storedUser.type)) { router.push('/dashboard'); return; }
    setUser(storedUser);
  }, [isMounted, router]);

  // Fetch all customers for selector — Admin only; Customer users get their own customer auto-selected
  useEffect(() => {
    if (!user || user.type !== 'Admin') return;
    const controller = new AbortController();
    const fetchCustomers = async () => {
      const token = getCookie('token');
      let all: CustomerOption[] = [];
      let page = 1;
      try {
        while (true) {
          const url = new URL(`${getBackendUrl()}/api/customers`);
          url.searchParams.set('pagination[page]', String(page));
          url.searchParams.set('pagination[pageSize]', '100');
          url.searchParams.set('fields[0]', 'id');
          url.searchParams.set('fields[1]', 'customer_name');
          url.searchParams.set('fields[2]', 'uuid');
          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          if (!res.ok) break;
          const json = await res.json();
          const fetched: CustomerOption[] = (json.data ?? []).map((c: { id: number; customer_name?: string; uuid?: string; attributes?: { customer_name?: string; uuid?: string } }) => ({
            id: c.id,
            customer_name: c.customer_name ?? c.attributes?.customer_name ?? '',
            uuid: c.uuid ?? c.attributes?.uuid ?? '',
          }));
          all = all.concat(fetched);
          if (all.length >= (json.meta?.pagination?.total ?? 0)) break;
          page++;
        }
        setCustomers(all.sort((a, b) => a.customer_name.localeCompare(b.customer_name)));
      } catch (err) {
        if ((err as Error).name !== 'AbortError') toast.error('Failed to load customers');
      }
    };
    fetchCustomers();
    return () => controller.abort();
  }, [user]);

  // Fetch setup when customer selected
  const fetchSetup = useCallback(async (customerUuid: string, customerName?: string) => {
    if (!customerUuid) return;
    setLoadingSetup(true);
    setSetup(null);
    setForm({});
    try {
      const token = getCookie('token');
      const res = await fetch(`${getBackendUrl()}/api/customer-setup/by-customer/${customerUuid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      if (json.data) {
        const normalized = {
          ...json.data,
          background_information: normalizeBackgroundInformation(json.data.background_information),
        };
        setSetup(normalized);
        setForm(normalized);
        setIsEditing(false);
      } else {
        setSetup(null);
        setForm({ ...DEFAULT_FORM, title: customerName ? `Opzet ${customerName} campaign` : '' });
        setIsEditing(false);
      }
    } catch {
      toast.error('Failed to load setup');
    } finally {
      setLoadingSetup(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomerUuid) {
      const customer = customers.find(c => c.uuid === selectedCustomerUuid);
      fetchSetup(selectedCustomerUuid, customer?.customer_name);
    }
  }, [selectedCustomerUuid, fetchSetup, customers]);

  // Chatter users get a selector limited to their own linked customers.
  useEffect(() => {
    if (!user || user.type !== 'Chatter') return;
    const controller = new AbortController();
    const loadLinkedCustomers = async () => {
      const token = getCookie('token');
      try {
        const params = new URLSearchParams();
        params.set('populate[customers][fields][0]', 'uuid');
        params.set('populate[customers][fields][1]', 'customer_name');
        const res = await fetch(`${getBackendUrl()}/api/users-permissions/users/uuid/${user.uuid}?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        const linked: CustomerOption[] = (json?.customers ?? [])
          .filter((c: any) => c?.uuid)
          .map((c: any) => ({ id: c.id, customer_name: c.customer_name || `Customer ${c.id}`, uuid: c.uuid }))
          .sort((a: CustomerOption, b: CustomerOption) => a.customer_name.localeCompare(b.customer_name));
        setCustomers(linked);
        if (linked.length === 1) setSelectedCustomerUuid(linked[0].uuid);
        else if (linked.length === 0) setNoCustomerLinked(true);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') toast.error('Failed to load your customers');
      }
    };
    loadLinkedCustomers();
    return () => controller.abort();
  }, [user]);

  // Auto-load for Customer/Manager users (they have exactly one customer). The
  // login response doesn't include relations, so fetch the linked customer explicitly.
  useEffect(() => {
    if (!user || !['Customer', 'Manager'].includes(user.type)) return;
    const controller = new AbortController();
    const loadOwnCustomer = async () => {
      const token = getCookie('token');
      try {
        const params = new URLSearchParams();
        params.set('populate[customers][fields][0]', 'id');
        params.set('populate[customers][fields][1]', 'uuid');
        params.set('populate[customers][fields][2]', 'customer_name');
        const res = await fetch(`${getBackendUrl()}/api/users-permissions/users/uuid/${user.uuid}?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        const own = json?.customers?.[0];
        if (own?.uuid) {
          // handleSave looks up the customer id via the `customers` array, so
          // Customer/Manager users need it populated too (not just the uuid).
          setCustomers([{ id: own.id, customer_name: own.customer_name ?? '', uuid: own.uuid }]);
          setSelectedCustomerUuid(own.uuid);
        } else {
          setNoCustomerLinked(true);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') toast.error('Failed to load your setup');
      }
    };
    loadOwnCustomer();
    return () => controller.abort();
  }, [user]);

  // Load notes when setup changes
  useEffect(() => {
    if (setup?.id) fetchNotes(setup.id);
    else setNotes([]);
  }, [setup?.id]);

  const set = <K extends keyof CustomerSetup>(key: K, value: CustomerSetup[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const fetchNotes = async (setupId: number) => {
    const token = getCookie('token');
    try {
      const res = await fetch(`${getBackendUrl()}/api/customer-setup/${setupId}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setNotes(json.data || []);
    } catch {}
  };

  const handleAddNote = async (section: string, text: string, onSuccess: () => void) => {
    if (noteSending || !setup?.id) return;
    setNoteSending(true);
    const token = getCookie('token');
    try {
      const res = await fetch(`${getBackendUrl()}/api/customer-setup/${setup.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, section }),
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setNotes(json.data || []);
      onSuccess();
    } catch {
      toast.error('Could not save note');
    } finally {
      setNoteSending(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!setup?.id) return;
    const token = getCookie('token');
    try {
      const res = await fetch(`${getBackendUrl()}/api/customer-setup/${setup.id}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setNotes(json.data || []);
    } catch {
      toast.error('Could not delete note');
    }
  };

  // Toggle a checklist checkbox from view mode (Admin + Customer) — optimistic
  // update, persisted through the checklist-only endpoint.
  const handleChecklistToggle = async (sectionIndex: number, itemIndex: number, checked: boolean) => {
    if (!setup?.id) return;
    const previous = setup.checklist;
    const next = normalizeChecklistData(setup.checklist).map((section, si) =>
      si === sectionIndex
        ? { ...section, items: section.items.map((item, ii) => ii === itemIndex ? { ...item, checked } : item) }
        : section
    );
    setSetup(s => s ? { ...s, checklist: next } : s);
    setForm(f => ({ ...f, checklist: next }));
    try {
      const token = getCookie('token');
      const res = await fetch(`${getBackendUrl()}/api/customer-setup/${setup.id}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checklist: next }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
    } catch {
      setSetup(s => s ? { ...s, checklist: previous } : s);
      setForm(f => ({ ...f, checklist: previous }));
      toast.error('Could not save checkbox');
    }
  };

  const handleFinalChecklistToggle = async (key: FinalChecklistKey, checked: boolean) => {
    if (!setup?.id) return;
    const previous = setup.final_checklist_checked ?? null;
    const next = { ...(previous ?? {}), [key]: checked };
    setSetup(s => s ? { ...s, final_checklist_checked: next } : s);
    setForm(f => ({ ...f, final_checklist_checked: next }));
    try {
      const token = getCookie('token');
      const res = await fetch(`${getBackendUrl()}/api/customer-setup/${setup.id}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ final_checklist_checked: next }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
    } catch {
      setSetup(s => s ? { ...s, final_checklist_checked: previous } : s);
      setForm(f => ({ ...f, final_checklist_checked: previous }));
      toast.error('Could not save checkbox');
    }
  };

  const handleSave = async () => {
    const customer = customers.find(c => c.uuid === selectedCustomerUuid);
    if (!customer) return;
    setSaving(true);
    try {
      const token = getCookie('token');
      // Create a clean payload with only fields that match the collection type
      const { id, ...formData } = form;
      const payload = {
        ...formData,
        title: form.title || '',
        setup_status: form.setup_status || 'draft',
        customer: customer.id,
      };

      if (setup?.id) {
        const res = await fetch(`${getBackendUrl()}/api/customer-setup/${setup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Save failed');
        const json = await res.json();
        setSetup(json.data);
        setForm(json.data);
        toast.success('Saved');
        setIsEditing(false);
      } else {
        const res = await fetch(`${getBackendUrl()}/api/customer-setup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Create failed');
        const json = await res.json();
        setSetup(json.data);
        setForm(json.data);
        toast.success('Created');
        setIsEditing(false);
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.clear();
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      router.push('/auth/login');
    } catch {
      router.push('/auth/login');
    }
  };

  if (!isMounted || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50">
        <ClipLoader size={32} color="#364570" />
      </div>
    );
  }

  const ta = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#364570]/30 focus:border-[#364570] resize-none';

  const ns = (title: string) => setup ? {
    sectionKey: title,
    sectionNotes: notes.filter(n => n.section === title),
    user,
    onAddNote: handleAddNote,
    onDeleteNote: handleDeleteNote,
    noteSending,
  } : {};

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <Toaster position="top-center" />
      {/* <Navigation user={user} onLogout={handleLogout} currentPage="Customer Setups" pageIcon={FiFileText} /> */}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Customer selector — Admin sees all customers; Chatters only their own linked ones */}
        {(user?.type === 'Admin' || (user?.type === 'Chatter' && customers.length > 1)) && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#364570]/30 focus:border-[#364570]"
              value={selectedCustomerUuid}
              onChange={e => setSelectedCustomerUuid(e.target.value)}
            >
              <option value="">— Select a customer —</option>
              {customers.map(c => (
                <option key={c.id} value={c.uuid}>{c.customer_name}</option>
              ))}
            </select>
          </div>
        )}

        {loadingSetup && (
          <div className="flex justify-center py-10"><ClipLoader size={28} color="#364570" /></div>
        )}

        {!loadingSetup && !selectedCustomerUuid && noCustomerLinked && (
          <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            There is no active setup document currently.
          </div>
        )}

        {!loadingSetup && selectedCustomerUuid && (
          <>
            {!setup && canEdit && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                No setup document found for this customer. Fill in the fields below and click <strong>Create</strong>.
              </div>
            )}
            {!setup && !canEdit && (
              <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                There is no active setup document currently.
              </div>
            )}

            {setup && !isEditing && (
              <>
                {/* View header bar */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base font-semibold text-gray-800 truncate">{setup.title || '—'}</span>
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[setup.setup_status]}`}>
                        {STATUS_LABELS[setup.setup_status]}
                      </span>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-[#364570] text-white rounded-lg text-sm font-medium hover:bg-[#2d3a5e] transition-colors"
                      >
                        <FiEdit className="w-4 h-4" /> Edit
                      </button>
                    )}
                  </div>
                </div>
                <Section title="Background Information" {...ns('Background Information')}><BackgroundInfoView value={setup.background_information} /></Section>
                <Section title="Data Segmentation — Company" {...ns('Data Segmentation — Company')}><FlexTableView value={setup.data_segmentation_company} /></Section>
                <Section title="Data Segmentation — Contact" {...ns('Data Segmentation — Contact')}><FlexTableView value={setup.data_segmentation_contact} /></Section>
                <Section title="Data Sources" {...ns('Data Sources')}><HtmlBlock value={setup.data_sources} /></Section>
                <Section title="Checklist" {...ns('Checklist')}>
                  <ChecklistSectionView value={setup.checklist} onToggle={handleChecklistToggle} />
                </Section>
                <Section title="Campaigns" {...ns('Campaigns')}><MultiTableView value={setup.campaigns} /></Section>
                <Section title="Message Flow" {...ns('Message Flow')}><MultiTableView value={setup.message_flow} /></Section>
                <Section title="Reply Templates" {...ns('Reply Templates')}><FlexTableView value={setup.reply_templates} /></Section>
                <Section title="Other DMU Campaign" {...ns('Other DMU Campaign')}><FlexTableView value={setup.other_dmu_campaign} /></Section>
                <Section title="Notes for Chatter" {...ns('Notes for Chatter')}>
                  <NotesForChatterView value={setup.notes_for_chatter ?? null} />
                </Section>
                <Section title="Final Checklist" {...ns('Final Checklist')}>
                  <FinalChecklistView
                    inactive_days={setup.inactive_days}
                    bi_weekly={setup.bi_weekly}
                    checked={setup.final_checklist_checked}
                    onToggle={handleFinalChecklistToggle}
                  />
                </Section>
              </>
            )}

            {(!setup || isEditing) && canEdit && (<>

            {/* 1. Header */}
            <Section title="General" {...ns('General')}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Title</label>
                  <input
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#364570]/30 focus:border-[#364570]"
                    value={form.title ?? ''}
                    placeholder="e.g. Acme Corp — Q1 2026"
                    onChange={e => set('title', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <div className="flex gap-2">
                    {(['draft', 'active', 'archived'] as const).map(s => {
                      const isActive = (form.setup_status ?? 'draft') === s;
                      const colors = {
                        draft: isActive ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-300 hover:bg-orange-50',
                        active: isActive ? 'bg-green-500 text-white border-green-500' : 'bg-white text-green-600 border-green-300 hover:bg-green-50',
                        archived: isActive ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-500 border-red-300 hover:bg-red-50',
                      };
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => set('setup_status', s)}
                          className={`flex-1 text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${colors[s]}`}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Section>

            {/* 2. Background information */}
            <Section title="Background Information" {...ns('Background Information')}>
              <RichTextEditor
                value={typeof form.background_information === 'string' ? form.background_information : ''}
                onChange={v => set('background_information', v)}
                placeholder="Enter background information with headings and details..."
                minHeight="180px"
              />
            </Section>

            {/* 3. Data segmentation company */}
            <Section title="Data Segmentation — Company" {...ns('Data Segmentation — Company')}>
              <FlexTableEditor
                value={form.data_segmentation_company ?? null}
                onChange={v => set('data_segmentation_company', v)}
              />
            </Section>

            {/* 4. Data segmentation contact */}
            <Section title="Data Segmentation — Contact" {...ns('Data Segmentation — Contact')}>
              <FlexTableEditor
                value={form.data_segmentation_contact ?? null}
                onChange={v => set('data_segmentation_contact', v)}
              />
            </Section>

            {/* 5. Data sources */}
            <Section title="Data Sources" {...ns('Data Sources')}>
              <RichTextEditor
                value={form.data_sources ?? null}
                onChange={v => set('data_sources', v)}
                placeholder="Describe data sources..."
                minHeight="120px"
              />
            </Section>

            {/* 8. Checklist */}
            <Section title="Checklist" {...ns('Checklist')}>
              <ChecklistSectionsEditor
                value={form.checklist ?? null}
                onChange={v => set('checklist', v)}
              />
            </Section>

            {/* 9. Campaigns */}
            <Section title="Campaigns" {...ns('Campaigns')}>
              <MultiTableEditor
                value={form.campaigns ?? null}
                onChange={v => set('campaigns', v)}
                showPlaceholders={false}
              />
            </Section>

            {/* 10. Message flow */}
            <Section title="Message Flow" {...ns('Message Flow')}>
              <MultiTableEditor
                value={form.message_flow ?? null}
                onChange={v => set('message_flow', v)}
                showPlaceholders={true}
              />
            </Section>

            {/* 11. Reply templates */}
            <Section title="Reply Templates" {...ns('Reply Templates')}>
              <FlexTableEditor
                value={form.reply_templates ?? null}
                onChange={v => set('reply_templates', v)}
                showPlaceholders={true}
              />
            </Section>

            {/* 11b. Other DMU Campaign */}
            <Section title="Other DMU Campaign" {...ns('Other DMU Campaign')}>
              <FlexTableEditor
                value={form.other_dmu_campaign ?? null}
                onChange={v => set('other_dmu_campaign', v)}
              />
            </Section>

            {/* 12. Notes for chatter */}
            <Section title="Notes for Chatter" {...ns('Notes for Chatter')}>
              <NotesForChatterEditor
                value={form.notes_for_chatter ?? ''}
                onChange={v => set('notes_for_chatter', v)}
              />
            </Section>
            <Section title="Final Checklist" {...ns('Final Checklist')}>
              <FinalChecklistEditor
                inactive_days={form.inactive_days ?? []}
                bi_weekly={form.bi_weekly ?? ''}
                checked={form.final_checklist_checked}
                onChangeInactiveDays={v => set('inactive_days', v)}
                onChangeBiWeekly={v => set('bi_weekly', v)}
                onToggleChecked={(key, c) => set('final_checklist_checked', { ...(form.final_checklist_checked ?? {}), [key]: c })}
              />
            </Section>

            {/* Bottom save */}
            <div className="flex items-center justify-end gap-3 pb-8">
              {setup && (
                <button
                  onClick={() => { setForm(setup); setIsEditing(false); }}
                  className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#364570] text-white rounded-lg text-sm font-medium hover:bg-[#2d3a5e] transition-colors disabled:opacity-50"
              >
                {saving ? <ClipLoader size={14} color="#fff" /> : <FiSave className="w-4 h-4" />}
                {setup ? 'Save' : 'Create'}
              </button>
            </div>
            </>)}
          </>
        )}
      </div>
    </div>
  );
}
