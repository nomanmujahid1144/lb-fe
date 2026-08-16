'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import { getCookie } from '@/lib/auth';
import { getBackendUrl } from '@/lib/api-config';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-hot-toast';
import { FaListUl, FaPencilAlt, FaFileDownload, FaColumns, FaTrash, FaPalette, FaTimes, FaComment, FaFilter, FaEye } from 'react-icons/fa';
import { RiResetLeftFill } from 'react-icons/ri';
import ColumnFilterDropdown from '@/components/table/ColumnFilterDropdown';
import { BsChevronLeft } from 'react-icons/bs';
import Pagination from '@/components/layout/Pagination';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: 'in_review', label: 'In Review', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    { value: 'accepted',  label: 'Accepted',  bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    { value: 'declined',  label: 'Declined',  bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500'   },
];

const COLOR_OPTIONS = [
    { value: 'red',    label: 'Red',    bg: 'bg-red-100',    border: 'border-red-400',    dot: 'bg-red-500' },
    { value: 'orange', label: 'Orange', bg: 'bg-orange-100', border: 'border-orange-400', dot: 'bg-orange-500' },
    { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-100', border: 'border-yellow-400', dot: 'bg-yellow-400' },
    { value: 'green',  label: 'Green',  bg: 'bg-green-100',  border: 'border-green-400',  dot: 'bg-green-500' },
    { value: 'blue',   label: 'Blue',   bg: 'bg-blue-100',   border: 'border-blue-400',   dot: 'bg-blue-500' },
    { value: 'gray',   label: 'Gray',   bg: 'bg-gray-100',   border: 'border-gray-400',   dot: 'bg-gray-400' },
];

const TOGGLEABLE_COLUMNS = [
    { key: 'first_name',          label: 'First Name' },
    { key: 'last_name',           label: 'Last Name' },
    { key: 'linkedin_url',        label: 'LinkedIn' },
    { key: 'job_title',           label: 'Job Title' },
    { key: 'job_change',          label: 'Job Change' },
    { key: 'company_name',        label: 'Company' },
    { key: 'company_website_url', label: 'Company Website' },
    { key: 'company_industry',    label: 'Company Industry' },
    { key: 'company_size_range',  label: 'Company Size' },
    { key: 'company_city',        label: 'Company City' },
    { key: 'company_country',     label: 'Company Country' },
    { key: 'persona_level',       label: 'Persona Level' },
    { key: 'persona_areas',       label: 'Persona Areas' },
    { key: 'persona_levels',      label: 'Persona Levels' },
    { key: 'persona_category',    label: 'Persona Category' },
    { key: 'customer_feedback',   label: 'Customer Feedback' },
] as const;

const ROW_COLOR_STYLES: Record<string, string> = {
    red:    'bg-red-50',
    orange: 'bg-orange-50',
    yellow: 'bg-yellow-50',
    green:  'bg-green-50',
    blue:   'bg-blue-50',
    gray:   'bg-gray-100',
};

const ITEM_STATUS_OPTIONS = [
    { value: null,       label: '—',        bg: 'bg-gray-100',  text: 'text-gray-500', dot: 'bg-gray-400' },
    { value: 'accepted', label: 'Accepted', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    { value: 'declined', label: 'Declined', bg: 'bg-red-100',   text: 'text-red-700',  dot: 'bg-red-500' },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
    id: number;
    username: string;
    email: string;
    customers: any[];
    uuid: string;
    type: string;
}

interface CustomColumn {
    id: string;
    name: string;
    type: 'text' | 'select';
    options?: string[];
    customer_editable: boolean;
}

interface ListMeta {
    id: number;
    name: string;
    description: string | null;
    status: string;
    custom_columns: CustomColumn[];
    customer_id: number;
    customer_name: string | null;
}

interface ListItem {
    item_id: number;
    added_at: string;
    row_color: string | null;
    customer_feedback: string | null;
    custom_values: Record<string, any> | null;
    item_status: 'accepted' | 'declined' | null;
    customer_prospect_id: number;
    job_title: string | null;
    scraping_name: string | null;
    blacklisted: boolean | null;
    persona_areas: string | null;
    persona_levels: string | null;
    persona_level: string | null;
    persona_category: string | null;
    prospect_country: string | null;
    prospect_db_id: number;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    linkedin_url: string | null;
    prospect_id: string | null;
    contact_id: string | null;
    birthday: string | null;
    company_db_id: number | null;
    company_name: string | null;
    company_website_url: string | null;
    company_linkedin_url: string | null;
    company_industry: string | null;
    company_size_range: string | null;
    company_country: string | null;
    company_city: string | null;
    job_change: string | null;
}

export default function ProspectListDetailPage() {
    const router = useRouter();
    const params = useParams();
    const listId = params?.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [listMeta, setListMeta] = useState<ListMeta | null>(null);
    const [items, setItems] = useState<ListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 25;

    // Selection
    const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
    const [selectAllLoading, setSelectAllLoading] = useState(false);
    const lastClickedIndex = useRef<number | null>(null);

    // Filters
    // Per-column "Exclude" toggles for text search filters, keyed by the backend
    // field name (name / company_name / job_title / linkedin_url / etc.). When set,
    // that text search is inverted (NOT LIKE).
    const [excludeFilters, setExcludeFilters] = useState<Record<string, boolean>>({});
    const [searchName, setSearchName] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [searchJobTitle, setSearchJobTitle] = useState('');
    const [searchCompany, setSearchCompany] = useState('');
    const [searchCompanyWebsite, setSearchCompanyWebsite] = useState('');
    const [searchCompanyIndustry, setSearchCompanyIndustry] = useState('');
    const [searchCompanySizeRange, setSearchCompanySizeRange] = useState('');
    const [searchCompanyCity, setSearchCompanyCity] = useState('');
    const [searchCompanyCountry, setSearchCompanyCountry] = useState('');
    const [searchPersonaLevel, setSearchPersonaLevel] = useState('');
    const [searchPersonaAreas, setSearchPersonaAreas] = useState('');
    const [searchPersonaLevels, setSearchPersonaLevels] = useState('');
    const [searchPersonaCategory, setSearchPersonaCategory] = useState('');
    const [searchLinkedIn, setSearchLinkedIn] = useState('');
    const [searchStatus, setSearchStatus] = useState('');
    const [jobChangeFrom, setJobChangeFrom] = useState('');
    const [jobChangeTo, setJobChangeTo] = useState('');
    const [selectedBlacklisted, setSelectedBlacklisted] = useState('');
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [selectedCompanyIndustries, setSelectedCompanyIndustries] = useState<string[]>([]);
    const [selectedCompanyCountries, setSelectedCompanyCountries] = useState<string[]>([]);
    const [selectedCompanySizeRanges, setSelectedCompanySizeRanges] = useState<string[]>([]);
    const [selectedCompanyCities, setSelectedCompanyCities] = useState<string[]>([]);
    const [selectedPersonaLevelFilters, setSelectedPersonaLevelFilters] = useState<string[]>([]);
    const [selectedPersonaAreas, setSelectedPersonaAreas] = useState<string[]>([]);
    const [selectedPersonaLevelsFilters, setSelectedPersonaLevelsFilters] = useState<string[]>([]);
    const [selectedPersonaCategories, setSelectedPersonaCategories] = useState<string[]>([]);
    const [companyIndustryOptions, setCompanyIndustryOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [companyCountryOptions, setCompanyCountryOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [companySizeRangeOptions, setCompanySizeRangeOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [companyCityOptions, setCompanyCityOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [personaLevelOptions, setPersonaLevelOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [personaAreasOptions, setPersonaAreasOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [personaLevelsOptions, setPersonaLevelsOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [personaCategoryOptions, setPersonaCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [hasFeedback, setHasFeedback] = useState('');
    const [searchFeedback, setSearchFeedback] = useState('');

    // Bulk feedback
    const [showBulkFeedbackModal, setShowBulkFeedbackModal] = useState(false);
    const [bulkFeedbackValue, setBulkFeedbackValue] = useState('');
    const [bulkFeedbackSaving, setBulkFeedbackSaving] = useState(false);

    // Inline feedback editing
    const [editingFeedbackId, setEditingFeedbackId] = useState<number | null>(null);
    const [feedbackDraft, setFeedbackDraft] = useState('');
    const [feedbackSaving, setFeedbackSaving] = useState(false);

    // Bulk color picker
    const [showColorPicker, setShowColorPicker] = useState(false);

    // List status picker
    const [showListStatusPicker, setShowListStatusPicker] = useState(false);

    // Bulk delete
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Item status
    const [statusMenuOpenId, setStatusMenuOpenId] = useState<number | null>(null);
    const [statusSaving, setStatusSaving] = useState(false);
    const [showBulkStatusPicker, setShowBulkStatusPicker] = useState(false);

    // Column management modal
    const [showColumnModal, setShowColumnModal] = useState(false);
    const [columnsDraft, setColumnsDraft] = useState<CustomColumn[]>([]);
    const [columnsSaving, setColumnsSaving] = useState(false);

    // Bulk custom value setter
    const [showBulkValueModal, setShowBulkValueModal] = useState(false);
    const [bulkColumnId, setBulkColumnId] = useState('');
    const [bulkColumnValue, setBulkColumnValue] = useState('');
    const [bulkValueSaving, setBulkValueSaving] = useState(false);

    // Edit list meta
    const [showEditMetaModal, setShowEditMetaModal] = useState(false);
    const [metaName, setMetaName] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [metaSaving, setMetaSaving] = useState(false);

    // Delete list (Admin)
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteListLoading, setDeleteListLoading] = useState(false);

    const [exportLoading, setExportLoading] = useState(false);

    // Column visibility
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
        new Set(['company_website_url', 'company_industry', 'company_size_range', 'company_city', 'company_country', 'job_change', 'persona_areas', 'persona_levels', 'persona_level'])
    );
    const [showColMenu, setShowColMenu] = useState(false);

    // Column header filter
    const [openColumnFilter, setOpenColumnFilter] = useState<string | null>(null);

    // Custom column filters
    const [customColumnFilters, setCustomColumnFilters] = useState<Record<string, string>>({});

    // Empty / Not Empty column filters (keyed by backend column key)
    const [emptyFilters, setEmptyFilters] = useState<Record<string, boolean>>({});
    const [notEmptyFilters, setNotEmptyFilters] = useState<Record<string, boolean>>({});
    const emptyFilterProps = (key: string) => ({
        includeEmpty: emptyFilters[key] || false,
        onIncludeEmptyChange: (v: boolean) => setEmptyFilters(prev => ({ ...prev, [key]: v })),
        notEmpty: notEmptyFilters[key] || false,
        onNotEmptyChange: (v: boolean) => setNotEmptyFilters(prev => ({ ...prev, [key]: v })),
    });
    const hasEmptyFilter = (key: string) => !!emptyFilters[key] || !!notEmptyFilters[key];
    const anyEmptyFiltersActive = Object.values(emptyFilters).some(Boolean) || Object.values(notEmptyFilters).some(Boolean);

    const backendUrl = getBackendUrl();
    const tableScrollRef = useRef<HTMLDivElement>(null);

    const fetchListFilterOptions = useCallback(async () => {
        if (!user) return;
        const token = getCookie('token');
        if (!token) return;

        try {
            const response = await fetch(`${backendUrl}/api/prospect-lists/${listId}/filter-options`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) return;
            const data = await response.json();
            const options = data.filterOptions || {};

            setCompanyIndustryOptions((options.companyIndustries || []).map((value: string) => ({ value, label: value })));
            setCompanyCountryOptions((options.companyCountries || []).map((value: string) => ({ value, label: value })));
            setCompanySizeRangeOptions((options.companySizeRanges || []).map((value: string) => ({ value, label: value })));
            setCompanyCityOptions((options.companyCities || []).map((value: string) => ({ value, label: value })));
            setPersonaLevelOptions((options.personaLevel || []).map((value: string) => ({ value, label: value })));
            setPersonaAreasOptions((options.personaAreas || []).map((value: string) => ({ value, label: value })));
            setPersonaLevelsOptions((options.personaLevels || []).map((value: string) => ({ value, label: value })));
            setPersonaCategoryOptions((options.personaCategory || []).map((value: string) => ({ value, label: value })));
        } catch (error) {
            console.error('Failed to load prospect list filter options', error);
        }
    }, [backendUrl, user]);

    // ── Init ─────────────────────────────────────────────────────────────────
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
        if (user) {
            fetchData(1);
            fetchListFilterOptions();
        }
    }, [user]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.column-filter-dropdown')) setOpenColumnFilter(null);
        };
        if (openColumnFilter) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [openColumnFilter]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.col-visibility-menu')) setShowColMenu(false);
        };
        if (showColMenu) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showColMenu]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.list-status-popover')) setShowListStatusPicker(false);
        };
        if (showListStatusPicker) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showListStatusPicker]);

    // ── Data fetch ───────────────────────────────────────────────────────────
    const buildCurrentFilters = useCallback((): Record<string, any> => ({
        searchName: searchName || undefined,
        searchEmail: searchEmail || undefined,
        searchJobTitle: searchJobTitle || undefined,
        searchCompany: searchCompany || undefined,
        searchCompanyWebsite: searchCompanyWebsite || undefined,
        searchCompanyIndustry: searchCompanyIndustry || undefined,
        searchCompanySizeRange: searchCompanySizeRange || undefined,
        searchCompanyCity: searchCompanyCity || undefined,
        searchCompanyCountry: searchCompanyCountry || undefined,
        selectedCompanyIndustries: selectedCompanyIndustries.length > 0 ? selectedCompanyIndustries : undefined,
        selectedCompanySizeRanges: selectedCompanySizeRanges.length > 0 ? selectedCompanySizeRanges : undefined,
        selectedCompanyCountries: selectedCompanyCountries.length > 0 ? selectedCompanyCountries : undefined,
        selectedCompanyCities: selectedCompanyCities.length > 0 ? selectedCompanyCities : undefined,
        searchPersonaLevel: searchPersonaLevel || undefined,
        searchPersonaAreas: searchPersonaAreas || undefined,
        searchPersonaLevels: searchPersonaLevels || undefined,
        searchPersonaCategory: searchPersonaCategory || undefined,
        selectedPersonaLevelFilters: selectedPersonaLevelFilters.length > 0 ? selectedPersonaLevelFilters : undefined,
        selectedPersonaAreas: selectedPersonaAreas.length > 0 ? selectedPersonaAreas : undefined,
        selectedPersonaLevelsFilters: selectedPersonaLevelsFilters.length > 0 ? selectedPersonaLevelsFilters : undefined,
        selectedPersonaCategories: selectedPersonaCategories.length > 0 ? selectedPersonaCategories : undefined,
        searchLinkedIn: searchLinkedIn || undefined,
        searchStatus: searchStatus || undefined,
        jobChangeFrom: jobChangeFrom || undefined,
        jobChangeTo: jobChangeTo || undefined,
        blacklistedFilter: selectedBlacklisted === 'true' ? 'yes' : selectedBlacklisted === 'false' ? 'no' : undefined,
        selectedColors: selectedColors.length > 0 ? selectedColors : undefined,
        hasFeedback: hasFeedback || undefined,
        searchFeedback: searchFeedback || undefined,
        customColumnFilters: Object.keys(customColumnFilters).length > 0 ? customColumnFilters : undefined,
        includeEmptyFilters: Object.values(emptyFilters).some(Boolean) ? emptyFilters : undefined,
        notEmptyFilters: Object.values(notEmptyFilters).some(Boolean) ? notEmptyFilters : undefined,
        excludeFilters: Object.values(excludeFilters).some(Boolean) ? excludeFilters : undefined,
    }), [searchName, searchEmail, searchJobTitle, searchCompany, searchCompanyWebsite, searchCompanyIndustry, searchCompanySizeRange, searchCompanyCity, searchCompanyCountry, selectedCompanyIndustries, selectedCompanySizeRanges, selectedCompanyCountries, selectedCompanyCities, searchPersonaLevel, searchPersonaAreas, searchPersonaLevels, searchPersonaCategory, selectedPersonaLevelFilters, selectedPersonaAreas, selectedPersonaLevelsFilters, selectedPersonaCategories, searchLinkedIn, searchStatus, jobChangeFrom, jobChangeTo, selectedBlacklisted, selectedColors, hasFeedback, searchFeedback, customColumnFilters, emptyFilters, notEmptyFilters, excludeFilters]);

    const fetchData = useCallback(async (page: number, explicitFilters?: Record<string, any>) => {
        const token = getCookie('token');
        setLoading(true);
        try {
            const f = explicitFilters ?? buildCurrentFilters();
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ page, pageSize, ...f }),
            });
            if (res.status === 404) {
                toast.error('This list no longer exists');
                router.push('/dashboard/lists');
                return;
            }
            if (!res.ok) throw new Error('Failed to load list data');
            const data = await res.json();
            setItems(data.data.items || []);
            setTotal(data.data.total || 0);
            setCurrentPage(data.data.page || 1);
            setTotalPages(data.data.totalPages || 1);
            if (data.data.list) setListMeta(data.data.list);
        } catch {
            toast.error('Could not load list');
        } finally {
            setLoading(false);
        }
    }, [listId, backendUrl, buildCurrentFilters]);

    // Fetch every item_id matching the current filters (not just the current page) so
    // bulk actions can operate on the full result set instead of one page at a time.
    const fetchAllMatchingItemIds = useCallback(async () => {
        const token = getCookie('token');
        if (!token) return;
        setSelectAllLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ idsOnly: true, ...buildCurrentFilters() }),
            });
            if (!res.ok) throw new Error('Failed to fetch matching items');
            const data = await res.json();
            const ids: number[] = data.data.itemIds || [];
            setSelectedItemIds(new Set(ids));
            if (total > ids.length) {
                toast.success(`Selected the first ${ids.length.toLocaleString()} of ${total.toLocaleString()} matching items (selection limit)`);
            } else {
                toast.success(`Selected ${ids.length.toLocaleString()} item${ids.length !== 1 ? 's' : ''}`);
            }
        } catch {
            toast.error('Could not select all matching items');
        } finally {
            setSelectAllLoading(false);
        }
    }, [backendUrl, listId, buildCurrentFilters, total]);

    const handlePageChange = (page: number) => {
        setSelectedItemIds(new Set());
        fetchData(page);
        tableScrollRef.current?.scrollTo({ top: 0 });
    };

    // Apply filters on Enter while a column filter dropdown is open
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                setOpenColumnFilter(null);
                // Clear selection like the Filter button does — a refetch with new
                // filters must not leave a stale (possibly cross-page) selection behind.
                setSelectedItemIds(new Set());
                fetchData(1);
            }
        };
        if (openColumnFilter) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [openColumnFilter, fetchData]);

    const isFiltersActive = !!searchName || !!searchEmail || !!searchJobTitle || !!searchCompany || !!searchCompanyWebsite || !!searchCompanyIndustry || !!searchCompanySizeRange || !!searchCompanyCity || !!searchCompanyCountry || selectedCompanyIndustries.length > 0 || selectedCompanySizeRanges.length > 0 || selectedCompanyCountries.length > 0 || selectedCompanyCities.length > 0 || !!searchPersonaLevel || !!searchPersonaAreas || !!searchPersonaLevels || !!searchPersonaCategory || selectedPersonaLevelFilters.length > 0 || selectedPersonaAreas.length > 0 || selectedPersonaLevelsFilters.length > 0 || selectedPersonaCategories.length > 0 || !!searchLinkedIn || !!searchStatus || !!jobChangeFrom || !!jobChangeTo
        || !!selectedBlacklisted || selectedColors.length > 0 || !!hasFeedback || !!searchFeedback
        || Object.values(customColumnFilters).some(v => !!v)
        || anyEmptyFiltersActive;

    const handleResetFilters = () => {
        setExcludeFilters({});
        setSearchName(''); setSearchEmail(''); setSearchJobTitle(''); setSearchCompany('');
        setSearchCompanyWebsite(''); setSearchCompanyIndustry(''); setSearchCompanySizeRange(''); setSearchCompanyCity(''); setSearchCompanyCountry('');
        setSelectedCompanyIndustries([]); setSelectedCompanySizeRanges([]); setSelectedCompanyCountries([]); setSelectedCompanyCities([]);
        setSearchPersonaLevel(''); setSearchPersonaAreas(''); setSearchPersonaLevels(''); setSearchPersonaCategory('');
        setSelectedPersonaLevelFilters([]); setSelectedPersonaAreas([]); setSelectedPersonaLevelsFilters([]); setSelectedPersonaCategories([]);
        setSearchLinkedIn(''); setSearchStatus(''); setJobChangeFrom(''); setJobChangeTo('');
        setSelectedBlacklisted(''); setSelectedColors([]); setHasFeedback(''); setSearchFeedback('');
        setCustomColumnFilters({});
        setEmptyFilters({}); setNotEmptyFilters({});
        setSelectedItemIds(new Set());
        fetchData(1, {});
    };

    // ── Row selection ─────────────────────────────────────────────────────────
    const toggleRow = (itemId: number, index: number, shiftKey: boolean) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (shiftKey && lastClickedIndex.current !== null) {
                const from = Math.min(lastClickedIndex.current, index);
                const to = Math.max(lastClickedIndex.current, index);
                for (let i = from; i <= to; i++) {
                    const id = items[i]?.item_id;
                    if (id) next.add(id);
                }
            } else {
                if (next.has(itemId)) next.delete(itemId);
                else next.add(itemId);
            }
            return next;
        });
        lastClickedIndex.current = index;
    };

    const toggleSelectAll = () => {
        const pageIds = items.map(i => i.item_id);
        const allSelected = pageIds.every(id => selectedItemIds.has(id));
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (allSelected) { pageIds.forEach(id => next.delete(id)); }
            else { pageIds.forEach(id => next.add(id)); }
            return next;
        });
    };

    // ── Helper ────────────────────────────────────────────────────────────────
    const getApiError = async (res: Response, fallback: string) => {
        try {
            const data = await res.json();
            if (res.status === 403) return data?.error?.message || 'Je hebt geen toegang voor deze actie';
            return data?.error?.message || fallback;
        } catch { return fallback; }
    };

    // ── Bulk color ────────────────────────────────────────────────────────────
    const handleBulkColor = async (color: string | null) => {
        const token = getCookie('token');
        setShowColorPicker(false);
        const ids = Array.from(selectedItemIds);
        if (ids.length === 0) return;
        try {
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/items/bulk-update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ item_ids: ids, row_color: color }),
            });
            if (!res.ok) throw new Error(await getApiError(res, 'Kon kleur niet bijwerken'));
            toast.success(`Color updated for ${ids.length} item${ids.length !== 1 ? 's' : ''}`);
            setItems(prev => prev.map(item =>
                selectedItemIds.has(item.item_id) ? { ...item, row_color: color } : item
            ));
        } catch (err: any) {
            toast.error(err.message || 'Kon kleur niet bijwerken');
        }
    };

    // ── List status ───────────────────────────────────────────────────────────
    const handleListStatusChange = async (status: string) => {
        setShowListStatusPicker(false);
        const prevStatus = listMeta?.status;
        if (listMeta) setListMeta(prev => prev ? { ...prev, status } : prev);
        const token = getCookie('token');
        const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) {
            toast.error('Could not update list status');
            if (listMeta) setListMeta(prev => prev ? { ...prev, status: prevStatus || 'in_review' } : prev);
        }
    };

    // ── Bulk delete ───────────────────────────────────────────────────────────
    const handleBulkDelete = async () => {
        const ids = Array.from(selectedItemIds);
        if (ids.length === 0 || !confirm(`Remove ${ids.length} item${ids.length !== 1 ? 's' : ''} from this list?`)) return;
        setDeleteLoading(true);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/items/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ item_ids: ids }),
            });
            if (!res.ok) throw new Error(await getApiError(res, 'Kon items niet verwijderen'));
            const data = await res.json();
            toast.success(`${data.data.deleted} item${data.data.deleted !== 1 ? 's' : ''} removed`);
            setSelectedItemIds(new Set());
            fetchData(currentPage);
        } catch (err: any) {
            toast.error(err.message || 'Kon items niet verwijderen');
        } finally {
            setDeleteLoading(false);
        }
    };

    // ── Bulk status ────────────────────────────────────────────────────────────
    const handleBulkStatus = async (status: 'accepted' | 'declined' | null) => {
        const ids = Array.from(selectedItemIds);
        if (ids.length === 0) return;
        setStatusSaving(true);
        setShowBulkStatusPicker(false);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/items/bulk-update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ item_ids: ids, item_status: status }),
            });
            if (!res.ok) throw new Error(await getApiError(res, 'Kon status niet instellen'));
            toast.success(`Status updated for ${ids.length} item${ids.length !== 1 ? 's' : ''}`);
            setItems(prev => prev.map(item =>
                selectedItemIds.has(item.item_id) ? { ...item, item_status: status } : item
            ));
        } catch (err: any) {
            toast.error(err.message || 'Kon status niet instellen');
        } finally {
            setStatusSaving(false);
        }
    };

    // ── Bulk feedback ─────────────────────────────────────────────────────────
    const handleBulkFeedback = async () => {
        const ids = Array.from(selectedItemIds);
        setBulkFeedbackSaving(true);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/items/bulk-update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ item_ids: ids, customer_feedback: bulkFeedbackValue }),
            });
            if (!res.ok) throw new Error(await getApiError(res, 'Kon feedback niet instellen'));
            toast.success(`Feedback set for ${ids.length} item${ids.length !== 1 ? 's' : ''}`);
            setItems(prev => prev.map(item =>
                selectedItemIds.has(item.item_id) ? { ...item, customer_feedback: bulkFeedbackValue } : item
            ));
            setShowBulkFeedbackModal(false);
            setBulkFeedbackValue('');
        } catch (err: any) {
            toast.error(err.message || 'Kon feedback niet instellen');
        } finally {
            setBulkFeedbackSaving(false);
        }
    };

    // ── Inline feedback ───────────────────────────────────────────────────────
    const saveFeedback = async (itemId: number) => {
        setFeedbackSaving(true);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ customer_feedback: feedbackDraft }),
            });
            if (!res.ok) throw new Error(await getApiError(res, 'Kon feedback niet opslaan'));
            setItems(prev => prev.map(item =>
                item.item_id === itemId ? { ...item, customer_feedback: feedbackDraft } : item
            ));
            setEditingFeedbackId(null);
        } catch (err: any) {
            toast.error(err.message || 'Kon feedback niet opslaan');
        } finally {
            setFeedbackSaving(false);
        }
    };

    // ── Item status ───────────────────────────────────────────────────────────
    const saveItemStatus = async (itemId: number, status: 'accepted' | 'declined' | null) => {
        setStatusSaving(true);
        setStatusMenuOpenId(null);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ item_status: status }),
            });
            if (!res.ok) throw new Error(await getApiError(res, 'Kon status niet opslaan'));
            setItems(prev => prev.map(item =>
                item.item_id === itemId ? { ...item, item_status: status } : item
            ));
        } catch (err: any) {
            toast.error(err.message || 'Kon status niet opslaan');
        } finally {
            setStatusSaving(false);
        }
    };

    // ── Columns ───────────────────────────────────────────────────────────────
    const handleSaveColumns = async () => {
        setColumnsSaving(true);
        const token = getCookie('token');
        try {
            const columnsToSend = isAdmin
                ? columnsDraft
                : [
                    ...(listMeta?.custom_columns?.filter(c => !c.customer_editable) || []),
                    ...columnsDraft.map(c => ({ ...c, customer_editable: true })),
                  ];
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/columns`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ custom_columns: columnsToSend }),
            });
            if (!res.ok) throw new Error('Failed');
            toast.success('Columns updated');
            setListMeta(prev => prev ? { ...prev, custom_columns: columnsToSend } : prev);
            setShowColumnModal(false);
            fetchData(currentPage);
        } catch {
            toast.error('Could not save columns');
        } finally {
            setColumnsSaving(false);
        }
    };

    const addNewColumn = () => {
        const newId = `col_${Date.now()}`;
        setColumnsDraft(prev => [...prev, { id: newId, name: '', type: 'text', customer_editable: false }]);
    };

    // ── Bulk custom value ─────────────────────────────────────────────────────
    const handleBulkSetValue = async () => {
        if (!bulkColumnId || bulkColumnValue === undefined) return;
        const ids = Array.from(selectedItemIds);
        setBulkValueSaving(true);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/items/bulk-update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ item_ids: ids, column_id: bulkColumnId, column_value: bulkColumnValue }),
            });
            if (!res.ok) throw new Error('Failed');
            toast.success(`Value set for ${ids.length} item${ids.length !== 1 ? 's' : ''}`);
            setShowBulkValueModal(false);
            setBulkColumnId(''); setBulkColumnValue('');
            setItems(prev => prev.map(item => {
                if (!selectedItemIds.has(item.item_id)) return item;
                const cv = { ...(item.custom_values || {}), [bulkColumnId]: bulkColumnValue };
                return { ...item, custom_values: cv };
            }));
        } catch {
            toast.error('Could not set value');
        } finally {
            setBulkValueSaving(false);
        }
    };

    // ── Export ────────────────────────────────────────────────────────────────
    const handleExport = async () => {
        setExportLoading(true);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/export`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `prospect_list_${listId}_export.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Export failed');
        } finally {
            setExportLoading(false);
        }
    };

    // ── Meta edit ─────────────────────────────────────────────────────────────
    const handleSaveMeta = async () => {
        setMetaSaving(true);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/meta`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: metaName, description: metaDescription }),
            });
            if (!res.ok) throw new Error('Failed');
            setListMeta(prev => prev ? { ...prev, name: metaName, description: metaDescription } : prev);
            toast.success('List updated');
            setShowEditMetaModal(false);
        } catch {
            toast.error('Could not update list');
        } finally {
            setMetaSaving(false);
        }
    };

    const handleDeleteList = async () => {
        setDeleteListLoading(true);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/prospect-lists/${listId}/delete`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed');
            toast.success('List deleted');
            router.push('/dashboard/lists');
        } catch {
            toast.error('Could not delete list');
            setDeleteListLoading(false);
        }
    };

    const handleLogout = () => {
        document.cookie = 'token=; Max-Age=0; path=/';
        localStorage.removeItem('user');
        router.push('/auth/login');
    };

    const isAdmin = user?.type === 'Admin';
    const customColumns: CustomColumn[] = listMeta?.custom_columns || [];
    const selectedCount = selectedItemIds.size;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
            {/* {user && <Navigation user={user} onLogout={handleLogout} currentPage={listMeta?.name || 'Prospect List'} pageIcon={FaListUl} />} */}

            <div className="px-3 sm:px-6 mt-4 sm:mt-6">
                {/* Header card */}
                <div className="bg-white shadow-md rounded-lg px-4 py-3 mb-4">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 mb-2.5">
                        <button
                            onClick={() => router.push('/dashboard/lists')}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#364570] transition-colors"
                        >
                            <BsChevronLeft className="w-3 h-3" />
                            Lists
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-[#364570] truncate">{listMeta?.name || '…'}</h1>
                                {isAdmin && listMeta && (
                                    <button
                                        onClick={() => { setMetaName(listMeta.name); setMetaDescription(listMeta.description || ''); setShowEditMetaModal(true); }}
                                        className="text-gray-400 hover:text-[#364570] transition-colors p-1 rounded hover:bg-gray-100"
                                        title="Edit list name"
                                    >
                                        <FaPencilAlt className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            {listMeta?.description && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{listMeta.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">Prospect List</span>
                                {isAdmin && listMeta?.customer_name && (
                                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{listMeta.customer_name}</span>
                                )}
                                {/* List status badge */}
                                {listMeta && (() => {
                                    const s = STATUS_OPTIONS.find(o => o.value === (listMeta.status || 'in_review')) || STATUS_OPTIONS[0];
                                    return (
                                        <div className="relative list-status-popover">
                                            <button
                                                onClick={() => setShowListStatusPicker(p => !p)}
                                                className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium list-status-popover ${s.bg} ${s.text}`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                {s.label}
                                            </button>
                                            {showListStatusPicker && (
                                                <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[130px] list-status-popover">
                                                    {STATUS_OPTIONS.map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => handleListStatusChange(opt.value)}
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
                            </div>
                        </div>

                        {/* Toolbar buttons */}
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                            <button
                                onClick={() => fetchData(1)}
                                disabled={loading}
                                className="h-[30px] px-3 text-xs font-medium rounded-md bg-[#364570] text-white hover:bg-[#2a3654] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                {loading ? <ClipLoader size={12} color="#fff" /> : <FaFilter className="w-3 h-3" />}
                                Filter
                            </button>
                            <button
                                onClick={handleResetFilters}
                                disabled={!isFiltersActive || loading}
                                className={`h-[30px] px-3 text-xs font-medium rounded-md border flex items-center justify-center gap-1.5 transition-colors ${
                                    isFiltersActive ? 'border-orange-400 text-orange-600 hover:bg-orange-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'
                                }`}
                            >
                                <RiResetLeftFill className="w-3.5 h-3.5" />
                                Reset
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={exportLoading || total === 0}
                                className="h-[30px] px-3 text-xs font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                {exportLoading ? <ClipLoader size={12} color="#364570" /> : <FaFileDownload className="w-3.5 h-3.5" />}
                                {exportLoading ? 'Exporting…' : 'Export'}
                            </button>
                            <div className="relative col-visibility-menu">
                                <button
                                    onClick={() => setShowColMenu(p => !p)}
                                    className="w-full h-[30px] px-3 text-xs font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <FaEye className="w-3.5 h-3.5" />
                                    View Columns
                                </button>
                                {showColMenu && (
                                    <div className="absolute top-full mt-1 right-0 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 min-w-44">
                                        {TOGGLEABLE_COLUMNS.map(col => (
                                            <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs text-gray-700 select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={!hiddenColumns.has(col.key)}
                                                    onChange={() => setHiddenColumns(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(col.key)) next.delete(col.key);
                                                        else next.add(col.key);
                                                        return next;
                                                    })}
                                                    className="accent-[#364570]"
                                                />
                                                {col.label}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    const cols = isAdmin ? customColumns : customColumns.filter(c => c.customer_editable);
                                    setColumnsDraft(cols.map(c => ({ ...c })));
                                    setShowColumnModal(true);
                                }}
                                className="h-[30px] px-3 text-xs font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <FaColumns className="w-3.5 h-3.5" />
                                Add Columns
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    className="col-span-2 sm:col-span-1 h-[30px] px-3 text-xs font-medium rounded-md text-white flex items-center justify-center gap-1.5 transition-colors"
                                    style={{ backgroundColor: '#db2f43' }}
                                >
                                    <FaTrash className="w-3 h-3" />
                                    Delete List
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Selection banner */}
                    {selectedCount > 0 && (
                        <div className="mt-3 -mx-4 -mb-3 px-4 pb-3 pt-2.5 bg-blue-50 border-t border-blue-100 rounded-b-lg flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-blue-800">{selectedCount} selected</span>

                            {items.length > 0 && items.every(i => selectedItemIds.has(i.item_id)) && total > selectedCount && (
                                <button
                                    onClick={fetchAllMatchingItemIds}
                                    disabled={selectAllLoading}
                                    className="text-xs text-blue-700 underline font-semibold hover:text-blue-900 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5"
                                >
                                    {selectAllLoading && <ClipLoader size={10} color="currentColor" />}
                                    {selectAllLoading ? 'Selecting…' : `Select all ${Math.min(total, 50000).toLocaleString()} matching`}
                                </button>
                            )}

                            {/* Set Feedback — available to all users */}
                            <button
                                onClick={() => { setBulkFeedbackValue(''); setShowBulkFeedbackModal(true); }}
                                className="h-[26px] px-2.5 text-xs font-medium rounded-md border border-[#364570] text-[#364570] hover:bg-[#364570] hover:text-white flex items-center gap-1.5 transition-colors"
                            >
                                <FaComment className="w-3 h-3" />
                                Set Feedback
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setShowColorPicker(p => !p)}
                                    className="h-[26px] px-2.5 text-xs font-medium rounded-md border border-[#364570] text-[#364570] hover:bg-[#364570] hover:text-white flex items-center gap-1.5 transition-colors"
                                >
                                    <FaPalette className="w-3 h-3" />
                                    Color
                                </button>
                                {showColorPicker && (
                                    <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-col gap-0.5 w-36">
                                        {COLOR_OPTIONS.map(c => (
                                            <button
                                                key={c.value}
                                                onClick={() => handleBulkColor(c.value)}
                                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 text-xs text-gray-700 w-full"
                                            >
                                                <span className={`w-3 h-3 rounded-full shrink-0 ${c.dot}`} />
                                                {c.label}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => handleBulkColor(null)}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 text-xs text-gray-400 w-full border-t border-gray-100 mt-0.5 pt-2"
                                        >
                                            Clear color
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isAdmin && customColumns.length > 0 && (
                                <button
                                    onClick={() => { setBulkColumnId(customColumns[0]?.id || ''); setBulkColumnValue(''); setShowBulkValueModal(true); }}
                                    className="h-[26px] px-2.5 text-xs font-medium rounded-md border border-[#364570] text-[#364570] hover:bg-[#364570] hover:text-white flex items-center gap-1.5 transition-colors"
                                >
                                    Set value
                                </button>
                            )}

                            {/* Bulk status picker */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowBulkStatusPicker(p => !p)}
                                    className="h-[26px] px-2.5 text-xs font-medium rounded-md border border-[#364570] text-[#364570] hover:bg-[#364570] hover:text-white flex items-center gap-1.5 transition-colors"
                                >
                                    Status
                                </button>
                                {showBulkStatusPicker && (
                                    <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                                        {ITEM_STATUS_OPTIONS.map(opt => (
                                            <button
                                                key={String(opt.value)}
                                                onClick={() => handleBulkStatus(opt.value as any)}
                                                disabled={statusSaving}
                                                className={`flex items-center gap-2 px-3 py-1.5 text-xs w-full text-left hover:bg-gray-50 ${opt.text} whitespace-nowrap`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setSelectedItemIds(new Set())}
                                className="h-[26px] px-2.5 text-xs font-medium rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center gap-1 transition-colors"
                            >
                                <FaTimes className="w-2.5 h-2.5" />
                                Clear
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center py-20"><ClipLoader size={36} color="#364570" /></div>
                ) : (
                    <>
                        <div ref={tableScrollRef} className="overflow-x-auto rounded-lg border border-gray-200 bg-white min-h-[400px]">
                            <table className="min-w-full text-xs divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-2 py-1.5 w-8">
                                            <input
                                                type="checkbox"
                                                checked={items.length > 0 && items.every(i => selectedItemIds.has(i.item_id))}
                                                onChange={toggleSelectAll}
                                                className="accent-[#364570]"
                                            />
                                        </th>
                                        {/* Color */}
                                        <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Color</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'color' ? null : 'color'); }}
                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                >
                                                    <FaFilter className={`w-2.5 h-2.5 ${(selectedColors.length > 0 || hasEmptyFilter('color')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'color' && (
                                                <ColumnFilterDropdown
                                                    column="Color"
                                                    type="multiselect"
                                                    options={COLOR_OPTIONS.map(c => ({ value: c.value, label: c.label }))}
                                                    renderOption={(opt: {value: string; label: string}) => {
                                                        const c = COLOR_OPTIONS.find(co => co.value === opt.value);
                                                        return c ? <span className={`inline-block w-3 h-3 rounded-full ${c.dot}`} title={c.label} /> : opt.label;
                                                    }}
                                                    selectedValues={selectedColors}
                                                    onSelectedValuesChange={setSelectedColors}
                                                    {...emptyFilterProps('color')}
                                                    isOpen={true}
                                                    onClose={() => setOpenColumnFilter(null)}
                                                />
                                            )}
                                        </th>
                                        {/* First Name */}
                                        {!hiddenColumns.has('first_name') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>First Name</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'first_name' ? null : 'first_name'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(searchName || hasEmptyFilter('first_name')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'first_name' && (
                                                    <ColumnFilterDropdown
                                                        column="First Name"
                                                        type="text"
                                                        searchValue={searchName}
                                                        onSearchChange={setSearchName}
                                                        excludeSearch={excludeFilters["name"] || false}
                                                        onExcludeSearchChange={(v) => setExcludeFilters(prev => ({ ...prev, ["name"]: v }))}
                                                        {...emptyFilterProps('first_name')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Last Name */}
                                        {!hiddenColumns.has('last_name') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Last Name</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'last_name' ? null : 'last_name'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(searchName || hasEmptyFilter('last_name')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'last_name' && (
                                                    <ColumnFilterDropdown
                                                        column="Last Name"
                                                        type="text"
                                                        searchValue={searchName}
                                                        onSearchChange={setSearchName}
                                                        excludeSearch={excludeFilters["name"] || false}
                                                        onExcludeSearchChange={(v) => setExcludeFilters(prev => ({ ...prev, ["name"]: v }))}
                                                        {...emptyFilterProps('last_name')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Job Title */}
                                        {!hiddenColumns.has('job_title') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Job Title</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'job_title' ? null : 'job_title'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(searchJobTitle || hasEmptyFilter('job_title')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'job_title' && (
                                                    <ColumnFilterDropdown
                                                        column="Job Title"
                                                        type="text"
                                                        searchValue={searchJobTitle}
                                                        onSearchChange={setSearchJobTitle}
                                                        excludeSearch={excludeFilters["job_title"] || false}
                                                        onExcludeSearchChange={(v) => setExcludeFilters(prev => ({ ...prev, ["job_title"]: v }))}
                                                        {...emptyFilterProps('job_title')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Job Change */}
                                        {!hiddenColumns.has('job_change') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Job Change</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'job_change' ? null : 'job_change'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(jobChangeFrom || jobChangeTo || hasEmptyFilter('job_change')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'job_change' && (
                                                    <ColumnFilterDropdown
                                                        column="Job Change"
                                                        type="daterange"
                                                        dateFromValue={jobChangeFrom}
                                                        dateToValue={jobChangeTo}
                                                        onDateFromChange={setJobChangeFrom}
                                                        onDateToChange={setJobChangeTo}
                                                        {...emptyFilterProps('job_change')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Company */}
                                        {!hiddenColumns.has('company_name') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Company</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'company_name' ? null : 'company_name'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(searchCompany || hasEmptyFilter('company_name')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'company_name' && (
                                                    <ColumnFilterDropdown
                                                        column="Company"
                                                        type="text"
                                                        searchValue={searchCompany}
                                                        onSearchChange={setSearchCompany}
                                                        excludeSearch={excludeFilters["company_name"] || false}
                                                        onExcludeSearchChange={(v) => setExcludeFilters(prev => ({ ...prev, ["company_name"]: v }))}
                                                        {...emptyFilterProps('company_name')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Company Website */}
                                        {!hiddenColumns.has('company_website_url') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Company Website</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'company_website_url' ? null : 'company_website_url'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(searchCompanyWebsite || hasEmptyFilter('company_website_url')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'company_website_url' && (
                                                    <ColumnFilterDropdown
                                                        column="Company Website"
                                                        type="text"
                                                        searchValue={searchCompanyWebsite}
                                                        onSearchChange={setSearchCompanyWebsite}
                                                        excludeSearch={excludeFilters["company_website_url"] || false}
                                                        onExcludeSearchChange={(v) => setExcludeFilters(prev => ({ ...prev, ["company_website_url"]: v }))}
                                                        {...emptyFilterProps('company_website_url')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Company Industry */}
                                        {!hiddenColumns.has('company_industry') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Industry</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'company_industry' ? null : 'company_industry'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(selectedCompanyIndustries.length > 0 || searchCompanyIndustry || hasEmptyFilter('company_industry')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'company_industry' && (
                                                    <ColumnFilterDropdown
                                                        column="Industry"
                                                        type="multiselect"
                                                        options={companyIndustryOptions}
                                                        selectedValues={selectedCompanyIndustries}
                                                        onSelectedValuesChange={setSelectedCompanyIndustries}
                                                        {...emptyFilterProps('company_industry')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Company Size */}
                                        {!hiddenColumns.has('company_size_range') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Company Size</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'company_size_range' ? null : 'company_size_range'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(selectedCompanySizeRanges.length > 0 || searchCompanySizeRange || hasEmptyFilter('company_size_range')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'company_size_range' && (
                                                    <ColumnFilterDropdown
                                                        column="Company Size"
                                                        type="multiselect"
                                                        options={companySizeRangeOptions}
                                                        selectedValues={selectedCompanySizeRanges}
                                                        onSelectedValuesChange={setSelectedCompanySizeRanges}
                                                        {...emptyFilterProps('company_size_range')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Company City */}
                                        {!hiddenColumns.has('company_city') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Company City</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'company_city' ? null : 'company_city'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(selectedCompanyCities.length > 0 || searchCompanyCity || hasEmptyFilter('company_city')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'company_city' && (
                                                    <ColumnFilterDropdown
                                                        column="Company City"
                                                        type="multiselect"
                                                        options={companyCityOptions}
                                                        selectedValues={selectedCompanyCities}
                                                        onSelectedValuesChange={setSelectedCompanyCities}
                                                        {...emptyFilterProps('company_city')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Company Country */}
                                        {!hiddenColumns.has('company_country') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Company Country</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'company_country' ? null : 'company_country'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(selectedCompanyCountries.length > 0 || searchCompanyCountry || hasEmptyFilter('company_country')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'company_country' && (
                                                    <ColumnFilterDropdown
                                                        column="Company Country"
                                                        type="multiselect"
                                                        options={companyCountryOptions}
                                                        selectedValues={selectedCompanyCountries}
                                                        onSelectedValuesChange={setSelectedCompanyCountries}
                                                        {...emptyFilterProps('company_country')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Persona Level */}
                                        {!hiddenColumns.has('persona_level') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Persona Level</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'persona_level' ? null : 'persona_level'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(selectedPersonaLevelFilters.length > 0 || searchPersonaLevel || hasEmptyFilter('persona_level')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'persona_level' && (
                                                    <ColumnFilterDropdown
                                                        column="Persona Level"
                                                        type="multiselect"
                                                        options={personaLevelOptions}
                                                        selectedValues={selectedPersonaLevelFilters}
                                                        onSelectedValuesChange={setSelectedPersonaLevelFilters}
                                                        {...emptyFilterProps('persona_level')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Persona Areas */}
                                        {!hiddenColumns.has('persona_areas') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Persona Areas</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'persona_areas' ? null : 'persona_areas'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(selectedPersonaAreas.length > 0 || searchPersonaAreas || hasEmptyFilter('persona_areas')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'persona_areas' && (
                                                    <ColumnFilterDropdown
                                                        column="Persona Areas"
                                                        type="multiselect"
                                                        options={personaAreasOptions}
                                                        selectedValues={selectedPersonaAreas}
                                                        onSelectedValuesChange={setSelectedPersonaAreas}
                                                        {...emptyFilterProps('persona_areas')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Persona Levels */}
                                        {!hiddenColumns.has('persona_levels') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Persona Levels</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'persona_levels' ? null : 'persona_levels'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(selectedPersonaLevelsFilters.length > 0 || searchPersonaLevels || hasEmptyFilter('persona_levels')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'persona_levels' && (
                                                    <ColumnFilterDropdown
                                                        column="Persona Levels"
                                                        type="multiselect"
                                                        options={personaLevelsOptions}
                                                        selectedValues={selectedPersonaLevelsFilters}
                                                        onSelectedValuesChange={setSelectedPersonaLevelsFilters}
                                                        {...emptyFilterProps('persona_levels')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Persona Category */}
                                        {!hiddenColumns.has('persona_category') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Persona Category</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'persona_category' ? null : 'persona_category'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(selectedPersonaCategories.length > 0 || searchPersonaCategory || hasEmptyFilter('persona_category')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'persona_category' && (
                                                    <ColumnFilterDropdown
                                                        column="Persona Category"
                                                        type="multiselect"
                                                        options={personaCategoryOptions}
                                                        selectedValues={selectedPersonaCategories}
                                                        onSelectedValuesChange={setSelectedPersonaCategories}
                                                        {...emptyFilterProps('persona_category')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* LinkedIn */}
                                        {!hiddenColumns.has('linkedin_url') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>LinkedIn</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'linkedin_url' ? null : 'linkedin_url'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(searchLinkedIn || hasEmptyFilter('linkedin_url')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'linkedin_url' && (
                                                    <ColumnFilterDropdown
                                                        column="LinkedIn"
                                                        type="text"
                                                        searchValue={searchLinkedIn}
                                                        onSearchChange={setSearchLinkedIn}
                                                        excludeSearch={excludeFilters["linkedin_url"] || false}
                                                        onExcludeSearchChange={(v) => setExcludeFilters(prev => ({ ...prev, ["linkedin_url"]: v }))}
                                                        {...emptyFilterProps('linkedin_url')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Customer Feedback */}
                                        {!hiddenColumns.has('customer_feedback') && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-48 relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>Customer Feedback</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'feedback' ? null : 'feedback'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(searchFeedback || hasFeedback || hasEmptyFilter('customer_feedback')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'feedback' && (
                                                    <ColumnFilterDropdown
                                                        column="Customer Feedback"
                                                        type="text"
                                                        searchValue={searchFeedback}
                                                        onSearchChange={setSearchFeedback}
                                                        excludeSearch={excludeFilters["customer_feedback"] || false}
                                                        onExcludeSearchChange={(v) => setExcludeFilters(prev => ({ ...prev, ["customer_feedback"]: v }))}
                                                        {...emptyFilterProps('customer_feedback')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                        position="right"
                                                    />
                                                )}
                                            </th>
                                        )}
                                        {/* Status */}
                                        <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Status</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'status' ? null : 'status'); }}
                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                >
                                                    <FaFilter className={`w-2.5 h-2.5 ${searchStatus ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'status' && (
                                                <ColumnFilterDropdown
                                                    column="Status"
                                                    type="singleselect"
                                                    statusValue={searchStatus}
                                                    onStatusChange={setSearchStatus}
                                                    statusOptions={[
                                                        { value: 'in_review', label: 'In Review' },
                                                        { value: 'accepted', label: 'Accepted' },
                                                        { value: 'declined', label: 'Declined' },
                                                    ]}
                                                    isOpen={true}
                                                    onClose={() => setOpenColumnFilter(null)}
                                                />
                                            )}
                                        </th>
                                        {/* Custom columns */}
                                        {customColumns.map(col => (
                                            <th key={col.id} className="px-2 py-1.5 text-left text-[10px] font-medium text-[#364570] uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>{col.name}</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === col.id ? null : col.id); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(customColumnFilters[col.id] || hasEmptyFilter(col.id)) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === col.id && (
                                                    <ColumnFilterDropdown
                                                        column={col.name}
                                                        type="text"
                                                        searchValue={customColumnFilters[col.id] || ''}
                                                        onSearchChange={(val: string) => setCustomColumnFilters(prev => ({ ...prev, [col.id]: val }))}
                                                        {...emptyFilterProps(col.id)}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                    />
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={99} className="py-12 text-center text-gray-400">No prospects in this list</td>
                                        </tr>
                                    ) : items.map((item, idx) => {
                                        const rowBg = item.item_status === 'declined'
                                            ? 'bg-red-100'
                                            : (item.row_color ? ROW_COLOR_STYLES[item.row_color] || '' : '');
                                        const isSelected = selectedItemIds.has(item.item_id);
                                        const isEditingFeedback = editingFeedbackId === item.item_id;

                                        return (
                                            <tr
                                                key={item.item_id}
                                                className={`${rowBg} ${isSelected ? 'bg-[#364570]/5 ring-1 ring-inset ring-[#364570]/30' : 'hover:bg-gray-50'} transition-colors cursor-pointer`}
                                                onClick={e => toggleRow(item.item_id, idx, e.shiftKey)}
                                            >
                                                <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleRow(item.item_id, idx, false)}
                                                        className="accent-[#364570]"
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    {item.row_color && (
                                                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${COLOR_OPTIONS.find(c => c.value === item.row_color)?.dot || ''}`} />
                                                    )}
                                                </td>
                                        {!hiddenColumns.has('first_name') && (
                                            <td className="px-2 py-1.5 font-medium text-gray-900 whitespace-nowrap max-w-48 overflow-hidden text-ellipsis">{item.first_name || '–'}</td>
                                        )}
                                        {!hiddenColumns.has('last_name') && (
                                            <td className="px-2 py-1.5 text-gray-600">{item.last_name || '–'}</td>
                                        )}
                                        {!hiddenColumns.has('job_title') && (
                                            <td className="px-2 py-1.5 text-gray-600">{item.job_title || '–'}</td>
                                        )}
                                        {!hiddenColumns.has('job_change') && (
                                            <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">
                                                {item.job_change ? new Date(item.job_change).toLocaleDateString('nl-NL') : '–'}
                                            </td>
                                        )}
                                        {!hiddenColumns.has('company_name') && (
                                            <td className="px-2 py-1.5 text-gray-600">{item.company_name || '–'}</td>
                                        )}
                                        {!hiddenColumns.has('company_website_url') && (
                                            <td className="px-2 py-1.5">
                                                {item.company_website_url ? (
                                                    <a href={item.company_website_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline truncate max-w-[180px] block">{item.company_website_url}</a>
                                                ) : '–'}
                                            </td>
                                        )}
                                        {!hiddenColumns.has('company_industry') && (
                                            <td className="px-2 py-1.5 text-gray-600">{item.company_industry || '–'}</td>
                                        )}
                                        {!hiddenColumns.has('company_size_range') && (
                                            <td className="px-2 py-1.5 text-gray-600">{item.company_size_range || '–'}</td>
                                        )}
                                        {!hiddenColumns.has('company_city') && (
                                            <td className="px-2 py-1.5 text-gray-600">{item.company_city || '–'}</td>
                                        )}
                                        {!hiddenColumns.has('company_country') && (
                                            <td className="px-2 py-1.5 text-gray-600">{item.company_country || '–'}</td>
                                        )}
                                        {!hiddenColumns.has('persona_level') && (
                                            <td className="px-2 py-1.5 text-gray-600">{item.persona_level || '–'}</td>
                                        )}
                                        {!hiddenColumns.has('persona_areas') && (
                                            <td className="px-2 py-1.5 text-gray-600">{item.persona_areas || '–'}</td>
                                        )}
                                        {!hiddenColumns.has('persona_levels') && (
                                            <td className="px-2 py-1.5 text-gray-600">{item.persona_levels || '–'}</td>
                                        )}
                                        {!hiddenColumns.has('persona_category') && (
                                            <td className="px-2 py-1.5 text-gray-600">{item.persona_category || '–'}</td>
                                        )}
                                        {!hiddenColumns.has('linkedin_url') && (
                                            <td className="px-2 py-1.5">
                                                {item.linkedin_url ? (
                                                    <a href={item.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline">Profile</a>
                                                ) : '–'}
                                            </td>
                                        )}
                                        {/* Customer Feedback – editable */}
                                        {!hiddenColumns.has('customer_feedback') && (
                                            <td className="px-2 py-1.5 min-w-48" onClick={e => e.stopPropagation()}>
                                                {isEditingFeedback ? (
                                                    <div className="flex items-center gap-1">
                                                        <textarea
                                                            value={feedbackDraft}
                                                            onChange={e => setFeedbackDraft(e.target.value)}
                                                            rows={2}
                                                            autoFocus
                                                            className="flex-1 text-xs border border-[#364570] rounded px-1.5 py-1 focus:outline-none resize-none"
                                                            onKeyDown={e => { if (e.key === 'Escape') setEditingFeedbackId(null); }}
                                                        />
                                                        <div className="flex flex-col gap-1">
                                                            <button
                                                                onClick={() => saveFeedback(item.item_id)}
                                                                disabled={feedbackSaving}
                                                                className="text-[10px] bg-[#364570] text-white px-1.5 py-0.5 rounded"
                                                            >
                                                                {feedbackSaving ? '…' : '✓'}
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingFeedbackId(null)}
                                                                className="text-[10px] border border-gray-300 text-gray-500 px-1.5 py-0.5 rounded"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => { setEditingFeedbackId(item.item_id); setFeedbackDraft(item.customer_feedback || ''); }}
                                                        className="cursor-text min-h-[24px] text-gray-700 hover:bg-white/60 rounded px-1 py-0.5 group"
                                                    >
                                                        {item.customer_feedback || (
                                                            <span className="text-gray-300 group-hover:text-gray-400">Click to add…</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        )}

                                        {/* Item status */}
                                        <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                                            <div className="relative">
                                                {(() => {
                                                    const opt = ITEM_STATUS_OPTIONS.find(o => o.value === item.item_status) ?? ITEM_STATUS_OPTIONS[0];
                                                    return (
                                                        <button
                                                            onClick={() => setStatusMenuOpenId(statusMenuOpenId === item.item_id ? null : item.item_id)}
                                                            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${opt.bg} ${opt.text} whitespace-nowrap`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })()}
                                                {statusMenuOpenId === item.item_id && (
                                                    <div className="absolute z-20 mt-1 left-0 bg-white border border-gray-200 rounded shadow-md min-w-[110px]">
                                                        {ITEM_STATUS_OPTIONS.map(opt => (
                                                            <button
                                                                key={String(opt.value)}
                                                                onClick={() => saveItemStatus(item.item_id, opt.value as any)}
                                                                disabled={statusSaving}
                                                                className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 ${opt.text}`}
                                                            >
                                                                <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Custom columns */}
                                        {customColumns.map(col => (
                                            <td key={col.id} className="px-2 py-1.5 text-gray-600">
                                                {(item.custom_values || {})[col.id] ?? '–'}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="mt-4">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={total}
                        itemsPerPage={pageSize}
                        onNext={() => handlePageChange(currentPage + 1)}
                        onPrev={() => handlePageChange(currentPage - 1)}
                    />
                </div>
            </>
        )}
            </div>

            {/* ── Modals ──────────────────────────────────────────────────── */}

            {/* Bulk Feedback Modal */}
            {showBulkFeedbackModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-3">Set Feedback for {selectedCount} item{selectedCount !== 1 ? 's' : ''}</h2>
                        <textarea
                            value={bulkFeedbackValue}
                            onChange={e => setBulkFeedbackValue(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570] resize-none mb-4"
                            placeholder="Enter feedback…"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowBulkFeedbackModal(false)} className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">Cancel</button>
                            <button onClick={handleBulkFeedback} disabled={bulkFeedbackSaving} className="px-4 py-2 text-sm bg-[#364570] text-white rounded-md hover:bg-[#2d3a5e] disabled:opacity-50 flex items-center gap-2">
                                {bulkFeedbackSaving && <ClipLoader size={12} color="#fff" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Custom Value Modal */}
            {showBulkValueModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-3">Set Column Value</h2>
                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Column</label>
                                <select
                                    value={bulkColumnId}
                                    onChange={e => setBulkColumnId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570]"
                                >
                                    <option value="">— Select column —</option>
                                    {customColumns.filter(c => isAdmin || c.customer_editable).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            {bulkColumnId && (() => {
                                const col = customColumns.find(c => c.id === bulkColumnId);
                                if (!col) return null;
                                return (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                                        {col.type === 'select' ? (
                                            <select value={bulkColumnValue} onChange={e => setBulkColumnValue(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570]">
                                                <option value="">—</option>
                                                {(col.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <input type="text" value={bulkColumnValue} onChange={e => setBulkColumnValue(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570]" />
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowBulkValueModal(false)} className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">Cancel</button>
                            <button onClick={handleBulkSetValue} disabled={bulkValueSaving || !bulkColumnId} className="px-4 py-2 text-sm bg-[#364570] text-white rounded-md hover:bg-[#2d3a5e] disabled:opacity-50 flex items-center gap-2">
                                {bulkValueSaving && <ClipLoader size={12} color="#fff" />}
                                Set
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Column Management Modal */}
            {showColumnModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[80vh] flex flex-col">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Manage Custom Columns</h2>
                        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                            {columnsDraft.map((col, i) => (
                                <div key={col.id} className="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={col.name}
                                            onChange={e => setColumnsDraft(prev => prev.map((c, ci) => ci === i ? { ...c, name: e.target.value } : c))}
                                            placeholder="Column name"
                                            className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#364570]"
                                        />
                                        <select
                                            value={col.type}
                                            onChange={e => setColumnsDraft(prev => prev.map((c, ci) => ci === i ? { ...c, type: e.target.value as any } : c))}
                                            className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#364570]"
                                        >
                                            <option value="text">Text</option>
                                            <option value="select">Select</option>
                                        </select>
                                        {col.type === 'select' && (
                                            <div className="col-span-2">
                                                <input
                                                    type="text"
                                                    value={(col.options || []).join(', ')}
                                                    onChange={e => setColumnsDraft(prev => prev.map((c, ci) => ci === i ? { ...c, options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) } : c))}
                                                    placeholder="Options (comma separated)"
                                                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#364570]"
                                                />
                                            </div>
                                        )}
                                        {isAdmin && (
                                            <label className="col-span-2 flex items-center gap-2 text-xs text-gray-600">
                                                <input
                                                    type="checkbox"
                                                    checked={col.customer_editable}
                                                    onChange={e => setColumnsDraft(prev => prev.map((c, ci) => ci === i ? { ...c, customer_editable: e.target.checked } : c))}
                                                    className="accent-[#364570]"
                                                />
                                                Customer can edit
                                            </label>
                                        )}
                                    </div>
                                    <button onClick={() => setColumnsDraft(prev => prev.filter((_, ci) => ci !== i))} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                        <FaTrash className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {columnsDraft.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-4">No custom columns yet</p>
                            )}
                        </div>
                        <div className="flex justify-between gap-2">
                            <button onClick={addNewColumn} className="px-3 py-2 text-xs border border-dashed border-gray-300 text-gray-500 rounded-md hover:bg-gray-50">+ Add Column</button>
                            <div className="flex gap-2">
                                <button onClick={() => setShowColumnModal(false)} className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">Cancel</button>
                                <button onClick={handleSaveColumns} disabled={columnsSaving} className="px-4 py-2 text-sm bg-[#364570] text-white rounded-md hover:bg-[#2d3a5e] disabled:opacity-50 flex items-center gap-2">
                                    {columnsSaving && <ClipLoader size={12} color="#fff" />}
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Meta Modal */}
            {showEditMetaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Edit List</h2>
                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                <input type="text" value={metaName} onChange={e => setMetaName(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570]" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                <textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570] resize-none" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowEditMetaModal(false)} className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">Cancel</button>
                            <button onClick={handleSaveMeta} disabled={metaSaving || !metaName.trim()} className="px-4 py-2 text-sm bg-[#364570] text-white rounded-md hover:bg-[#2d3a5e] disabled:opacity-50 flex items-center gap-2">
                                {metaSaving && <ClipLoader size={12} color="#fff" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete List Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-2">Delete List</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            This will permanently delete <strong>{listMeta?.name}</strong> and all its items. This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleteListLoading}
                                className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteList}
                                disabled={deleteListLoading}
                                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                            >
                                {deleteListLoading && <ClipLoader size={14} color="#fff" />}
                                {deleteListLoading ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
