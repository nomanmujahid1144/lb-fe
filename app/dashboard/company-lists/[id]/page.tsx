'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import { getCookie } from '@/lib/auth';
import { getBackendUrl } from '@/lib/api-config';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-hot-toast';
import { FaListUl, FaPencilAlt, FaFileDownload, FaFileUpload, FaColumns, FaTrash, FaPalette, FaTimes, FaComment, FaFilter, FaEye, FaUserPlus } from 'react-icons/fa';
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
    { key: 'company_id',        label: 'Company ID' },
    { key: 'name',              label: 'Name' },
    { key: 'industry',          label: 'Industry' },
    { key: 'country',           label: 'Country' },
    { key: 'size',              label: 'Size' },
    { key: 'business_type',     label: 'Business Type' },
    { key: 'blacklisted',       label: 'Blacklisted' },
    { key: 'added_at',          label: 'Added At' },
    { key: 'customer_feedback', label: 'Customer Feedback' },
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
    ai_prompt_id: number | null;
    ai_prompt_name: string | null;
    customer_id: number;
    customer_name: string | null;
}

interface ListItem {
    item_id: number;
    company_id: string;
    company_db_id: number;
    name: string;
    description: string | null;
    website_url: string | null;
    linkedin_url: string | null;
    city: string | null;
    size: number | null;
    size_range: string | null;
    industry_company: string | null;
    business_type: string | null;
    offering_type: string | null;
    country: string | null;
    provincie: string | null;
    blacklisted: boolean | null;
    customer_feedback_company: string | null;
    scraping_name: string | null;
    added_at: string;
    row_color: string | null;
    customer_feedback: string | null;
    custom_values: Record<string, any> | null;
    analysis_data: Record<string, any> | null;
    item_status: 'accepted' | 'declined' | null;
}

