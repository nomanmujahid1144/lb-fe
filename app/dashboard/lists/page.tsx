'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import { getCookie } from '@/lib/auth';
import { getBackendUrl } from '@/lib/api-config';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-hot-toast';
import { FaListUl, FaPlus, FaBuilding, FaUser, FaChevronRight, FaTrash, FaSearch } from 'react-icons/fa';

type ListType = 'all' | 'company' | 'prospect';

const STATUS_OPTIONS = [
    { value: 'in_review', label: 'In Review', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    { value: 'accepted',  label: 'Accepted',  bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    { value: 'declined',  label: 'Declined',  bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500'   },
];

interface User {
    id: number;
    username: string;
    email: string;
    customers: any[];
    uuid: string;
    type: string;
}

interface AnyList {
    id: number;
    name: string;
    description: string | null;
    item_count: number;
    customer_name: string;
    customer_id: number;
    ai_prompt_name?: string | null;
    created_at: string;
    status: string;
    listType: ListType;
}

interface CustomerOption {
    value: number;
    label: string;
}

export default function ListsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [companyLists, setCompanyLists] = useState<AnyList[]>([]);
    const [prospectLists, setProspectLists] = useState<AnyList[]>([]);
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<number | ''>('');
    const [listType, setListType] = useState<ListType>('all');

    // Create list modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createDescription, setCreateDescription] = useState('');
    const [createCustomer, setCreateCustomer] = useState<number | ''>('');
    const [createType, setCreateType] = useState<ListType>('company');
    const [createSaving, setCreateSaving] = useState(false);

    // Delete confirmation
    const [deletingList, setDeletingList] = useState<AnyList | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('in_review');
    const [openStatusListId, setOpenStatusListId] = useState<number | null>(null);

    const backendUrl = getBackendUrl();

    const activeLists = listType === 'all' 
        ? [...companyLists, ...prospectLists].sort((a, b) => {
            if (a.listType !== b.listType) return a.listType === 'company' ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
        : listType === 'company' ? companyLists : prospectLists;

    const filteredLists = activeLists.filter(l => {
        if (statusFilter && l.status !== statusFilter) return false;
        if (searchTerm.trim() && !l.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    useEffect(() => {
        const token = getCookie('token');
        if (!token) { router.push('/auth/login'); return; }
        const stored = localStorage.getItem('user');
        if (stored) {
            const parsed = JSON.parse(stored);
            const allowedTypes = ['Admin', 'Manager', 'Customer'];
            if (!allowedTypes.includes(parsed.type)) {
                router.push('/dashboard');
                return;
            }
            setUser(parsed);
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchAllLists();
        if (user.type === 'Admin') fetchCustomers();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        fetchAllLists();
    }, [selectedCustomer]);

    // Close status popover on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.list-status-popover')) setOpenStatusListId(null);
        };
        if (openStatusListId !== null) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [openStatusListId]);

    const fetchCustomers = async () => {
        const token = getCookie('token');
        try {
            let allCustomers: any[] = [];
            let page = 1;
            while (true) {
                const queryUrl = new URL(`${backendUrl}/api/customers`);
                queryUrl.searchParams.append('filters[lead_phase][$eq]', 'Active');
                queryUrl.searchParams.append('pagination[page]', String(page));
                queryUrl.searchParams.append('pagination[pageSize]', '100');
                const res = await fetch(queryUrl.toString(), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) break;
                const result = await res.json();
                const fetched = result.data || [];
                allCustomers = allCustomers.concat(fetched);
                if (allCustomers.length >= (result.meta?.pagination?.total || 0)) break;
                page++;
            }
            const customerList = allCustomers
                .map((c: any) => ({ value: c.id as number, label: c.customer_name as string }))
                .sort((a, b) => a.label.localeCompare(b.label));
            setCustomers(customerList);
        } catch { /* silent */ }
    };

    const fetchAllLists = useCallback(async () => {
        const token = getCookie('token');
        setLoading(true);
        try {
            const body: any = {};
            if (selectedCustomer) body.customer_id = selectedCustomer;

            const [companyRes, prospectRes] = await Promise.all([
                fetch(`${backendUrl}/api/company-lists/all`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(body),
                }),
                fetch(`${backendUrl}/api/prospect-lists/all`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(body),
                }),
            ]);

            if (!companyRes.ok) throw new Error('Failed to load company lists');
            if (!prospectRes.ok) throw new Error('Failed to load prospect lists');

            const [companyData, prospectData] = await Promise.all([companyRes.json(), prospectRes.json()]);
            setCompanyLists((companyData.data || []).map((l: any) => ({ ...l, listType: 'company' as ListType })));
            setProspectLists((prospectData.data || []).map((l: any) => ({ ...l, listType: 'prospect' as ListType })));
        } catch {
            toast.error('Could not load lists');
        } finally {
            setLoading(false);
        }
    }, [user, selectedCustomer]);

    const handleCreate = async () => {
        if (!createName.trim() || !createCustomer) return;
        setCreateSaving(true);
        const token = getCookie('token');
        const endpoint = createType === 'company' ? 'company-lists' : 'prospect-lists';
        try {
            const res = await fetch(`${backendUrl}/api/${endpoint}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: createName.trim(),
                    description: createDescription.trim() || null,
                    customer_id: createCustomer,
                }),
            });
            if (!res.ok) throw new Error('Failed to create list');
            toast.success('List created');
            setShowCreateModal(false);
            setCreateName(''); setCreateDescription(''); setCreateCustomer('');
            setListType(createType);
            fetchAllLists();
        } catch {
            toast.error('Could not create list');
        } finally {
            setCreateSaving(false);
        }
    };

    const handleDelete = async (list: AnyList) => {
        setDeleteLoading(true);
        const token = getCookie('token');
        const endpoint = list.listType === 'company' ? 'company-lists' : 'prospect-lists';
        try {
            const res = await fetch(`${backendUrl}/api/${endpoint}/${list.id}/delete`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('List deleted');
            setDeletingList(null);
            fetchAllLists();
        } catch {
            toast.error('Could not delete list');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleLogout = () => {
        document.cookie = 'token=; Max-Age=0; path=/';
        localStorage.removeItem('user');
        router.push('/auth/login');
    };

    const handleListStatusChange = async (list: AnyList, status: string) => {
        setOpenStatusListId(null);
        const endpoint = list.listType === 'company' ? 'company-lists' : 'prospect-lists';
        if (list.listType === 'company') {
            setCompanyLists(prev => prev.map(l => l.id === list.id ? { ...l, status } : l));
        } else {
            setProspectLists(prev => prev.map(l => l.id === list.id ? { ...l, status } : l));
        }
        const token = getCookie('token');
        const res = await fetch(`${backendUrl}/api/${endpoint}/${list.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) {
            toast.error('Could not update status');
            fetchAllLists();
        }
    };

    const handleCardClick = (list: AnyList) => {
        if (list.listType === 'company') {
            router.push(`/dashboard/company-lists/${list.id}`);
        } else {
            router.push(`/dashboard/prospect-lists/${list.id}`);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
            {/* {user && <Navigation user={user} onLogout={handleLogout} currentPage="Lists" pageIcon={FaListUl} />} */}

            <div className="px-3 sm:px-6 mt-4 sm:mt-6">
                {/* Control bar */}
                <div className="bg-white shadow-md rounded-lg px-3 py-2 mb-5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
                    {/* Top row: title + actions */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FaListUl className="w-4 h-4 text-[#364570] shrink-0" />
                        <span className="text-sm font-semibold text-[#364570] whitespace-nowrap">Lists</span>
                        {!loading && (
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                · {filteredLists.length} list{filteredLists.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Search + customer filter row (full width on mobile) */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Search */}
                        <div className="relative flex-1 sm:flex-none">
                            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search lists…"
                                className="h-[30px] pl-7 pr-3 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#364570] w-full sm:w-44"
                            />
                        </div>

                        {/* Customer filter (Admin only) */}
                        {user?.type === 'Admin' && customers.length > 0 && (
                            <select
                                value={selectedCustomer}
                                onChange={e => setSelectedCustomer(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                className="h-[30px] border border-gray-300 rounded-md px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#364570] flex-1 sm:flex-none sm:min-w-44"
                            >
                                <option value="">All customers</option>
                                {customers.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        )}

                        {/* New List (Admin only) — shown inline on mobile too */}
                        {user?.type === 'Admin' && (
                            <button
                                onClick={() => { setCreateType(listType); setShowCreateModal(true); }}
                                className="sm:hidden h-[30px] flex items-center gap-1.5 px-3 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors shrink-0"
                            >
                                <FaPlus className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Type filter dropdown */}
                    <div className="w-full sm:w-auto">
                        <select
                            value={listType}
                            onChange={(e) => setListType(e.target.value as ListType)}
                            className="h-[30px] border border-gray-300 rounded-md px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#364570] w-full sm:min-w-36"
                        >
                            <option value="all">All Lists</option>
                            <option value="company">Company Lists</option>
                            <option value="prospect">Prospect Lists</option>
                        </select>
                    </div>

                    {/* Status filter pills (full width on mobile) */}
                    <div className="flex items-center gap-1 w-full sm:w-auto">
                        {[{ value: '', label: 'All' }, ...STATUS_OPTIONS].map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setStatusFilter(opt.value)}
                                className={`h-[26px] px-2.5 text-xs font-medium rounded-full transition-colors ${
                                    statusFilter === opt.value
                                        ? 'bg-[#364570] text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {user?.type === 'Admin' && (
                        <button
                            onClick={() => { setCreateType(listType); setShowCreateModal(true); }}
                            className="hidden sm:flex h-[30px] items-center gap-1.5 px-3 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors"
                        >
                            <FaPlus className="w-3 h-3" />
                            New List
                        </button>
                    )}
                </div>

                {/* Lists grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <ClipLoader size={36} color="#364570" />
                    </div>
                ) : filteredLists.length === 0 ? (
                    <div className="text-center py-20">
                        <FaListUl className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                        <p className="text-base font-medium text-gray-400">
                            {searchTerm || statusFilter
                                ? 'No lists match your filters'
                                : (user?.type === 'Customer' || user?.type === 'Manager')
                                    ? 'No lists to check at the moment.'
                                    : `No ${listType} lists yet`}
                        </p>
                        {!searchTerm && !statusFilter && user?.type === 'Admin' && listType !== 'all' && (
                            <p className="text-sm mt-1 text-gray-400">
                                {listType === 'company'
                                    ? 'Create a list and add companies from the Master Database.'
                                    : 'Create a list and add prospects from the Unassigned Prospects tab.'}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredLists.map(list => (
                            <div
                                key={`${list.listType}-${list.id}`}
                                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#364570]/30 transition-all duration-150 cursor-pointer flex flex-col group"
                                onClick={() => handleCardClick(list)}
                            >
                                <div className={`h-1 rounded-t-xl ${list.listType === 'company' ? 'bg-[#364570]' : 'bg-[#db2f43]'}`} />
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-[#364570] transition-colors line-clamp-2">
                                            {list.name}
                                        </h3>
                                        <span className={`shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                            list.listType === 'company'
                                                ? 'text-[#364570] bg-[#364570]/10'
                                                : 'text-[#db2f43] bg-[#db2f43]/10'
                                        }`}>
                                            {list.listType === 'company'
                                                ? <FaBuilding className="w-2.5 h-2.5" />
                                                : <FaUser className="w-2.5 h-2.5" />
                                            }
                                            {list.item_count}
                                        </span>
                                    </div>
                                    {list.description ? (
                                        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed flex-1">{list.description}</p>
                                    ) : (
                                        <div className="flex-1" />
                                    )}
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {user?.type === 'Admin' && list.customer_name && (
                                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                {list.customer_name}
                                            </span>
                                        )}
                                        {list.ai_prompt_name && (
                                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                                                AI: {list.ai_prompt_name}
                                            </span>
                                        )}
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            list.listType === 'company'
                                                ? 'bg-slate-100 text-slate-600'
                                                : 'bg-[#db2f43]/10 text-[#db2f43]'
                                        }`}>
                                            {list.listType === 'company' ? 'Companies' : 'Prospects'}
                                        </span>
                                    </div>
                                </div>
                                <div className="px-4 pb-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-xs text-gray-400">
                                        {new Date(list.created_at).toLocaleDateString('nl-NL')}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {/* Status badge */}
                                        {(() => {
                                            const s = STATUS_OPTIONS.find(o => o.value === (list.status || 'in_review')) || STATUS_OPTIONS[0];
                                            return (
                                                <div className="relative list-status-popover" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenStatusListId(openStatusListId === list.id ? null : list.id); }}
                                                        className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium list-status-popover ${s.bg} ${s.text}`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                        {s.label}
                                                    </button>
                                                    {openStatusListId === list.id && (
                                                        <div className="absolute bottom-full mb-1 right-0 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px] list-status-popover">
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <button
                                                                    key={opt.value}
                                                                    onClick={() => handleListStatusChange(list, opt.value)}
                                                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-gray-50"
                                                                >
                                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        <span className="text-xs text-[#364570] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            Open <FaChevronRight className="w-2.5 h-2.5" />
                                        </span>
                                        {user?.type === 'Admin' && (
                                            <button
                                                onClick={e => { e.stopPropagation(); setDeletingList(list); }}
                                                className="text-gray-300 hover:text-red-500 transition-colors p-0.5 rounded"
                                                title="Delete list"
                                            >
                                                <FaTrash className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">New List</h2>
                        <div className="space-y-3 mb-5">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">List type <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCreateType('company')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md border transition-colors ${
                                            createType === 'company'
                                                ? 'bg-[#364570] text-white border-[#364570]'
                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <FaBuilding className="w-3 h-3" /> Company List
                                    </button>
                                    <button
                                        onClick={() => setCreateType('prospect')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md border transition-colors ${
                                            createType === 'prospect'
                                                ? 'bg-purple-600 text-white border-purple-600'
                                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <FaUser className="w-3 h-3" /> Prospect List
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">List name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={createName}
                                    onChange={e => setCreateName(e.target.value)}
                                    placeholder={createType === 'company' ? 'e.g. Q2 Target Companies' : 'e.g. Q2 Target Prospects'}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                                <textarea
                                    value={createDescription}
                                    onChange={e => setCreateDescription(e.target.value)}
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570] resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Customer <span className="text-red-500">*</span></label>
                                <select
                                    value={createCustomer}
                                    onChange={e => setCreateCustomer(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570]"
                                >
                                    <option value="">— Select a customer —</option>
                                    {customers.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { setShowCreateModal(false); setCreateName(''); setCreateDescription(''); setCreateCustomer(''); }}
                                disabled={createSaving}
                                className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={createSaving || !createName.trim() || !createCustomer}
                                className="px-4 py-2 text-sm font-medium bg-[#364570] text-white rounded-md hover:bg-[#2d3a5e] disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {createSaving && <ClipLoader size={14} color="#fff" />}
                                {createSaving ? 'Creating…' : 'Create List'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {deletingList !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-2">Delete List</h2>
                        <p className="text-sm text-gray-500 mb-5">This will permanently delete <strong>{deletingList.name}</strong> and all its items. This action cannot be undone.</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setDeletingList(null)}
                                disabled={deleteLoading}
                                className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deletingList)}
                                disabled={deleteLoading}
                                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {deleteLoading && <ClipLoader size={14} color="#fff" />}
                                {deleteLoading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
