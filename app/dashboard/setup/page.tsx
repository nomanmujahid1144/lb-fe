'use client';

import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { useRouter } from 'next/navigation';
import { ClipLoader } from 'react-spinners';
import { FiFileText } from 'react-icons/fi';
import Navigation from '@/components/layout/Navigation';
import { safeLocalStorage } from '@/lib/storage';
import { getCookie } from '@/lib/auth';
import { getBackendUrl } from '@/lib/api-config';

interface User {
  id: number;
  username: string;
  email: string;
  customers: { id: number; customer_name: string; uuid: string }[];
  uuid: string;
  type: string;
}

interface CustomerSetup {
  id: number;
  title: string;
  status: 'draft' | 'active' | 'archived';
  background_information: string | null;
  data_segmentation_company: string | null;
  data_segmentation_contact: { columns: string[]; rows: string[][] } | null;
  data_sources: string | null;
  blacklist: { name: string; value: string }[] | null;
  li_profile_analysis: string | null;
  checklist: { label: string; checked: boolean; value?: string }[] | null;
  campaigns: { columns: string[]; rows: string[][] } | null;
  message_flow: { columns: string[]; rows: string[][] } | null;
  reply_templates: string | null;
  inactive_days: string[] | null;
  bi_weekly: string | null;
  notes_for_chatter: string | null;
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#364570] mb-3">{title}</h2>
      {children}
    </div>
  );
}

function HtmlBlock({ value }: { value: string | null }) {
  if (!value) return <p className="text-gray-400 italic text-sm">—</p>;
  return (
    <div
      className="text-sm text-gray-700 ProseMirror"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }}
    />
  );
}

function FlexTable({ value }: { value: { columns: string[]; rows: string[][] } | null }) {
  if (!value || !value.columns?.length) return <p className="text-gray-400 italic text-sm">—</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr>
            {value.columns.map((col, i) => (
              <th key={i} className="border border-gray-400 px-3 py-2 bg-[#364570] text-white font-medium text-left">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {value.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {value.columns.map((_, ci) => (
                <td key={ci} className="border border-gray-300 px-3 py-2 text-gray-700">{row[ci] ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StringList({ value }: { value: string[] | null }) {
  if (!value || value.length === 0) return <p className="text-gray-400 italic text-sm">—</p>;
  return (
    <ul className="list-disc list-inside space-y-1">
      {value.map((item, i) => (
        <li key={i} className="text-sm text-gray-700">{item}</li>
      ))}
    </ul>
  );
}

function ChecklistView({ value }: { value: { label: string; checked: boolean; value?: string }[] | null }) {
  if (!value || value.length === 0) return <p className="text-gray-400 italic text-sm">—</p>;
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[20px_1fr_1fr] gap-x-3 text-xs font-medium text-gray-500 pb-1 border-b border-gray-100">
        <span />
        <span>Item</span>
        <span>Value</span>
      </div>
      {value.map((item, i) => (
        <div key={i} className="grid grid-cols-[20px_1fr_1fr] gap-x-3 items-start py-0.5">
          <input type="checkbox" checked={item.checked} readOnly className="h-4 w-4 accent-[#364570] mt-0.5" />
          <span className="text-sm text-gray-700">{item.label}</span>
          <span className="text-sm text-gray-800 font-medium">{item.value ?? ''}</span>
        </div>
      ))}
    </div>
  );
}

function MessageFlowTable({ value }: { value: { type: string; name: string; message: string }[] | null }) {
  if (!value || value.length === 0) return <p className="text-gray-400 italic text-sm">—</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-[#364570] text-white">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Type</th>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Message</th>
          </tr>
        </thead>
        <tbody>
          {value.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-3 py-2 border-t border-gray-100 text-gray-700">{row.type}</td>
              <td className="px-3 py-2 border-t border-gray-100 text-gray-700">{row.name}</td>
              <td className="px-3 py-2 border-t border-gray-100 text-gray-700 whitespace-pre-wrap">{row.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NameValueList({ value }: { value: { name: string; value: string }[] | null }) {
  if (!value || value.length === 0) return <p className="text-gray-400 italic text-sm">—</p>;
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-x-3 text-xs font-medium text-gray-500 pb-1 border-b border-gray-100">
        <span>Name</span>
        <span>Value</span>
      </div>
      {value.map((item, i) => (
        <div key={i} className="grid grid-cols-2 gap-x-3 items-start py-0.5">
          <span className="text-sm text-gray-700">{item.name}</span>
          <span className="text-sm text-gray-800 font-medium">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [setup, setSetup] = useState<CustomerSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isMounted) return;
    const token = getCookie('token');
    const storedUser = safeLocalStorage.getParsedItem<User>('user');
    if (!token || !storedUser) { router.push('/auth/login'); return; }
    if (storedUser.type !== 'Admin') { router.push('/dashboard'); return; }
    setUser(storedUser);
  }, [isMounted, router]);

  useEffect(() => {
    if (!user) return;
    const customerUuid = user.customers?.[0]?.uuid;
    if (!customerUuid) { setLoading(false); return; }

    const token = getCookie('token');
    fetch(`${getBackendUrl()}/api/customer-setup/by-customer/${customerUuid}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(json => setSetup(json.data ?? null))
      .catch(() => setSetup(null))
      .finally(() => setLoading(false));
  }, [user]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <ClipLoader size={32} color="#364570" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={handleLogout} currentPage="Setup Document" pageIcon={FiFileText} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-[#364570] flex items-center gap-2">
            <FiFileText className="w-6 h-6" />
            Setup Document
          </h1>
          <p className="text-sm text-gray-500 mt-1">Your campaign setup document.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><ClipLoader size={32} color="#364570" /></div>
        ) : !setup ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
            No setup document found yet.
          </div>
        ) : (
          <>
            {/* Header */}
            <Section title="General">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-gray-800">{setup.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[setup.status]}`}>
                  {STATUS_LABELS[setup.status]}
                </span>
              </div>
            </Section>

            <Section title="Background Information">
              <HtmlBlock value={setup.background_information} />
            </Section>

            <Section title="Data Segmentation — Company">
              <HtmlBlock value={setup.data_segmentation_company} />
            </Section>

            <Section title="Data Segmentation — Contact">
              <FlexTable value={setup.data_segmentation_contact} />
            </Section>

            <Section title="Data Sources">
              <HtmlBlock value={setup.data_sources} />
            </Section>

            <Section title="Blacklist">
              <NameValueList value={setup.blacklist} />
            </Section>

            <Section title="LI Profile Analysis">
              <HtmlBlock value={setup.li_profile_analysis} />
            </Section>

            <Section title="Checklist">
              <ChecklistView value={setup.checklist} />
            </Section>

            <Section title="Campaigns">
              <FlexTable value={setup.campaigns} />
            </Section>

            <Section title="Message Flow">
              <FlexTable value={setup.message_flow} />
            </Section>

            <Section title="Reply Templates">
              <HtmlBlock value={setup.reply_templates} />
            </Section>

            <Section title="Inactive Days">
              <StringList value={setup.inactive_days} />
            </Section>

            <Section title="Bi-Weekly">
              <HtmlBlock value={setup.bi_weekly} />
            </Section>

            <Section title="Notes for Chatter">
              <HtmlBlock value={setup.notes_for_chatter} />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