export default function ListDetailPage() {
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
    // field name (name / company_id / feedback / general_feedback). When set, that
    // text search is inverted (NOT LIKE).
    const [excludeFilters, setExcludeFilters] = useState<Record<string, boolean>>({});
    const [searchName, setSearchName] = useState('');
    const [searchCompanyId, setSearchCompanyId] = useState('');
    const [searchCountry, setSearchCountry] = useState('');
    const [searchIndustry, setSearchIndustry] = useState('');
    const [searchBusinessType, setSearchBusinessType] = useState('');
    const [selectedBlacklisted, setSelectedBlacklisted] = useState('');
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
    const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]);
    const [selectedSizeRanges, setSelectedSizeRanges] = useState<string[]>([]);
    const [industryOptions, setIndustryOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [countryOptions, setCountryOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [businessTypeOptions, setBusinessTypeOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [sizeRangeOptions, setSizeRangeOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [searchFeedback, setSearchFeedback] = useState('');
    const [searchGeneralFeedback, setSearchGeneralFeedback] = useState('');
    const [searchStatus, setSearchStatus] = useState('');
    const [addedFrom, setAddedFrom] = useState('');
    const [addedTo, setAddedTo] = useState('');
    const [minSize, setMinSize] = useState('');
    const [maxSize, setMaxSize] = useState('');

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

    // Column management modal (Admin)
    const [showColumnModal, setShowColumnModal] = useState(false);
    const [columnsDraft, setColumnsDraft] = useState<CustomColumn[]>([]);
    const [columnsSaving, setColumnsSaving] = useState(false);

    // Bulk custom value setter (Admin)
    const [showBulkValueModal, setShowBulkValueModal] = useState(false);
    const [bulkColumnId, setBulkColumnId] = useState('');
    const [bulkColumnValue, setBulkColumnValue] = useState('');
    const [bulkValueSaving, setBulkValueSaving] = useState(false);

    // Import feedback modal (Admin)
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importSaving, setImportSaving] = useState(false);

    // Edit list meta (Admin)
    const [showEditMetaModal, setShowEditMetaModal] = useState(false);
    const [metaName, setMetaName] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [metaSaving, setMetaSaving] = useState(false);

    const [exportLoading, setExportLoading] = useState(false);

    // Assign to customer (Admin)
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignLoading, setAssignLoading] = useState(false);

    // Delete list (Admin)
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteListLoading, setDeleteListLoading] = useState(false);

    // Column visibility
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(['company_id', 'business_type', 'blacklisted', 'added_at']));
    const [showColMenu, setShowColMenu] = useState(false);

    // Column header filter
    const [openColumnFilter, setOpenColumnFilter] = useState<string | null>(null);
    const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Custom column filters
    const [customColumnFilters, setCustomColumnFilters] = useState<Record<string, string>>({});
    const [aiAnalysisFilters, setAiAnalysisFilters] = useState<Record<string, string>>({});
    const [aiAnalysisExclude, setAiAnalysisExclude] = useState<Record<string, boolean>>({});
    const [aiAnalysisIncludeEmpty, setAiAnalysisIncludeEmpty] = useState<Record<string, boolean>>({});
    const [aiAnalysisNotEmpty, setAiAnalysisNotEmpty] = useState<Record<string, boolean>>({});
    const [aiFieldOptions, setAiFieldOptions] = useState<Record<string, { value: string; label: string }[]>>({});
    const [aiAnalysisMultiSelectFilters, setAiAnalysisMultiSelectFilters] = useState<Record<string, string[]>>({});

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
            const response = await fetch(`${backendUrl}/api/company-lists/${listId}/filter-options`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) return;
            const data = await response.json();
            const options = data.filterOptions || {};

            setIndustryOptions((options.industries || []).map((value: string) => ({ value, label: value })));
            setCountryOptions((options.countries || []).map((value: string) => ({ value, label: value })));
            setBusinessTypeOptions((options.businessTypes || []).map((value: string) => ({ value, label: value })));
            setSizeRangeOptions((options.sizeRanges || []).map((value: string) => ({ value, label: value })));
        } catch (error) {
            console.error('Failed to load company list filter options', error);
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

    // Close column filter dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.column-filter-dropdown')) setOpenColumnFilter(null);
        };
        if (openColumnFilter) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [openColumnFilter]);

    // Close column visibility menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.col-visibility-menu')) setShowColMenu(false);
        };
        if (showColMenu) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showColMenu]);

    // Close list status popover on outside click
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
        searchCompanyId: searchCompanyId || undefined,
        searchCountry: searchCountry || undefined,
        searchIndustry: searchIndustry || undefined,
        searchBusinessType: searchBusinessType || undefined,
        selectedIndustries: selectedIndustries.length > 0 ? selectedIndustries : undefined,
        selectedCountries: selectedCountries.length > 0 ? selectedCountries : undefined,
        selectedBusinessTypes: selectedBusinessTypes.length > 0 ? selectedBusinessTypes : undefined,
        selectedSizeRanges: selectedSizeRanges.length > 0 ? selectedSizeRanges : undefined,
        blacklistedFilter: selectedBlacklisted === 'true' ? 'yes' : selectedBlacklisted === 'false' ? 'no' : undefined,
        selectedColors: selectedColors.length > 0 ? selectedColors : undefined,
        searchFeedback: searchFeedback || undefined,
        searchGeneralFeedback: searchGeneralFeedback || undefined,
        searchStatus: searchStatus || undefined,
        addedFrom: addedFrom || undefined,
        addedTo: addedTo || undefined,
        minSize: minSize || undefined,
        maxSize: maxSize || undefined,
        customColumnFilters: Object.keys(customColumnFilters).length > 0 ? customColumnFilters : undefined,
        aiDataFilters: Object.keys(aiAnalysisFilters).length > 0 ? aiAnalysisFilters : undefined,
        aiDataExclude: Object.values(aiAnalysisExclude).some(Boolean) ? aiAnalysisExclude : undefined,
        aiDataIncludeEmpty: Object.keys(aiAnalysisIncludeEmpty).length > 0 ? aiAnalysisIncludeEmpty : undefined,
        aiDataNotEmpty: Object.keys(aiAnalysisNotEmpty).length > 0 ? aiAnalysisNotEmpty : undefined,
        aiDataMultiSelectFilters: Object.values(aiAnalysisMultiSelectFilters).some((v: string[]) => v.length > 0) ? aiAnalysisMultiSelectFilters : undefined,
        includeEmptyFilters: Object.values(emptyFilters).some(Boolean) ? emptyFilters : undefined,
        notEmptyFilters: Object.values(notEmptyFilters).some(Boolean) ? notEmptyFilters : undefined,
        excludeFilters: Object.values(excludeFilters).some(Boolean) ? excludeFilters : undefined,
    }), [searchName, searchCompanyId, searchCountry, searchIndustry, searchBusinessType, selectedIndustries, selectedCountries, selectedBusinessTypes, selectedSizeRanges, selectedBlacklisted, selectedColors, searchFeedback, searchGeneralFeedback, searchStatus, addedFrom, addedTo, minSize, maxSize, customColumnFilters, aiAnalysisFilters, aiAnalysisExclude, aiAnalysisIncludeEmpty, aiAnalysisNotEmpty, aiAnalysisMultiSelectFilters, emptyFilters, notEmptyFilters, excludeFilters]);

    const fetchData = useCallback(async (page: number, explicitFilters?: Record<string, any>) => {
        const token = getCookie('token');
        setLoading(true);
        try {
            const f = explicitFilters ?? buildCurrentFilters();
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    page,
                    pageSize,
                    ...f,
                }),
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
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/data`, {
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

    const isFiltersActive = !!searchName || !!searchCompanyId || !!searchCountry || !!searchIndustry || !!searchBusinessType || selectedIndustries.length > 0 || selectedCountries.length > 0 || selectedBusinessTypes.length > 0 || selectedSizeRanges.length > 0 || !!selectedBlacklisted || selectedColors.length > 0 || !!searchFeedback || !!searchGeneralFeedback || !!searchStatus || !!addedFrom || !!addedTo || !!minSize || !!maxSize || Object.values(customColumnFilters).some(v => !!v) || Object.values(aiAnalysisFilters).some(v => !!v) || Object.values(aiAnalysisIncludeEmpty).some(v => v) || Object.values(aiAnalysisNotEmpty).some(v => v) || Object.values(aiAnalysisMultiSelectFilters).some((v: string[]) => v.length > 0) || anyEmptyFiltersActive;

    const handleResetFilters = () => {
        setExcludeFilters({});
        setSearchName('');
        setSearchCompanyId('');
        setSearchCountry('');
        setSearchIndustry('');
        setSearchBusinessType('');
        setSelectedBlacklisted('');
        setSelectedColors([]);
        setSelectedIndustries([]);
        setSelectedCountries([]);
        setSelectedBusinessTypes([]);
        setSelectedSizeRanges([]);
        setSearchFeedback('');
        setSearchGeneralFeedback('');
        setSearchStatus('');
        setAddedFrom('');
        setAddedTo('');
        setMinSize('');
        setMaxSize('');
        setCustomColumnFilters({});
        setAiAnalysisFilters({});
        setAiAnalysisExclude({});
        setAiAnalysisIncludeEmpty({});
        setAiAnalysisNotEmpty({});
        setAiAnalysisMultiSelectFilters({});
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

    // ── Bulk color ────────────────────────────────────────────────────────────
    const getApiError = async (res: Response, fallback: string) => {
        try {
            const data = await res.json();
            if (res.status === 403) return data?.error?.message || 'Je hebt geen toegang voor deze actie';
            return data?.error?.message || fallback;
        } catch { return fallback; }
    };

    const handleBulkColor = async (color: string | null) => {
        const token = getCookie('token');
        setShowColorPicker(false);
        const ids = Array.from(selectedItemIds);
        if (ids.length === 0) return;
        try {
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/items/bulk-update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ item_ids: ids, row_color: color }),
            });
            if (!res.ok) throw new Error(await getApiError(res, 'Kon kleur niet bijwerken'));
            toast.success(`Color updated for ${ids.length} item${ids.length !== 1 ? 's' : ''}`);
            // Optimistic update
            setItems(prev => prev.map(item =>
                selectedItemIds.has(item.item_id) ? { ...item, row_color: color } : item
            ));
        } catch (err: any) {
            toast.error(err.message || 'Kon kleur niet bijwerken');
        }
    };

    // ── List status change ────────────────────────────────────────────────────
    const handleListStatusChange = async (status: string) => {
        setShowListStatusPicker(false);
        const prevStatus = listMeta?.status;
        if (listMeta) setListMeta(prev => prev ? { ...prev, status } : prev);
        const token = getCookie('token');
        const res = await fetch(`${backendUrl}/api/company-lists/${listId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) {
            toast.error('Could not update list status');
            if (listMeta) setListMeta(prev => prev ? { ...prev, status: prevStatus || 'in_review' } : prev);
        }
    };

    // ── Assign to customer ────────────────────────────────────────────────────
    const handleAssignToCustomer = async () => {
        setAssignLoading(true);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/assign-to-customer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.message || `Request failed: ${res.status}`);
            }
            const result = await res.json();
            const customerLabel = listMeta?.customer_name || 'customer';
            if (result.queued === 0) {
                toast.success(`All ${result.skipped} companies already assigned to ${customerLabel}`);
            } else {
                toast.success(`Queued ${result.queued} compan${result.queued !== 1 ? 'ies' : 'y'} for assignment to ${customerLabel}${result.skipped > 0 ? ` (${result.skipped} already assigned, skipped)` : ''}`);
            }
            setShowAssignModal(false);
        } catch (err: any) {
            toast.error(err.message || 'Failed to assign customer');
        } finally {
            setAssignLoading(false);
        }
    };

    // ── Bulk delete ───────────────────────────────────────────────────────────
    const handleBulkDelete = async () => {
        const ids = Array.from(selectedItemIds);
        if (ids.length === 0 || !confirm(`Remove ${ids.length} item${ids.length !== 1 ? 's' : ''} from this list?`)) return;
        setDeleteLoading(true);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/items/delete`, {
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
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/items/bulk-update`, {
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
    const handleBulkFeedback = async () => {        const ids = Array.from(selectedItemIds);
        setBulkFeedbackSaving(true);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/items/bulk-update`, {
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
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/items/${itemId}`, {
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
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/items/${itemId}`, {
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
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/columns`, {
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
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/items/bulk-update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ item_ids: ids, column_id: bulkColumnId, column_value: bulkColumnValue }),
            });
            if (!res.ok) throw new Error('Failed');
            toast.success(`Value set for ${ids.length} item${ids.length !== 1 ? 's' : ''}`);
            setShowBulkValueModal(false);
            setBulkColumnId(''); setBulkColumnValue('');
            // Optimistic
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
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/export`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `list_${listId}_export.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Export failed');
        } finally {
            setExportLoading(false);
        }
    };

    // ── Import feedback ───────────────────────────────────────────────────────
    const handleImportFeedback = async () => {
        if (!importFile) return;
        setImportSaving(true);
        const token = getCookie('token');
        try {
            const text = await importFile.text();
            const lines = text.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const cidIdx = headers.findIndex(h => h.toLowerCase() === 'company_id' || h.toLowerCase() === 'company id');
            const fbIdx = headers.findIndex(h => h.toLowerCase().includes('feedback'));
            if (cidIdx === -1 || fbIdx === -1) {
                toast.error('CSV must have "Company ID" and a feedback column');
                return;
            }
            const rows = lines.slice(1).map(line => {
                const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                return { company_id: cols[cidIdx], customer_feedback: cols[fbIdx] };
            }).filter(r => r.company_id);

            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/import-feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ rows }),
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            toast.success(`${data.data.updated} feedback value${data.data.updated !== 1 ? 's' : ''} imported`);
            setShowImportModal(false);
            setImportFile(null);
            fetchData(currentPage);
        } catch (err: any) {
            toast.error(err.message || 'Import failed');
        } finally {
            setImportSaving(false);
        }
    };

    // ── Meta edit ─────────────────────────────────────────────────────────────
    const handleSaveMeta = async () => {
        setMetaSaving(true);
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/meta`, {
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
            const res = await fetch(`${backendUrl}/api/company-lists/${listId}/delete`, {
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

    // ── Flatten analysis_data for display ─────────────────────────────────────
    const flattenObj = (obj: any, prefix = ''): Record<string, string> => {
        if (!obj || typeof obj !== 'object') return {};
        return Object.entries(obj).reduce((acc: Record<string, string>, [k, v]) => {
            const key = prefix ? `${prefix}.${k}` : k;
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                Object.assign(acc, flattenObj(v, key));
            } else {
                acc[key] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
            }
            return acc;
        }, {});
    };

    // Collect all analysis keys from current page for dynamic columns
    const analysisKeys = React.useMemo(() => {
        const keys = new Set<string>();
        items.forEach(item => {
            if (item.analysis_data) {
                Object.keys(flattenObj(item.analysis_data)).forEach(k => keys.add(k));
            }
        });
        return Array.from(keys).slice(0, 30); // Cap for performance
    }, [items]);

    // Fetch AI field multiselect options when the list has a prompt and analysis keys are known
    useEffect(() => {
        if (!listMeta?.ai_prompt_id || analysisKeys.length === 0 || !user) {
            setAiFieldOptions({});
            return;
        }
        const token = getCookie('token');
        if (!token) return;
        fetch(`${backendUrl}/api/company-lists/${listId}/ai-field-values`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ fields: analysisKeys }),
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data?.fields) return;
                const opts: Record<string, { value: string; label: string }[]> = {};
                for (const [field, meta] of Object.entries(data.fields as Record<string, any>)) {
                    if (meta && Array.isArray(meta.values)) {
                        opts[field] = meta.values.map((v: string) => ({ value: v, label: v }));
                    }
                }
                setAiFieldOptions(opts);
            })
            .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listMeta?.ai_prompt_id, analysisKeys.join(','), user, backendUrl, listId]);

    return (
        <div className="min-h-screen bg-gray-50">
            {user && <Navigation user={user} onLogout={handleLogout} currentPage={listMeta?.name || 'List'} pageIcon={FaListUl} />}

            <div className="px-3 sm:px-6 mt-4 sm:mt-6">
                {/* Header + toolbar card */}
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
                        {/* Title + meta */}
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
                                {listMeta?.ai_prompt_name && (
                                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">AI: {listMeta.ai_prompt_name}</span>
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

                        {/* Always-visible actions */}
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                            {/* Filter */}
                            <button
                                onClick={() => { setSelectedItemIds(new Set()); fetchData(1); }}
                                disabled={loading}
                                className="h-[30px] px-3 text-xs font-medium rounded-md bg-[#364570] text-white hover:bg-[#2a3654] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                {loading ? <ClipLoader size={12} color="#fff" /> : <FaFilter className="w-3 h-3" />}
                                Filter
                            </button>

                            {/* Reset */}
                            <button
                                onClick={handleResetFilters}
                                disabled={!isFiltersActive || loading}
                                title={isFiltersActive ? 'Reset Filters' : 'No active filters'}
                                className={`h-[30px] px-3 text-xs font-medium rounded-md border flex items-center justify-center gap-1.5 transition-colors ${
                                    isFiltersActive
                                        ? 'border-orange-400 text-orange-600 hover:bg-orange-50'
                                        : 'border-gray-200 text-gray-300 cursor-not-allowed'
                                }`}
                            >
                                <RiResetLeftFill className="w-3.5 h-3.5" />
                                Reset
                            </button>

                            {/* Export */}
                            <button
                                onClick={handleExport}
                                disabled={exportLoading || total === 0}
                                className="h-[30px] px-3 text-xs font-medium rounded-md border flex items-center justify-center gap-1.5 transition-colors border-gray-300 text-gray-600 hover:bg-gray-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                {exportLoading ? <ClipLoader size={12} color="#364570" /> : <FaFileDownload className="w-3.5 h-3.5" />}
                                {exportLoading ? 'Exporting…' : 'Export'}
                            </button>

                            {/* Column visibility toggle */}
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

                            {isAdmin && (
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="h-[30px] px-3 text-xs font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <FaFileUpload className="w-3.5 h-3.5" />
                                    Import Feedback
                                </button>
                            )}

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
                                    onClick={() => setShowAssignModal(true)}
                                    className="col-span-2 sm:col-span-1 h-[30px] px-3 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <FaUserPlus className="w-3.5 h-3.5" />
                                    Assign to Customer
                                </button>
                            )}
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
                                                    renderOption={opt => {
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
                                        {/* Company ID */}
                                        <th className={`px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative${hiddenColumns.has('company_id') ? ' hidden' : ''}`}>
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Company ID</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'companyId' ? null : 'companyId'); }}
                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                >
                                                    <FaFilter className={`w-2.5 h-2.5 ${(searchCompanyId || hasEmptyFilter('company_id')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'companyId' && (
                                                <ColumnFilterDropdown
                                                    column="Company ID"
                                                    type="text"
                                                    searchValue={searchCompanyId}
                                                    onSearchChange={setSearchCompanyId}
                                                    excludeSearch={excludeFilters["company_id"] || false}
                                                    onExcludeSearchChange={(v) => setExcludeFilters(prev => ({ ...prev, ["company_id"]: v }))}
                                                    {...emptyFilterProps('company_id')}
                                                    isOpen={true}
                                                    onClose={() => setOpenColumnFilter(null)}
                                                />
                                            )}
                                        </th>
                                        {/* Name */}
                                        <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Name</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'name' ? null : 'name'); }}
                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                >
                                                    <FaFilter className={`w-2.5 h-2.5 ${(searchName || hasEmptyFilter('name')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'name' && (
                                                <ColumnFilterDropdown
                                                    column="Name"
                                                    type="text"
                                                    searchValue={searchName}
                                                    onSearchChange={setSearchName}
                                                    excludeSearch={excludeFilters["name"] || false}
                                                    onExcludeSearchChange={(v) => setExcludeFilters(prev => ({ ...prev, ["name"]: v }))}
                                                    {...emptyFilterProps('name')}
                                                    isOpen={true}
                                                    onClose={() => setOpenColumnFilter(null)}
                                                />
                                            )}
                                        </th>
                                        {/* Industry */}
                                        <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Industry</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'industry' ? null : 'industry'); }}
                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                >
                                                    <FaFilter className={`w-2.5 h-2.5 ${(selectedIndustries.length > 0 || searchIndustry || hasEmptyFilter('industry')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'industry' && (
                                                <ColumnFilterDropdown
                                                    column="Industry"
                                                    type="multiselect"
                                                    options={industryOptions}
                                                    selectedValues={selectedIndustries}
                                                    onSelectedValuesChange={setSelectedIndustries}
                                                    {...emptyFilterProps('industry')}
                                                    isOpen={true}
                                                    onClose={() => setOpenColumnFilter(null)}
                                                />
                                            )}
                                        </th>
                                        {/* Country */}
                                        <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Country</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'country' ? null : 'country'); }}
                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                >
                                                    <FaFilter className={`w-2.5 h-2.5 ${(selectedCountries.length > 0 || searchCountry || hasEmptyFilter('country')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'country' && (
                                                <ColumnFilterDropdown
                                                    column="Country"
                                                    type="multiselect"
                                                    options={countryOptions}
                                                    selectedValues={selectedCountries}
                                                    onSelectedValuesChange={setSelectedCountries}
                                                    {...emptyFilterProps('country')}
                                                    isOpen={true}
                                                    onClose={() => setOpenColumnFilter(null)}
                                                />
                                            )}
                                        </th>
                                        {/* Size Range */}
                                        <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Size Range</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'size' ? null : 'size'); }}
                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                >
                                                    <FaFilter className={`w-2.5 h-2.5 ${(selectedSizeRanges.length > 0 || hasEmptyFilter('size_range')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'size' && (
                                                <ColumnFilterDropdown
                                                    column="Size Range"
                                                    type="multiselect"
                                                    options={sizeRangeOptions}
                                                    selectedValues={selectedSizeRanges}
                                                    onSelectedValuesChange={setSelectedSizeRanges}
                                                    {...emptyFilterProps('size_range')}
                                                    isOpen={true}
                                                    onClose={() => setOpenColumnFilter(null)}
                                                />
                                            )}
                                        </th>
                                        {/* Size Range / Business Type */}
                                        <th className={`px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative${hiddenColumns.has('business_type') ? ' hidden' : ''}`}>
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Business Type</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'businessType' ? null : 'businessType'); }}
                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                >
                                                    <FaFilter className={`w-2.5 h-2.5 ${(selectedBusinessTypes.length > 0 || searchBusinessType || hasEmptyFilter('business_type')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'businessType' && (
                                                <ColumnFilterDropdown
                                                    column="Business Type"
                                                    type="multiselect"
                                                    options={businessTypeOptions}
                                                    selectedValues={selectedBusinessTypes}
                                                    onSelectedValuesChange={setSelectedBusinessTypes}
                                                    {...emptyFilterProps('business_type')}
                                                    isOpen={true}
                                                    onClose={() => setOpenColumnFilter(null)}
                                                />
                                            )}
                                        </th>
                                        {/* Blacklisted */}
                                        <th className={`px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative${hiddenColumns.has('blacklisted') ? ' hidden' : ''}`}>
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Blacklisted</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'blacklisted' ? null : 'blacklisted'); }}
                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                >
                                                    <FaFilter className={`w-2.5 h-2.5 ${selectedBlacklisted ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'blacklisted' && (
                                                <ColumnFilterDropdown
                                                    column="Blacklisted"
                                                    type="boolean"
                                                    booleanValue={selectedBlacklisted}
                                                    onBooleanChange={setSelectedBlacklisted}
                                                    isOpen={true}
                                                    onClose={() => setOpenColumnFilter(null)}
                                                />
                                            )}
                                        </th>
                                        <th className={`px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative${hiddenColumns.has('added_at') ? ' hidden' : ''}`}>
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Added At</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'addedAt' ? null : 'addedAt'); }}
                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                >
                                                    <FaFilter className={`w-2.5 h-2.5 ${(addedFrom || addedTo || hasEmptyFilter('added_at')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'addedAt' && (
                                                <ColumnFilterDropdown
                                                    column="Added At"
                                                    type="daterange"
                                                    dateFromValue={addedFrom}
                                                    dateToValue={addedTo}
                                                    onDateFromChange={setAddedFrom}
                                                    onDateToChange={setAddedTo}
                                                    {...emptyFilterProps('added_at')}
                                                    isOpen={true}
                                                    onClose={() => setOpenColumnFilter(null)}
                                                />
                                            )}
                                        </th>
                                        {/* Customer Feedback */}
                                        <th className={`px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-48 relative${hiddenColumns.has('customer_feedback') ? ' hidden' : ''}`}>
                                            <div className="flex items-center justify-between gap-1">
                                                <span>Customer Feedback</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'feedback' ? null : 'feedback'); }}
                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                >
                                                    <FaFilter className={`w-2.5 h-2.5 ${(searchFeedback || hasEmptyFilter('customer_feedback')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'feedback' && (
                                                <ColumnFilterDropdown
                                                    column="Customer Feedback"
                                                    type="text"
                                                    searchValue={searchFeedback}
                                                    onSearchChange={setSearchFeedback}
                                                    excludeSearch={excludeFilters["feedback"] || false}
                                                    onExcludeSearchChange={(v) => setExcludeFilters(prev => ({ ...prev, ["feedback"]: v }))}
                                                    {...emptyFilterProps('customer_feedback')}
                                                    isOpen={true}
                                                    onClose={() => setOpenColumnFilter(null)}
                                                    position="right"
                                                />
                                            )}
                                        </th>
                                        {isAdmin && (
                                            <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap relative">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span>General Feedback</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'generalFeedback' ? null : 'generalFeedback'); }}
                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                    >
                                                        <FaFilter className={`w-2.5 h-2.5 ${(searchGeneralFeedback || hasEmptyFilter('general_feedback')) ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    </button>
                                                </div>
                                                {openColumnFilter === 'generalFeedback' && (
                                                    <ColumnFilterDropdown
                                                        column="General Feedback"
                                                        type="text"
                                                        searchValue={searchGeneralFeedback}
                                                        onSearchChange={setSearchGeneralFeedback}
                                                        excludeSearch={excludeFilters["general_feedback"] || false}
                                                        onExcludeSearchChange={(v) => setExcludeFilters(prev => ({ ...prev, ["general_feedback"]: v }))}
                                                        {...emptyFilterProps('general_feedback')}
                                                        isOpen={true}
                                                        onClose={() => setOpenColumnFilter(null)}
                                                        position="right"
                                                    />
                                                )}
                                            </th>
                                        )}
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
                                        {/* AI analysis columns */}
                                        {listMeta?.ai_prompt_id && analysisKeys.map(key => {
                                            const hasMultiSelect = !!aiFieldOptions[key];
                                            const isActive = (hasMultiSelect && (aiAnalysisMultiSelectFilters[key] || []).length > 0) ||
                                                !!aiAnalysisFilters[key] || !!aiAnalysisIncludeEmpty[key] || !!aiAnalysisNotEmpty[key] || !!aiAnalysisExclude[key];
                                            return (
                                                <th key={key} className="px-2 py-1.5 text-left text-[10px] font-medium text-purple-600 uppercase tracking-wider whitespace-nowrap relative">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span>{key}</span>
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === key ? null : key); }}
                                                            className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                        >
                                                            <FaFilter className={`w-2.5 h-2.5 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
                                                        </button>
                                                    </div>
                                                    {openColumnFilter === key && (
                                                        hasMultiSelect ? (
                                                            <ColumnFilterDropdown
                                                                column={key}
                                                                type="multiselect"
                                                                options={aiFieldOptions[key]}
                                                                selectedValues={aiAnalysisMultiSelectFilters[key] || []}
                                                                onSelectedValuesChange={vals => setAiAnalysisMultiSelectFilters(prev => ({ ...prev, [key]: vals }))}
                                                                searchValue={aiAnalysisFilters[key] || ''}
                                                                onSearchChange={value => setAiAnalysisFilters(prev => ({ ...prev, [key]: value }))}
                                                                excludeSearch={aiAnalysisExclude[key] || false}
                                                                onExcludeSearchChange={value => setAiAnalysisExclude(prev => ({ ...prev, [key]: value }))}
                                                                isOpen={true}
                                                                onClose={() => setOpenColumnFilter(null)}
                                                            />
                                                        ) : (
                                                            <ColumnFilterDropdown
                                                                column={key}
                                                                type="text"
                                                                searchValue={aiAnalysisFilters[key] || ''}
                                                                onSearchChange={value => setAiAnalysisFilters(prev => ({ ...prev, [key]: value }))}
                                                                excludeSearch={aiAnalysisExclude[key] || false}
                                                                onExcludeSearchChange={value => setAiAnalysisExclude(prev => ({ ...prev, [key]: value }))}
                                                                includeEmpty={aiAnalysisIncludeEmpty[key] || false}
                                                                onIncludeEmptyChange={value => setAiAnalysisIncludeEmpty(prev => ({ ...prev, [key]: value }))}
                                                                notEmpty={aiAnalysisNotEmpty[key] || false}
                                                                onNotEmptyChange={value => setAiAnalysisNotEmpty(prev => ({ ...prev, [key]: value }))}
                                                                isOpen={true}
                                                                onClose={() => setOpenColumnFilter(null)}
                                                            />
                                                        )
                                                    )}
                                                </th>
                                            );
                                        })}
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
                                                        onSearchChange={val => setCustomColumnFilters(prev => ({ ...prev, [col.id]: val }))}
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
                                            <td colSpan={99} className="py-12 text-center text-gray-400">No companies in this list</td>
                                        </tr>
                                    ) : items.map((item, idx) => {
                                        const rowBg = item.item_status === 'declined'
                                            ? 'bg-red-100'
                                            : (item.row_color ? ROW_COLOR_STYLES[item.row_color] || '' : '');
                                        const isSelected = selectedItemIds.has(item.item_id);
                                        const flatAnalysis = item.analysis_data ? flattenObj(item.analysis_data) : {};
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
                                                <td className={`px-2 py-1.5 text-gray-500${hiddenColumns.has('company_id') ? ' hidden' : ''}`}>{item.company_id}</td>
                                                <td className="px-2 py-1.5 font-medium text-gray-900 whitespace-nowrap max-w-48 overflow-hidden text-ellipsis">{item.name}</td>
                                                <td className="px-2 py-1.5 text-gray-600">{item.industry_company || '–'}</td>
                                                <td className="px-2 py-1.5 text-gray-600">{item.country || '–'}</td>
                                                <td className="px-2 py-1.5 text-gray-600">{item.size ?? '–'}</td>
                                                <td className={`px-2 py-1.5 text-gray-600${hiddenColumns.has('business_type') ? ' hidden' : ''}`}>{item.business_type || '–'}</td>
                                                <td className={`px-2 py-1.5${hiddenColumns.has('blacklisted') ? ' hidden' : ''}`}>
                                                    {item.blacklisted && (
                                                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Yes</span>
                                                    )}
                                                </td>
                                                <td className={`px-2 py-1.5 text-gray-500 whitespace-nowrap${hiddenColumns.has('added_at') ? ' hidden' : ''}`}>
                                                    {item.added_at ? new Date(item.added_at).toLocaleDateString('nl-NL') : '–'}
                                                </td>

                                                {/* Customer Feedback – editable */}
                                                <td className={`px-2 py-1.5 min-w-48${hiddenColumns.has('customer_feedback') ? ' hidden' : ''}`} onClick={e => e.stopPropagation()}>
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

                                                {/* General feedback (read-only, admin only) */}
                                                {isAdmin && (
                                                    <td className="px-2 py-1.5 text-gray-500 max-w-40 overflow-hidden text-ellipsis whitespace-nowrap">
                                                        {item.customer_feedback_company || '–'}
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

                                                {/* AI analysis columns */}
                                                {listMeta?.ai_prompt_id && analysisKeys.map(key => (
                                                    <td key={key} className="px-2 py-1.5 text-purple-800 max-w-40 overflow-hidden text-ellipsis whitespace-nowrap">
                                                        {flatAnalysis[key] || '–'}
                                                    </td>
                                                ))}

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

            {/* ── Bulk feedback modal ─────────────────────────────────────────────── */}
            {showBulkFeedbackModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-2">Set Feedback</h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Apply feedback to <span className="font-semibold">{selectedCount}</span> selected item{selectedCount !== 1 ? 's' : ''}.
                        </p>
                        <textarea
                            value={bulkFeedbackValue}
                            onChange={e => setBulkFeedbackValue(e.target.value)}
                            rows={4}
                            autoFocus
                            placeholder="Enter feedback…"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#364570] resize-none mb-5"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowBulkFeedbackModal(false)}
                                disabled={bulkFeedbackSaving}
                                className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkFeedback}
                                disabled={bulkFeedbackSaving}
                                className="px-4 py-2 text-sm font-medium bg-[#364570] text-white rounded-md hover:bg-[#2d3a5e] disabled:opacity-50 flex items-center gap-2"
                            >
                                {bulkFeedbackSaving && <ClipLoader size={14} color="#fff" />}
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Column management modal ─────────────────────────────────────────── */}
            {showColumnModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Manage Custom Columns</h2>
                        <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                            {columnsDraft.map((col, idx) => (
                                <div key={col.id} className="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
                                    <input
                                        type="text"
                                        value={col.name}
                                        onChange={e => setColumnsDraft(prev => prev.map((c, i) => i === idx ? { ...c, name: e.target.value } : c))}
                                        placeholder="Column name"
                                        className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none"
                                    />
                                    <select
                                        value={col.type}
                                        onChange={e => setColumnsDraft(prev => prev.map((c, i) => i === idx ? { ...c, type: e.target.value as 'text' | 'select' } : c))}
                                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none"
                                    >
                                        <option value="text">Text</option>
                                        <option value="select">Select</option>
                                    </select>
                                    {col.type === 'select' && (
                                        <input
                                            type="text"
                                            value={(col.options || []).join(',')}
                                            onChange={e => setColumnsDraft(prev => prev.map((c, i) => i === idx ? { ...c, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : c))}
                                            placeholder="Option1,Option2"
                                            className="w-32 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none"
                                        />
                                    )}
                                    <button
                                        onClick={() => setColumnsDraft(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-red-400 hover:text-red-600 text-lg leading-none"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addNewColumn}
                            className="text-xs text-[#364570] hover:underline mb-4 flex items-center gap-1"
                        >
                            + Add column
                        </button>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowColumnModal(false)} disabled={columnsSaving} className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                            <button onClick={handleSaveColumns} disabled={columnsSaving} className="px-4 py-2 text-sm font-medium bg-[#364570] text-white rounded-md hover:bg-[#2d3a5e] disabled:opacity-50 flex items-center gap-2">
                                {columnsSaving && <ClipLoader size={14} color="#fff" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bulk set custom value modal ─────────────────────────────────────── */}
            {showBulkValueModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Set Column Value</h2>
                        <p className="text-xs text-gray-500 mb-3">Set a value for <span className="font-semibold">{selectedCount}</span> selected item{selectedCount !== 1 ? 's' : ''}.</p>
                        <div className="space-y-3 mb-5">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Column</label>
                                <select
                                    value={bulkColumnId}
                                    onChange={e => setBulkColumnId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
                                >
                                    {customColumns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                                {customColumns.find(c => c.id === bulkColumnId)?.type === 'select' ? (
                                    <select
                                        value={bulkColumnValue}
                                        onChange={e => setBulkColumnValue(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
                                    >
                                        <option value="">— Select —</option>
                                        {(customColumns.find(c => c.id === bulkColumnId)?.options || []).map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={bulkColumnValue}
                                        onChange={e => setBulkColumnValue(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
                                        placeholder="Enter value…"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowBulkValueModal(false)} disabled={bulkValueSaving} className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                            <button onClick={handleBulkSetValue} disabled={bulkValueSaving || !bulkColumnId} className="px-4 py-2 text-sm font-medium bg-[#364570] text-white rounded-md hover:bg-[#2d3a5e] disabled:opacity-50 flex items-center gap-2">
                                {bulkValueSaving && <ClipLoader size={14} color="#fff" />}
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Import feedback modal ────────────────────────────────────────────── */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-2">Import Feedback</h2>
                        <p className="text-xs text-gray-500 mb-4">Upload a CSV file with columns: <code className="bg-gray-100 px-1 rounded">Company ID</code> and a column containing "feedback" in its name. Values are matched by Company ID.</p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={e => setImportFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-gray-600 mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => { setShowImportModal(false); setImportFile(null); }} disabled={importSaving} className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                            <button onClick={handleImportFeedback} disabled={importSaving || !importFile} className="px-4 py-2 text-sm font-medium bg-[#364570] text-white rounded-md hover:bg-[#2d3a5e] disabled:opacity-50 flex items-center gap-2">
                                {importSaving && <ClipLoader size={14} color="#fff" />}
                                Import
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit meta modal ──────────────────────────────────────────────────── */}
            {showEditMetaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Edit List</h2>
                        <div className="space-y-3 mb-5">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                <input type="text" value={metaName} onChange={e => setMetaName(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                <textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none resize-none" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowEditMetaModal(false)} disabled={metaSaving} className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                            <button onClick={handleSaveMeta} disabled={metaSaving || !metaName.trim()} className="px-4 py-2 text-sm font-medium bg-[#364570] text-white rounded-md hover:bg-[#2d3a5e] disabled:opacity-50 flex items-center gap-2">
                                {metaSaving && <ClipLoader size={14} color="#fff" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Assign to customer modal ─────────────────────────────────────────── */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-1">Assign to Customer</h2>
                        <p className="text-sm text-gray-600 mb-5">
                            Assign all companies in this list to{' '}
                            <span className="font-semibold text-gray-900">{listMeta?.customer_name}</span>?
                            <br />
                            <span className="text-xs text-gray-400 mt-1 block">Companies already assigned to this customer are skipped automatically.</span>
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                disabled={assignLoading}
                                className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignToCustomer}
                                disabled={assignLoading}
                                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {assignLoading && <ClipLoader size={14} color="#fff" />}
                                {assignLoading ? 'Assigning…' : 'Assign'}
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
