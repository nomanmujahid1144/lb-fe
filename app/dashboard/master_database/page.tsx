'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FaDatabase, FaFilter, FaEdit, FaUserPlus, FaTimes, FaTags, FaSync, FaPaperPlane, FaSlidersH, FaListUl, FaTrash, FaExchangeAlt } from 'react-icons/fa';
import { GiBrain } from 'react-icons/gi';
import { FaPersonCircleQuestion } from 'react-icons/fa6';
import { MdCancel, MdTimer, MdOutlineConnectWithoutContact } from 'react-icons/md';
import { TbCancel, TbMessageDown } from 'react-icons/tb';
import { IoCheckmarkDoneSharp } from 'react-icons/io5';
import { FcAlarmClock } from 'react-icons/fc';
import { RiResetLeftFill } from 'react-icons/ri';
import { BsEye, BsChevronDown } from 'react-icons/bs';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-hot-toast';
import Navigation from '@/components/layout/Navigation';
import { safeLocalStorage } from '@/lib/storage';
import { getBackendUrl } from '@/lib/api-config';
import { getCookie } from '@/lib/auth';
import Pagination from '@/components/layout/Pagination';
import EditRowModal, { TabType as EditTabType } from '@/components/EditRowModal';
import BulkEditModal from '@/components/BulkEditModal';
import MultiSelect from '@/components/MultiSelect';
import ColumnFilterDropdown from '@/components/table/ColumnFilterDropdown';
import ResizableHeader from '@/components/table/ResizableHeader';
import SortIndicator from '@/components/table/SortIndicator';
import CreateCampaignModal from '@/components/CreateCampaignModal';
import AddToListModal from '@/components/AddToListModal';
import AddToProspectListModal from '@/components/AddToProspectListModal';

interface User {
    id: number;
    username: string;
    email: string;
    customers: any[];
    uuid: string;
    type: string;
}

// sessionStorage key for restoring the filtered view when the user returns
// from the AI Analysis page ("Back to Master Database").
const MASTER_DB_RETURN_STATE_KEY = 'masterDbReturnState';

export default function MasterDatabasePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [customers, setCustomers] = useState<Array<{ value: string; label: string }>>([]);
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
    const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'companies' | 'prospects' | 'unassigned_prospects' | 'campaigns' | 'blacklist' | 'ai_analysis' | 'exports' | 'actions' | 'audit_receiver_search'>('companies');
    const hasInitialFetch = React.useRef(false);

    // Scroll container refs for preserving horizontal scroll position across data refreshes
    const companiesScrollRef = React.useRef<HTMLDivElement>(null);
    const prospectsScrollRef = React.useRef<HTMLDivElement>(null);
    const unassignedProspectsScrollRef = React.useRef<HTMLDivElement>(null);
    const campaignsScrollRef = React.useRef<HTMLDivElement>(null);
    const blacklistScrollRef = React.useRef<HTMLDivElement>(null);
    const aiAnalysisScrollRef = React.useRef<HTMLDivElement>(null);
    // Maps analysis record ID → company DB ID so the Add-to-List modal gets all
    // selected company IDs even when "select all matching records" was used and
    // only the current page rows are in aiAnalysisData.
    const aiAnalysisIdToCompanyIdRef = React.useRef<Map<number, number>>(new Map());
    
    // Status display mapping
    const statusDisplayMap: Record<string, string> = {
        'Awaiting reply': 'Chatter Task'
    };

    // Function to get status icon and styling
    const getStatusDisplay = (status: string) => {
        const displayName = statusDisplayMap[status] || status;
        switch (status) {
            case 'Revoked':
                return {
                    icon: <MdCancel className="w-6 h-6" />,
                    bgColor: 'bg-red-100',
                    textColor: 'text-red-800',
                    displayName
                };
            case 'First follow-up sent':
                return {
                    icon: <span className="font-bold text-xl text-gray-600">1</span>,
                    bgColor: 'bg-blue-100',
                    textColor: 'text-blue-800',
                    displayName
                };
            case 'Second follow-up sent':
                return {
                    icon: <span className="font-bold text-xl text-gray-600">2</span>,
                    bgColor: 'bg-blue-100',
                    textColor: 'text-blue-800',
                    displayName
                };
            case 'Third follow-up sent':
                return {
                    icon: <span className="font-bold text-xl text-gray-600">3</span>,
                    bgColor: 'bg-blue-100',
                    textColor: 'text-blue-800',
                    displayName
                };
            case 'Fourth follow-up sent':
                return {
                    icon: <span className="font-bold text-xl text-gray-600">4</span>,
                    bgColor: 'bg-blue-100',
                    textColor: 'text-blue-800',
                    displayName
                };
            case 'First messenger follow-up sent':
                return {
                    icon: <span className="font-bold text-xl text-green-600">M1</span>,
                    bgColor: 'bg-green-100',
                    textColor: 'text-green-800',
                    displayName
                };
            case 'Second messenger follow-up sent':
                return {
                    icon: <span className="font-bold text-xl text-green-600">M2</span>,
                    bgColor: 'bg-green-100',
                    textColor: 'text-green-800',
                    displayName
                };
            case 'Third messenger follow-up sent':
                return {
                    icon: <span className="font-bold text-xl text-green-600">M3</span>,
                    bgColor: 'bg-green-100',
                    textColor: 'text-green-800',
                    displayName
                };
            case 'Fourth messenger follow-up sent':
                return {
                    icon: <span className="font-bold text-xl text-green-600">M4</span>,
                    bgColor: 'bg-green-100',
                    textColor: 'text-green-800',
                    displayName
                };
            case 'Bounced':
                return {
                    icon: <TbCancel className="w-6 h-6" />,
                    bgColor: 'bg-orange-100',
                    textColor: 'text-orange-800',
                    displayName
                };
            case 'Connection requested':
                return {
                    icon: <MdTimer className="w-6 h-6" />,
                    bgColor: 'bg-yellow-100',
                    textColor: 'text-yellow-800',
                    displayName
                };
            case 'Connected':
                return {
                    icon: <MdOutlineConnectWithoutContact className="w-6 h-6" />,
                    bgColor: 'bg-green-100',
                    textColor: 'text-green-800',
                    displayName
                };
            case 'Messenger sent':
                return {
                    icon: <TbMessageDown className="w-6 h-6" />,
                    bgColor: 'bg-purple-100',
                    textColor: 'text-purple-800',
                    displayName
                };
            case 'Completed':
                return {
                    icon: <IoCheckmarkDoneSharp className="w-6 h-6" />,
                    bgColor: 'bg-emerald-100',
                    textColor: 'text-emerald-800',
                    displayName
                };
            case 'Check':
                return {
                    icon: <FaPersonCircleQuestion className="w-6 h-6" />,
                    bgColor: 'bg-indigo-100',
                    textColor: 'text-indigo-800',
                    displayName
                };
            case 'Checked':
                return {
                    icon: <IoCheckmarkDoneSharp className="w-6 h-6" />,
                    bgColor: 'bg-green-100',
                    textColor: 'text-green-800',
                    displayName
                };
            case 'Awaiting reply':
                return {
                    icon: <FcAlarmClock className="w-6 h-6" />,
                    bgColor: 'bg-yellow-100',
                    textColor: 'text-yellow-800',
                    displayName
                };
            default:
                return {
                    icon: null,
                    bgColor: 'bg-gray-100',
                    textColor: 'text-gray-800',
                    displayName
                };
        }
    };
    
    // Data states for each tab
    const [companiesData, setCompaniesData] = useState<any[]>([]);
    const [prospectsData, setProspectsData] = useState<any[]>([]);
    const [unassignedProspectsData, setUnassignedProspectsData] = useState<any[]>([]);
    const [campaignsData, setCampaignsData] = useState<any[]>([]);
    const [blacklistData, setBlacklistData] = useState<any[]>([]);
    const [aiAnalysisData, setAiAnalysisData] = useState<any[]>([]);
    
    // Total count states for each tab
    const [companiesTotal, setCompaniesTotal] = useState(0);
    const [prospectsTotal, setProspectsTotal] = useState(0);
    const [unassignedProspectsTotal, setUnassignedProspectsTotal] = useState(0);
    const [campaignsTotal, setCampaignsTotal] = useState(0);
    const [blacklistTotal, setBlacklistTotal] = useState(0);
    const [aiAnalysisTotal, setAiAnalysisTotal] = useState(0);
    
    // Loading and pagination states
    const [dataLoading, setDataLoading] = useState(false);
    const [isCountLoading, setIsCountLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [adminLookupSource, setAdminLookupSource] = useState<'audit-log' | 'data-receiver'>('audit-log');
    const [adminLookupQuery, setAdminLookupQuery] = useState('');
    const [adminLookupProfileId, setAdminLookupProfileId] = useState('');
    const [adminLookupResults, setAdminLookupResults] = useState<any[]>([]);
    const [adminLookupLoading, setAdminLookupLoading] = useState(false);
    const [adminLookupError, setAdminLookupError] = useState<string | null>(null);
    const pageSize = 100;

    // Per-tab pagination tracking (persists across tab switches)
    const tabPagination = React.useRef<Record<string, { currentPage: number; totalPages: number }>>({
        companies: { currentPage: 1, totalPages: 1 },
        prospects: { currentPage: 1, totalPages: 1 },
        unassigned_prospects: { currentPage: 1, totalPages: 1 },
        campaigns: { currentPage: 1, totalPages: 1 },
        blacklist: { currentPage: 1, totalPages: 1 },
        ai_analysis: { currentPage: 1, totalPages: 1 },
        audit_receiver_search: { currentPage: 1, totalPages: 1 },
    });

    // Tracks whether a page change was triggered by user pagination (prev/next) vs programmatic reset
    const paginationUserAction = React.useRef(false);
    
    // Filter states for Companies tab
    // Per-column "Exclude" toggles for text search filters. Keyed by the field
    // suffix that matches each searchX state (e.g. 'Name' for searchName), so the
    // backend receives excludeName / excludeProspectFirstName / etc.
    const [excludeFlags, setExcludeFlags] = useState<Record<string, boolean>>({});
    const buildExcludeFilters = () =>
        Object.fromEntries(
            Object.entries(excludeFlags)
                .filter(([, v]) => v)
                .map(([k]) => ['exclude' + k, true])
        );
    // Per-AI-field "Exclude" toggles for the AI analysis tab (keyed by field path).
    const [aiExclude, setAiExclude] = useState<Record<string, boolean>>({});
    const [searchCompanyId, setSearchCompanyId] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchDescription, setSearchDescription] = useState('');
    const [searchWebsite, setSearchWebsite] = useState('');
    const [searchLinkedIn, setSearchLinkedIn] = useState('');
    const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
    const [includeEmptyIndustry, setIncludeEmptyIndustry] = useState(false);
    const [notEmptyIndustry, setNotEmptyIndustry] = useState(false);
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
    const [includeEmptyCountry, setIncludeEmptyCountry] = useState(false);
    const [notEmptyCountry, setNotEmptyCountry] = useState(false);
    const [selectedProvincies, setSelectedProvincies] = useState<string[]>([]);
    const [includeEmptyProvincie, setIncludeEmptyProvincie] = useState(false);
    const [notEmptyProvincie, setNotEmptyProvincie] = useState(false);
    const [selectedSizeRanges, setSelectedSizeRanges] = useState<string[]>([]);
    const [includeEmptySizeRange, setIncludeEmptySizeRange] = useState(false);
    const [notEmptySizeRange, setNotEmptySizeRange] = useState(false);
    const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]);
    const [includeEmptyBusinessType, setIncludeEmptyBusinessType] = useState(false);
    const [notEmptyBusinessType, setNotEmptyBusinessType] = useState(false);
    const [selectedOfferingTypes, setSelectedOfferingTypes] = useState<string[]>([]);
    const [includeEmptyOfferingType, setIncludeEmptyOfferingType] = useState(false);
    const [notEmptyOfferingType, setNotEmptyOfferingType] = useState(false);
    const [hasWebsiteFilter, setHasWebsiteFilter] = useState<string>(''); // '' | 'true' | 'false'
    const [selectedCompanyPrompts, setSelectedCompanyPrompts] = useState<string[]>([]);
    const [excludeCompanyPrompt, setExcludeCompanyPrompt] = useState(false);
    const [selectedScrapingNames, setSelectedScrapingNames] = useState<string[]>([]);
    const [includeEmptyScrapingName, setIncludeEmptyScrapingName] = useState(false);
    const [notEmptyScrapingName, setNotEmptyScrapingName] = useState(false);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [minSize, setMinSize] = useState('');
    const [maxSize, setMaxSize] = useState('');
    const [blacklistedFilter, setBlacklistedFilter] = useState<string>(''); // '' | 'true' | 'false'
    const [websiteScrapeFilter, setWebsiteScrapeFilter] = useState<string>(''); // '' | 'true' | 'false'
    // In Campaigns (company) filter: how many people of the company already sit in Connector campaigns
    const [companiesInCampaignBasis, setCompaniesInCampaignBasis] = useState('total');
    const [companiesInCampaignMin, setCompaniesInCampaignMin] = useState('');
    const [companiesInCampaignMax, setCompaniesInCampaignMax] = useState('');
    const [createdAtFrom, setCreatedAtFrom] = useState('');
    const [createdAtTo, setCreatedAtTo] = useState('');
    const [includeEmptyCreatedAt, setIncludeEmptyCreatedAt] = useState(false);
    const [notEmptyCreatedAt, setNotEmptyCreatedAt] = useState(false);

    // Company list filter
    const [selectedListId, setSelectedListId] = useState('');
    const [selectedListStatus, setSelectedListStatus] = useState('');
    const [companyLists, setCompanyLists] = useState<Array<{ id: number; name: string }>>([]); 
     
    // Prospect list filter (for prospects in campaigns)
    const [selectedProspectListId, setSelectedProspectListId] = useState('');
    const [selectedProspectListStatus, setSelectedProspectListStatus] = useState('');

    // Company list filter (for prospects in campaigns) — filters on the company linked to the prospect
    const [selectedProspectCompanyListId, setSelectedProspectCompanyListId] = useState('');
    const [selectedProspectCompanyListStatus, setSelectedProspectCompanyListStatus] = useState('');

    // Prospect list filter (for unassigned prospects)
    const [selectedUnassignedListId, setSelectedUnassignedListId] = useState('');
    const [selectedUnassignedListStatus, setSelectedUnassignedListStatus] = useState('');

    // Company list filter (for unassigned prospects) — filters on the company linked to the prospect
    const [selectedUnassignedCompanyListId, setSelectedUnassignedCompanyListId] = useState('');
    const [selectedUnassignedCompanyListStatus, setSelectedUnassignedCompanyListStatus] = useState('');
    const [prospectLists, setProspectLists] = useState<Array<{ id: number; name: string }>>([]);
    
    // Include empty states for search fields
    const [includeEmptyCompanyId, setIncludeEmptyCompanyId] = useState(false);
    const [notEmptyCompanyId, setNotEmptyCompanyId] = useState(false);
    const [includeEmptyName, setIncludeEmptyName] = useState(false);
    const [notEmptyName, setNotEmptyName] = useState(false);
    const [includeEmptyDescription, setIncludeEmptyDescription] = useState(false);
    const [notEmptyDescription, setNotEmptyDescription] = useState(false);
    const [includeEmptyWebsite, setIncludeEmptyWebsite] = useState(false);
    const [notEmptyWebsite, setNotEmptyWebsite] = useState(false);
    const [includeEmptyLinkedIn, setIncludeEmptyLinkedIn] = useState(false);
    const [notEmptyLinkedIn, setNotEmptyLinkedIn] = useState(false);
    
    // Filter options
    const [industries, setIndustries] = useState<string[]>([]);
    const [countries, setCountries] = useState<string[]>([]);
    const [provincies, setProvincies] = useState<string[]>([]);
    const [sizeRanges, setSizeRanges] = useState<string[]>([]);
    const [businessTypes, setBusinessTypes] = useState<string[]>([]);
    const [offeringTypeOptions, setOfferingTypeOptions] = useState<string[]>([]);
    const [companyPromptOptions, setCompanyPromptOptions] = useState<string[]>([]);
    const [scrapingNames, setScrapingNames] = useState<string[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    
    // Filter states for Prospects tab
    const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
    const [selectedProspectCampaigns, setSelectedProspectCampaigns] = useState<string[]>([]);
    
    // Filter options for Prospects tab
    const [profiles, setProfiles] = useState<Array<{ id: string; name: string }>>([]);
    const [prospectCampaigns, setProspectCampaigns] = useState<Array<{ id: string; name: string }>>([]);
    const [campaignNames, setCampaignNames] = useState<string[]>([]);
    const [prospectStatuses, setProspectStatuses] = useState<string[]>([]);
    const [prospectCompanySizeRanges, setProspectCompanySizeRanges] = useState<string[]>([]);
    const [prospectCompanyIndustries, setProspectCompanyIndustries] = useState<string[]>([]);
    const [leadPhases, setLeadPhases] = useState<string[]>([]);
    const [groupAreasOptions, setGroupAreasOptions] = useState<string[]>([]);
    const [personaAreasOptions, setPersonaAreasOptions] = useState<string[]>([]);
    const [prospectCountryOptions, setProspectCountryOptions] = useState<string[]>([]);
    const [personaLevelsOptions, setPersonaLevelsOptions] = useState<string[]>([]);
    const [personaLevelOptions, setPersonaLevelOptions] = useState<string[]>([]);
    const [personaCategoryOptions, setPersonaCategoryOptions] = useState<string[]>([]);
    
    // Multiselect filter states for Prospects tab
    const [selectedCampaignNames, setSelectedCampaignNames] = useState<string[]>([]);
    const [includeEmptyProspectCampaignName, setIncludeEmptyProspectCampaignName] = useState(false);
    const [notEmptyProspectCampaignName, setNotEmptyProspectCampaignName] = useState(false);
    const [selectedProspectStatuses, setSelectedProspectStatuses] = useState<string[]>([]);
    const [includeEmptyProspectStatus, setIncludeEmptyProspectStatus] = useState(false);
    const [notEmptyProspectStatus, setNotEmptyProspectStatus] = useState(false);
    const [includeEmptyProspectPlaceholders, setIncludeEmptyProspectPlaceholders] = useState(false);
    const [notEmptyProspectPlaceholders, setNotEmptyProspectPlaceholders] = useState(false);
    const [includeEmptyUnassignedPlaceholders, setIncludeEmptyUnassignedPlaceholders] = useState(false);
    const [notEmptyUnassignedPlaceholders, setNotEmptyUnassignedPlaceholders] = useState(false);
    const [showDeleteProspectsConfirm, setShowDeleteProspectsConfirm] = useState(false);
    const [deleteProspectsLoading, setDeleteProspectsLoading] = useState(false);
    const [selectedProspectCompanySizeRanges, setSelectedProspectCompanySizeRanges] = useState<string[]>([]);
    const [includeEmptyProspectCompanySizeRange, setIncludeEmptyProspectCompanySizeRange] = useState(false);
    const [notEmptyProspectCompanySizeRange, setNotEmptyProspectCompanySizeRange] = useState(false);
    const [selectedProspectCompanyIndustries, setSelectedProspectCompanyIndustries] = useState<string[]>([]);
    const [includeEmptyProspectCompanyIndustry, setIncludeEmptyProspectCompanyIndustry] = useState(false);
    const [notEmptyProspectCompanyIndustry, setNotEmptyProspectCompanyIndustry] = useState(false);
    const [selectedLeadPhases, setSelectedLeadPhases] = useState<string[]>([]);
    const [includeEmptyLeadPhase, setIncludeEmptyLeadPhase] = useState(false);
    const [notEmptyLeadPhase, setNotEmptyLeadPhase] = useState(false);
    const [selectedGroupAreas, setSelectedGroupAreas] = useState<string[]>([]);
    const [includeEmptyGroupAreas, setIncludeEmptyGroupAreas] = useState(false);
    const [notEmptyGroupAreas, setNotEmptyGroupAreas] = useState(false);
    const [selectedPersonaAreas, setSelectedPersonaAreas] = useState<string[]>([]);
    const [includeEmptyPersonaAreas, setIncludeEmptyPersonaAreas] = useState(false);
    const [notEmptyPersonaAreas, setNotEmptyPersonaAreas] = useState(false);
    const [selectedProspectCountry, setSelectedProspectCountry] = useState<string[]>([]);
    const [includeEmptyProspectCountry, setIncludeEmptyProspectCountry] = useState(false);
    const [notEmptyProspectCountry, setNotEmptyProspectCountry] = useState(false);
    const [selectedPersonaLevels, setSelectedPersonaLevels] = useState<string[]>([]);
    const [includeEmptyPersonaLevels, setIncludeEmptyPersonaLevels] = useState(false);
    const [notEmptyPersonaLevels, setNotEmptyPersonaLevels] = useState(false);
    const [selectedPersonaLevel, setSelectedPersonaLevel] = useState<string[]>([]);
    const [includeEmptyPersonaLevel, setIncludeEmptyPersonaLevel] = useState(false);
    const [notEmptyPersonaLevel, setNotEmptyPersonaLevel] = useState(false);
    const [selectedPersonaCategory, setSelectedPersonaCategory] = useState<string[]>([]);
    const [includeEmptyPersonaCategory, setIncludeEmptyPersonaCategory] = useState(false);
    const [notEmptyPersonaCategory, setNotEmptyPersonaCategory] = useState(false);
    
    // Boolean filter states for Prospects tab (Yes/No - has value or not)
    const [emailFilter, setEmailFilter] = useState<string>(''); // '' | 'yes' | 'no'
    const [phoneFilter, setPhoneFilter] = useState<string>('');
    const [birthdayFilter, setBirthdayFilter] = useState<string>('');
    const [linkedInGroupNameFilter, setLinkedInGroupNameFilter] = useState<string>('');
    const [stopOutreachFilter, setStopOutreachFilter] = useState<string>('');
    const [emailSentFilter, setEmailSentFilter] = useState<string>('');
    const [blacklistedProspectFilter, setBlacklistedProspectFilter] = useState<string>('');
    const [crmFilter, setCrmFilter] = useState<string>('');
    
    // Range filter for Company Size in Prospects tab
    const [minProspectCompanySize, setMinProspectCompanySize] = useState('');
    const [maxProspectCompanySize, setMaxProspectCompanySize] = useState('');

    // Search/filter states for Prospects tab
    const [searchProspectFirstName, setSearchProspectFirstName] = useState('');
    const [searchProspectLastName, setSearchProspectLastName] = useState('');
    const [searchProspectEmail, setSearchProspectEmail] = useState('');
    const [searchProspectPhone, setSearchProspectPhone] = useState('');
    const [searchProspectCompany, setSearchProspectCompany] = useState('');
    const [searchProspectLinkedInUrl, setSearchProspectLinkedInUrl] = useState('');
    const [searchProspectId, setSearchProspectId] = useState('');
    const [searchProspectContactId, setSearchProspectContactId] = useState('');
    const [searchProspectBirthday, setSearchProspectBirthday] = useState('');
    const [searchProspectCompanyId, setSearchProspectCompanyId] = useState('');
    const [searchProspectJobTitle, setSearchProspectJobTitle] = useState('');
    const [searchProspectCompanyCompanyId, setSearchProspectCompanyCompanyId] = useState('');
    const [searchProspectCompanyWebsite, setSearchProspectCompanyWebsite] = useState('');
    const [searchProspectCompanyLinkedIn, setSearchProspectCompanyLinkedIn] = useState('');
    const [searchProspectCompanyCity, setSearchProspectCompanyCity] = useState('');
    const [searchProspectCompanyBusinessType, setSearchProspectCompanyBusinessType] = useState('');
    const [searchProspectCompanyCountry, setSearchProspectCompanyCountry] = useState('');
    const [searchProspectCompanyProvincie, setSearchProspectCompanyProvincie] = useState('');
    const [searchProspectDateConnected, setSearchProspectDateConnected] = useState('');
    const [searchProspectDateConnectionRequested, setSearchProspectDateConnectionRequested] = useState('');
    const [searchProspectDateReplied, setSearchProspectDateReplied] = useState('');
    const [searchProspectDatePositiveTag, setSearchProspectDatePositiveTag] = useState('');
    const [searchProspectScrapingName, setSearchProspectScrapingName] = useState('');
    const [selectedProspectScrapingNames, setSelectedProspectScrapingNames] = useState<string[]>([]);
    const [prospectScrapingNamesOptions, setProspectScrapingNamesOptions] = useState<string[]>([]);

    // Include empty / not empty states for prospects search fields
    const [includeEmptyProspectFirstName, setIncludeEmptyProspectFirstName] = useState(false);
    const [notEmptyProspectFirstName, setNotEmptyProspectFirstName] = useState(false);
    const [includeEmptyProspectLastName, setIncludeEmptyProspectLastName] = useState(false);
    const [notEmptyProspectLastName, setNotEmptyProspectLastName] = useState(false);
    const [includeEmptyProspectEmail] = useState(false);
    const [notEmptyProspectEmail] = useState(false);
    const [includeEmptyProspectPhone] = useState(false);
    const [notEmptyProspectPhone] = useState(false);
    const [includeEmptyProspectCompany, setIncludeEmptyProspectCompany] = useState(false);
    const [notEmptyProspectCompany, setNotEmptyProspectCompany] = useState(false);
    const [includeEmptyProspectLinkedInUrl, setIncludeEmptyProspectLinkedInUrl] = useState(false);
    const [notEmptyProspectLinkedInUrl, setNotEmptyProspectLinkedInUrl] = useState(false);
    const [includeEmptyProspectId, setIncludeEmptyProspectId] = useState(false);
    const [notEmptyProspectId, setNotEmptyProspectId] = useState(false);
    const [includeEmptyProspectContactId, setIncludeEmptyProspectContactId] = useState(false);
    const [notEmptyProspectContactId, setNotEmptyProspectContactId] = useState(false);
    const [includeEmptyProspectBirthday, setIncludeEmptyProspectBirthday] = useState(false);
    const [notEmptyProspectBirthday, setNotEmptyProspectBirthday] = useState(false);
    const [includeEmptyProspectCompanyId, setIncludeEmptyProspectCompanyId] = useState(false);
    const [notEmptyProspectCompanyId, setNotEmptyProspectCompanyId] = useState(false);
    const [includeEmptyProspectJobTitle, setIncludeEmptyProspectJobTitle] = useState(false);
    const [notEmptyProspectJobTitle, setNotEmptyProspectJobTitle] = useState(false);
    const [includeEmptyProspectCompanyCompanyId, setIncludeEmptyProspectCompanyCompanyId] = useState(false);
    const [notEmptyProspectCompanyCompanyId, setNotEmptyProspectCompanyCompanyId] = useState(false);
    const [includeEmptyProspectCompanyWebsite, setIncludeEmptyProspectCompanyWebsite] = useState(false);
    const [notEmptyProspectCompanyWebsite, setNotEmptyProspectCompanyWebsite] = useState(false);
    const [includeEmptyProspectCompanyLinkedIn, setIncludeEmptyProspectCompanyLinkedIn] = useState(false);
    const [notEmptyProspectCompanyLinkedIn, setNotEmptyProspectCompanyLinkedIn] = useState(false);
    const [includeEmptyProspectCompanyCity, setIncludeEmptyProspectCompanyCity] = useState(false);
    const [notEmptyProspectCompanyCity, setNotEmptyProspectCompanyCity] = useState(false);
    const [includeEmptyProspectCompanyBusinessType, setIncludeEmptyProspectCompanyBusinessType] = useState(false);
    const [notEmptyProspectCompanyBusinessType, setNotEmptyProspectCompanyBusinessType] = useState(false);
    const [includeEmptyProspectCompanyCountry, setIncludeEmptyProspectCompanyCountry] = useState(false);
    const [notEmptyProspectCompanyCountry, setNotEmptyProspectCompanyCountry] = useState(false);
    const [includeEmptyProspectCompanyProvincie, setIncludeEmptyProspectCompanyProvincie] = useState(false);
    const [notEmptyProspectCompanyProvincie, setNotEmptyProspectCompanyProvincie] = useState(false);
    const [includeEmptyProspectDateConnected, setIncludeEmptyProspectDateConnected] = useState(false);
    const [notEmptyProspectDateConnected, setNotEmptyProspectDateConnected] = useState(false);
    const [includeEmptyProspectDateConnectionRequested, setIncludeEmptyProspectDateConnectionRequested] = useState(false);
    const [notEmptyProspectDateConnectionRequested, setNotEmptyProspectDateConnectionRequested] = useState(false);
    const [includeEmptyProspectDateReplied, setIncludeEmptyProspectDateReplied] = useState(false);
    const [notEmptyProspectDateReplied, setNotEmptyProspectDateReplied] = useState(false);
    const [includeEmptyProspectDatePositiveTag, setIncludeEmptyProspectDatePositiveTag] = useState(false);
    const [notEmptyProspectDatePositiveTag, setNotEmptyProspectDatePositiveTag] = useState(false);
    const [includeEmptyProspectScrapingName, setIncludeEmptyProspectScrapingName] = useState(false);
    const [notEmptyProspectScrapingName, setNotEmptyProspectScrapingName] = useState(false);
    const [prospectJobChangeFilter, setProspectJobChangeFilter] = useState<string[]>([]);
    const [includeEmptyProspectJobChange, setIncludeEmptyProspectJobChange] = useState(false);
    const [notEmptyProspectJobChange, setNotEmptyProspectJobChange] = useState(false);
    const [prospectJobChangeDateFrom, setProspectJobChangeDateFrom] = useState('');
    const [prospectJobChangeDateTo, setProspectJobChangeDateTo] = useState('');
    
    // LinkedIn Group text search for Prospects tab
    const [searchProspectLinkedInGroupName, setSearchProspectLinkedInGroupName] = useState('');
    const [includeEmptyProspectLinkedInGroupName, setIncludeEmptyProspectLinkedInGroupName] = useState(false);
    const [notEmptyProspectLinkedInGroupName, setNotEmptyProspectLinkedInGroupName] = useState(false);
    
    // Filter states for Unassigned Prospects tab
    const [searchUnassignedContactId, setSearchUnassignedContactId] = useState('');
    const [includeEmptyUnassignedContactId, setIncludeEmptyUnassignedContactId] = useState(false);
    const [notEmptyUnassignedContactId, setNotEmptyUnassignedContactId] = useState(false);
    const [searchUnassignedProspectId, setSearchUnassignedProspectId] = useState('');
    const [includeEmptyUnassignedProspectId, setIncludeEmptyUnassignedProspectId] = useState(false);
    const [notEmptyUnassignedProspectId, setNotEmptyUnassignedProspectId] = useState(false);
    const [searchUnassignedFirstName, setSearchUnassignedFirstName] = useState('');
    const [includeEmptyUnassignedFirstName, setIncludeEmptyUnassignedFirstName] = useState(false);
    const [notEmptyUnassignedFirstName, setNotEmptyUnassignedFirstName] = useState(false);
    const [searchUnassignedLastName, setSearchUnassignedLastName] = useState('');
    const [includeEmptyUnassignedLastName, setIncludeEmptyUnassignedLastName] = useState(false);
    const [notEmptyUnassignedLastName, setNotEmptyUnassignedLastName] = useState(false);
    const [unassignedEmailFilter, setUnassignedEmailFilter] = useState<string>('');
    const [unassignedPhoneFilter, setUnassignedPhoneFilter] = useState<string>('');
    const [searchUnassignedJobTitle, setSearchUnassignedJobTitle] = useState('');
    const [includeEmptyUnassignedJobTitle, setIncludeEmptyUnassignedJobTitle] = useState(false);
    const [notEmptyUnassignedJobTitle, setNotEmptyUnassignedJobTitle] = useState(false);
    const [selectedUnassignedScrapingNames, setSelectedUnassignedScrapingNames] = useState<string[]>([]);
    const [includeEmptyUnassignedScrapingName, setIncludeEmptyUnassignedScrapingName] = useState(false);
    const [notEmptyUnassignedScrapingName, setNotEmptyUnassignedScrapingName] = useState(false);
    const [unassignedBlacklistedFilter, setUnassignedBlacklistedFilter] = useState<string>('');
    const [unassignedJobChangeFilter, setUnassignedJobChangeFilter] = useState<string[]>([]);
    const [includeEmptyUnassignedJobChange, setIncludeEmptyUnassignedJobChange] = useState(false);
    const [notEmptyUnassignedJobChange, setNotEmptyUnassignedJobChange] = useState(false);
    const [unassignedJobChangeDateFrom, setUnassignedJobChangeDateFrom] = useState('');
    const [unassignedJobChangeDateTo, setUnassignedJobChangeDateTo] = useState('');
    // In Campaigns (company) filter: how many people of the prospect's company already sit in Connector campaigns
    const [unassignedInCampaignBasis, setUnassignedInCampaignBasis] = useState('total');
    const [unassignedInCampaignMin, setUnassignedInCampaignMin] = useState('');
    const [unassignedInCampaignMax, setUnassignedInCampaignMax] = useState('');
    const [searchUnassignedCompany, setSearchUnassignedCompany] = useState('');
    const [includeEmptyUnassignedCompany, setIncludeEmptyUnassignedCompany] = useState(false);
    const [notEmptyUnassignedCompany, setNotEmptyUnassignedCompany] = useState(false);
    const [searchUnassignedCompanyCompanyId, setSearchUnassignedCompanyCompanyId] = useState('');
    const [includeEmptyUnassignedCompanyCompanyId, setIncludeEmptyUnassignedCompanyCompanyId] = useState(false);
    const [notEmptyUnassignedCompanyCompanyId, setNotEmptyUnassignedCompanyCompanyId] = useState(false);
    const [searchUnassignedCompanyCity, setSearchUnassignedCompanyCity] = useState('');
    const [includeEmptyUnassignedCompanyCity, setIncludeEmptyUnassignedCompanyCity] = useState(false);
    const [notEmptyUnassignedCompanyCity, setNotEmptyUnassignedCompanyCity] = useState(false);
    const [selectedUnassignedCompanySizeRanges, setSelectedUnassignedCompanySizeRanges] = useState<string[]>([]);
    const [includeEmptyUnassignedCompanySizeRange, setIncludeEmptyUnassignedCompanySizeRange] = useState(false);
    const [notEmptyUnassignedCompanySizeRange, setNotEmptyUnassignedCompanySizeRange] = useState(false);
    const [selectedUnassignedCompanyIndustries, setSelectedUnassignedCompanyIndustries] = useState<string[]>([]);
    const [includeEmptyUnassignedCompanyIndustry, setIncludeEmptyUnassignedCompanyIndustry] = useState(false);
    const [notEmptyUnassignedCompanyIndustry, setNotEmptyUnassignedCompanyIndustry] = useState(false);
    const [searchUnassignedCompanyBusinessType, setSearchUnassignedCompanyBusinessType] = useState('');
    const [includeEmptyUnassignedCompanyBusinessType, setIncludeEmptyUnassignedCompanyBusinessType] = useState(false);
    const [notEmptyUnassignedCompanyBusinessType, setNotEmptyUnassignedCompanyBusinessType] = useState(false);
    const [searchUnassignedCompanyCountry, setSearchUnassignedCompanyCountry] = useState('');
    const [includeEmptyUnassignedCompanyCountry, setIncludeEmptyUnassignedCompanyCountry] = useState(false);
    const [notEmptyUnassignedCompanyCountry, setNotEmptyUnassignedCompanyCountry] = useState(false);
    const [searchUnassignedCompanyProvincie, setSearchUnassignedCompanyProvincie] = useState('');
    const [includeEmptyUnassignedCompanyProvincie, setIncludeEmptyUnassignedCompanyProvincie] = useState(false);
    const [notEmptyUnassignedCompanyProvincie, setNotEmptyUnassignedCompanyProvincie] = useState(false);
    // LinkedIn Group text search for Unassigned tab
    const [searchUnassignedLinkedInGroupName, setSearchUnassignedLinkedInGroupName] = useState('');
    const [includeEmptyUnassignedLinkedInGroupName, setIncludeEmptyUnassignedLinkedInGroupName] = useState(false);
    const [notEmptyUnassignedLinkedInGroupName, setNotEmptyUnassignedLinkedInGroupName] = useState(false);
    // Persona filters for Unassigned Prospects tab
    const [selectedUnassignedPersonaAreas, setSelectedUnassignedPersonaAreas] = useState<string[]>([]);
    const [includeEmptyUnassignedPersonaAreas, setIncludeEmptyUnassignedPersonaAreas] = useState(false);
    const [notEmptyUnassignedPersonaAreas, setNotEmptyUnassignedPersonaAreas] = useState(false);
    const [selectedUnassignedCountry, setSelectedUnassignedCountry] = useState<string[]>([]);
    const [includeEmptyUnassignedCountry, setIncludeEmptyUnassignedCountry] = useState(false);
    const [notEmptyUnassignedCountry, setNotEmptyUnassignedCountry] = useState(false);
    const [selectedUnassignedPersonaLevels, setSelectedUnassignedPersonaLevels] = useState<string[]>([]);
    const [includeEmptyUnassignedPersonaLevels, setIncludeEmptyUnassignedPersonaLevels] = useState(false);
    const [notEmptyUnassignedPersonaLevels, setNotEmptyUnassignedPersonaLevels] = useState(false);
    const [selectedUnassignedPersonaLevel, setSelectedUnassignedPersonaLevel] = useState<string[]>([]);
    const [includeEmptyUnassignedPersonaLevel, setIncludeEmptyUnassignedPersonaLevel] = useState(false);
    const [notEmptyUnassignedPersonaLevel, setNotEmptyUnassignedPersonaLevel] = useState(false);
    const [selectedUnassignedPersonaCategory, setSelectedUnassignedPersonaCategory] = useState<string[]>([]);
    const [includeEmptyUnassignedPersonaCategory, setIncludeEmptyUnassignedPersonaCategory] = useState(false);
    const [notEmptyUnassignedPersonaCategory, setNotEmptyUnassignedPersonaCategory] = useState(false);
    // Filter options for Unassigned Prospects tab
    const [unassignedCompanySizeRanges, setUnassignedCompanySizeRangesOptions] = useState<string[]>([]);
    const [unassignedCompanyIndustries, setUnassignedCompanyIndustriesOptions] = useState<string[]>([]);
    const [unassignedGroupAreasOptions, setUnassignedGroupAreasOptions] = useState<string[]>([]);
    const [unassignedPersonaAreasOptions, setUnassignedPersonaAreasOptions] = useState<string[]>([]);
    const [unassignedCountryOptions, setUnassignedCountryOptions] = useState<string[]>([]);
    const [unassignedPersonaLevelsOptions, setUnassignedPersonaLevelsOptions] = useState<string[]>([]);
    const [unassignedPersonaLevelOptions, setUnassignedPersonaLevelOptions] = useState<string[]>([]);
    const [unassignedPersonaCategoryOptions, setUnassignedPersonaCategoryOptions] = useState<string[]>([]);
    const [unassignedScrapingNamesOptions, setUnassignedScrapingNamesOptions] = useState<string[]>([]);
    const [selectedUnassignedGroupAreas, setSelectedUnassignedGroupAreas] = useState<string[]>([]);
    const [includeEmptyUnassignedGroupAreas, setIncludeEmptyUnassignedGroupAreas] = useState(false);
    const [notEmptyUnassignedGroupAreas, setNotEmptyUnassignedGroupAreas] = useState(false);
    // Assign to campaign widget state
    const [showAssignProspectsWidget, setShowAssignProspectsWidget] = useState(false);
    const [assignWidgetTargetProfileId, setAssignWidgetTargetProfileId] = useState('');
    const [assignWidgetTargetCampaignId, setAssignWidgetTargetCampaignId] = useState('');
    const [assignWidgetCampaigns, setAssignWidgetCampaigns] = useState<Array<{ id: string; name: string }>>([]);
    const [assignWidgetCampaignsLoading, setAssignWidgetCampaignsLoading] = useState(false);
    const [assignProspectsLoading, setAssignProspectsLoading] = useState(false);
    // Per-company limits for assignment ('' = unlimited)
    const [assignMaxPerCompanyBatch, setAssignMaxPerCompanyBatch] = useState('');
    const [assignMaxPerCompanyTotal, setAssignMaxPerCompanyTotal] = useState('');
    const [assignLimitCountBasis, setAssignLimitCountBasis] = useState<'total' | 'connected' | 'replied' | 'pos' | 'neg'>('total');
    // AI Prompt filter for Unassigned Prospects tab
    const [unassignedAiPromptName, setUnassignedAiPromptName] = useState('');
    const [unassignedAiSelectedFields, setUnassignedAiSelectedFields] = useState<string[]>([]);
    const [unassignedAiFieldFilters, setUnassignedAiFieldFilters] = useState<Array<{ field: string; value: string }>>([]);
    const [unassignedAiFieldExclude, setUnassignedAiFieldExclude] = useState<Record<string, boolean>>({});
    const [unassignedAiFieldOptions, setUnassignedAiFieldOptions] = useState<Record<string, { value: string; label: string }[]>>({});
    const [unassignedAiMultiSelectFilters, setUnassignedAiMultiSelectFilters] = useState<Record<string, string[]>>({});
    const [, setAvailableUnassignedAiFields] = useState<string[]>([]);
    const [, setUnassignedAiFieldsLoading] = useState(false);
    // AI Prompt filter for Prospects (Campaigns) tab
    const [prospectsAiPromptName, setProspectsAiPromptName] = useState('');
    const [prospectsAiSelectedFields, setProspectsAiSelectedFields] = useState<string[]>([]);
    const [prospectsAiFieldFilters, setProspectsAiFieldFilters] = useState<Array<{ field: string; value: string }>>([]);
    const [prospectsAiFieldExclude, setProspectsAiFieldExclude] = useState<Record<string, boolean>>({});
    const [prospectsAiFieldOptions, setProspectsAiFieldOptions] = useState<Record<string, { value: string; label: string }[]>>({});
    const [prospectsAiMultiSelectFilters, setProspectsAiMultiSelectFilters] = useState<Record<string, string[]>>({});
    const [, setAvailableProspectsAiFields] = useState<string[]>([]);
    const [, setProspectsAiFieldsLoading] = useState(false);
    // AI field selection modal (shared between prospects and unassigned tabs)
    const [aiFieldModalTarget, setAiFieldModalTarget] = useState<'prospects' | 'unassigned_prospects' | null>(null);
    const [pendingAiFields, setPendingAiFields] = useState<string[]>([]);
    const [pendingAiSelectedFields, setPendingAiSelectedFields] = useState<string[]>([]);
    // Assign to Messenger campaign widget state (Prospects Campaigns tab)
    const [showMessengerAssignWidget, setShowMessengerAssignWidget] = useState(false);
    const [messengerAssignTargetProfileId, setMessengerAssignTargetProfileId] = useState('');
    const [messengerAssignTargetCampaignId, setMessengerAssignTargetCampaignId] = useState('');
    const [messengerAssignCampaigns, setMessengerAssignCampaigns] = useState<Array<{ id: string; name: string }>>([]);
    const [messengerAssignCampaignsLoading, setMessengerAssignCampaignsLoading] = useState(false);
    const [messengerAssignLoading, setMessengerAssignLoading] = useState(false);
    
    // Filter options for Campaigns tab
    const [campaignProfileNames, setCampaignProfileNames] = useState<string[]>([]);
    const [campaignNamesOptions, setCampaignNamesOptions] = useState<string[]>([]);
    const [campaignTypes, setCampaignTypes] = useState<string[]>([]);
    const [campaignContents, setCampaignContents] = useState<string[]>([]);
    const [campaignSectors, setCampaignSectors] = useState<string[]>([]);
    const [campaignCompanyAttributes, setCampaignCompanyAttributes] = useState<string[]>([]);
    const [campaignPersonas, setCampaignPersonas] = useState<string[]>([]);
    
    // Selected filter states for Campaigns tab
    const [selectedCampaignProfiles, setSelectedCampaignProfiles] = useState<string[]>([]);
    const [includeEmptyCampaignProfile, setIncludeEmptyCampaignProfile] = useState(false);
    const [notEmptyCampaignProfile, setNotEmptyCampaignProfile] = useState(false);
    const [selectedCampaignNamesFilter, setSelectedCampaignNamesFilter] = useState<string[]>([]);
    const [includeEmptyCampaignName, setIncludeEmptyCampaignName] = useState(false);
    const [notEmptyCampaignName, setNotEmptyCampaignName] = useState(false);
    const [selectedCampaignTypes, setSelectedCampaignTypes] = useState<string[]>([]);
    const [includeEmptyCampaignType, setIncludeEmptyCampaignType] = useState(false);
    const [notEmptyCampaignType, setNotEmptyCampaignType] = useState(false);
    const [selectedCampaignContents, setSelectedCampaignContents] = useState<string[]>([]);
    const [includeEmptyCampaignContent, setIncludeEmptyCampaignContent] = useState(false);
    const [notEmptyCampaignContent, setNotEmptyCampaignContent] = useState(false);
    const [selectedCampaignSectors, setSelectedCampaignSectors] = useState<string[]>([]);
    const [includeEmptyCampaignSector, setIncludeEmptyCampaignSector] = useState(false);
    const [notEmptyCampaignSector, setNotEmptyCampaignSector] = useState(false);
    const [selectedCampaignCompanyAttributes, setSelectedCampaignCompanyAttributes] = useState<string[]>([]);
    const [includeEmptyCampaignCompanyAttribute, setIncludeEmptyCampaignCompanyAttribute] = useState(false);
    const [notEmptyCampaignCompanyAttribute, setNotEmptyCampaignCompanyAttribute] = useState(false);
    const [selectedCampaignPersonas, setSelectedCampaignPersonas] = useState<string[]>([]);
    const [includeEmptyCampaignPersona, setIncludeEmptyCampaignPersona] = useState(false);
    const [notEmptyCampaignPersona, setNotEmptyCampaignPersona] = useState(false);
    
    // Range filter for requests_per_day in Campaigns tab
    const [minRequestsPerDay, setMinRequestsPerDay] = useState('');
    const [maxRequestsPerDay, setMaxRequestsPerDay] = useState('');
    
    // Boolean filter states for Campaigns tab
    const [liveFilter, setLiveFilter] = useState<string>(''); // '' | 'yes' | 'no'
    const [stopFollowUpFilter, setStopFollowUpFilter] = useState<string>('');
    
    // Text search states for Campaigns tab
    const [searchCampaignStartDate, setSearchCampaignStartDate] = useState('');
    const [includeEmptyCampaignStartDate, setIncludeEmptyCampaignStartDate] = useState(false);
    const [notEmptyCampaignStartDate, setNotEmptyCampaignStartDate] = useState(false);
    
    // Blacklist tab filter states
    const [searchBlacklistValue, setSearchBlacklistValue] = useState('');
    const [selectedFieldTargets, setSelectedFieldTargets] = useState<string[]>([]);
    const [includeEmptyFieldTarget, setIncludeEmptyFieldTarget] = useState(false);
    const [notEmptyFieldTarget, setNotEmptyFieldTarget] = useState(false);
    const [selectedComparisonTypes, setSelectedComparisonTypes] = useState<string[]>([]);
    const [includeEmptyComparisonType, setIncludeEmptyComparisonType] = useState(false);
    const [notEmptyComparisonType, setNotEmptyComparisonType] = useState(false);
    
    // Blacklist filter options
    const [fieldTargets, setFieldTargets] = useState<string[]>([]);
    const [comparisonTypes, setComparisonTypes] = useState<string[]>([]);
    
    // AI Analysis tab filter states
    const [aiPromptOptions, setAiPromptOptions] = useState<Array<{ id: number; name: string; version: string; active: boolean }>>([]);
    const [selectedAiPromptId, setSelectedAiPromptId] = useState<string>('');
    const [analysisFields, setAnalysisFields] = useState<string[]>([]);
    const [aiDataFilters, setAiDataFilters] = useState<Record<string, string>>({});
    const [aiDataIncludeEmpty, setAiDataIncludeEmpty] = useState<Record<string, boolean>>({});
    const [aiDataNotEmpty, setAiDataNotEmpty] = useState<Record<string, boolean>>({});
    const [aiFieldOptions, setAiFieldOptions] = useState<Record<string, { value: string; label: string }[]>>({});
    const [aiDataMultiSelectFilters, setAiDataMultiSelectFilters] = useState<Record<string, string[]>>({});
    const [selectedAiListId, setSelectedAiListId] = useState<string>('');
    const [selectedAiListStatus, setSelectedAiListStatus] = useState<string>('');

    // AI Analysis company field filter states
    const [searchAiCompanyName, setSearchAiCompanyName] = useState('');
    const [includeEmptyAiCompanyName, setIncludeEmptyAiCompanyName] = useState(false);
    const [notEmptyAiCompanyName, setNotEmptyAiCompanyName] = useState(false);
    const [searchAiCompanyIndustry, setSearchAiCompanyIndustry] = useState('');
    const [includeEmptyAiCompanyIndustry, setIncludeEmptyAiCompanyIndustry] = useState(false);
    const [notEmptyAiCompanyIndustry, setNotEmptyAiCompanyIndustry] = useState(false);
    const [searchAiCompanyCountry, setSearchAiCompanyCountry] = useState('');
    const [includeEmptyAiCompanyCountry, setIncludeEmptyAiCompanyCountry] = useState(false);
    const [notEmptyAiCompanyCountry, setNotEmptyAiCompanyCountry] = useState(false);
    const [searchAiCompanySizeRange, setSearchAiCompanySizeRange] = useState('');
    const [includeEmptyAiCompanySizeRange, setIncludeEmptyAiCompanySizeRange] = useState(false);
    const [notEmptyAiCompanySizeRange, setNotEmptyAiCompanySizeRange] = useState(false);
    const [searchAiCompanyCity, setSearchAiCompanyCity] = useState('');
    const [includeEmptyAiCompanyCity, setIncludeEmptyAiCompanyCity] = useState(false);
    const [notEmptyAiCompanyCity, setNotEmptyAiCompanyCity] = useState(false);
    const [searchAiCompanyWebsite, setSearchAiCompanyWebsite] = useState('');
    const [includeEmptyAiCompanyWebsite, setIncludeEmptyAiCompanyWebsite] = useState(false);
    const [notEmptyAiCompanyWebsite, setNotEmptyAiCompanyWebsite] = useState(false);
    const [searchAiCompanyDescription, setSearchAiCompanyDescription] = useState('');
    const [includeEmptyAiCompanyDescription, setIncludeEmptyAiCompanyDescription] = useState(false);
    const [notEmptyAiCompanyDescription, setNotEmptyAiCompanyDescription] = useState(false);
    const [minAiCompanySize, setMinAiCompanySize] = useState('');
    const [maxAiCompanySize, setMaxAiCompanySize] = useState('');
    const [selectedAiCompanyProvincies, setSelectedAiCompanyProvincies] = useState<string[]>([]);
    const [includeEmptyAiCompanyProvincie, setIncludeEmptyAiCompanyProvincie] = useState(false);
    const [notEmptyAiCompanyProvincie, setNotEmptyAiCompanyProvincie] = useState(false);
    const [selectedAiCompanyBusinessTypes, setSelectedAiCompanyBusinessTypes] = useState<string[]>([]);
    const [includeEmptyAiCompanyBusinessType, setIncludeEmptyAiCompanyBusinessType] = useState(false);
    const [notEmptyAiCompanyBusinessType, setNotEmptyAiCompanyBusinessType] = useState(false);
    const [searchAiCompanyOfferingType, setSearchAiCompanyOfferingType] = useState('');
    const [includeEmptyAiCompanyOfferingType, setIncludeEmptyAiCompanyOfferingType] = useState(false);
    const [notEmptyAiCompanyOfferingType, setNotEmptyAiCompanyOfferingType] = useState(false);
    const [selectedAiCompanyTypes, setSelectedAiCompanyTypes] = useState<string[]>([]);
    const [includeEmptyAiCompanyType, setIncludeEmptyAiCompanyType] = useState(false);
    const [notEmptyAiCompanyType, setNotEmptyAiCompanyType] = useState(false);
    const [showPromptModal, setShowPromptModal] = useState(false);
    const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
    const [promptModalMode, setPromptModalMode] = useState<'view' | 'edit' | 'create'>('view');
    const [allAiPrompts, setAllAiPrompts] = useState<any[]>([]);
    const [editingPrompt, setEditingPrompt] = useState<any>(null);
    const originalPromptRef = React.useRef<any>(null);
    const [promptSaving, setPromptSaving] = useState(false);
    const [promptSearchTerm, setPromptSearchTerm] = useState('');
    
    // AI Analysis detail modal
    const [showAnalysisDetailModal, setShowAnalysisDetailModal] = useState(false);
    const [selectedAnalysisRow, setSelectedAnalysisRow] = useState<any>(null);


    
    // UI state
    const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());
    const [openColumnFilter, setOpenColumnFilter] = useState<string | null>(null);
    
    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [, setSelectedCompany] = useState<any>(null);
    const [editModalTab, setEditModalTab] = useState<EditTabType | null>(null);
    const [editModalRow, setEditModalRow] = useState<any>(null);

    // Bulk edit state
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const [selectAllLoading, setSelectAllLoading] = useState(false);
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);

    // Add to List state
    const [showAddToListModal, setShowAddToListModal] = useState(false);
    const [showAddToProspectListModal, setShowAddToProspectListModal] = useState(false);

    // Bulk assign customer state
    const [showBulkAssignCustomerModal, setShowBulkAssignCustomerModal] = useState(false);
    const [bulkAssignCustomerName, setBulkAssignCustomerName] = useState('');
    const [bulkAssignLoading, setBulkAssignLoading] = useState(false);
    // Actions tab state
    const [actionCustomerName, setActionCustomerName] = useState('');
    const [dailyTaskRunning, setDailyTaskRunning] = useState(false);
    const [dailyTaskResult, setDailyTaskResult] = useState<{ success: boolean; tasksCreated?: number; tasksPossible?: number; applicable?: boolean; reasons?: Record<string, number>; message?: string; customerName?: string | null } | null>(null);
    const [classifyLoading, setClassifyLoading] = useState(false);

    // Content Update action state
    const [contentUpdateCustomerName, setContentUpdateCustomerName] = useState('');
    const [contentUpdateRunning, setContentUpdateRunning] = useState(false);
    const [contentUpdateResult, setContentUpdateResult] = useState<{ success: boolean; customerName?: string; totalContentUpdates?: number; error?: string } | null>(null);

    // Move Prospects widget state
    const [showMoveProspectsWidget, setShowMoveProspectsWidget] = useState(false);
    const [moveWidgetTargetProfileId, setMoveWidgetTargetProfileId] = useState('');
    const [moveWidgetTargetCampaignId, setMoveWidgetTargetCampaignId] = useState('');
    const [moveWidgetCampaigns, setMoveWidgetCampaigns] = useState<Array<{ id: string; name: string }>>([]);
    const [moveWidgetCampaignsLoading, setMoveWidgetCampaignsLoading] = useState(false);
    // Snapshot of prospect filters that were actually applied (set on Apply click, cleared on Reset)
    const [appliedProspectFilters, setAppliedProspectFilters] = useState<{
        statuses: string[];
        campaignNames: string[];
        prospectCampaignIds: string[];
        profileIds: string[];
    } | null>(null);
    
    // Sorting state
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    
    // Column visibility
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState({
        companyId: true,
        name: true,
        description: true,
        website: true,
        linkedin: true,
        industry: true,
        businessType: true,
        offeringType: true,
        aiPromptFilter: false,
        country: true,
        provincie: true,
        city: true,
        size: true,
        sizeRange: true,
        blacklisted: true,
        websiteScrape: true,
        scrapingName: true,
        createdAt: true,
        inCampaign: true,
        list: true,
    });

    // Column visibility for Prospects
    const [visibleColumnsProspects, setVisibleColumnsProspects] = useState({
        contactId: true,
        linkedinObjectUrn: false,
        prospectId: true,
        linkedinUrl: true,
        firstName: true,
        lastName: true,
        campaignName: true,
        prospectStatus: true,
        email: true,
        phone: true,
        birthday: true,
        jobTitle: true,
        personaAreas: true,
        personaLevels: true,
        personaLevel: true,
        personaCategory: true,
        jobChange: true,
        linkedinGroupName: true,
        groupAreas: true,
        placeholders: true,
        dateConnected: true,
        dateConnectionRequested: true,
        dateReplied: true,
        datePositiveTag: true,
        scrapingName: true,
        country: true,
        leadPhase: false,
        emailSent: false,
        blacklisted: true,
        stopOutreach: true,
        crm: false,
        company: true,
        companyCompanyId: false,
        companyWebsiteUrl: false,
        companyLinkedinUrl: false,
        companyCity: false,
        companySize: false,
        companySizeRange: false,
        companyIndustry: false,
        companyBusinessType: false,
        companyCountry: false,
        companyProvincie: false,
        list: true,
        companyList: true,
    });

    // Column visibility for Unassigned Prospects
    const [visibleColumnsUnassigned, setVisibleColumnsUnassigned] = useState({
        contactId: true,
        prospectId: false,
        linkedInObjectUrn: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        jobTitle: true,
        scrapingName: true,
        country: true,
        blacklisted: true,
        personaAreas: true,
        personaLevels: true,
        personaLevel: true,
        personaCategory: true,
        jobChange: true,
        linkedInGroup: true,
        groupAreas: true,
        placeholders: true,
        companyName: true,
        companyCity: false,
        companySizeRange: false,
        companyIndustry: false,
        companyCountry: false,
        inCampaign: true,
        list: true,
        companyList: true,
    });

    // Column visibility for Campaigns
    const [visibleColumnsCampaigns, setVisibleColumnsCampaigns] = useState({
        profileName: true,
        campaignName: true,
        requestsPerDay: true,
        type: true,
        content: true,
        sector: true,
        companyAttribute: true,
        persona: true,
        connectionRequest: true,
        firstFollowUp: true,
        secondFollowUp: true,
        thirdFollowUp: true,
        fourthFollowUp: true,
        startDate: true,
        live: true,
        stopFollowUp: true,
    });

    const [visibleColumnsAiAnalysis, setVisibleColumnsAiAnalysis] = useState({
        companyName: true,
        companyId: true,
        companyWebsite: true,
        companyLinkedin: false,
        companyIndustry: true,
        companyCountry: false,
        companyCity: false,
        companySizeRange: false,
        description: false,
        size: false,
        provincie: false,
        businessType: false,
        offeringType: false,
        companyType: false,
        analysisStatus: true,
        modelId: false,
        promptVersion: false,
        createdAt: true,
    });

    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

    // Memoized options arrays to avoid creating new references on every render.
    // MultiSelect is React.memo'd, so stable references prevent unnecessary re-renders.
    const profileOptions = useMemo(() => profiles.map(p => ({ value: p.id, label: p.name })), [profiles]);
    const prospectCampaignOptions = useMemo(() => prospectCampaigns.map(c => ({ value: c.id, label: c.name })), [prospectCampaigns]);
    const campaignProfileNameOptions = useMemo(() => campaignProfileNames.map(n => ({ value: n, label: n })), [campaignProfileNames]);
    const industryOptions = useMemo(() => industries.map(i => ({ value: i, label: i })), [industries]);
    const countryOptions = useMemo(() => countries.map(c => ({ value: c, label: c })), [countries]);
    const provincieOptions = useMemo(() => provincies.map(p => ({ value: p, label: p })), [provincies]);
    const businessTypeOptions = useMemo(() => businessTypes.map(b => ({ value: b, label: b })), [businessTypes]);
    const sizeRangeOptions = useMemo(() => sizeRanges.map(s => ({ value: s, label: s })), [sizeRanges]);
    const scrapingNameOptions = useMemo(() => scrapingNames.map(s => ({ value: s, label: s })), [scrapingNames]);
    const cityOptions = useMemo(() => cities.map(c => ({ value: c, label: c })), [cities]);
    const offeringTypeOpts = useMemo(() => offeringTypeOptions.map(o => ({ value: o, label: o })), [offeringTypeOptions]);
    const companyPromptOpts = useMemo(() => companyPromptOptions.map(p => ({ value: p, label: p })), [companyPromptOptions]);
    const campaignNameOptions = useMemo(() => {
        if (prospectsData.length > 0) {
            const names = Array.from(new Set(prospectsData.map((p: any) => p.campaign_name).filter(Boolean))).sort();
            return names.map(c => ({ value: c, label: c }));
        }
        return campaignNames.map(c => ({ value: c, label: c }));
    }, [campaignNames, prospectsData]);
    const prospectStatusOptions = useMemo(() => prospectStatuses.map(s => ({ value: s, label: s })), [prospectStatuses]);
    const leadPhaseOptions = useMemo(() => leadPhases.map(l => ({ value: l, label: l })), [leadPhases]);
    const groupAreaOptions = useMemo(() => groupAreasOptions.map(a => ({ value: a, label: a })), [groupAreasOptions]);
    const personaAreaOptions = useMemo(() => personaAreasOptions.map(a => ({ value: a, label: a })), [personaAreasOptions]);
    const prospectCountryOpts = useMemo(() => prospectCountryOptions.map(a => ({ value: a, label: a })), [prospectCountryOptions]);
    const personaLevelsOpts = useMemo(() => personaLevelsOptions.map(a => ({ value: a, label: a })), [personaLevelsOptions]);
    const personaLevelOpts = useMemo(() => personaLevelOptions.map(a => ({ value: a, label: a })), [personaLevelOptions]);
    const personaCategoryOpts = useMemo(() => personaCategoryOptions.map(a => ({ value: a, label: a })), [personaCategoryOptions]);
    const prospectCompanySizeRangeOptions = useMemo(() => prospectCompanySizeRanges.map(s => ({ value: s, label: s })), [prospectCompanySizeRanges]);
    const prospectCompanyIndustryOptions = useMemo(() => prospectCompanyIndustries.map(i => ({ value: i, label: i })), [prospectCompanyIndustries]);
    const sortedCustomerOptions = useMemo(() => [...customers].sort((a, b) => a.label.localeCompare(b.label)), [customers]);
    const campaignNameFilterOptions = useMemo(() => {
        if (campaignsData.length > 0) {
            const names = Array.from(new Set(campaignsData.map(c => c.campaign_name).filter(Boolean))).sort();
            return names.map(c => ({ value: c, label: c }));
        }
        return campaignNamesOptions.map(c => ({ value: c, label: c }));
    }, [campaignNamesOptions, campaignsData]);
    const campaignTypeOptions = useMemo(() => {
        if (campaignsData.length > 0) {
            const types = Array.from(new Set(campaignsData.map(c => c.campaign_type).filter(Boolean))).sort();
            return types.map(t => ({ value: t, label: t }));
        }
        return campaignTypes.map(t => ({ value: t, label: t }));
    }, [campaignTypes, campaignsData]);
    const campaignContentOptions = useMemo(() => {
        if (campaignsData.length > 0) {
            const contents = Array.from(new Set(campaignsData.map(c => c.campaign_content).filter(Boolean))).sort();
            return contents.map(c => ({ value: c, label: c }));
        }
        return campaignContents.map(c => ({ value: c, label: c }));
    }, [campaignContents, campaignsData]);
    const campaignSectorOptions = useMemo(() => {
        if (campaignsData.length > 0) {
            const sectors = Array.from(new Set(campaignsData.map(c => c.campaign_sector).filter(Boolean))).sort();
            return sectors.map(s => ({ value: s, label: s }));
        }
        return campaignSectors.map(s => ({ value: s, label: s }));
    }, [campaignSectors, campaignsData]);
    const campaignCompanyAttributeOptions = useMemo(() => {
        if (campaignsData.length > 0) {
            const attrs = Array.from(new Set(campaignsData.map(c => c.campaign_company_attribute).filter(Boolean))).sort();
            return attrs.map(a => ({ value: a, label: a }));
        }
        return campaignCompanyAttributes.map(a => ({ value: a, label: a }));
    }, [campaignCompanyAttributes, campaignsData]);
    const campaignPersonaOptions = useMemo(() => {
        if (campaignsData.length > 0) {
            const personas = Array.from(new Set(campaignsData.map(c => c.campaign_persona).filter(Boolean))).sort();
            return personas.map(p => ({ value: p, label: p }));
        }
        return campaignPersonas.map(p => ({ value: p, label: p }));
    }, [campaignPersonas, campaignsData]);
    const fieldTargetOptions = useMemo(() => fieldTargets.map(ft => ({ value: ft, label: ft })), [fieldTargets]);
    const comparisonTypeOptions = useMemo(() => comparisonTypes.map(ct => ({ value: ct, label: ct })), [comparisonTypes]);
    const unassignedPersonaAreasOpts = useMemo(() => unassignedPersonaAreasOptions.map(a => ({ value: a, label: a })), [unassignedPersonaAreasOptions]);
    const unassignedCountryOpts = useMemo(() => unassignedCountryOptions.map(a => ({ value: a, label: a })), [unassignedCountryOptions]);
    const unassignedPersonaLevelsOpts = useMemo(() => unassignedPersonaLevelsOptions.map(a => ({ value: a, label: a })), [unassignedPersonaLevelsOptions]);
    const unassignedPersonaLevelOpts = useMemo(() => unassignedPersonaLevelOptions.map(a => ({ value: a, label: a })), [unassignedPersonaLevelOptions]);
    const unassignedPersonaCategoryOpts = useMemo(() => unassignedPersonaCategoryOptions.map(a => ({ value: a, label: a })), [unassignedPersonaCategoryOptions]);
    const unassignedGroupAreaOpts = useMemo(() => unassignedGroupAreasOptions.map(a => ({ value: a, label: a })), [unassignedGroupAreasOptions]);
    const unassignedSizeRangeOpts = useMemo(() => unassignedCompanySizeRanges.map(s => ({ value: s, label: s })), [unassignedCompanySizeRanges]);
    const unassignedIndustryOpts = useMemo(() => unassignedCompanyIndustries.map(s => ({ value: s, label: s })), [unassignedCompanyIndustries]);
    const unassignedScrapingNameOpts = useMemo(() => unassignedScrapingNamesOptions.map(s => ({ value: s, label: s })), [unassignedScrapingNamesOptions]);
    const prospectScrapingNameOpts = useMemo(() => prospectScrapingNamesOptions.map(s => ({ value: s, label: s })), [prospectScrapingNamesOptions]);
    const aiPromptSelectOptions = useMemo(() => aiPromptOptions.map(p => ({ value: String(p.id), label: `${p.name} (v${p.version})${p.active ? '' : ' [inactive]'}` })), [aiPromptOptions]);

    const handleColumnResize = (columnKey: string, newWidth: number) => {
        setColumnWidths(prev => ({
            ...prev,
            [columnKey]: newWidth
        }));
    };

    const handleFilterExpandedChange = (filterName: string, isExpanded: boolean) => {
        setExpandedFilters(prev => {
            const next = new Set(prev);
            if (isExpanded) {
                next.add(filterName);
            } else {
                next.delete(filterName);
            }
            return next;
        });
    };

    // Handle column sorting
    const handleSort = (field: string) => {
        let newDirection: 'asc' | 'desc' = 'asc';
        
        // If clicking the same field, toggle direction
        if (sortField === field) {
            if (sortDirection === 'asc') {
                newDirection = 'desc';
            } else {
                // If already desc, remove sorting
                setSortField(null);
                setSortDirection('asc');
                
                // Re-fetch data without sorting
                const customer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
                const filters: any = {};
                if (selectedCustomers.length > 0) filters.selectedCustomers = selectedCustomers;
                if (activeTab === 'companies') {
                    if (searchCompanyId.trim()) filters.searchCompanyId = searchCompanyId.trim();
                    if (includeEmptyCompanyId) filters.includeEmptyCompanyId = true;
                    if (searchName.trim()) filters.searchName = searchName.trim();
                    if (includeEmptyName) filters.includeEmptyName = true;
                    if (searchDescription.trim()) filters.searchDescription = searchDescription.trim();
                    if (includeEmptyDescription) filters.includeEmptyDescription = true;
                    if (searchWebsite.trim()) filters.searchWebsite = searchWebsite.trim();
                    if (includeEmptyWebsite) filters.includeEmptyWebsite = true;
                    if (searchLinkedIn.trim()) filters.searchLinkedIn = searchLinkedIn.trim();
                    if (includeEmptyLinkedIn) filters.includeEmptyLinkedIn = true;
                    if (selectedIndustries.length > 0) filters.selectedIndustries = selectedIndustries;
                    if (includeEmptyIndustry) filters.includeEmptyIndustry = true;
                    if (selectedCountries.length > 0) filters.selectedCountries = selectedCountries;
                    if (includeEmptyCountry) filters.includeEmptyCountry = true;
                    if (selectedProvincies.length > 0) filters.selectedProvincies = selectedProvincies;
                    if (includeEmptyProvincie) filters.includeEmptyProvincie = true;
                    if (selectedSizeRanges.length > 0) filters.selectedSizeRanges = selectedSizeRanges;
                    if (includeEmptySizeRange) filters.includeEmptySizeRange = true;
                    if (selectedBusinessTypes.length > 0) filters.selectedBusinessTypes = selectedBusinessTypes;
                    if (includeEmptyBusinessType) filters.includeEmptyBusinessType = true;
                    if (selectedCities.length > 0) filters.selectedCities = selectedCities;
                    if (selectedScrapingNames.length > 0) filters.selectedScrapingNames = selectedScrapingNames;
                    if (includeEmptyScrapingName) filters.includeEmptyScrapingName = true;
                    if (minSize.trim()) filters.minSize = minSize.trim();
                    if (maxSize.trim()) filters.maxSize = maxSize.trim();
                    if (blacklistedFilter) filters.blacklistedFilter = blacklistedFilter;
                    if (websiteScrapeFilter) filters.websiteScrapeFilter = websiteScrapeFilter;
                    if (companiesInCampaignMin.trim() || companiesInCampaignMax.trim() || companiesInCampaignBasis !== 'total') {
                        filters.companiesInCampaignBasis = companiesInCampaignBasis;
                        if (companiesInCampaignMin.trim()) filters.companiesInCampaignMin = companiesInCampaignMin.trim();
                        if (companiesInCampaignMax.trim()) filters.companiesInCampaignMax = companiesInCampaignMax.trim();
                    }
                    if (createdAtFrom.trim()) filters.createdAtFrom = createdAtFrom.trim();
                    if (createdAtTo.trim()) filters.createdAtTo = createdAtTo.trim();
                    if (includeEmptyCreatedAt) filters.includeEmptyCreatedAt = true;
                    if (selectedListId) filters.selectedListId = selectedListId;
                    if (selectedListStatus) filters.selectedListStatus = selectedListStatus;
                }
                if (activeTab === 'ai_analysis') {
                    if (selectedAiPromptId) filters.selectedAiPromptId = selectedAiPromptId;
                    if (selectedAiListId) filters.selectedListId = selectedAiListId;
                    if (selectedAiListStatus) filters.selectedListStatus = selectedAiListStatus;
                }
                setCurrentPage(1);
                tabPagination.current[activeTab] = { currentPage: 1, totalPages: 1 };
                fetchMasterData(activeTab, customer, 1, filters);
                return;
            }
        }
        
        setSortField(field);
        setSortDirection(newDirection);
        
        // Apply the sort immediately
        const customer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
        const filters: any = {
            sortField: field,
            sortDirection: newDirection
        };
        
        // Include existing filters
        if (selectedCustomers.length > 0) filters.selectedCustomers = selectedCustomers;
        if (activeTab === 'companies') {
            if (searchCompanyId.trim()) filters.searchCompanyId = searchCompanyId.trim();
            if (includeEmptyCompanyId) filters.includeEmptyCompanyId = true;
            if (searchName.trim()) filters.searchName = searchName.trim();
            if (includeEmptyName) filters.includeEmptyName = true;
            if (searchDescription.trim()) filters.searchDescription = searchDescription.trim();
            if (includeEmptyDescription) filters.includeEmptyDescription = true;
            if (searchWebsite.trim()) filters.searchWebsite = searchWebsite.trim();
            if (includeEmptyWebsite) filters.includeEmptyWebsite = true;
            if (searchLinkedIn.trim()) filters.searchLinkedIn = searchLinkedIn.trim();
            if (includeEmptyLinkedIn) filters.includeEmptyLinkedIn = true;
            if (selectedIndustries.length > 0) filters.selectedIndustries = selectedIndustries;
            if (includeEmptyIndustry) filters.includeEmptyIndustry = true;
            if (selectedCountries.length > 0) filters.selectedCountries = selectedCountries;
            if (includeEmptyCountry) filters.includeEmptyCountry = true;
            if (selectedProvincies.length > 0) filters.selectedProvincies = selectedProvincies;
            if (includeEmptyProvincie) filters.includeEmptyProvincie = true;
            if (selectedSizeRanges.length > 0) filters.selectedSizeRanges = selectedSizeRanges;
            if (includeEmptySizeRange) filters.includeEmptySizeRange = true;
            if (selectedBusinessTypes.length > 0) filters.selectedBusinessTypes = selectedBusinessTypes;
            if (includeEmptyBusinessType) filters.includeEmptyBusinessType = true;
            if (selectedCities.length > 0) filters.selectedCities = selectedCities;
            if (selectedScrapingNames.length > 0) filters.selectedScrapingNames = selectedScrapingNames;
            if (includeEmptyScrapingName) filters.includeEmptyScrapingName = true;
            if (minSize.trim()) filters.minSize = minSize.trim();
            if (maxSize.trim()) filters.maxSize = maxSize.trim();
            if (blacklistedFilter) filters.blacklistedFilter = blacklistedFilter;
            if (websiteScrapeFilter) filters.websiteScrapeFilter = websiteScrapeFilter;
            if (createdAtFrom.trim()) filters.createdAtFrom = createdAtFrom.trim();
            if (createdAtTo.trim()) filters.createdAtTo = createdAtTo.trim();
            if (includeEmptyCreatedAt) filters.includeEmptyCreatedAt = true;
            if (selectedListId) filters.selectedListId = selectedListId;
            if (selectedListStatus) filters.selectedListStatus = selectedListStatus;
        }
        if (activeTab === 'ai_analysis') {
            if (selectedAiPromptId) filters.selectedAiPromptId = selectedAiPromptId;
            if (selectedAiListId) filters.selectedListId = selectedAiListId;
            if (selectedAiListStatus) filters.selectedListStatus = selectedAiListStatus;
        }
        
        setCurrentPage(1);
        tabPagination.current[activeTab] = { currentPage: 1, totalPages: 1 };
        fetchMasterData(activeTab, customer, 1, filters);
    };

    const getAdaptiveRowHeight = (rowCount: number) => {
        if (rowCount <= 0) return 7;
        const estimatedHeight = Math.floor(330 / rowCount);
        return Math.max(7, Math.min(200, estimatedHeight));
    };

    // ── Bulk selection helpers ──────────────────────────────────────────────
    const getActiveDataForTab = () => {
        switch (activeTab) {
            case 'companies': return companiesData;
            case 'prospects': return prospectsData;
            case 'unassigned_prospects': return unassignedProspectsData;
            case 'campaigns': return campaignsData;
            case 'blacklist': return blacklistData;
            case 'ai_analysis': return aiAnalysisData;
            default: return [];
        }
    };

    const toggleRowSelection = (id: number) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                if (next.size >= 50000) {
                    toast.error('Maximum 50000 records can be selected for bulk edit');
                    return prev;
                }
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAllOnPage = () => {
        const data = getActiveDataForTab();
        const pageIds = data.map((row: any) => row.id).filter(Boolean);
        const allSelected = pageIds.length > 0 && pageIds.every((id: number) => selectedRowIds.has(id));
        if (allSelected) {
            setSelectedRowIds(prev => {
                const next = new Set(prev);
                for (const id of pageIds) next.delete(id);
                return next;
            });
        } else {
            setSelectedRowIds(prev => {
                const next = new Set(prev);
                for (const id of pageIds) {
                    if (next.size >= 50000) {
                        toast.error('Maximum 50000 records can be selected for bulk edit');
                        break;
                    }
                    next.add(id);
                }
                return next;
            });
        }
    };

    const isAllPageSelected = () => {
        const data = getActiveDataForTab();
        const pageIds = data.map((row: any) => row.id).filter(Boolean);
        return pageIds.length > 0 && pageIds.every((id: number) => selectedRowIds.has(id));
    };

    const isSomePageSelected = () => {
        const data = getActiveDataForTab();
        const pageIds = data.map((row: any) => row.id).filter(Boolean);
        return pageIds.some((id: number) => selectedRowIds.has(id)) && !isAllPageSelected();
    };

    const getActiveTotalForTab = () => {
        switch (activeTab) {
            case 'companies': return companiesTotal;
            case 'prospects': return prospectsTotal;
            case 'unassigned_prospects': return unassignedProspectsTotal;
            case 'campaigns': return campaignsTotal;
            case 'blacklist': return blacklistTotal;
            case 'ai_analysis': return aiAnalysisTotal;
            default: return 0;
        }
    };

    const toggleColumnVisibility = (column: keyof typeof visibleColumns) => {
        setVisibleColumns(prev => ({
            ...prev,
            [column]: !prev[column]
        }));
    };

    // Fetch customer options
    const fetchCustomerOptions = async (userUuid: string, token: string) => {
        setFilterOptionsLoading(true);
        const backendUrl = getBackendUrl();
        
        try {
            const response = await fetch(`${backendUrl}/api/master-database/customer-options`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ userUuid })
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch customer options: ${response.status}`);
            }

            const data = await response.json();
            const options = data.filterOptions || {};
            const customerList = options.customers?.map((customer: string) => ({ value: customer, label: customer })) || [];
            setCustomers(customerList);
        } catch (error) {
            setCustomers([]);
        } finally {
            setFilterOptionsLoading(false);
        }
    };

    // Fetch tab-specific filter options
    const fetchTabFilterOptions = async (customer: string, dataType: string) => {
        if (!user) return;
        if (dataType === 'audit_receiver_search') {
            setFilterOptionsLoading(false);
            return;
        }
        
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        
        if (!token) return;
        
        try {
            const response = await fetch(`${backendUrl}/api/master-database/filter-options`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers: selectedCustomers, // Send the array of selected customers
                    dataType: dataType,
                    ...(dataType === 'campaigns' && selectedCampaignProfiles.length > 0 && { selectedCampaignProfiles })
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tab filter options: ${response.status}`);
            }

            const data = await response.json();
            const options = data.filterOptions || {};
            
            // Set filter options based on tab
            if (dataType === 'companies') {
                setIndustries(options.industries || []);
                setCountries(options.countries || []);
                setProvincies(options.provincies || []);
                setSizeRanges(options.sizeRanges || []);
                setBusinessTypes(options.businessTypes || []);
                setOfferingTypeOptions(options.offeringTypes || []);
                setCompanyPromptOptions(options.prompts || []);
                setScrapingNames(options.scrapingNames || []);
                setCities(options.cities || []);
                // Fetch company lists for the list filter dropdown
                try {
                    const listsRes = await fetch(`${backendUrl}/api/company-lists/all`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({}),
                    });
                    if (listsRes.ok) {
                        const listsData = await listsRes.json();
                        setCompanyLists((listsData.data || []).map((l: any) => ({ id: l.id, name: l.name || `List ${l.id}` })));
                    }
                } catch {}
            } else if (dataType === 'prospects') {
                // Note: profiles and prospectCampaigns are fetched separately via fetchProfiles/fetchProspectCampaigns
                setCampaignNames(options.campaignNames || []);
                setProspectStatuses(options.prospectStatuses || []);
                setProspectCompanySizeRanges(options.companySizeRanges || []);
                setProspectCompanyIndustries(options.companyIndustries || []);
                setLeadPhases(options.leadPhases || []);
                setGroupAreasOptions(options.groupAreas || []);
                setPersonaAreasOptions(options.personaAreas || []);
                setProspectCountryOptions(options.country || []);
                setPersonaLevelsOptions(options.personaLevels || []);
                setPersonaLevelOptions(options.personaLevel || []);
                setPersonaCategoryOptions(options.personaCategory || []);
                setProspectScrapingNamesOptions(options.scrapingNames || []);
                setCompanyPromptOptions(options.prompts || []);
                // Fetch prospect lists for the list filter dropdown (same as unassigned tab)
                try {
                    const listsRes = await fetch(`${backendUrl}/api/prospect-lists/all`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({}),
                    });
                    if (listsRes.ok) {
                        const listsData = await listsRes.json();
                        setProspectLists((listsData.data || []).map((l: any) => ({ id: l.id, name: l.name || `List ${l.id}` })));
                    }
                } catch {}
                // Fetch company lists for the Company List filter dropdown
                try {
                    const companyListsRes = await fetch(`${backendUrl}/api/company-lists/all`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({}),
                    });
                    if (companyListsRes.ok) {
                        const companyListsData = await companyListsRes.json();
                        setCompanyLists((companyListsData.data || []).map((l: any) => ({ id: l.id, name: l.name || `List ${l.id}` })));
                    }
                } catch {}
            } else if (dataType === 'unassigned_prospects') {
                setUnassignedCompanySizeRangesOptions(options.companySizeRanges || []);
                setUnassignedCompanyIndustriesOptions(options.companyIndustries || []);
                setUnassignedGroupAreasOptions(options.groupAreas || []);
                setUnassignedPersonaAreasOptions(options.personaAreas || []);
                setUnassignedCountryOptions(options.country || []);
                setUnassignedPersonaLevelsOptions(options.personaLevels || []);
                setUnassignedPersonaLevelOptions(options.personaLevel || []);
                setUnassignedPersonaCategoryOptions(options.personaCategory || []);
                setUnassignedScrapingNamesOptions(options.scrapingNames || []);
                setCompanyPromptOptions(options.prompts || []);
                // Fetch prospect lists for the list filter dropdown
                try {
                    const listsRes = await fetch(`${backendUrl}/api/prospect-lists/all`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({}),
                    });
                    if (listsRes.ok) {
                        const listsData = await listsRes.json();
                        setProspectLists((listsData.data || []).map((l: any) => ({ id: l.id, name: l.name || `List ${l.id}` })));
                    }
                } catch {}
                // Fetch company lists for the Company List filter dropdown
                try {
                    const companyListsRes = await fetch(`${backendUrl}/api/company-lists/all`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({}),
                    });
                    if (companyListsRes.ok) {
                        const companyListsData = await companyListsRes.json();
                        setCompanyLists((companyListsData.data || []).map((l: any) => ({ id: l.id, name: l.name || `List ${l.id}` })));
                    }
                } catch {}
            } else if (dataType === 'campaigns') {
                setCampaignProfileNames(options.profileNames || []);
                setCampaignNamesOptions(options.campaignNames || []);
                setCampaignTypes(options.campaignTypes || []);
                setCampaignContents(options.campaignContents || []);
                setCampaignSectors(options.campaignSectors || []);
                setCampaignCompanyAttributes(options.campaignCompanyAttributes || []);
                setCampaignPersonas(options.campaignPersonas || []);
            } else if (dataType === 'blacklist') {
                setFieldTargets(options.fieldTargets || []);
                setComparisonTypes(options.comparisonTypes || []);
            } else if (dataType === 'ai_analysis') {
                setAiPromptOptions(options.aiPrompts || []);
                // Also load company lists for the list filter
                try {
                    const listsRes = await fetch(`${backendUrl}/api/company-lists/all`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({}),
                    });
                    if (listsRes.ok) {
                        const listsData = await listsRes.json();
                        setCompanyLists((listsData.data || []).map((l: any) => ({ id: l.id, name: l.name || `List ${l.id}` })));
                    }
                } catch {}
            }
            // Add similar logic for other tabs when needed
            
        } catch (error) {
            console.error('❌ Tab Filter Options Error:', error);
        }
    };

    // Derived: whether the "Move Prospects" action button is enabled.
    // Uses the applied snapshot so the button only activates after Apply is clicked.
    const canMoveProspects = (() => {
        if (!appliedProspectFilters || dataLoading || prospectsData.length === 0) return false;
        const { statuses, profileIds } = appliedProspectFilters;
        return statuses.length === 1 && statuses[0] === 'Unknown' && profileIds.length === 1;
    })();
    // Delete is enabled whenever status = Unknown is the only status filter applied
    const canDeleteProspects = !!(
        appliedProspectFilters && !dataLoading && prospectsData.length > 0 &&
        appliedProspectFilters.statuses.length === 1 && appliedProspectFilters.statuses[0] === 'Unknown'
    );
    // Resolve the display name for the "From Campaign" field in the widget
    const moveProspectsFromCampaignName = (() => {
        if (!appliedProspectFilters) return '';
        if (appliedProspectFilters.campaignNames.length === 1) return appliedProspectFilters.campaignNames[0];
        if (appliedProspectFilters.prospectCampaignIds.length === 1) {
            return prospectCampaigns.find(c => c.id === appliedProspectFilters.prospectCampaignIds[0])?.name
                ?? appliedProspectFilters.prospectCampaignIds[0];
        }
        return '';
    })();

    // Resolve the "From Campaign" ID for the move widget
    const moveProspectsFromCampaignId = (() => {
        if (!appliedProspectFilters) return '';
        if (appliedProspectFilters.prospectCampaignIds.length === 1) return appliedProspectFilters.prospectCampaignIds[0];
        if (appliedProspectFilters.campaignNames.length === 1) {
            return prospectCampaigns.find(c => c.name === appliedProspectFilters.campaignNames[0])?.id ?? '';
        }
        return '';
    })();

    // Whether the Move Prospects button inside the widget is ready
    const canExecuteMove = moveProspectsFromCampaignName !== '' && moveWidgetTargetProfileId !== '' && moveWidgetTargetCampaignId !== '' && moveWidgetTargetCampaignId !== moveProspectsFromCampaignId;
    const [moveProspectsLoading, setMoveProspectsLoading] = useState(false);

    const handleMoveProspects = async () => {
        if (!user || !canExecuteMove || !appliedProspectFilters) return;

        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { toast.error('Authentication token not found'); return; }

        setMoveProspectsLoading(true);
        try {
            const response = await fetch(`${backendUrl}/api/master-database/move-prospects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers,
                    targetCampaignId: moveWidgetTargetCampaignId,
                    selectedProfileIds: appliedProspectFilters.profileIds,
                    selectedCampaignIds: appliedProspectFilters.prospectCampaignIds,
                    selectedCampaignNames: appliedProspectFilters.campaignNames,
                    selectedProspectStatuses: appliedProspectFilters.statuses,
                    campaignProspectIds: selectedRowIds.size > 0 ? Array.from(selectedRowIds) : undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error?.message || `Failed: ${response.status}`);
            }

            const result = await response.json();
            toast.success(result.message || `${result.count} prospect(s) queued for moving`);
            setShowMoveProspectsWidget(false);
        } catch (error) {
            console.error('❌ Move Prospects Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to move prospects');
        } finally {
            setMoveProspectsLoading(false);
        }
    };

    const handleDeleteProspects = async () => {
        if (!user || !canDeleteProspects) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { toast.error('Authentication token not found'); return; }
        setDeleteProspectsLoading(true);
        try {
            const filters = buildCurrentFilters();
            const response = await fetch(`${backendUrl}/api/master-database/delete-prospects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers,
                    campaignProspectIds: selectedRowIds.size > 0 ? Array.from(selectedRowIds) : undefined,
                    ...filters,
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.error?.message || `Request failed: ${response.status}`);
            }
            const data = await response.json();
            toast.success(`${data.count} prospect(s) deleted`);
            setShowDeleteProspectsConfirm(false);
            setAppliedProspectFilters(null);
            const refreshFilters = buildCurrentFilters();
            fetchMasterData('prospects', selectedCustomers.length > 0 ? selectedCustomers[0] : '', 1, refreshFilters);
        } catch (error) {
            console.error('❌ Delete Prospects Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete prospects');
        } finally {
            setDeleteProspectsLoading(false);
        }
    };

    // Fetch campaigns for the Assign Prospects widget by profile ID
    const fetchAssignWidgetCampaigns = async (profileId: string) => {
        if (!user || !profileId || selectedCustomers.length === 0) {
            setAssignWidgetCampaigns([]);
            return;
        }
        setAssignWidgetCampaignsLoading(true);
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { setAssignWidgetCampaignsLoading(false); return; }
        try {
            const response = await fetch(`${backendUrl}/api/master-database/prospect-campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers: selectedCustomers,
                    selectedProfileIds: [profileId],
                })
            });
            if (!response.ok) throw new Error(`Failed to fetch campaigns: ${response.status}`);
            const data = await response.json();
            setAssignWidgetCampaigns(data.campaigns || []);
        } catch (error) {
            console.error('❌ Fetch Assign Widget Campaigns Error:', error);
            setAssignWidgetCampaigns([]);
        } finally {
            setAssignWidgetCampaignsLoading(false);
        }
    };

    const handleAssignProspects = async () => {
        if (!user || !assignWidgetTargetCampaignId) return;

        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { toast.error('Authentication token not found'); return; }

        setAssignProspectsLoading(true);
        try {
            const filters = buildCurrentFilters();
            const response = await fetch(`${backendUrl}/api/master-database/assign-prospects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers,
                    targetCampaignId: assignWidgetTargetCampaignId,
                    customerProspectIds: selectedRowIds.size > 0 ? Array.from(selectedRowIds) : undefined,
                    maxPerCompanyBatch: assignMaxPerCompanyBatch ? Number(assignMaxPerCompanyBatch) : undefined,
                    maxPerCompanyTotal: assignMaxPerCompanyTotal ? Number(assignMaxPerCompanyTotal) : undefined,
                    limitCountBasis: assignLimitCountBasis,
                    ...filters,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error?.message || `Failed: ${response.status}`);
            }

            const result = await response.json();
            toast.success(result.message || `${result.count} prospect(s) queued for assignment`, { duration: 10000 });
            setShowAssignProspectsWidget(false);
            setSelectedRowIds(new Set());
            setAssignMaxPerCompanyBatch('');
            setAssignMaxPerCompanyTotal('');
            setAssignLimitCountBasis('total');
            // Refresh the unassigned prospects data
            const customer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
            const refreshFilters = buildCurrentFilters();
            fetchMasterData('unassigned_prospects', customer, currentPage, refreshFilters);
        } catch (error) {
            console.error('❌ Assign Prospects Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to assign prospects');
        } finally {
            setAssignProspectsLoading(false);
        }
    };

    const fetchMessengerCampaigns = async (profileId: string) => {
        if (!user || !profileId || selectedCustomers.length === 0) {
            setMessengerAssignCampaigns([]);
            return;
        }
        setMessengerAssignCampaignsLoading(true);
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { setMessengerAssignCampaignsLoading(false); return; }
        try {
            const response = await fetch(`${backendUrl}/api/master-database/prospect-campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers: selectedCustomers,
                    selectedProfileIds: [profileId],
                    campaignTypeFilter: 'Messenger',
                })
            });
            if (!response.ok) throw new Error(`Failed to fetch campaigns: ${response.status}`);
            const data = await response.json();
            setMessengerAssignCampaigns(data.campaigns || []);
        } catch (error) {
            console.error('❌ Fetch Messenger Campaigns Error:', error);
            setMessengerAssignCampaigns([]);
        } finally {
            setMessengerAssignCampaignsLoading(false);
        }
    };

    const handleAssignToMessenger = async () => {
        if (!user || !messengerAssignTargetCampaignId || selectedRowIds.size === 0) return;

        // Backend caps this operation at 10,000 ids per call.
        if (selectedRowIds.size > 10000) {
            toast.error('Maximum 10,000 prospects can be assigned to a Messenger campaign at once. Please narrow your selection.');
            return;
        }

        // Validate that all selected prospects have a status that may enter a Messenger campaign.
        // Keep in sync with MESSENGER_ASSIGNABLE_STATUSES in the backend's master-database controller.
        const messengerAssignableStatuses = ['Checked', 'Completed', 'First connection'];
        const invalidProspects = prospectsData
            .filter(p => selectedRowIds.has(p.id))
            .filter(p => !messengerAssignableStatuses.includes(p.prospect_status));

        if (invalidProspects.length > 0) {
            toast.error(`${invalidProspects.length} selected prospect(s) do not have "Checked", "Completed" or "First connection" status. Please deselect them first.`);
            return;
        }

        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { toast.error('Authentication token not found'); return; }

        setMessengerAssignLoading(true);
        try {
            const response = await fetch(`${backendUrl}/api/master-database/assign-to-messenger-campaign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers,
                    targetCampaignId: messengerAssignTargetCampaignId,
                    campaignProspectIds: Array.from(selectedRowIds),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error?.message || `Failed: ${response.status}`);
            }

            const result = await response.json();
            let message = result.message || `${result.count} prospect(s) queued for Messenger assignment`;
            if (result.skipped > 0) {
                message += ` (${result.skipped} skipped: no customer-prospect found)`;
            }
            toast.success(message);
            setShowMessengerAssignWidget(false);
            setSelectedRowIds(new Set());
            // Refresh the prospects data
            const customer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
            const refreshFilters = buildCurrentFilters();
            fetchMasterData('prospects', customer, currentPage, refreshFilters);
        } catch (error) {
            console.error('❌ Assign to Messenger Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to assign to Messenger campaign');
        } finally {
            setMessengerAssignLoading(false);
        }
    };

    // Fetch profiles for the active master database tab.
    const fetchProfiles = async () => {
        if (!user || (selectedCustomers.length === 0 && activeTab !== 'audit_receiver_search')) return;
        
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        
        if (!token) return;
        
        try {
            const response = await fetch(`${backendUrl}/api/master-database/prospect-profiles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers: activeTab === 'audit_receiver_search' ? [] : selectedCustomers
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch profiles: ${response.status}`);
            }

            const data = await response.json();
            setProfiles(data.profiles || []);
            // Clear selected profiles and campaigns when customer changes
            setSelectedProfiles([]);
            setSelectedProspectCampaigns([]);
            setProspectCampaigns([]);
        } catch (error) {
            console.error('❌ Fetch Profiles Error:', error);
            setProfiles([]);
        }
    };

    // Fetch campaigns based on selected profiles
    const fetchProspectCampaigns = async (selectedProfiles: string[]) => {
        if (!user || selectedCustomers.length === 0 || selectedProfiles.length === 0) {
            setProspectCampaigns([]);
            return;
        }        
        
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        
        if (!token) return;
        
        try {
            const response = await fetch(`${backendUrl}/api/master-database/prospect-campaigns`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers: selectedCustomers,
                    profiles: selectedProfiles
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch campaigns: ${response.status}`);
            }

            const data = await response.json();
            setProspectCampaigns(data.campaigns || []);
            // Clear selected campaigns when profiles change
            setSelectedProspectCampaigns([]);
        } catch (error) {
            console.error('❌ Fetch Prospect Campaigns Error:', error);
            setProspectCampaigns([]);
        }
    };

    // Clears the Log Inspector search form and results.
    const clearAdminLookup = () => {
        setAdminLookupQuery('');
        setAdminLookupProfileId('');
        setAdminLookupResults([]);
        setAdminLookupError(null);
    };

    // Lookup audit-log or data-receiver records for admins
    const fetchAdminAuditLookup = async () => {
        if (!user) return;

        const queryText = adminLookupQuery.trim();
        if (!queryText) {
            toast.error('Enter a URL or prospect ID to search.');
            return;
        }

        setAdminLookupLoading(true);
        setAdminLookupError(null);
        setAdminLookupResults([]);

        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) {
            setAdminLookupLoading(false);
            toast.error('Authentication token not found.');
            return;
        }

        try {
            const endpoint = adminLookupSource === 'audit-log'
                ? `${backendUrl}/api/master-database/log-inspector/audit-logs`
                : `${backendUrl}/api/master-database/log-inspector/data-receivers`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    queryText,
                    profileId: adminLookupProfileId.trim() || undefined
                })
            });

            if (!response.ok) {
                throw new Error(`Lookup failed: ${response.statusText || response.status}`);
            }

            const data = await response.json();
            const results = Array.isArray(data)
                ? data
                : Array.isArray(data.data)
                    ? data.data
                    : (data?.data ? data.data : []);
            setAdminLookupResults(results || []);
            if (!results || results.length === 0) {
                setAdminLookupError('No matching records found.');
            }
        } catch (error) {
            console.error('❌ Admin Audit Lookup Error:', error);
            setAdminLookupError(error instanceof Error ? error.message : 'Lookup failed.');
        } finally {
            setAdminLookupLoading(false);
        }
    };

    // Fetch campaigns for the Move Prospects widget by profile ID
    const fetchMoveWidgetCampaigns = async (profileId: string) => {
        if (!user || !profileId || selectedCustomers.length === 0) {
            setMoveWidgetCampaigns([]);
            return;
        }
        setMoveWidgetCampaignsLoading(true);
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { setMoveWidgetCampaignsLoading(false); return; }
        try {
            const response = await fetch(`${backendUrl}/api/master-database/prospect-campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers: selectedCustomers,
                    selectedProfileIds: [profileId],
                })
            });
            if (!response.ok) throw new Error(`Failed to fetch campaigns: ${response.status}`);
            const data = await response.json();
            setMoveWidgetCampaigns(data.campaigns || []);
        } catch (error) {
            console.error('❌ Fetch Move Widget Campaigns Error:', error);
            setMoveWidgetCampaigns([]);
        } finally {
            setMoveWidgetCampaignsLoading(false);
        }
    };

    // Fetch master database data
    const fetchMasterData = async (dataType: string, customer: string, page: number = 1, filters?: any) => {
        if (!user) return;

        // Capture scroll position of the fetched tab's container before re-render resets it
        const tabScrollRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
            companies: companiesScrollRef,
            prospects: prospectsScrollRef,
            unassigned_prospects: unassignedProspectsScrollRef,
            campaigns: campaignsScrollRef,
            blacklist: blacklistScrollRef,
            ai_analysis: aiAnalysisScrollRef,
        };
        const savedScrollLeft = tabScrollRefs[dataType]?.current?.scrollLeft ?? 0;

        setDataLoading(true);
        setIsCountLoading(true);
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        
        if (!token) {
            toast.error('Authentication token not found');
            setDataLoading(false);
            setIsCountLoading(false);
            return;
        }
        
        const baseRequestBody = {
            userUuid: user.uuid,
            dataType: dataType,
            page: page,
            pageSize: pageSize,
            ...buildExcludeFilters(), // Per-column Exclude toggles (harmless when the matching search is empty)
            aiExclude, // Per-AI-field Exclude toggles for the AI analysis tab
            ...(filters || {}) // Include any filters (including selectedCustomers)
        };
        
        console.log('🔍 Master Database API Request:', {
            url: `${backendUrl}/api/master-database`,
            method: 'POST',
            body: baseRequestBody
        });

        // Helper to set data for the active tab
        const setTabData = (result: any) => {
            switch (dataType) {
                case 'companies':
                    setCompaniesData(result.data || []);
                    requestAnimationFrame(() => {
                        if (companiesScrollRef.current) companiesScrollRef.current.scrollLeft = savedScrollLeft;
                    });
                    break;
                case 'prospects':
                    setProspectsData(result.data || []);
                    requestAnimationFrame(() => {
                        if (prospectsScrollRef.current) prospectsScrollRef.current.scrollLeft = savedScrollLeft;
                    });
                    break;
                case 'unassigned_prospects':
                    setUnassignedProspectsData(result.data || []);
                    requestAnimationFrame(() => {
                        if (unassignedProspectsScrollRef.current) unassignedProspectsScrollRef.current.scrollLeft = savedScrollLeft;
                    });
                    break;
                case 'campaigns':
                    setCampaignsData(result.data || []);
                    requestAnimationFrame(() => {
                        if (campaignsScrollRef.current) campaignsScrollRef.current.scrollLeft = savedScrollLeft;
                    });
                    break;
                case 'blacklist':
                    setBlacklistData(result.data || []);
                    requestAnimationFrame(() => {
                        if (blacklistScrollRef.current) blacklistScrollRef.current.scrollLeft = savedScrollLeft;
                    });
                    break;
                case 'ai_analysis':
                    setAiAnalysisData(result.data || []);
                    if (result.data && result.data.length > 0) {
                        const fields = getAnalysisFields(result.data);
                        setAnalysisFields(fields);
                        // Filter options are fetched separately (complete, server-side,
                        // scoped to customer + prompt) by the effect that watches
                        // analysisFields — not derived from this page of data.
                    }
                    requestAnimationFrame(() => {
                        if (aiAnalysisScrollRef.current) aiAnalysisScrollRef.current.scrollLeft = savedScrollLeft;
                    });
                    break;
            }
        };

        const setTabTotal = (total: number) => {
            switch (dataType) {
                case 'companies': setCompaniesTotal(total); break;
                case 'prospects': setProspectsTotal(total); break;
                case 'unassigned_prospects': setUnassignedProspectsTotal(total); break;
                case 'campaigns': setCampaignsTotal(total); break;
                case 'blacklist': setBlacklistTotal(total); break;
                case 'ai_analysis': setAiAnalysisTotal(total); break;
            }
        };
        
        try {
            // Phase 1: Fetch data without count (fast)
            const dataResponse = await fetch(`${backendUrl}/api/master-database`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ...baseRequestBody, skipCount: true })
            });

            if (!dataResponse.ok) {
                throw new Error(`Failed to fetch ${dataType}: ${dataResponse.status}`);
            }

            const dataResult = await dataResponse.json();
            
            console.log('✅ Master Database Phase 1 (data):', {
                dataType,
                page,
                recordsReceived: dataResult.data?.length || 0,
            });
            
            // Show data immediately
            setTabData(dataResult);
            setDataLoading(false);

            // Phase 2: Fetch count in background
            try {
                const countResponse = await fetch(`${backendUrl}/api/master-database`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ ...baseRequestBody, countOnly: true })
                });

                if (!countResponse.ok) {
                    throw new Error(`Failed to fetch count for ${dataType}: ${countResponse.status}`);
                }

                const countResult = await countResponse.json();
                const totalRecords = countResult.meta?.totalRecords || 0;
                const newTotalPages = countResult.meta?.pageCount || 1;

                console.log('✅ Master Database Phase 2 (count):', {
                    dataType,
                    totalRecords,
                    totalPages: newTotalPages,
                });

                setTabTotal(totalRecords);
                setTotalPages(newTotalPages);
                tabPagination.current[dataType] = {
                    currentPage: page,
                    totalPages: newTotalPages,
                };
            } catch (countError) {
                console.error('⚠️ Count fetch failed, falling back:', countError);
                // Fallback: at least set a reasonable page count based on data received
                const fallbackTotalPages = dataResult.data?.length === pageSize ? page + 1 : page;
                setTotalPages(fallbackTotalPages);
                tabPagination.current[dataType] = {
                    currentPage: page,
                    totalPages: fallbackTotalPages,
                };
            } finally {
                setIsCountLoading(false);
            }
        } catch (error) {
            console.error('❌ Master Database API Error:', {
                dataType,
                customer,
                page,
                error: error instanceof Error ? error.message : error
            });
            toast.error(`Failed to load ${dataType} data`);
            setDataLoading(false);
            setIsCountLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });

            localStorage.clear();
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

            toast.success('Successfully logged out!', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                },
            });

            router.push('/auth/login');
        } catch (error) {
            console.error('Logout error:', error);
            router.push('/auth/login');
        }
    };

    // Build the current filters object (extracted so it can be reused)
    const buildCurrentFilters = () => {
        const filters: any = {};
        
        // Customer filter
        if (selectedCustomers.length > 0) {
            filters.selectedCustomers = selectedCustomers;
        }
        
        // Add sorting parameters
        if (sortField) {
            filters.sortField = sortField;
            filters.sortDirection = sortDirection;
        } else if (activeTab === 'campaigns') {
            filters.sortField = 'live';
            filters.sortDirection = 'desc';
        }
        
        // Companies tab filters
        if (activeTab === 'companies') {
            if (searchCompanyId.trim()) filters.searchCompanyId = searchCompanyId.trim();
            if (includeEmptyCompanyId) filters.includeEmptyCompanyId = true;
            if (notEmptyCompanyId) filters.notEmptyCompanyId = true;
            if (searchName.trim()) filters.searchName = searchName.trim();
            if (includeEmptyName) filters.includeEmptyName = true;
            if (notEmptyName) filters.notEmptyName = true;
            if (searchDescription.trim()) filters.searchDescription = searchDescription.trim();
            if (includeEmptyDescription) filters.includeEmptyDescription = true;
            if (notEmptyDescription) filters.notEmptyDescription = true;
            if (searchWebsite.trim()) filters.searchWebsite = searchWebsite.trim();
            if (includeEmptyWebsite) filters.includeEmptyWebsite = true;
            if (notEmptyWebsite) filters.notEmptyWebsite = true;
            if (searchLinkedIn.trim()) filters.searchLinkedIn = searchLinkedIn.trim();
            if (includeEmptyLinkedIn) filters.includeEmptyLinkedIn = true;
            if (notEmptyLinkedIn) filters.notEmptyLinkedIn = true;
            if (selectedIndustries.length > 0) filters.selectedIndustries = selectedIndustries;
            if (includeEmptyIndustry) filters.includeEmptyIndustry = true;
            if (notEmptyIndustry) filters.notEmptyIndustry = true;
            if (selectedCountries.length > 0) filters.selectedCountries = selectedCountries;
            if (includeEmptyCountry) filters.includeEmptyCountry = true;
            if (notEmptyCountry) filters.notEmptyCountry = true;
            if (selectedProvincies.length > 0) filters.selectedProvincies = selectedProvincies;
            if (includeEmptyProvincie) filters.includeEmptyProvincie = true;
            if (notEmptyProvincie) filters.notEmptyProvincie = true;
            if (selectedSizeRanges.length > 0) filters.selectedSizeRanges = selectedSizeRanges;
            if (includeEmptySizeRange) filters.includeEmptySizeRange = true;
            if (notEmptySizeRange) filters.notEmptySizeRange = true;
            if (selectedBusinessTypes.length > 0) filters.selectedBusinessTypes = selectedBusinessTypes;
            if (includeEmptyBusinessType) filters.includeEmptyBusinessType = true;
            if (notEmptyBusinessType) filters.notEmptyBusinessType = true;
            if (selectedOfferingTypes.length > 0) filters.selectedOfferingTypes = selectedOfferingTypes;
            if (includeEmptyOfferingType) filters.includeEmptyOfferingType = true;
            if (notEmptyOfferingType) filters.notEmptyOfferingType = true;
            if (hasWebsiteFilter) filters.hasWebsite = hasWebsiteFilter;
            if (selectedCompanyPrompts.length > 0) filters.selectedCompanyPrompts = selectedCompanyPrompts;
            if (excludeCompanyPrompt) filters.excludeCompanyPrompt = true;
            if (selectedCities.length > 0) filters.selectedCities = selectedCities;
            if (selectedScrapingNames.length > 0) filters.selectedScrapingNames = selectedScrapingNames;
            if (includeEmptyScrapingName) filters.includeEmptyScrapingName = true;
            if (notEmptyScrapingName) filters.notEmptyScrapingName = true;
            if (minSize.trim()) filters.minSize = minSize.trim();
            if (maxSize.trim()) filters.maxSize = maxSize.trim();
            if (blacklistedFilter) filters.blacklistedFilter = blacklistedFilter;
            if (websiteScrapeFilter) filters.websiteScrapeFilter = websiteScrapeFilter;
            if (companiesInCampaignMin.trim() !== '' || companiesInCampaignMax.trim() !== '') {
                filters.companiesInCampaignBasis = companiesInCampaignBasis;
                if (companiesInCampaignMin.trim() !== '') filters.companiesInCampaignMin = companiesInCampaignMin.trim();
                if (companiesInCampaignMax.trim() !== '') filters.companiesInCampaignMax = companiesInCampaignMax.trim();
            }
            if (createdAtFrom.trim()) filters.createdAtFrom = createdAtFrom.trim();
            if (createdAtTo.trim()) filters.createdAtTo = createdAtTo.trim();
            if (includeEmptyCreatedAt) filters.includeEmptyCreatedAt = true;
            if (notEmptyCreatedAt) filters.notEmptyCreatedAt = true;
            if (selectedListId) filters.selectedListId = selectedListId;
            if (selectedListStatus) filters.selectedListStatus = selectedListStatus;
        }
        
        // Prospects tab filters
        if (activeTab === 'prospects') {
            if (selectedProfiles.length > 0) filters.selectedProfiles = selectedProfiles;
            if (selectedProspectCampaigns.length > 0) filters.selectedProspectCampaigns = selectedProspectCampaigns;
            if (searchProspectFirstName.trim()) filters.searchProspectFirstName = searchProspectFirstName.trim();
            if (includeEmptyProspectFirstName) filters.includeEmptyProspectFirstName = true;
            if (notEmptyProspectFirstName) filters.notEmptyProspectFirstName = true;
            if (searchProspectLastName.trim()) filters.searchProspectLastName = searchProspectLastName.trim();
            if (includeEmptyProspectLastName) filters.includeEmptyProspectLastName = true;
            if (notEmptyProspectLastName) filters.notEmptyProspectLastName = true;
            if (searchProspectEmail.trim()) filters.searchProspectEmail = searchProspectEmail.trim();
            if (emailFilter) filters.emailFilter = emailFilter;
            if (searchProspectPhone.trim()) filters.searchProspectPhone = searchProspectPhone.trim();
            if (phoneFilter) filters.phoneFilter = phoneFilter;
            if (searchProspectCompany.trim()) filters.searchProspectCompany = searchProspectCompany.trim();
            if (includeEmptyProspectCompany) filters.includeEmptyProspectCompany = true;
            if (notEmptyProspectCompany) filters.notEmptyProspectCompany = true;
            if (searchProspectLinkedInUrl.trim()) filters.searchProspectLinkedInUrl = searchProspectLinkedInUrl.trim();
            if (includeEmptyProspectLinkedInUrl) filters.includeEmptyProspectLinkedInUrl = true;
            if (notEmptyProspectLinkedInUrl) filters.notEmptyProspectLinkedInUrl = true;
            if (searchProspectId.trim()) filters.searchProspectId = searchProspectId.trim();
            if (includeEmptyProspectId) filters.includeEmptyProspectId = true;
            if (notEmptyProspectId) filters.notEmptyProspectId = true;
            if (searchProspectContactId.trim()) filters.searchProspectContactId = searchProspectContactId.trim();
            if (includeEmptyProspectContactId) filters.includeEmptyProspectContactId = true;
            if (notEmptyProspectContactId) filters.notEmptyProspectContactId = true;
            if (searchProspectBirthday.trim()) filters.searchProspectBirthday = searchProspectBirthday.trim();
            if (birthdayFilter) filters.birthdayFilter = birthdayFilter;
            if (searchProspectCompanyId.trim()) filters.searchProspectCompanyId = searchProspectCompanyId.trim();
            if (includeEmptyProspectCompanyId) filters.includeEmptyProspectCompanyId = true;
            if (notEmptyProspectCompanyId) filters.notEmptyProspectCompanyId = true;
            if (selectedCampaignNames.length > 0) filters.selectedCampaignNames = selectedCampaignNames;
            if (includeEmptyProspectCampaignName) filters.includeEmptyProspectCampaignName = true;
            if (notEmptyProspectCampaignName) filters.notEmptyProspectCampaignName = true;
            if (selectedProspectStatuses.length > 0) filters.selectedProspectStatuses = selectedProspectStatuses;
            if (includeEmptyProspectStatus) filters.includeEmptyProspectStatus = true;
            if (notEmptyProspectStatus) filters.notEmptyProspectStatus = true;
            if (searchProspectJobTitle.trim()) filters.searchProspectJobTitle = searchProspectJobTitle.trim();
            if (includeEmptyProspectJobTitle) filters.includeEmptyProspectJobTitle = true;
            if (notEmptyProspectJobTitle) filters.notEmptyProspectJobTitle = true;
            if (linkedInGroupNameFilter) filters.linkedInGroupNameFilter = linkedInGroupNameFilter;
            if (searchProspectLinkedInGroupName.trim()) filters.searchProspectLinkedInGroupName = searchProspectLinkedInGroupName.trim();
            if (includeEmptyProspectLinkedInGroupName) filters.includeEmptyProspectLinkedInGroupName = true;
            if (notEmptyProspectLinkedInGroupName) filters.notEmptyProspectLinkedInGroupName = true;
            if (selectedGroupAreas.length > 0) filters.selectedGroupAreas = selectedGroupAreas;
            if (includeEmptyGroupAreas) filters.includeEmptyGroupAreas = true;
            if (notEmptyGroupAreas) filters.notEmptyGroupAreas = true;
            if (selectedPersonaAreas.length > 0) filters.selectedPersonaAreas = selectedPersonaAreas;
            if (includeEmptyPersonaAreas) filters.includeEmptyPersonaAreas = true;
            if (notEmptyPersonaAreas) filters.notEmptyPersonaAreas = true;
            if (selectedProspectCountry.length > 0) filters.selectedProspectCountry = selectedProspectCountry;
            if (includeEmptyProspectCountry) filters.includeEmptyProspectCountry = true;
            if (notEmptyProspectCountry) filters.notEmptyProspectCountry = true;
            if (selectedPersonaLevels.length > 0) filters.selectedPersonaLevels = selectedPersonaLevels;
            if (includeEmptyPersonaLevels) filters.includeEmptyPersonaLevels = true;
            if (notEmptyPersonaLevels) filters.notEmptyPersonaLevels = true;
            if (selectedPersonaLevel.length > 0) filters.selectedPersonaLevel = selectedPersonaLevel;
            if (includeEmptyPersonaLevel) filters.includeEmptyPersonaLevel = true;
            if (notEmptyPersonaLevel) filters.notEmptyPersonaLevel = true;
            if (selectedPersonaCategory.length > 0) filters.selectedPersonaCategory = selectedPersonaCategory;
            if (includeEmptyPersonaCategory) filters.includeEmptyPersonaCategory = true;
            if (notEmptyPersonaCategory) filters.notEmptyPersonaCategory = true;
            if (selectedProspectListId) filters.selectedListId = selectedProspectListId;
            if (selectedProspectListStatus) filters.selectedListStatus = selectedProspectListStatus;
            if (selectedProspectCompanyListId) filters.selectedCompanyListId = selectedProspectCompanyListId;
            if (selectedProspectCompanyListStatus) filters.selectedCompanyListStatus = selectedProspectCompanyListStatus;
            if (searchProspectCompanyCompanyId.trim()) filters.searchProspectCompanyCompanyId = searchProspectCompanyCompanyId.trim();
            if (includeEmptyProspectCompanyCompanyId) filters.includeEmptyProspectCompanyCompanyId = true;
            if (notEmptyProspectCompanyCompanyId) filters.notEmptyProspectCompanyCompanyId = true;
            if (searchProspectCompanyWebsite.trim()) filters.searchProspectCompanyWebsite = searchProspectCompanyWebsite.trim();
            if (includeEmptyProspectCompanyWebsite) filters.includeEmptyProspectCompanyWebsite = true;
            if (notEmptyProspectCompanyWebsite) filters.notEmptyProspectCompanyWebsite = true;
            if (searchProspectCompanyLinkedIn.trim()) filters.searchProspectCompanyLinkedIn = searchProspectCompanyLinkedIn.trim();
            if (includeEmptyProspectCompanyLinkedIn) filters.includeEmptyProspectCompanyLinkedIn = true;
            if (notEmptyProspectCompanyLinkedIn) filters.notEmptyProspectCompanyLinkedIn = true;
            if (searchProspectCompanyCity.trim()) filters.searchProspectCompanyCity = searchProspectCompanyCity.trim();
            if (includeEmptyProspectCompanyCity) filters.includeEmptyProspectCompanyCity = true;
            if (notEmptyProspectCompanyCity) filters.notEmptyProspectCompanyCity = true;
            if (minProspectCompanySize.trim()) filters.minProspectCompanySize = minProspectCompanySize.trim();
            if (maxProspectCompanySize.trim()) filters.maxProspectCompanySize = maxProspectCompanySize.trim();
            if (selectedProspectCompanySizeRanges.length > 0) filters.selectedProspectCompanySizeRanges = selectedProspectCompanySizeRanges;
            if (includeEmptyProspectCompanySizeRange) filters.includeEmptyProspectCompanySizeRange = true;
            if (notEmptyProspectCompanySizeRange) filters.notEmptyProspectCompanySizeRange = true;
            if (selectedProspectCompanyIndustries.length > 0) filters.selectedProspectCompanyIndustries = selectedProspectCompanyIndustries;
            if (includeEmptyProspectCompanyIndustry) filters.includeEmptyProspectCompanyIndustry = true;
            if (notEmptyProspectCompanyIndustry) filters.notEmptyProspectCompanyIndustry = true;
            if (searchProspectCompanyBusinessType.trim()) filters.searchProspectCompanyBusinessType = searchProspectCompanyBusinessType.trim();
            if (includeEmptyProspectCompanyBusinessType) filters.includeEmptyProspectCompanyBusinessType = true;
            if (notEmptyProspectCompanyBusinessType) filters.notEmptyProspectCompanyBusinessType = true;
            if (searchProspectCompanyCountry.trim()) filters.searchProspectCompanyCountry = searchProspectCompanyCountry.trim();
            if (includeEmptyProspectCompanyCountry) filters.includeEmptyProspectCompanyCountry = true;
            if (notEmptyProspectCompanyCountry) filters.notEmptyProspectCompanyCountry = true;
            if (searchProspectCompanyProvincie.trim()) filters.searchProspectCompanyProvincie = searchProspectCompanyProvincie.trim();
            if (includeEmptyProspectCompanyProvincie) filters.includeEmptyProspectCompanyProvincie = true;
            if (notEmptyProspectCompanyProvincie) filters.notEmptyProspectCompanyProvincie = true;
            if (searchProspectDateConnected.trim()) filters.searchProspectDateConnected = searchProspectDateConnected.trim();
            if (includeEmptyProspectDateConnected) filters.includeEmptyProspectDateConnected = true;
            if (notEmptyProspectDateConnected) filters.notEmptyProspectDateConnected = true;
            if (searchProspectDateConnectionRequested.trim()) filters.searchProspectDateConnectionRequested = searchProspectDateConnectionRequested.trim();
            if (includeEmptyProspectDateConnectionRequested) filters.includeEmptyProspectDateConnectionRequested = true;
            if (notEmptyProspectDateConnectionRequested) filters.notEmptyProspectDateConnectionRequested = true;
            if (searchProspectDateReplied.trim()) filters.searchProspectDateReplied = searchProspectDateReplied.trim();
            if (includeEmptyProspectDateReplied) filters.includeEmptyProspectDateReplied = true;
            if (notEmptyProspectDateReplied) filters.notEmptyProspectDateReplied = true;
            if (searchProspectDatePositiveTag.trim()) filters.searchProspectDatePositiveTag = searchProspectDatePositiveTag.trim();
            if (includeEmptyProspectDatePositiveTag) filters.includeEmptyProspectDatePositiveTag = true;
            if (notEmptyProspectDatePositiveTag) filters.notEmptyProspectDatePositiveTag = true;
            if (selectedProspectScrapingNames.length > 0) filters.selectedProspectScrapingNames = selectedProspectScrapingNames;
            if (searchProspectScrapingName.trim()) filters.searchProspectScrapingName = searchProspectScrapingName.trim();
            if (includeEmptyProspectScrapingName) filters.includeEmptyProspectScrapingName = true;
            if (notEmptyProspectScrapingName) filters.notEmptyProspectScrapingName = true;
            if (stopOutreachFilter) filters.stopOutreachFilter = stopOutreachFilter;
            if (selectedLeadPhases.length > 0) filters.selectedLeadPhases = selectedLeadPhases;
            if (includeEmptyLeadPhase) filters.includeEmptyLeadPhase = true;
            if (notEmptyLeadPhase) filters.notEmptyLeadPhase = true;
            if (emailSentFilter) filters.emailSentFilter = emailSentFilter;
            if (blacklistedProspectFilter) filters.blacklistedProspectFilter = blacklistedProspectFilter;
            if (crmFilter) filters.crmFilter = crmFilter;
            if (prospectJobChangeFilter.length > 0) filters.prospectJobChangeFilter = prospectJobChangeFilter;
            if (includeEmptyProspectJobChange) filters.includeEmptyProspectJobChange = true;
            if (notEmptyProspectJobChange) filters.notEmptyProspectJobChange = true;
            if (prospectJobChangeDateFrom) filters.prospectJobChangeDateFrom = prospectJobChangeDateFrom;
            if (prospectJobChangeDateTo) filters.prospectJobChangeDateTo = prospectJobChangeDateTo;
            if (prospectsAiPromptName) {
                filters.prospectsAiPromptName = prospectsAiPromptName;
                if (prospectsAiSelectedFields.length > 0) filters.prospectsAiSelectedFields = prospectsAiSelectedFields;
                if (prospectsAiFieldFilters.length > 0) filters.prospectsAiFieldFilters = prospectsAiFieldFilters.map(f => ({ ...f, exclude: !!prospectsAiFieldExclude[f.field] }));
                const activeProspectsMulti = Object.fromEntries(Object.entries(prospectsAiMultiSelectFilters).filter(([, v]) => v.length > 0));
                if (Object.keys(activeProspectsMulti).length > 0) filters.prospectsAiMultiSelectFilters = activeProspectsMulti;
            }
            if (includeEmptyProspectPlaceholders) filters.includeEmptyPlaceholders = true;
            if (notEmptyProspectPlaceholders) filters.notEmptyPlaceholders = true;
        }

        // Unassigned Prospects tab filters
        if (activeTab === 'unassigned_prospects') {
            if (searchUnassignedContactId.trim()) filters.searchUnassignedContactId = searchUnassignedContactId.trim();
            if (includeEmptyUnassignedContactId) filters.includeEmptyUnassignedContactId = true;
            if (notEmptyUnassignedContactId) filters.notEmptyUnassignedContactId = true;
            if (searchUnassignedProspectId.trim()) filters.searchUnassignedProspectId = searchUnassignedProspectId.trim();
            if (includeEmptyUnassignedProspectId) filters.includeEmptyUnassignedProspectId = true;
            if (notEmptyUnassignedProspectId) filters.notEmptyUnassignedProspectId = true;
            if (searchUnassignedFirstName.trim()) filters.searchUnassignedFirstName = searchUnassignedFirstName.trim();
            if (includeEmptyUnassignedFirstName) filters.includeEmptyUnassignedFirstName = true;
            if (notEmptyUnassignedFirstName) filters.notEmptyUnassignedFirstName = true;
            if (searchUnassignedLastName.trim()) filters.searchUnassignedLastName = searchUnassignedLastName.trim();
            if (includeEmptyUnassignedLastName) filters.includeEmptyUnassignedLastName = true;
            if (notEmptyUnassignedLastName) filters.notEmptyUnassignedLastName = true;
            if (unassignedEmailFilter) filters.unassignedEmailFilter = unassignedEmailFilter;
            if (unassignedPhoneFilter) filters.unassignedPhoneFilter = unassignedPhoneFilter;
            if (searchUnassignedJobTitle.trim()) filters.searchUnassignedJobTitle = searchUnassignedJobTitle.trim();
            if (includeEmptyUnassignedJobTitle) filters.includeEmptyUnassignedJobTitle = true;
            if (notEmptyUnassignedJobTitle) filters.notEmptyUnassignedJobTitle = true;
            if (selectedUnassignedScrapingNames.length > 0) filters.selectedUnassignedScrapingNames = selectedUnassignedScrapingNames;
            if (includeEmptyUnassignedScrapingName) filters.includeEmptyUnassignedScrapingName = true;
            if (notEmptyUnassignedScrapingName) filters.notEmptyUnassignedScrapingName = true;
            if (unassignedBlacklistedFilter) filters.unassignedBlacklistedFilter = unassignedBlacklistedFilter;
            if (searchUnassignedCompany.trim()) filters.searchUnassignedCompany = searchUnassignedCompany.trim();
            if (includeEmptyUnassignedCompany) filters.includeEmptyUnassignedCompany = true;
            if (notEmptyUnassignedCompany) filters.notEmptyUnassignedCompany = true;
            if (searchUnassignedCompanyCompanyId.trim()) filters.searchUnassignedCompanyCompanyId = searchUnassignedCompanyCompanyId.trim();
            if (includeEmptyUnassignedCompanyCompanyId) filters.includeEmptyUnassignedCompanyCompanyId = true;
            if (notEmptyUnassignedCompanyCompanyId) filters.notEmptyUnassignedCompanyCompanyId = true;
            if (searchUnassignedCompanyCity.trim()) filters.searchUnassignedCompanyCity = searchUnassignedCompanyCity.trim();
            if (includeEmptyUnassignedCompanyCity) filters.includeEmptyUnassignedCompanyCity = true;
            if (notEmptyUnassignedCompanyCity) filters.notEmptyUnassignedCompanyCity = true;
            if (selectedUnassignedCompanySizeRanges.length > 0) filters.selectedUnassignedCompanySizeRanges = selectedUnassignedCompanySizeRanges;
            if (includeEmptyUnassignedCompanySizeRange) filters.includeEmptyUnassignedCompanySizeRange = true;
            if (notEmptyUnassignedCompanySizeRange) filters.notEmptyUnassignedCompanySizeRange = true;
            if (selectedUnassignedCompanyIndustries.length > 0) filters.selectedUnassignedCompanyIndustries = selectedUnassignedCompanyIndustries;
            if (includeEmptyUnassignedCompanyIndustry) filters.includeEmptyUnassignedCompanyIndustry = true;
            if (notEmptyUnassignedCompanyIndustry) filters.notEmptyUnassignedCompanyIndustry = true;
            if (searchUnassignedCompanyBusinessType.trim()) filters.searchUnassignedCompanyBusinessType = searchUnassignedCompanyBusinessType.trim();
            if (includeEmptyUnassignedCompanyBusinessType) filters.includeEmptyUnassignedCompanyBusinessType = true;
            if (notEmptyUnassignedCompanyBusinessType) filters.notEmptyUnassignedCompanyBusinessType = true;
            if (searchUnassignedCompanyCountry.trim()) filters.searchUnassignedCompanyCountry = searchUnassignedCompanyCountry.trim();
            if (includeEmptyUnassignedCompanyCountry) filters.includeEmptyUnassignedCompanyCountry = true;
            if (notEmptyUnassignedCompanyCountry) filters.notEmptyUnassignedCompanyCountry = true;
            if (searchUnassignedCompanyProvincie.trim()) filters.searchUnassignedCompanyProvincie = searchUnassignedCompanyProvincie.trim();
            if (includeEmptyUnassignedCompanyProvincie) filters.includeEmptyUnassignedCompanyProvincie = true;
            if (notEmptyUnassignedCompanyProvincie) filters.notEmptyUnassignedCompanyProvincie = true;
            if (selectedUnassignedPersonaAreas.length > 0) filters.selectedUnassignedPersonaAreas = selectedUnassignedPersonaAreas;
            if (includeEmptyUnassignedPersonaAreas) filters.includeEmptyUnassignedPersonaAreas = true;
            if (notEmptyUnassignedPersonaAreas) filters.notEmptyUnassignedPersonaAreas = true;
            if (selectedUnassignedCountry.length > 0) filters.selectedUnassignedCountry = selectedUnassignedCountry;
            if (includeEmptyUnassignedCountry) filters.includeEmptyUnassignedCountry = true;
            if (notEmptyUnassignedCountry) filters.notEmptyUnassignedCountry = true;
            if (selectedUnassignedPersonaLevels.length > 0) filters.selectedUnassignedPersonaLevels = selectedUnassignedPersonaLevels;
            if (includeEmptyUnassignedPersonaLevels) filters.includeEmptyUnassignedPersonaLevels = true;
            if (notEmptyUnassignedPersonaLevels) filters.notEmptyUnassignedPersonaLevels = true;
            if (selectedUnassignedPersonaLevel.length > 0) filters.selectedUnassignedPersonaLevel = selectedUnassignedPersonaLevel;
            if (includeEmptyUnassignedPersonaLevel) filters.includeEmptyUnassignedPersonaLevel = true;
            if (notEmptyUnassignedPersonaLevel) filters.notEmptyUnassignedPersonaLevel = true;
            if (selectedUnassignedPersonaCategory.length > 0) filters.selectedUnassignedPersonaCategory = selectedUnassignedPersonaCategory;
            if (selectedUnassignedListId) filters.selectedListId = selectedUnassignedListId;
            if (selectedUnassignedListStatus) filters.selectedListStatus = selectedUnassignedListStatus;
            if (selectedUnassignedCompanyListId) filters.selectedCompanyListId = selectedUnassignedCompanyListId;
            if (selectedUnassignedCompanyListStatus) filters.selectedCompanyListStatus = selectedUnassignedCompanyListStatus;
            if (includeEmptyUnassignedPersonaCategory) filters.includeEmptyUnassignedPersonaCategory = true;
            if (notEmptyUnassignedPersonaCategory) filters.notEmptyUnassignedPersonaCategory = true;
            if (unassignedJobChangeFilter.length > 0) filters.unassignedJobChangeFilter = unassignedJobChangeFilter;
            if (includeEmptyUnassignedJobChange) filters.includeEmptyUnassignedJobChange = true;
            if (notEmptyUnassignedJobChange) filters.notEmptyUnassignedJobChange = true;
            if (unassignedJobChangeDateFrom) filters.unassignedJobChangeDateFrom = unassignedJobChangeDateFrom;
            if (unassignedJobChangeDateTo) filters.unassignedJobChangeDateTo = unassignedJobChangeDateTo;
            if (unassignedInCampaignMin.trim() !== '' || unassignedInCampaignMax.trim() !== '') {
                filters.unassignedInCampaignBasis = unassignedInCampaignBasis;
                if (unassignedInCampaignMin.trim() !== '') filters.unassignedInCampaignMin = unassignedInCampaignMin.trim();
                if (unassignedInCampaignMax.trim() !== '') filters.unassignedInCampaignMax = unassignedInCampaignMax.trim();
            }
            if (selectedUnassignedGroupAreas.length > 0) filters.selectedUnassignedGroupAreas = selectedUnassignedGroupAreas;
            if (includeEmptyUnassignedGroupAreas) filters.includeEmptyUnassignedGroupAreas = true;
            if (notEmptyUnassignedGroupAreas) filters.notEmptyUnassignedGroupAreas = true;
            if (searchUnassignedLinkedInGroupName.trim()) filters.searchUnassignedLinkedInGroupName = searchUnassignedLinkedInGroupName.trim();
            if (includeEmptyUnassignedLinkedInGroupName) filters.includeEmptyUnassignedLinkedInGroupName = true;
            if (notEmptyUnassignedLinkedInGroupName) filters.notEmptyUnassignedLinkedInGroupName = true;
            if (unassignedAiPromptName) {
                filters.unassignedAiPromptName = unassignedAiPromptName;
                if (unassignedAiSelectedFields.length > 0) filters.unassignedAiSelectedFields = unassignedAiSelectedFields;
                if (unassignedAiFieldFilters.length > 0) filters.unassignedAiFieldFilters = unassignedAiFieldFilters.map(f => ({ ...f, exclude: !!unassignedAiFieldExclude[f.field] }));
                const activeUnassignedMulti = Object.fromEntries(Object.entries(unassignedAiMultiSelectFilters).filter(([, v]) => v.length > 0));
                if (Object.keys(activeUnassignedMulti).length > 0) filters.unassignedAiMultiSelectFilters = activeUnassignedMulti;
            }
            if (includeEmptyUnassignedPlaceholders) filters.includeEmptyPlaceholders = true;
            if (notEmptyUnassignedPlaceholders) filters.notEmptyPlaceholders = true;
        }
        
        // Campaigns tab filters
        if (activeTab === 'campaigns') {
            if (selectedCampaignProfiles.length > 0) filters.selectedCampaignProfiles = selectedCampaignProfiles;
            if (includeEmptyCampaignProfile) filters.includeEmptyCampaignProfile = true;
            if (notEmptyCampaignProfile) filters.notEmptyCampaignProfile = true;
            if (selectedCampaignNamesFilter.length > 0) filters.selectedCampaignNames_filter = selectedCampaignNamesFilter;
            if (includeEmptyCampaignName) filters.includeEmptyCampaignName = true;
            if (notEmptyCampaignName) filters.notEmptyCampaignName = true;
            if (selectedCampaignTypes.length > 0) filters.selectedCampaignTypes = selectedCampaignTypes;
            if (includeEmptyCampaignType) filters.includeEmptyCampaignType = true;
            if (notEmptyCampaignType) filters.notEmptyCampaignType = true;
            if (selectedCampaignContents.length > 0) filters.selectedCampaignContents = selectedCampaignContents;
            if (includeEmptyCampaignContent) filters.includeEmptyCampaignContent = true;
            if (notEmptyCampaignContent) filters.notEmptyCampaignContent = true;
            if (selectedCampaignSectors.length > 0) filters.selectedCampaignSectors = selectedCampaignSectors;
            if (includeEmptyCampaignSector) filters.includeEmptyCampaignSector = true;
            if (notEmptyCampaignSector) filters.notEmptyCampaignSector = true;
            if (selectedCampaignCompanyAttributes.length > 0) filters.selectedCampaignCompanyAttributes = selectedCampaignCompanyAttributes;
            if (includeEmptyCampaignCompanyAttribute) filters.includeEmptyCampaignCompanyAttribute = true;
            if (notEmptyCampaignCompanyAttribute) filters.notEmptyCampaignCompanyAttribute = true;
            if (selectedCampaignPersonas.length > 0) filters.selectedCampaignPersonas = selectedCampaignPersonas;
            if (includeEmptyCampaignPersona) filters.includeEmptyCampaignPersona = true;
            if (notEmptyCampaignPersona) filters.notEmptyCampaignPersona = true;
            if (minRequestsPerDay.trim()) filters.minRequestsPerDay = minRequestsPerDay.trim();
            if (maxRequestsPerDay.trim()) filters.maxRequestsPerDay = maxRequestsPerDay.trim();
            if (liveFilter) filters.liveFilter = liveFilter;
            if (stopFollowUpFilter) filters.stopFollowUpFilter = stopFollowUpFilter;
            if (searchCampaignStartDate.trim()) filters.searchCampaignStartDate = searchCampaignStartDate.trim();
            if (includeEmptyCampaignStartDate) filters.includeEmptyCampaignStartDate = true;
            if (notEmptyCampaignStartDate) filters.notEmptyCampaignStartDate = true;
        }
        
        // Blacklist tab filters
        if (activeTab === 'blacklist') {
            if (searchBlacklistValue.trim()) filters.searchBlacklistValue = searchBlacklistValue.trim();
            if (selectedFieldTargets.length > 0) filters.selectedFieldTargets = selectedFieldTargets;
            if (includeEmptyFieldTarget) filters.includeEmptyFieldTarget = true;
            if (notEmptyFieldTarget) filters.notEmptyFieldTarget = true;
            if (selectedComparisonTypes.length > 0) filters.selectedComparisonTypes = selectedComparisonTypes;
            if (includeEmptyComparisonType) filters.includeEmptyComparisonType = true;
            if (notEmptyComparisonType) filters.notEmptyComparisonType = true;
        }

        // AI Analysis tab filters
        if (activeTab === 'ai_analysis') {
            if (selectedAiPromptId) filters.selectedAiPromptId = selectedAiPromptId;
            if (selectedAiListId) filters.selectedListId = selectedAiListId;
            if (selectedAiListStatus) filters.selectedListStatus = selectedAiListStatus;
            // Company field filters
            if (searchAiCompanyName.trim()) filters.searchAiCompanyName = searchAiCompanyName.trim();
            if (includeEmptyAiCompanyName) filters.includeEmptyAiCompanyName = true;
            if (notEmptyAiCompanyName) filters.notEmptyAiCompanyName = true;
            if (searchAiCompanyIndustry.trim()) filters.searchAiCompanyIndustry = searchAiCompanyIndustry.trim();
            if (includeEmptyAiCompanyIndustry) filters.includeEmptyAiCompanyIndustry = true;
            if (notEmptyAiCompanyIndustry) filters.notEmptyAiCompanyIndustry = true;
            if (searchAiCompanyCountry.trim()) filters.searchAiCompanyCountry = searchAiCompanyCountry.trim();
            if (includeEmptyAiCompanyCountry) filters.includeEmptyAiCompanyCountry = true;
            if (notEmptyAiCompanyCountry) filters.notEmptyAiCompanyCountry = true;
            if (searchAiCompanySizeRange.trim()) filters.searchAiCompanySizeRange = searchAiCompanySizeRange.trim();
            if (includeEmptyAiCompanySizeRange) filters.includeEmptyAiCompanySizeRange = true;
            if (notEmptyAiCompanySizeRange) filters.notEmptyAiCompanySizeRange = true;
            if (searchAiCompanyCity.trim()) filters.searchAiCompanyCity = searchAiCompanyCity.trim();
            if (includeEmptyAiCompanyCity) filters.includeEmptyAiCompanyCity = true;
            if (notEmptyAiCompanyCity) filters.notEmptyAiCompanyCity = true;
            if (searchAiCompanyWebsite.trim()) filters.searchAiCompanyWebsite = searchAiCompanyWebsite.trim();
            if (includeEmptyAiCompanyWebsite) filters.includeEmptyAiCompanyWebsite = true;
            if (notEmptyAiCompanyWebsite) filters.notEmptyAiCompanyWebsite = true;
            if (searchAiCompanyDescription.trim()) filters.searchAiCompanyDescription = searchAiCompanyDescription.trim();
            if (includeEmptyAiCompanyDescription) filters.includeEmptyAiCompanyDescription = true;
            if (notEmptyAiCompanyDescription) filters.notEmptyAiCompanyDescription = true;
            if (minAiCompanySize.trim()) filters.minAiCompanySize = minAiCompanySize.trim();
            if (maxAiCompanySize.trim()) filters.maxAiCompanySize = maxAiCompanySize.trim();
            if (selectedAiCompanyProvincies.length > 0) filters.selectedAiCompanyProvincies = selectedAiCompanyProvincies;
            if (includeEmptyAiCompanyProvincie) filters.includeEmptyAiCompanyProvincie = true;
            if (notEmptyAiCompanyProvincie) filters.notEmptyAiCompanyProvincie = true;
            if (selectedAiCompanyBusinessTypes.length > 0) filters.selectedAiCompanyBusinessTypes = selectedAiCompanyBusinessTypes;
            if (includeEmptyAiCompanyBusinessType) filters.includeEmptyAiCompanyBusinessType = true;
            if (notEmptyAiCompanyBusinessType) filters.notEmptyAiCompanyBusinessType = true;
            if (searchAiCompanyOfferingType.trim()) filters.searchAiCompanyOfferingType = searchAiCompanyOfferingType.trim();
            if (includeEmptyAiCompanyOfferingType) filters.includeEmptyAiCompanyOfferingType = true;
            if (notEmptyAiCompanyOfferingType) filters.notEmptyAiCompanyOfferingType = true;
            if (selectedAiCompanyTypes.length > 0) filters.selectedAiCompanyTypes = selectedAiCompanyTypes;
            if (includeEmptyAiCompanyType) filters.includeEmptyAiCompanyType = true;
            if (notEmptyAiCompanyType) filters.notEmptyAiCompanyType = true;
            // Dynamic analysis_data filters
            const activeDataFilters: Record<string, string> = {};
            Object.entries(aiDataFilters).forEach(([key, val]) => {
                if (val && val.trim()) activeDataFilters[key] = val.trim();
            });
            if (Object.keys(activeDataFilters).length > 0) filters.aiDataFilters = activeDataFilters;
            const activeIncludeEmpty: Record<string, boolean> = {};
            Object.entries(aiDataIncludeEmpty).forEach(([key, val]) => {
                if (val) activeIncludeEmpty[key] = true;
            });
            if (Object.keys(activeIncludeEmpty).length > 0) filters.aiIncludeEmpty = activeIncludeEmpty;
            const activeNotEmpty: Record<string, boolean> = {};
            Object.entries(aiDataNotEmpty).forEach(([key, val]) => {
                if (val) activeNotEmpty[key] = true;
            });
            if (Object.keys(activeNotEmpty).length > 0) filters.aiNotEmpty = activeNotEmpty;
            const activeMultiSelectFilters: Record<string, string[]> = {};
            Object.entries(aiDataMultiSelectFilters).forEach(([key, vals]) => {
                if (vals && vals.length > 0) activeMultiSelectFilters[key] = vals;
            });
            if (Object.keys(activeMultiSelectFilters).length > 0) filters.aiMultiSelectFilters = activeMultiSelectFilters;
        }

        return filters;
    };

    // Fetch up to 50000 IDs matching current filters (for "Select all matching")
    const fetchAllFilteredIds = async () => {
        if (!user) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) return;

        const filters = buildCurrentFilters();
        const requestBody = {
            userUuid: user.uuid,
            dataType: activeTab,
            page: 1,
            pageSize: 50000,
            idsOnly: true,
            skipCount: true,
            ...filters,
        };

        setSelectAllLoading(true);
        try {
            const response = await fetch(`${backendUrl}/api/master-database`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) throw new Error('Failed to fetch IDs');
            const result = await response.json();
            const ids: number[] = (result.data || []).map((row: any) => row.id).filter(Boolean);
            // For AI analysis rows, the response also includes company_id — cache it so the
            // Add-to-List modal can resolve all selected company IDs even across pages.
            if (activeTab === 'ai_analysis') {
                for (const row of (result.data || [])) {
                    if (row.id && row.company_id) {
                        aiAnalysisIdToCompanyIdRef.current.set(row.id as number, row.company_id as number);
                    }
                }
            }
            setSelectedRowIds(new Set(ids));
            toast.success(`Selected ${ids.length} record(s)`);
        } catch {
            toast.error('Failed to select all matching records');
        } finally {
            setSelectAllLoading(false);
        }
    };

    // Bulk classify job titles for selected prospects
        const handleBulkClassify = async (force = false) => {
        if (!user || selectedRowIds.size === 0) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { toast.error('Authentication token not found'); return; }

        setClassifyLoading(true);
        try {
            const response = await fetch(`${backendUrl}/api/master-database/classify-personas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    ids: Array.from(selectedRowIds),
                    force,
                    dataType: activeTab === 'unassigned_prospects' ? 'unassigned_prospects' : 'prospects',
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.error?.message || `Request failed with status ${response.status}`);
            }
            const result = await response.json();
            toast.success(`Classified ${result.updated} prospect(s). Skipped ${result.skipped}.`);
            setSelectedRowIds(new Set());
            const refreshCustomer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
            const refreshFilters = buildCurrentFilters();
            fetchMasterData(activeTab, refreshCustomer, currentPage, refreshFilters);
            fetchTabFilterOptions(refreshCustomer, activeTab);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Classification failed: ${msg}`);
        } finally {
            setClassifyLoading(false);
        }
    };

    // Bulk assign customer to selected companies
    const handleBulkAssignCustomer = async () => {
        if (!user || !bulkAssignCustomerName || selectedRowIds.size === 0) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { toast.error('Authentication token not found'); return; }

        // Resolve company IDs depending on active tab
        let companyIds: number[];
        if (activeTab === 'companies') {
            companyIds = Array.from(selectedRowIds);
        } else if (activeTab === 'ai_analysis') {
            const seen = new Set<number>();
            companyIds = Array.from(selectedRowIds).map((id) => {
                return aiAnalysisIdToCompanyIdRef.current.get(id) || aiAnalysisData.find((row: any) => row.id === id)?.company_id;
            }).filter((id: any) => {
                if (!id || seen.has(id)) return false;
                seen.add(id);
                return true;
            });
        } else {
            return;
        }

        if (companyIds.length === 0) {
            toast.error('No valid companies found in selection');
            return;
        }

        setBulkAssignLoading(true);
        try {
            const response = await fetch(`${backendUrl}/api/master-database/bulk-assign-customer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userUuid: user.uuid, companyIds, customerName: bulkAssignCustomerName }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.error?.message || `Request failed with status ${response.status}`);
            }
            const result = await response.json();
            toast.success(`Queued ${result.queued} compan${result.queued !== 1 ? 'ies' : 'y'} for assignment to ${bulkAssignCustomerName}`);
            setShowBulkAssignCustomerModal(false);
            setBulkAssignCustomerName('');
            setSelectedRowIds(new Set());
            // Refresh current tab
            const customer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
            fetchMasterData(activeTab, customer, currentPage);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to assign customer');
        } finally {
            setBulkAssignLoading(false);
        }
    };

    // AI field selection modal — Fetch button handler
    const handleAiFieldModalFetch = () => {
        const fields = pendingAiSelectedFields;
        const target = aiFieldModalTarget;
        setAiFieldModalTarget(null);
        setPendingAiFields([]);
        setPendingAiSelectedFields([]);
        setExpandedFilters(new Set());
        setOpenColumnFilter(null);
        const customer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
        const filters = buildCurrentFilters();
        setCurrentPage(1);
        if (target === 'prospects') {
            setProspectsAiSelectedFields(fields);
            if (prospectsAiPromptName) filters.prospectsAiSelectedFields = fields;
            tabPagination.current['prospects'] = { currentPage: 1, totalPages: 1 };
            setAppliedProspectFilters({
                statuses: [...selectedProspectStatuses],
                campaignNames: [...selectedCampaignNames],
                prospectCampaignIds: [...selectedProspectCampaigns],
                profileIds: [...selectedProfiles],
            });
            fetchMasterData('prospects', customer, 1, filters);
        } else if (target === 'unassigned_prospects') {
            setUnassignedAiSelectedFields(fields);
            if (unassignedAiPromptName) filters.unassignedAiSelectedFields = fields;
            tabPagination.current['unassigned_prospects'] = { currentPage: 1, totalPages: 1 };
            setAppliedProspectFilters(null);
            fetchMasterData('unassigned_prospects', customer, 1, filters);
        }
    };

    const handleAiFieldModalCancel = () => {
        const target = aiFieldModalTarget;
        setAiFieldModalTarget(null);
        setPendingAiFields([]);
        setPendingAiSelectedFields([]);
        if (target === 'prospects') {
            setProspectsAiPromptName('');
            setProspectsAiSelectedFields([]);
            setProspectsAiMultiSelectFilters({});
            setProspectsAiFieldOptions({});
            setProspectsAiFieldExclude({});
        } else if (target === 'unassigned_prospects') {
            setUnassignedAiPromptName('');
            setUnassignedAiSelectedFields([]);
            setUnassignedAiMultiSelectFilters({});
            setUnassignedAiFieldOptions({});
            setUnassignedAiFieldExclude({});
        }
    };

    // Apply filters
    const applyFilters = () => {
        setExpandedFilters(new Set());
        setOpenColumnFilter(null);
        
        const customer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
        const filters = buildCurrentFilters();
        
        console.log('🎯 Apply Filters - Prospects:', {
            selectedProfiles,
            selectedProspectCampaigns,
            profiles: profiles.map(p => ({ id: p.id, name: p.name })),
            prospectCampaigns: prospectCampaigns.map(c => ({ id: c.id, name: c.name })),
            filters: activeTab === 'prospects' ? {
                selectedProfiles: filters.selectedProfiles,
                selectedProspectCampaigns: filters.selectedProspectCampaigns
            } : 'Not prospects tab'
        });
        
        setCurrentPage(1);
        tabPagination.current[activeTab] = { currentPage: 1, totalPages: 1 };
        // Snapshot the prospect filter state that was actually sent to the backend
        if (activeTab === 'prospects') {
            setAppliedProspectFilters({
                statuses: [...selectedProspectStatuses],
                campaignNames: [...selectedCampaignNames],
                prospectCampaignIds: [...selectedProspectCampaigns],
                profileIds: [...selectedProfiles],
            });
        } else {
            setAppliedProspectFilters(null);
        }
        fetchMasterData(activeTab, customer, 1, filters);
    };

    // Reset all filters for the active tab only
    const resetFilters = () => {
        setExpandedFilters(new Set());
        setOpenColumnFilter(null);
        setSortField(null);
        setSortDirection('asc');
        setCurrentPage(1);
        tabPagination.current[activeTab] = { currentPage: 1, totalPages: 1 };
        setAppliedProspectFilters(null);
        setExcludeFlags({});
        setAiExclude({});

        const customer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
        const filters = selectedCustomers.length > 0 ? { selectedCustomers } : {};

        if (activeTab === 'companies') {
            setSearchCompanyId('');
            setSearchName('');
            setSearchDescription('');
            setSearchWebsite('');
            setSearchLinkedIn('');
            setIncludeEmptyCompanyId(false);
            setNotEmptyCompanyId(false);
            setIncludeEmptyName(false);
            setNotEmptyName(false);
            setIncludeEmptyDescription(false);
            setNotEmptyDescription(false);
            setIncludeEmptyWebsite(false);
            setNotEmptyWebsite(false);
            setIncludeEmptyLinkedIn(false);
            setNotEmptyLinkedIn(false);
            setSelectedIndustries([]);
            setIncludeEmptyIndustry(false);
            setNotEmptyIndustry(false);
            setSelectedCountries([]);
            setIncludeEmptyCountry(false);
            setNotEmptyCountry(false);
            setSelectedProvincies([]);
            setIncludeEmptyProvincie(false);
            setNotEmptyProvincie(false);
            setSelectedSizeRanges([]);
            setIncludeEmptySizeRange(false);
            setNotEmptySizeRange(false);
            setSelectedBusinessTypes([]);
            setIncludeEmptyBusinessType(false);
            setNotEmptyBusinessType(false);
            setSelectedOfferingTypes([]);
            setIncludeEmptyOfferingType(false);
            setNotEmptyOfferingType(false);
            setHasWebsiteFilter('');
            setSelectedCompanyPrompts([]);
            setExcludeCompanyPrompt(false);
            setSelectedScrapingNames([]);
            setIncludeEmptyScrapingName(false);
            setNotEmptyScrapingName(false);
            setSelectedCities([]);
            setMinSize('');
            setMaxSize('');
            setBlacklistedFilter('');
            setWebsiteScrapeFilter('');
            setCompaniesInCampaignBasis('total');
            setCompaniesInCampaignMin('');
            setCompaniesInCampaignMax('');
            setCreatedAtFrom('');
            setCreatedAtTo('');
            setIncludeEmptyCreatedAt(false);
            setNotEmptyCreatedAt(false);
            setSelectedListId('');
            setSelectedListStatus('');
            setCompaniesData([]);;
            setCompaniesTotal(0);
        } else if (activeTab === 'prospects') {
            setSelectedProfiles([]);
            setSelectedProspectCampaigns([]);
            setSearchProspectFirstName('');
            setSearchProspectLastName('');
            setSearchProspectEmail('');
            setSearchProspectPhone('');
            setSearchProspectCompany('');
            setSearchProspectLinkedInUrl('');
            setIncludeEmptyProspectFirstName(false);
            setNotEmptyProspectFirstName(false);
            setIncludeEmptyProspectLastName(false);
            setNotEmptyProspectLastName(false);
            setEmailFilter('');
            setPhoneFilter('');
            setIncludeEmptyProspectCompany(false);
            setNotEmptyProspectCompany(false);
            setIncludeEmptyProspectLinkedInUrl(false);
            setNotEmptyProspectLinkedInUrl(false);
            setSearchProspectId('');
            setSearchProspectContactId('');
            setSearchProspectBirthday('');
            setBirthdayFilter('');
            setSearchProspectCompanyId('');
            setIncludeEmptyProspectId(false);
            setNotEmptyProspectId(false);
            setIncludeEmptyProspectContactId(false);
            setNotEmptyProspectContactId(false);
            setIncludeEmptyProspectBirthday(false);
            setNotEmptyProspectBirthday(false);
            setIncludeEmptyProspectCompanyId(false);
            setNotEmptyProspectCompanyId(false);
            setSelectedCampaignNames([]);
            setIncludeEmptyProspectCampaignName(false);
            setNotEmptyProspectCampaignName(false);
            setSelectedProspectStatuses([]);
            setIncludeEmptyProspectStatus(false);
            setNotEmptyProspectStatus(false);
            setSearchProspectJobTitle('');
            setLinkedInGroupNameFilter('');
            setSearchProspectLinkedInGroupName('');
            setIncludeEmptyProspectLinkedInGroupName(false);
            setNotEmptyProspectLinkedInGroupName(false);
            setSelectedGroupAreas([]);
            setIncludeEmptyGroupAreas(false);
            setNotEmptyGroupAreas(false);
            setSelectedPersonaAreas([]);
            setIncludeEmptyPersonaAreas(false);
            setNotEmptyPersonaAreas(false);
            setSelectedPersonaLevels([]);
            setIncludeEmptyPersonaLevels(false);
            setNotEmptyPersonaLevels(false);
            setSelectedPersonaLevel([]);
            setIncludeEmptyPersonaLevel(false);
            setNotEmptyPersonaLevel(false);
            setSelectedPersonaCategory([]);
            setIncludeEmptyPersonaCategory(false);
            setNotEmptyPersonaCategory(false);
            setSelectedProspectListId('');
            setSelectedProspectListStatus('');
            setSelectedProspectCompanyListId('');
            setSelectedProspectCompanyListStatus('');
            setSearchProspectCompanyCompanyId('');
            setSearchProspectCompanyWebsite('');
            setSearchProspectCompanyLinkedIn('');
            setSearchProspectCompanyCity('');
            setMinProspectCompanySize('');
            setMaxProspectCompanySize('');
            setSelectedProspectCompanySizeRanges([]);
            setIncludeEmptyProspectCompanySizeRange(false);
            setNotEmptyProspectCompanySizeRange(false);
            setSelectedProspectCompanyIndustries([]);
            setIncludeEmptyProspectCompanyIndustry(false);
            setNotEmptyProspectCompanyIndustry(false);
            setSearchProspectCompanyBusinessType('');
            setSearchProspectCompanyCountry('');
            setSearchProspectCompanyProvincie('');
            setIncludeEmptyProspectJobTitle(false);
            setNotEmptyProspectJobTitle(false);
            setIncludeEmptyProspectCompanyCompanyId(false);
            setNotEmptyProspectCompanyCompanyId(false);
            setIncludeEmptyProspectCompanyWebsite(false);
            setNotEmptyProspectCompanyWebsite(false);
            setIncludeEmptyProspectCompanyLinkedIn(false);
            setNotEmptyProspectCompanyLinkedIn(false);
            setIncludeEmptyProspectCompanyCity(false);
            setNotEmptyProspectCompanyCity(false);
            setIncludeEmptyProspectCompanyBusinessType(false);
            setNotEmptyProspectCompanyBusinessType(false);
            setIncludeEmptyProspectCompanyCountry(false);
            setNotEmptyProspectCompanyCountry(false);
            setIncludeEmptyProspectCompanyProvincie(false);
            setNotEmptyProspectCompanyProvincie(false);
            setSearchProspectDateConnected('');
            setSearchProspectDateConnectionRequested('');
            setSearchProspectDateReplied('');
            setSearchProspectDatePositiveTag('');
            setSearchProspectScrapingName('');
            setSelectedProspectScrapingNames([]);
            setStopOutreachFilter('');
            setSelectedLeadPhases([]);
            setIncludeEmptyLeadPhase(false);
            setNotEmptyLeadPhase(false);
            setEmailSentFilter('');
            setBlacklistedProspectFilter('');
            setCrmFilter('');
            setIncludeEmptyProspectDateConnected(false);
            setNotEmptyProspectDateConnected(false);
            setIncludeEmptyProspectDateConnectionRequested(false);
            setNotEmptyProspectDateConnectionRequested(false);
            setIncludeEmptyProspectDateReplied(false);
            setNotEmptyProspectDateReplied(false);
            setIncludeEmptyProspectDatePositiveTag(false);
            setNotEmptyProspectDatePositiveTag(false);
            setIncludeEmptyProspectScrapingName(false);
            setNotEmptyProspectScrapingName(false);
            setProspectJobChangeFilter([]);
            setIncludeEmptyProspectJobChange(false);
            setNotEmptyProspectJobChange(false);
            setProspectJobChangeDateFrom('');
            setProspectJobChangeDateTo('');
            setIncludeEmptyProspectPlaceholders(false);
            setNotEmptyProspectPlaceholders(false);
            setIncludeEmptyUnassignedPlaceholders(false);
            setNotEmptyUnassignedPlaceholders(false);
            setProspectsAiPromptName('');
            setProspectsAiSelectedFields([]);
            setProspectsAiFieldFilters([]);
            setProspectsAiFieldExclude({});
            setProspectsAiMultiSelectFilters({});
            setProspectsAiFieldOptions({});
            setAvailableProspectsAiFields([]);
            setProspectsData([]);
            setProspectsTotal(0);
        } else if (activeTab === 'unassigned_prospects') {
            setSearchUnassignedContactId('');
            setIncludeEmptyUnassignedContactId(false);
            setNotEmptyUnassignedContactId(false);
            setSearchUnassignedProspectId('');
            setIncludeEmptyUnassignedProspectId(false);
            setNotEmptyUnassignedProspectId(false);
            setSearchUnassignedFirstName('');
            setIncludeEmptyUnassignedFirstName(false);
            setNotEmptyUnassignedFirstName(false);
            setSearchUnassignedLastName('');
            setIncludeEmptyUnassignedLastName(false);
            setNotEmptyUnassignedLastName(false);
            setUnassignedEmailFilter('');
            setUnassignedPhoneFilter('');
            setSearchUnassignedJobTitle('');
            setIncludeEmptyUnassignedJobTitle(false);
            setNotEmptyUnassignedJobTitle(false);
            setSelectedUnassignedScrapingNames([]);
            setIncludeEmptyUnassignedScrapingName(false);
            setNotEmptyUnassignedScrapingName(false);
            setUnassignedBlacklistedFilter('');
            setSearchUnassignedCompany('');
            setIncludeEmptyUnassignedCompany(false);
            setNotEmptyUnassignedCompany(false);
            setSearchUnassignedCompanyCompanyId('');
            setIncludeEmptyUnassignedCompanyCompanyId(false);
            setNotEmptyUnassignedCompanyCompanyId(false);
            setSearchUnassignedCompanyCity('');
            setIncludeEmptyUnassignedCompanyCity(false);
            setNotEmptyUnassignedCompanyCity(false);
            setSelectedUnassignedCompanySizeRanges([]);
            setIncludeEmptyUnassignedCompanySizeRange(false);
            setNotEmptyUnassignedCompanySizeRange(false);
            setSelectedUnassignedCompanyIndustries([]);
            setIncludeEmptyUnassignedCompanyIndustry(false);
            setNotEmptyUnassignedCompanyIndustry(false);
            setSearchUnassignedCompanyBusinessType('');
            setIncludeEmptyUnassignedCompanyBusinessType(false);
            setNotEmptyUnassignedCompanyBusinessType(false);
            setSearchUnassignedCompanyCountry('');
            setIncludeEmptyUnassignedCompanyCountry(false);
            setNotEmptyUnassignedCompanyCountry(false);
            setSearchUnassignedCompanyProvincie('');
            setIncludeEmptyUnassignedCompanyProvincie(false);
            setNotEmptyUnassignedCompanyProvincie(false);
            setSelectedUnassignedPersonaAreas([]);
            setIncludeEmptyUnassignedPersonaAreas(false);
            setNotEmptyUnassignedPersonaAreas(false);
            setSelectedUnassignedPersonaLevels([]);
            setIncludeEmptyUnassignedPersonaLevels(false);
            setNotEmptyUnassignedPersonaLevels(false);
            setSelectedUnassignedPersonaLevel([]);
            setIncludeEmptyUnassignedPersonaLevel(false);
            setNotEmptyUnassignedPersonaLevel(false);
            setSelectedUnassignedPersonaCategory([]);
            setIncludeEmptyUnassignedPersonaCategory(false);
            setNotEmptyUnassignedPersonaCategory(false);
            setUnassignedJobChangeFilter([]);
            setIncludeEmptyUnassignedJobChange(false);
            setNotEmptyUnassignedJobChange(false);
            setUnassignedJobChangeDateFrom('');
            setUnassignedJobChangeDateTo('');
            setUnassignedInCampaignBasis('total');
            setUnassignedInCampaignMin('');
            setUnassignedInCampaignMax('');
            setSelectedUnassignedGroupAreas([]);
            setIncludeEmptyUnassignedGroupAreas(false);
            setNotEmptyUnassignedGroupAreas(false);
            setSearchUnassignedLinkedInGroupName('');
            setIncludeEmptyUnassignedLinkedInGroupName(false);
            setNotEmptyUnassignedLinkedInGroupName(false);
            setUnassignedAiPromptName('');
            setUnassignedAiSelectedFields([]);
            setUnassignedAiFieldFilters([]);
            setUnassignedAiFieldExclude({});
            setUnassignedAiMultiSelectFilters({});
            setUnassignedAiFieldOptions({});
            setAvailableUnassignedAiFields([]);
            setSelectedUnassignedListId('');
            setSelectedUnassignedListStatus('');
            setSelectedUnassignedCompanyListId('');
            setSelectedUnassignedCompanyListStatus('');
            setUnassignedProspectsData([]);
            setUnassignedProspectsTotal(0);
        } else if (activeTab === 'campaigns') {
            setSelectedCampaignProfiles([]);
            setIncludeEmptyCampaignProfile(false);
            setNotEmptyCampaignProfile(false);
            setSelectedCampaignNamesFilter([]);
            setIncludeEmptyCampaignName(false);
            setNotEmptyCampaignName(false);
            setSelectedCampaignTypes([]);
            setIncludeEmptyCampaignType(false);
            setNotEmptyCampaignType(false);
            setSelectedCampaignContents([]);
            setIncludeEmptyCampaignContent(false);
            setNotEmptyCampaignContent(false);
            setSelectedCampaignSectors([]);
            setIncludeEmptyCampaignSector(false);
            setNotEmptyCampaignSector(false);
            setSelectedCampaignCompanyAttributes([]);
            setIncludeEmptyCampaignCompanyAttribute(false);
            setNotEmptyCampaignCompanyAttribute(false);
            setSelectedCampaignPersonas([]);
            setIncludeEmptyCampaignPersona(false);
            setNotEmptyCampaignPersona(false);
            setMinRequestsPerDay('');
            setMaxRequestsPerDay('');
            setLiveFilter('');
            setStopFollowUpFilter('');
            setSearchCampaignStartDate('');
            setIncludeEmptyCampaignStartDate(false);
            setNotEmptyCampaignStartDate(false);
            setCampaignsData([]);
            setCampaignsTotal(0);
        } else if (activeTab === 'blacklist') {
            setSearchBlacklistValue('');
            setSelectedFieldTargets([]);
            setIncludeEmptyFieldTarget(false);
            setNotEmptyFieldTarget(false);
            setSelectedComparisonTypes([]);
            setIncludeEmptyComparisonType(false);
            setNotEmptyComparisonType(false);
            setBlacklistData([]);
            setBlacklistTotal(0);
        } else if (activeTab === 'ai_analysis') {
            setAiDataFilters({});
            setAiDataIncludeEmpty({});
            setAiDataNotEmpty({});
            setAiDataMultiSelectFilters({});
            setSearchAiCompanyName('');
            setIncludeEmptyAiCompanyName(false);
            setNotEmptyAiCompanyName(false);
            setSearchAiCompanyIndustry('');
            setIncludeEmptyAiCompanyIndustry(false);
            setNotEmptyAiCompanyIndustry(false);
            setSearchAiCompanyCountry('');
            setIncludeEmptyAiCompanyCountry(false);
            setNotEmptyAiCompanyCountry(false);
            setSearchAiCompanySizeRange('');
            setIncludeEmptyAiCompanySizeRange(false);
            setNotEmptyAiCompanySizeRange(false);
            setSearchAiCompanyCity('');
            setIncludeEmptyAiCompanyCity(false);
            setNotEmptyAiCompanyCity(false);
            setSearchAiCompanyWebsite('');
            setIncludeEmptyAiCompanyWebsite(false);
            setNotEmptyAiCompanyWebsite(false);
            setSearchAiCompanyDescription('');
            setIncludeEmptyAiCompanyDescription(false);
            setNotEmptyAiCompanyDescription(false);
            setMinAiCompanySize('');
            setMaxAiCompanySize('');
            setSelectedAiCompanyProvincies([]);
            setIncludeEmptyAiCompanyProvincie(false);
            setNotEmptyAiCompanyProvincie(false);
            setSelectedAiCompanyBusinessTypes([]);
            setIncludeEmptyAiCompanyBusinessType(false);
            setNotEmptyAiCompanyBusinessType(false);
            setSearchAiCompanyOfferingType('');
            setIncludeEmptyAiCompanyOfferingType(false);
            setNotEmptyAiCompanyOfferingType(false);
            setSelectedAiCompanyTypes([]);
            setIncludeEmptyAiCompanyType(false);
            setNotEmptyAiCompanyType(false);
            setSelectedAiListId('');
            setSelectedAiListStatus('');
            setAiAnalysisData([]);
            setAiAnalysisTotal(0);
            if (selectedAiPromptId) (filters as any).selectedAiPromptId = selectedAiPromptId;
        }

        fetchMasterData(activeTab, customer, 1, filters);
    };

    // Check if reset is needed
    const isResetNeeded =
        // Sorting (cleared by reset on every tab)
        sortField !== null ||
        // Companies tab
        searchCompanyId.trim() !== '' ||
        searchName.trim() !== '' ||
        searchDescription.trim() !== '' ||
        searchWebsite.trim() !== '' ||
        searchLinkedIn.trim() !== '' ||
        includeEmptyCompanyId || notEmptyCompanyId ||
        includeEmptyName || notEmptyName ||
        includeEmptyDescription || notEmptyDescription ||
        includeEmptyWebsite || notEmptyWebsite ||
        includeEmptyLinkedIn || notEmptyLinkedIn ||
        selectedIndustries.length > 0 ||
        includeEmptyIndustry || notEmptyIndustry ||
        selectedCountries.length > 0 ||
        includeEmptyCountry || notEmptyCountry ||
        selectedProvincies.length > 0 ||
        includeEmptyProvincie || notEmptyProvincie ||
        selectedSizeRanges.length > 0 ||
        includeEmptySizeRange || notEmptySizeRange ||
        selectedBusinessTypes.length > 0 ||
        includeEmptyBusinessType || notEmptyBusinessType ||
        selectedOfferingTypes.length > 0 ||
        includeEmptyOfferingType || notEmptyOfferingType ||
        hasWebsiteFilter !== '' ||
        selectedCompanyPrompts.length > 0 || excludeCompanyPrompt ||
        selectedScrapingNames.length > 0 ||
        includeEmptyScrapingName || notEmptyScrapingName ||
        selectedCities.length > 0 ||
        minSize.trim() !== '' ||
        maxSize.trim() !== '' ||
        blacklistedFilter !== '' ||
        websiteScrapeFilter !== '' ||
        companiesInCampaignBasis !== 'total' ||
        companiesInCampaignMin.trim() !== '' ||
        companiesInCampaignMax.trim() !== '' ||
        createdAtFrom.trim() !== '' ||
        createdAtTo.trim() !== '' ||
        includeEmptyCreatedAt || notEmptyCreatedAt ||
        selectedListId !== '' ||
        selectedListStatus !== '' ||
        // Prospects tab
        selectedProfiles.length > 0 ||
        selectedProspectCampaigns.length > 0 ||
        searchProspectFirstName.trim() !== '' ||
        searchProspectLastName.trim() !== '' ||
        searchProspectEmail.trim() !== '' ||
        searchProspectPhone.trim() !== '' ||
        searchProspectCompany.trim() !== '' ||
        searchProspectLinkedInUrl.trim() !== '' ||
        includeEmptyProspectFirstName || notEmptyProspectFirstName ||
        includeEmptyProspectLastName || notEmptyProspectLastName ||
        includeEmptyProspectEmail || notEmptyProspectEmail ||
        includeEmptyProspectPhone || notEmptyProspectPhone ||
        includeEmptyProspectCompany || notEmptyProspectCompany ||
        includeEmptyProspectLinkedInUrl || notEmptyProspectLinkedInUrl ||
        searchProspectId.trim() !== '' ||
        searchProspectContactId.trim() !== '' ||
        searchProspectBirthday.trim() !== '' ||
        searchProspectCompanyId.trim() !== '' ||
        includeEmptyProspectId || notEmptyProspectId ||
        includeEmptyProspectContactId || notEmptyProspectContactId ||
        includeEmptyProspectBirthday || notEmptyProspectBirthday ||
        includeEmptyProspectCompanyId || notEmptyProspectCompanyId ||
        searchProspectJobTitle.trim() !== '' ||
        includeEmptyProspectJobTitle || notEmptyProspectJobTitle ||
        searchProspectCompanyCompanyId.trim() !== '' ||
        includeEmptyProspectCompanyCompanyId || notEmptyProspectCompanyCompanyId ||
        searchProspectCompanyWebsite.trim() !== '' ||
        includeEmptyProspectCompanyWebsite || notEmptyProspectCompanyWebsite ||
        searchProspectCompanyLinkedIn.trim() !== '' ||
        includeEmptyProspectCompanyLinkedIn || notEmptyProspectCompanyLinkedIn ||
        searchProspectCompanyCity.trim() !== '' ||
        includeEmptyProspectCompanyCity || notEmptyProspectCompanyCity ||
        searchProspectCompanyBusinessType.trim() !== '' ||
        includeEmptyProspectCompanyBusinessType || notEmptyProspectCompanyBusinessType ||
        searchProspectCompanyCountry.trim() !== '' ||
        includeEmptyProspectCompanyCountry || notEmptyProspectCompanyCountry ||
        searchProspectCompanyProvincie.trim() !== '' ||
        includeEmptyProspectCompanyProvincie || notEmptyProspectCompanyProvincie ||
        searchProspectDateConnected.trim() !== '' ||
        includeEmptyProspectDateConnected || notEmptyProspectDateConnected ||
        searchProspectDateConnectionRequested.trim() !== '' ||
        includeEmptyProspectDateConnectionRequested || notEmptyProspectDateConnectionRequested ||
        searchProspectDateReplied.trim() !== '' ||
        includeEmptyProspectDateReplied || notEmptyProspectDateReplied ||
        searchProspectDatePositiveTag.trim() !== '' ||
        includeEmptyProspectDatePositiveTag || notEmptyProspectDatePositiveTag ||
        searchProspectScrapingName.trim() !== '' ||
        selectedProspectScrapingNames.length > 0 ||
        includeEmptyProspectScrapingName || notEmptyProspectScrapingName ||
        selectedCampaignNames.length > 0 ||
        includeEmptyProspectCampaignName || notEmptyProspectCampaignName ||
        selectedProspectListId !== '' ||
        selectedProspectListStatus !== '' ||
        selectedProspectCompanyListId !== '' ||
        selectedProspectCompanyListStatus !== '' ||
        selectedProspectStatuses.length > 0 ||
        includeEmptyProspectStatus || notEmptyProspectStatus ||
        selectedProspectCompanySizeRanges.length > 0 ||
        includeEmptyProspectCompanySizeRange || notEmptyProspectCompanySizeRange ||
        selectedProspectCompanyIndustries.length > 0 ||
        includeEmptyProspectCompanyIndustry || notEmptyProspectCompanyIndustry ||
        selectedLeadPhases.length > 0 ||
        includeEmptyLeadPhase || notEmptyLeadPhase ||
        selectedGroupAreas.length > 0 ||
        includeEmptyGroupAreas || notEmptyGroupAreas ||
        selectedPersonaAreas.length > 0 ||
        includeEmptyPersonaAreas || notEmptyPersonaAreas ||
        selectedPersonaLevels.length > 0 ||
        includeEmptyPersonaLevels || notEmptyPersonaLevels ||
        selectedPersonaLevel.length > 0 ||
        includeEmptyPersonaLevel || notEmptyPersonaLevel ||
        selectedPersonaCategory.length > 0 ||
        includeEmptyPersonaCategory || notEmptyPersonaCategory ||
        minProspectCompanySize.trim() !== '' ||
        maxProspectCompanySize.trim() !== '' ||
        emailFilter !== '' ||
        phoneFilter !== '' ||
        birthdayFilter !== '' ||
        stopOutreachFilter !== '' ||
        emailSentFilter !== '' ||
        blacklistedProspectFilter !== '' ||
        crmFilter !== '' ||
        searchProspectLinkedInGroupName.trim() !== '' ||
        includeEmptyProspectLinkedInGroupName || notEmptyProspectLinkedInGroupName ||
        linkedInGroupNameFilter !== '' ||
        prospectJobChangeFilter.length > 0 ||
        includeEmptyProspectJobChange || notEmptyProspectJobChange ||
        prospectJobChangeDateFrom !== '' || prospectJobChangeDateTo !== '' ||
        includeEmptyProspectPlaceholders || notEmptyProspectPlaceholders || includeEmptyUnassignedPlaceholders || notEmptyUnassignedPlaceholders ||
        // Unassigned Prospects tab
        searchUnassignedContactId.trim() !== '' ||
        includeEmptyUnassignedContactId || notEmptyUnassignedContactId ||
        searchUnassignedProspectId.trim() !== '' ||
        includeEmptyUnassignedProspectId || notEmptyUnassignedProspectId ||
        searchUnassignedFirstName.trim() !== '' ||
        includeEmptyUnassignedFirstName || notEmptyUnassignedFirstName ||
        searchUnassignedLastName.trim() !== '' ||
        includeEmptyUnassignedLastName || notEmptyUnassignedLastName ||
        unassignedEmailFilter !== '' ||
        unassignedPhoneFilter !== '' ||
        searchUnassignedJobTitle.trim() !== '' ||
        includeEmptyUnassignedJobTitle || notEmptyUnassignedJobTitle ||
        selectedUnassignedScrapingNames.length > 0 ||
        includeEmptyUnassignedScrapingName || notEmptyUnassignedScrapingName ||
        unassignedBlacklistedFilter !== '' ||
        unassignedJobChangeFilter.length > 0 ||
        includeEmptyUnassignedJobChange || notEmptyUnassignedJobChange ||
        unassignedJobChangeDateFrom !== '' || unassignedJobChangeDateTo !== '' ||
        unassignedInCampaignBasis !== 'total' ||
        unassignedInCampaignMin.trim() !== '' || unassignedInCampaignMax.trim() !== '' ||
        selectedUnassignedGroupAreas.length > 0 ||
        includeEmptyUnassignedGroupAreas || notEmptyUnassignedGroupAreas ||
        searchUnassignedCompany.trim() !== '' ||
        includeEmptyUnassignedCompany || notEmptyUnassignedCompany ||
        searchUnassignedCompanyCompanyId.trim() !== '' ||
        includeEmptyUnassignedCompanyCompanyId || notEmptyUnassignedCompanyCompanyId ||
        searchUnassignedCompanyCity.trim() !== '' ||
        includeEmptyUnassignedCompanyCity || notEmptyUnassignedCompanyCity ||
        selectedUnassignedCompanySizeRanges.length > 0 ||
        includeEmptyUnassignedCompanySizeRange || notEmptyUnassignedCompanySizeRange ||
        selectedUnassignedCompanyIndustries.length > 0 ||
        includeEmptyUnassignedCompanyIndustry || notEmptyUnassignedCompanyIndustry ||
        searchUnassignedCompanyBusinessType.trim() !== '' ||
        includeEmptyUnassignedCompanyBusinessType || notEmptyUnassignedCompanyBusinessType ||
        searchUnassignedCompanyCountry.trim() !== '' ||
        includeEmptyUnassignedCompanyCountry || notEmptyUnassignedCompanyCountry ||
        searchUnassignedCompanyProvincie.trim() !== '' ||
        includeEmptyUnassignedCompanyProvincie || notEmptyUnassignedCompanyProvincie ||
        selectedUnassignedPersonaAreas.length > 0 ||
        includeEmptyUnassignedPersonaAreas || notEmptyUnassignedPersonaAreas ||
        selectedUnassignedPersonaLevels.length > 0 ||
        includeEmptyUnassignedPersonaLevels || notEmptyUnassignedPersonaLevels ||
        selectedUnassignedPersonaLevel.length > 0 ||
        includeEmptyUnassignedPersonaLevel || notEmptyUnassignedPersonaLevel ||
        selectedUnassignedPersonaCategory.length > 0 ||
        includeEmptyUnassignedPersonaCategory || notEmptyUnassignedPersonaCategory ||
        searchUnassignedLinkedInGroupName.trim() !== '' ||
        includeEmptyUnassignedLinkedInGroupName || notEmptyUnassignedLinkedInGroupName ||
        selectedUnassignedListId !== '' ||
        selectedUnassignedListStatus !== '' ||
        selectedUnassignedCompanyListId !== '' ||
        selectedUnassignedCompanyListStatus !== '' ||
        // Campaigns tab
        selectedCampaignProfiles.length > 0 ||
        includeEmptyCampaignProfile || notEmptyCampaignProfile ||
        selectedCampaignNamesFilter.length > 0 ||
        includeEmptyCampaignName || notEmptyCampaignName ||
        selectedCampaignTypes.length > 0 ||
        includeEmptyCampaignType || notEmptyCampaignType ||
        selectedCampaignContents.length > 0 ||
        includeEmptyCampaignContent || notEmptyCampaignContent ||
        selectedCampaignSectors.length > 0 ||
        includeEmptyCampaignSector || notEmptyCampaignSector ||
        selectedCampaignCompanyAttributes.length > 0 ||
        includeEmptyCampaignCompanyAttribute || notEmptyCampaignCompanyAttribute ||
        selectedCampaignPersonas.length > 0 ||
        includeEmptyCampaignPersona || notEmptyCampaignPersona ||
        minRequestsPerDay.trim() !== '' ||
        maxRequestsPerDay.trim() !== '' ||
        liveFilter !== '' ||
        stopFollowUpFilter !== '' ||
        searchCampaignStartDate.trim() !== '' ||
        includeEmptyCampaignStartDate || notEmptyCampaignStartDate ||
        // Blacklist tab
        searchBlacklistValue.trim() !== '' ||
        selectedFieldTargets.length > 0 ||
        includeEmptyFieldTarget || notEmptyFieldTarget ||
        selectedComparisonTypes.length > 0 ||
        includeEmptyComparisonType || notEmptyComparisonType ||
        // AI Analysis tab
        Object.values(aiDataFilters).some(v => v && v.trim() !== '') ||
        Object.values(aiDataIncludeEmpty).some(v => v) ||
        Object.values(aiDataNotEmpty).some(v => v) ||
        Object.values(aiDataMultiSelectFilters).some(v => v.length > 0) ||
        searchAiCompanyName.trim() !== '' ||
        includeEmptyAiCompanyName || notEmptyAiCompanyName ||
        searchAiCompanyIndustry.trim() !== '' ||
        includeEmptyAiCompanyIndustry || notEmptyAiCompanyIndustry ||
        searchAiCompanyCountry.trim() !== '' ||
        includeEmptyAiCompanyCountry || notEmptyAiCompanyCountry ||
        searchAiCompanySizeRange.trim() !== '' ||
        includeEmptyAiCompanySizeRange || notEmptyAiCompanySizeRange ||
        searchAiCompanyCity.trim() !== '' ||
        includeEmptyAiCompanyCity || notEmptyAiCompanyCity ||
        searchAiCompanyWebsite.trim() !== '' ||
        includeEmptyAiCompanyWebsite || notEmptyAiCompanyWebsite ||
        searchAiCompanyDescription.trim() !== '' ||
        includeEmptyAiCompanyDescription || notEmptyAiCompanyDescription ||
        minAiCompanySize.trim() !== '' || maxAiCompanySize.trim() !== '' ||
        selectedAiCompanyProvincies.length > 0 ||
        includeEmptyAiCompanyProvincie || notEmptyAiCompanyProvincie ||
        selectedAiCompanyBusinessTypes.length > 0 ||
        includeEmptyAiCompanyBusinessType || notEmptyAiCompanyBusinessType ||
        searchAiCompanyOfferingType.trim() !== '' ||
        includeEmptyAiCompanyOfferingType || notEmptyAiCompanyOfferingType ||
        selectedAiCompanyTypes.length > 0 ||
        includeEmptyAiCompanyType || notEmptyAiCompanyType ||
        selectedAiListId !== '' ||
        selectedAiListStatus !== '' ||
        // Prospects / Unassigned AI Analysis filter
        prospectsAiPromptName !== '' ||
        prospectsAiFieldFilters.length > 0 ||
        Object.values(prospectsAiMultiSelectFilters).some(v => v.length > 0) ||
        unassignedAiPromptName !== '' ||
        unassignedAiFieldFilters.length > 0 ||
        Object.values(unassignedAiMultiSelectFilters).some(v => v.length > 0);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Keep the analysis-ID → company-ID lookup current for every page load
    useEffect(() => {
        for (const row of aiAnalysisData) {
            if (row.id && row.company_id) {
                aiAnalysisIdToCompanyIdRef.current.set(row.id as number, row.company_id as number);
            }
        }
    }, [aiAnalysisData]);

    // ── AI field filter options ──────────────────────────────────────────
    // Fetch the COMPLETE distinct value set for the dynamic AI (analysis_data)
    // fields from the server, scoped to the selected customer(s) + prompt. This
    // replaces the old current-page detection, which could hide values that
    // existed in the dataset but not on the visible page (so a filter option
    // silently implied "no such values exist"). Fields with ≤25 distinct values
    // come back as checkbox options; higher-cardinality fields are omitted here
    // and keep their free-text "contains" search.
    const fetchAiFieldOptions = async (
        dataType: 'ai_analysis' | 'prospects' | 'unassigned_prospects',
        fields: string[],
        promptKey: { aiPromptId?: string; aiPromptName?: string },
    ) => {
        if (!user || fields.length === 0) return;
        const token = getCookie('token');
        if (!token) return;
        const setter =
            dataType === 'ai_analysis' ? setAiFieldOptions
            : dataType === 'prospects' ? setProspectsAiFieldOptions
            : setUnassignedAiFieldOptions;
        try {
            const backendUrl = getBackendUrl();
            const res = await fetch(`${backendUrl}/api/master-database/ai-field-values`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers,
                    dataType,
                    fields,
                    ...promptKey,
                }),
            });
            if (!res.ok) return;
            const data = await res.json();
            const fieldResults = data.fields || {};
            const opts: Record<string, { value: string; label: string }[]> = {};
            for (const field of Object.keys(fieldResults)) {
                const meta = fieldResults[field];
                // Only ≤MAX fields come back with `values`; `tooMany` fields are
                // intentionally absent so the render falls back to the text input.
                if (meta && Array.isArray(meta.values)) {
                    opts[field] = meta.values.map((v: string) => ({ value: v, label: v }));
                }
            }
            setter(opts);
        } catch {
            // Network/parse error → leave options empty; fields fall back to text inputs.
        }
    };

    // AI Analysis tab — keyed on prompt + customer scope + discovered field set
    // (NOT pagination), so paging through results never re-fetches options.
    useEffect(() => {
        if (activeTab !== 'ai_analysis') return;
        if (!selectedAiPromptId || analysisFields.length === 0) { setAiFieldOptions({}); return; }
        fetchAiFieldOptions('ai_analysis', analysisFields, { aiPromptId: selectedAiPromptId });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, selectedAiPromptId, selectedCustomers.join(','), analysisFields.join(',')]);

    // Prospects tab — amber inline AI columns
    useEffect(() => {
        if (!prospectsAiPromptName || prospectsAiSelectedFields.length === 0) {
            setProspectsAiFieldOptions({});
            return;
        }
        fetchAiFieldOptions('prospects', prospectsAiSelectedFields, { aiPromptName: prospectsAiPromptName });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prospectsAiPromptName, prospectsAiSelectedFields.join(','), selectedCustomers.join(',')]);

    // Unassigned Prospects tab — amber inline AI columns
    useEffect(() => {
        if (!unassignedAiPromptName || unassignedAiSelectedFields.length === 0) {
            setUnassignedAiFieldOptions({});
            return;
        }
        fetchAiFieldOptions('unassigned_prospects', unassignedAiSelectedFields, { aiPromptName: unassignedAiPromptName });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unassignedAiPromptName, unassignedAiSelectedFields.join(','), selectedCustomers.join(',')]);

    // Clear row selections when tab changes
    useEffect(() => {
        setSelectedRowIds(new Set());
    }, [activeTab]);

    // Close column dropdown and filter dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (showColumnDropdown && !target.closest('.column-dropdown')) {
                setShowColumnDropdown(false);
            }
            if (openColumnFilter && !target.closest('.column-filter-dropdown')) {
                setOpenColumnFilter(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showColumnDropdown, openColumnFilter]);

    // Apply filters on Enter while a column filter dropdown is open
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Enter') applyFilters();
        };
        if (openColumnFilter) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [openColumnFilter, applyFilters]);

    useEffect(() => {
        if (!isMounted) return;

        const getCookie = (name: string): string | undefined => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return undefined;
        };

        const token = getCookie('token');
        const storedUser = safeLocalStorage.getParsedItem<User>('user');

        if (!token || !storedUser) {
            router.push('/auth/login');
            return;
        }

        // Admin-only page — redirect non-admins to dashboard
        if (storedUser.type !== 'Admin') {
            router.push('/dashboard');
            return;
        }

        setUser(storedUser);
        // Fetch customer options
        fetchCustomerOptions(storedUser.uuid, token);
    }, [router, isMounted]);

    // Fetch data when tab or customer changes
    // Fetch data when page changes (always fetch for pagination)
    useEffect(() => {
        if (user && paginationUserAction.current) {
            paginationUserAction.current = false;
            const customer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
            console.log('📄 Pagination - Fetching Page:', {
                customer: customer || 'all',
                activeTab,
                currentPage,
                totalPages,
                action: 'Fetching page of data'
            });
            
            const filters = buildCurrentFilters();
            fetchMasterData(activeTab, customer, currentPage, filters);
        }
        // Save current page to per-tab state
        tabPagination.current[activeTab] = {
            ...tabPagination.current[activeTab],
            currentPage,
        };
    }, [currentPage]);

    // Handle tab switch - restore per-tab pagination and update filter UI
    const prevTab = React.useRef(activeTab);
    useEffect(() => {
        const customer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';

        // Only reset pagination/UI state when the tab actually changed
        if (prevTab.current !== activeTab) {
            // Restore per-tab pagination state
            const saved = tabPagination.current[activeTab];
            setCurrentPage(saved?.currentPage || 1);
            setTotalPages(saved?.totalPages || 1);

            setOpenColumnFilter(null);
            setExpandedFilters(new Set());
            setSelectedRowIds(new Set());
        }
        
        // Fetch filter options for the current tab (always, even when "All" customers is selected)
        // Debounced to avoid rapid-fire calls when the user clicks through tabs/customers quickly.
        const timer = setTimeout(() => {
            fetchTabFilterOptions(customer, activeTab);
        }, 300);

        prevTab.current = activeTab;
        return () => clearTimeout(timer);
    }, [activeTab, selectedCustomers]);

    // Initial data fetch on mount after user and customer are set
    useEffect(() => {
        if (user && isMounted && !hasInitialFetch.current) {
            hasInitialFetch.current = true;
            const customer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
            console.log('🚀 Initial Load - Fetching Data:', {
                customer,
                activeTab,
                action: 'Initial data fetch on mount'
            });
            
            // Fetch filter options for the current tab
            fetchTabFilterOptions(customer, activeTab);
            
            // Don't fetch initial data automatically - wait for Apply button click
            // const filters = selectedCustomers.length > 0 ? { selectedCustomers } : {};
            // fetchMasterData(activeTab, customer, 1, filters);
        }
    }, [user, isMounted, selectedCustomers, activeTab]); // Run when selectedCustomers or activeTab change

    // ── Restore the filtered view when returning from AI Analysis ────────────
    // The AI Analysis page navigates back with a fresh router.push, so all
    // component state is lost. saveReturnState() stashed a snapshot in
    // sessionStorage; here we put the tab, customer scope and filter inputs
    // back and replay the exact query that was active when the user left.
    const hasRestoredReturnState = React.useRef(false);
    useEffect(() => {
        if (!user || !isMounted || hasRestoredReturnState.current) return;
        hasRestoredReturnState.current = true;

        let snap: any = null;
        try {
            const raw = sessionStorage.getItem(MASTER_DB_RETURN_STATE_KEY);
            if (!raw) return;
            snap = JSON.parse(raw);
            sessionStorage.removeItem(MASTER_DB_RETURN_STATE_KEY);
        } catch {
            return;
        }
        if (!snap?.activeTab) return;

        setActiveTab(snap.activeTab);
        if (Array.isArray(snap.selectedCustomers)) setSelectedCustomers(snap.selectedCustomers);
        setSortField(snap.sortField ?? null);
        setSortDirection(snap.sortDirection ?? 'asc');

        const apply = (value: any, setter: (v: any) => void) => { if (value !== undefined) setter(value); };
        const c = snap.companiesFilters;
        if (c) {
            apply(c.searchCompanyId, setSearchCompanyId);
            apply(c.includeEmptyCompanyId, setIncludeEmptyCompanyId);
            apply(c.notEmptyCompanyId, setNotEmptyCompanyId);
            apply(c.searchName, setSearchName);
            apply(c.includeEmptyName, setIncludeEmptyName);
            apply(c.notEmptyName, setNotEmptyName);
            apply(c.searchDescription, setSearchDescription);
            apply(c.includeEmptyDescription, setIncludeEmptyDescription);
            apply(c.notEmptyDescription, setNotEmptyDescription);
            apply(c.searchWebsite, setSearchWebsite);
            apply(c.includeEmptyWebsite, setIncludeEmptyWebsite);
            apply(c.notEmptyWebsite, setNotEmptyWebsite);
            apply(c.searchLinkedIn, setSearchLinkedIn);
            apply(c.includeEmptyLinkedIn, setIncludeEmptyLinkedIn);
            apply(c.notEmptyLinkedIn, setNotEmptyLinkedIn);
            apply(c.selectedIndustries, setSelectedIndustries);
            apply(c.includeEmptyIndustry, setIncludeEmptyIndustry);
            apply(c.notEmptyIndustry, setNotEmptyIndustry);
            apply(c.selectedCountries, setSelectedCountries);
            apply(c.includeEmptyCountry, setIncludeEmptyCountry);
            apply(c.notEmptyCountry, setNotEmptyCountry);
            apply(c.selectedProvincies, setSelectedProvincies);
            apply(c.includeEmptyProvincie, setIncludeEmptyProvincie);
            apply(c.notEmptyProvincie, setNotEmptyProvincie);
            apply(c.selectedSizeRanges, setSelectedSizeRanges);
            apply(c.includeEmptySizeRange, setIncludeEmptySizeRange);
            apply(c.notEmptySizeRange, setNotEmptySizeRange);
            apply(c.selectedBusinessTypes, setSelectedBusinessTypes);
            apply(c.includeEmptyBusinessType, setIncludeEmptyBusinessType);
            apply(c.notEmptyBusinessType, setNotEmptyBusinessType);
            apply(c.selectedOfferingTypes, setSelectedOfferingTypes);
            apply(c.includeEmptyOfferingType, setIncludeEmptyOfferingType);
            apply(c.notEmptyOfferingType, setNotEmptyOfferingType);
            apply(c.hasWebsiteFilter, setHasWebsiteFilter);
            apply(c.selectedCompanyPrompts, setSelectedCompanyPrompts);
            apply(c.excludeCompanyPrompt, setExcludeCompanyPrompt);
            apply(c.selectedCities, setSelectedCities);
            apply(c.selectedScrapingNames, setSelectedScrapingNames);
            apply(c.includeEmptyScrapingName, setIncludeEmptyScrapingName);
            apply(c.notEmptyScrapingName, setNotEmptyScrapingName);
            apply(c.minSize, setMinSize);
            apply(c.maxSize, setMaxSize);
            apply(c.blacklistedFilter, setBlacklistedFilter);
            apply(c.websiteScrapeFilter, setWebsiteScrapeFilter);
            apply(c.companiesInCampaignBasis, setCompaniesInCampaignBasis);
            apply(c.companiesInCampaignMin, setCompaniesInCampaignMin);
            apply(c.companiesInCampaignMax, setCompaniesInCampaignMax);
            apply(c.createdAtFrom, setCreatedAtFrom);
            apply(c.createdAtTo, setCreatedAtTo);
            apply(c.includeEmptyCreatedAt, setIncludeEmptyCreatedAt);
            apply(c.notEmptyCreatedAt, setNotEmptyCreatedAt);
            apply(c.selectedListId, setSelectedListId);
            apply(c.selectedListStatus, setSelectedListStatus);
        }
        const a = snap.aiTabFilters;
        if (a) {
            apply(a.selectedAiPromptId, setSelectedAiPromptId);
            apply(a.selectedAiListId, setSelectedAiListId);
            apply(a.selectedAiListStatus, setSelectedAiListStatus);
        }

        // Replay the query that was active when the user left, so the table
        // immediately shows the same filtered set.
        hasInitialFetch.current = true;
        fetchMasterData(snap.activeTab, snap.selectedCustomers?.[0] || '', 1, snap.filters || {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isMounted]);

    // Fetch profiles when customer changes (for prospects and unassigned_prospects tabs) or when audit tab is active.
    useEffect(() => {
        if (
            (activeTab === 'prospects' || activeTab === 'unassigned_prospects' || activeTab === 'campaigns') && selectedCustomers.length > 0
            || activeTab === 'audit_receiver_search'
        ) {
            const timer = setTimeout(() => {
                fetchProfiles();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [selectedCustomers, activeTab]);

    // Fetch campaigns when profiles change (for prospects tab)
    useEffect(() => {
        if (activeTab === 'prospects' && selectedCustomers.length > 0 && selectedProfiles.length > 0) {
            const timer = setTimeout(() => {
                fetchProspectCampaigns(selectedProfiles);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [selectedProfiles, activeTab, selectedCustomers]);

    // Cascading filter expansion: When Customer is selected, auto-expand Profile filter
    useEffect(() => {
        if (selectedCustomers.length > 0) {
            if (activeTab === 'prospects') {
                setExpandedFilters(prev => {
                    const next = new Set(prev);
                    next.add('profile');
                    return next;
                });
            } else if (activeTab === 'campaigns') {
                setExpandedFilters(prev => {
                    const next = new Set(prev);
                    next.add('campaignProfile');
                    return next;
                });
            }
        }
    }, [selectedCustomers]); // Only trigger when selectedCustomers changes, not on tab switch

    // Cascading filter expansion: When Profile is selected in Prospects tab, auto-expand Campaign filter
    useEffect(() => {
        if (activeTab === 'prospects' && selectedProfiles.length > 0) {
            setExpandedFilters(prev => {
                const next = new Set(prev);
                next.add('prospectCampaign');
                return next;
            });
        }
    }, [selectedProfiles]); // Only trigger when selectedProfiles changes, not on tab switch

    // Fetch AI prompt sample fields when unassignedAiPromptName changes
    useEffect(() => {
        if (!unassignedAiPromptName || !user) {
            setAvailableUnassignedAiFields([]);
            setUnassignedAiSelectedFields([]);
            setUnassignedAiFieldFilters([]);
            return;
        }
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token || !backendUrl) return;
        setUnassignedAiFieldsLoading(true);
        fetch(`${backendUrl}/api/master-database/ai-prompt-sample-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ userUuid: user.uuid, promptName: unassignedAiPromptName }),
        })
            .then(r => r.json())
            .then(json => {
                const fields: string[] = json?.fields || [];
                setAvailableUnassignedAiFields(fields);
                setUnassignedAiSelectedFields([]);
                setUnassignedAiFieldFilters([]);
                setPendingAiFields(fields);
                setPendingAiSelectedFields(fields);
                setAiFieldModalTarget('unassigned_prospects');
            })
            .catch(() => setAvailableUnassignedAiFields([]))
            .finally(() => setUnassignedAiFieldsLoading(false));
    }, [unassignedAiPromptName, user]);

    // Fetch AI prompt sample fields when prospectsAiPromptName changes
    useEffect(() => {
        if (!prospectsAiPromptName || !user) {
            setAvailableProspectsAiFields([]);
            setProspectsAiSelectedFields([]);
            setProspectsAiFieldFilters([]);
            return;
        }
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token || !backendUrl) return;
        setProspectsAiFieldsLoading(true);
        fetch(`${backendUrl}/api/master-database/ai-prompt-sample-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ userUuid: user.uuid, promptName: prospectsAiPromptName }),
        })
            .then(r => r.json())
            .then(json => {
                const fields: string[] = json?.fields || [];
                setAvailableProspectsAiFields(fields);
                setProspectsAiSelectedFields([]);
                setProspectsAiFieldFilters([]);
                setPendingAiFields(fields);
                setPendingAiSelectedFields(fields);
                setAiFieldModalTarget('prospects');
            })
            .catch(() => setAvailableProspectsAiFields([]))
            .finally(() => setProspectsAiFieldsLoading(false));
    }, [prospectsAiPromptName, user]);

    // Fetch all AI prompts for the management modal
    const fetchAllAiPrompts = async () => {
        if (!user) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) return;

        try {
            const response = await fetch(`${backendUrl}/api/master-database/ai-prompts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userUuid: user.uuid }),
            });
            if (!response.ok) throw new Error(`Failed to fetch prompts: ${response.status}`);
            const data = await response.json();
            setAllAiPrompts(data.prompts || []);
        } catch (error) {
            console.error('❌ Fetch AI Prompts Error:', error);
            toast.error('Failed to load AI prompts');
        }
    };

    // Save (create or update) an AI prompt
    const handleSavePrompt = async () => {
        if (!user || !editingPrompt) return;

        // For edits, skip if nothing changed
        if (promptModalMode === 'edit' && originalPromptRef.current) {
            const orig = originalPromptRef.current;
            const fields = ['prompt_name', 'prompt_description', 'prompt_text', 'version', 'active', 'output_structure', 'allow_without_website'] as const;
            const hasChanges = fields.some(f => editingPrompt[f] !== orig[f]);
            if (!hasChanges) {
                toast('No changes detected', { icon: 'ℹ️' });
                setPromptModalMode('view');
                setEditingPrompt(null);
                originalPromptRef.current = null;
                return;
            }
        }

        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) return;

        setPromptSaving(true);
        try {
            let parsedOutputStructure = null;
            if (editingPrompt.output_structure && typeof editingPrompt.output_structure === 'string' && editingPrompt.output_structure.trim()) {
                try {
                    parsedOutputStructure = JSON.parse(editingPrompt.output_structure);
                } catch {
                    toast.error('Invalid JSON in Output Structure field');
                    setPromptSaving(false);
                    return;
                }
            }

            if (promptModalMode === 'create') {
                const response = await fetch(`${backendUrl}/api/master-database/ai-prompts/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        userUuid: user.uuid,
                        prompt_name: editingPrompt.prompt_name,
                        prompt_description: editingPrompt.prompt_description,
                        prompt_text: editingPrompt.prompt_text,
                        version: editingPrompt.version,
                        active: editingPrompt.active,
                        output_structure: parsedOutputStructure,
                        allow_without_website: editingPrompt.allow_without_website ?? false,
                    }),
                });
                if (!response.ok) throw new Error(`Failed to create prompt: ${response.status}`);
                toast.success('Prompt created successfully');
            } else {
                const response = await fetch(`${backendUrl}/api/master-database/ai-prompts/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        userUuid: user.uuid,
                        promptId: editingPrompt.id,
                        changes: {
                            prompt_name: editingPrompt.prompt_name,
                            prompt_description: editingPrompt.prompt_description,
                            prompt_text: editingPrompt.prompt_text,
                            version: editingPrompt.version,
                            active: editingPrompt.active,
                            output_structure: parsedOutputStructure,
                            allow_without_website: editingPrompt.allow_without_website ?? false,
                        },
                    }),
                });
                if (!response.ok) throw new Error(`Failed to update prompt: ${response.status}`);
                toast.success('Prompt updated successfully');
            }

            // Refresh prompt list and filter options
            await fetchAllAiPrompts();
            const customer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
            if (customer) fetchTabFilterOptions(customer, 'ai_analysis');
            setPromptModalMode('view');
            setEditingPrompt(null);
        } catch (error) {
            console.error('❌ Save AI Prompt Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save prompt');
        } finally {
            setPromptSaving(false);
        }
    };

    // ── Export Jobs state ─────────────────────────────────────────────────
    interface ExportJob {
        exportId: string;
        status: string;
        progress: number;
        totalRows: number;
        processedRows: number;
        promptName: string;
        createdAt: string;
        updatedAt: string;
        error: string;
        fileName: string;
    }
    const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
    const [exportJobsLoading] = useState(false);
    const exportPollRef = React.useRef<NodeJS.Timeout | null>(null);

    const fetchExportJobs = async () => {
        if (!user) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) return;
        try {
            const res = await fetch(`${backendUrl}/api/master-database/exports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userUuid: user.uuid }),
            });
            if (!res.ok) return;
            const data = await res.json();
            setExportJobs(data.exports || []);
        } catch (e) {
            console.error('Failed to fetch export jobs:', e);
        }
    };

    // Poll for export progress when on exports tab.
    // Only start polling when there is at least one job in 'processing'.
    // Interval is 10s (was 3s) — exports take minutes, faster polling is wasted load.
    useEffect(() => {
        if (activeTab === 'exports' && user) {
            // Always do an initial fetch when entering the tab.
            fetchExportJobs();
        }
        return () => {
            if (exportPollRef.current) {
                clearInterval(exportPollRef.current);
                exportPollRef.current = null;
            }
        };
    }, [activeTab, user]);

    // Start/stop the poller based on whether any job is still processing.
    useEffect(() => {
        const hasActive = exportJobs.some(j => j.status === 'processing');
        if (activeTab === 'exports' && hasActive && !exportPollRef.current) {
            exportPollRef.current = setInterval(fetchExportJobs, 10000);
        } else if ((!hasActive || activeTab !== 'exports') && exportPollRef.current) {
            clearInterval(exportPollRef.current);
            exportPollRef.current = null;
        }
    }, [exportJobs, activeTab]);

    // Snapshot the active filter context before navigating to AI Analysis, so
    // "Back to Master Database" restores the same filtered view instead of a
    // blank page. Companies-tab inputs are restored in full; for the AI tab the
    // prompt/list scope is restored and the applied query is replayed.
    const saveReturnState = () => {
        try {
            sessionStorage.setItem(MASTER_DB_RETURN_STATE_KEY, JSON.stringify({
                activeTab,
                selectedCustomers,
                sortField,
                sortDirection,
                filters: buildCurrentFilters(),
                companiesFilters: activeTab === 'companies' ? {
                    searchCompanyId, includeEmptyCompanyId, notEmptyCompanyId,
                    searchName, includeEmptyName, notEmptyName,
                    searchDescription, includeEmptyDescription, notEmptyDescription,
                    searchWebsite, includeEmptyWebsite, notEmptyWebsite,
                    searchLinkedIn, includeEmptyLinkedIn, notEmptyLinkedIn,
                    selectedIndustries, includeEmptyIndustry, notEmptyIndustry,
                    selectedCountries, includeEmptyCountry, notEmptyCountry,
                    selectedProvincies, includeEmptyProvincie, notEmptyProvincie,
                    selectedSizeRanges, includeEmptySizeRange, notEmptySizeRange,
                    selectedBusinessTypes, includeEmptyBusinessType, notEmptyBusinessType,
                    selectedOfferingTypes, includeEmptyOfferingType, notEmptyOfferingType,
                    hasWebsiteFilter, selectedCompanyPrompts, excludeCompanyPrompt,
                    selectedCities, selectedScrapingNames, includeEmptyScrapingName, notEmptyScrapingName,
                    minSize, maxSize, blacklistedFilter, websiteScrapeFilter,
                    companiesInCampaignBasis, companiesInCampaignMin, companiesInCampaignMax,
                    createdAtFrom, createdAtTo, includeEmptyCreatedAt, notEmptyCreatedAt,
                    selectedListId, selectedListStatus,
                } : null,
                aiTabFilters: activeTab === 'ai_analysis' ? {
                    selectedAiPromptId, selectedAiListId, selectedAiListStatus,
                } : null,
            }));
        } catch {
            // sessionStorage unavailable/full — navigation still works, just without restore
        }
    };

    const handleAnalyzeSelected = () => {
        const ids = Array.from(selectedRowIds);
        if (ids.length === 0) { toast.error('Select at least one company first'); return; }
        saveReturnState();
        localStorage.setItem('selectedCompanyIds', JSON.stringify(ids));
        router.push('/dashboard/analyze_companies');
    };

    const handleAnalyzeSelectedFromAiTab = () => {
        // Resolve analysis-row ids → company ids via the ref map (kept current for every
        // loaded page AND for "Select all matching"), not aiAnalysisData — that only holds
        // the current page, so a multi-page selection would lose everything off-screen.
        const seen = new Set<number>();
        const companyIds = Array.from(selectedRowIds).map((id) => {
            return aiAnalysisIdToCompanyIdRef.current.get(id) || aiAnalysisData.find((row: any) => row.id === id)?.company_id;
        }).filter((id: any) => {
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
        if (companyIds.length === 0) { toast.error('No valid companies found in selection'); return; }
        saveReturnState();
        localStorage.setItem('selectedCompanyIds', JSON.stringify(companyIds));
        router.push('/dashboard/analyze_companies');
    };

    const fetchAllCompanyIdsForAnalysis = async () => {
        if (!user) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { toast.error('Authentication token not found'); return; }
        const filters = buildCurrentFilters();
        setDataLoading(true);
        try {
            const response = await fetch(`${backendUrl}/api/master-database`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    dataType: 'companies',
                    selectedCustomers,
                    idsOnly: true,
                    pageSize: 50000,
                    ...filters,
                }),
            });
            if (!response.ok) throw new Error('Failed to fetch company IDs');
            const data = await response.json();
            const ids = data.data?.map((r: any) => r.id) || [];
            saveReturnState();
            localStorage.setItem('selectedCompanyIds', JSON.stringify(ids));
            router.push('/dashboard/analyze_companies');
        } catch (error) {
            toast.error('Failed to fetch company IDs for analysis');
        } finally {
            setDataLoading(false);
        }
    };

    const [exportCompaniesLoading, setExportCompaniesLoading] = useState(false);

    const handleExportCompanies = async () => {
        if (!user) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { toast.error('Authentication token not found'); return; }

        setExportCompaniesLoading(true);
        try {
            const filters = buildCurrentFilters();
            const response = await fetch(`${backendUrl}/api/master-database/export-companies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers,
                    ...filters,
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.error?.message || `Export failed: ${response.status}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'companies_export.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('CSV exported successfully');
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Export failed: ${msg}`);
        } finally {
            setExportCompaniesLoading(false);
        }
    };

    const [exportUnassignedLoading, setExportUnassignedLoading] = useState(false);
    const [exportProspectsLoading, setExportProspectsLoading] = useState(false);

    const handleExportProspects = async () => {
        if (!user) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { toast.error('Authentication token not found'); return; }

        setExportProspectsLoading(true);
        try {
            const filters = buildCurrentFilters();
            const response = await fetch(`${backendUrl}/api/master-database/export-prospects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers,
                    ...filters,
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.error?.message || `Export failed: ${response.status}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'prospects_export.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('CSV exported successfully');
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Export failed: ${msg}`);
        } finally {
            setExportProspectsLoading(false);
        }
    };

    const handleExportUnassignedProspects = async () => {
        if (!user) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) { toast.error('Authentication token not found'); return; }

        setExportUnassignedLoading(true);
        try {
            const filters = buildCurrentFilters();
            const response = await fetch(`${backendUrl}/api/master-database/export-unassigned-prospects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers,
                    selectedIds: selectedRowIds.size > 0 ? Array.from(selectedRowIds) : undefined,
                    ...filters,
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.error?.message || `Export failed: ${response.status}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'unassigned_prospects_linkedin_urns.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('CSV exported successfully');
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Export failed: ${msg}`);
        } finally {
            setExportUnassignedLoading(false);
        }
    };

    const handleStartExport = async () => {
        if (!user || !selectedAiPromptId) {
            toast.error('Select an AI prompt on the AI Analysis tab first');
            return;
        }
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) return;

        // Build the same filters as the current view
        const activeDataFilters: Record<string, string> = {};
        Object.entries(aiDataFilters).forEach(([key, val]) => {
            if (val && val.trim()) activeDataFilters[key] = val.trim();
        });
        const activeIncludeEmpty: Record<string, boolean> = {};
        Object.entries(aiDataIncludeEmpty).forEach(([key, val]) => {
            if (val) activeIncludeEmpty[key] = true;
        });
        const activeNotEmpty: Record<string, boolean> = {};
        Object.entries(aiDataNotEmpty).forEach(([key, val]) => {
            if (val) activeNotEmpty[key] = true;
        });
        const activeMultiSelectFilters: Record<string, string[]> = {};
        Object.entries(aiDataMultiSelectFilters).forEach(([key, vals]) => {
            if (vals && vals.length > 0) activeMultiSelectFilters[key] = vals;
        });
        // Find prompt name for display
        const promptOption = aiPromptOptions.find(p => String(p.id) === selectedAiPromptId);
        const promptName = promptOption ? `${promptOption.name} (v${promptOption.version})` : selectedAiPromptId;

        try {
            const res = await fetch(`${backendUrl}/api/master-database/export-ai-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    userUuid: user.uuid,
                    selectedCustomers,
                    selectedAiPromptId,
                    aiDataFilters: Object.keys(activeDataFilters).length > 0 ? activeDataFilters : undefined,
                    aiIncludeEmpty: Object.keys(activeIncludeEmpty).length > 0 ? activeIncludeEmpty : undefined,
                    aiNotEmpty: Object.keys(activeNotEmpty).length > 0 ? activeNotEmpty : undefined,
                    aiMultiSelectFilters: Object.keys(activeMultiSelectFilters).length > 0 ? activeMultiSelectFilters : undefined,
                    searchAiCompanyName: searchAiCompanyName.trim() || undefined,
                    includeEmptyAiCompanyName: includeEmptyAiCompanyName || undefined,
                    notEmptyAiCompanyName: notEmptyAiCompanyName || undefined,
                    searchAiCompanyIndustry: searchAiCompanyIndustry.trim() || undefined,
                    includeEmptyAiCompanyIndustry: includeEmptyAiCompanyIndustry || undefined,
                    notEmptyAiCompanyIndustry: notEmptyAiCompanyIndustry || undefined,
                    searchAiCompanyCountry: searchAiCompanyCountry.trim() || undefined,
                    includeEmptyAiCompanyCountry: includeEmptyAiCompanyCountry || undefined,
                    notEmptyAiCompanyCountry: notEmptyAiCompanyCountry || undefined,
                    searchAiCompanySizeRange: searchAiCompanySizeRange.trim() || undefined,
                    includeEmptyAiCompanySizeRange: includeEmptyAiCompanySizeRange || undefined,
                    notEmptyAiCompanySizeRange: notEmptyAiCompanySizeRange || undefined,
                    searchAiCompanyCity: searchAiCompanyCity.trim() || undefined,
                    includeEmptyAiCompanyCity: includeEmptyAiCompanyCity || undefined,
                    notEmptyAiCompanyCity: notEmptyAiCompanyCity || undefined,
                    searchAiCompanyWebsite: searchAiCompanyWebsite.trim() || undefined,
                    includeEmptyAiCompanyWebsite: includeEmptyAiCompanyWebsite || undefined,
                    notEmptyAiCompanyWebsite: notEmptyAiCompanyWebsite || undefined,
                    searchAiCompanyDescription: searchAiCompanyDescription.trim() || undefined,
                    includeEmptyAiCompanyDescription: includeEmptyAiCompanyDescription || undefined,
                    notEmptyAiCompanyDescription: notEmptyAiCompanyDescription || undefined,
                    minAiCompanySize: minAiCompanySize.trim() || undefined,
                    maxAiCompanySize: maxAiCompanySize.trim() || undefined,
                    selectedAiCompanyProvincies: selectedAiCompanyProvincies.length > 0 ? selectedAiCompanyProvincies : undefined,
                    includeEmptyAiCompanyProvincie: includeEmptyAiCompanyProvincie || undefined,
                    notEmptyAiCompanyProvincie: notEmptyAiCompanyProvincie || undefined,
                    selectedAiCompanyBusinessTypes: selectedAiCompanyBusinessTypes.length > 0 ? selectedAiCompanyBusinessTypes : undefined,
                    includeEmptyAiCompanyBusinessType: includeEmptyAiCompanyBusinessType || undefined,
                    notEmptyAiCompanyBusinessType: notEmptyAiCompanyBusinessType || undefined,
                    searchAiCompanyOfferingType: searchAiCompanyOfferingType.trim() || undefined,
                    includeEmptyAiCompanyOfferingType: includeEmptyAiCompanyOfferingType || undefined,
                    notEmptyAiCompanyOfferingType: notEmptyAiCompanyOfferingType || undefined,
                    selectedAiCompanyTypes: selectedAiCompanyTypes.length > 0 ? selectedAiCompanyTypes : undefined,
                    includeEmptyAiCompanyType: includeEmptyAiCompanyType || undefined,
                    notEmptyAiCompanyType: notEmptyAiCompanyType || undefined,
                    selectedListId: selectedAiListId || undefined,
                    selectedListStatus: selectedAiListStatus || undefined,
                    sortField: sortField || undefined,
                    sortDirection: sortDirection || undefined,
                    promptName,
                    selectedIds: selectedRowIds.size > 0 ? Array.from(selectedRowIds) : undefined,
                }),
            });
            if (!res.ok) throw new Error(`Failed to start export: ${res.status}`);
            toast.success('Export started! Switch to the Exports tab to track progress.');
            setActiveTab('exports');
            setTimeout(fetchExportJobs, 500);
        } catch (error) {
            console.error('❌ Start Export Error:', error);
            toast.error('Failed to start export');
        }
    };

    const handleDownloadExport = async (exportId: string) => {
        if (!user) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) return;

        try {
            const res = await fetch(`${backendUrl}/api/master-database/export-download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userUuid: user.uuid, exportId }),
            });
            if (!res.ok) throw new Error(`Download failed: ${res.status}`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const job = exportJobs.find(j => j.exportId === exportId);
            a.download = job?.fileName || `ai_analysis_export.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('❌ Download Export Error:', error);
            toast.error('Failed to download export');
        }
    };

    const handleDeleteExport = async (exportId: string) => {
        if (!user) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        if (!token) return;

        try {
            const res = await fetch(`${backendUrl}/api/master-database/export-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userUuid: user.uuid, exportId }),
            });
            if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
            setExportJobs(prev => prev.filter(j => j.exportId !== exportId));
            toast.success('Export deleted');
        } catch (error) {
            console.error('❌ Delete Export Error:', error);
            toast.error('Failed to delete export');
        }
    };

    // Known static fields on AI analysis rows — anything else is a dynamic analysis_data field
    const AI_STATIC_FIELDS = new Set([
        'id', 'analysis_data', 'analysis_status', 'prompt_version', 'model_id',
        'created_at', 'updated_at', 'company_id', 'company_name', 'company_company_id',
        'company_website', 'company_linkedin', 'company_industry',
        'ai_prompt_id', 'prompt_name', 'prompt_version_name',
        'scrape_website_url',
    ]);

    const getAnalysisFields = (data: any[]): string[] => {
        const allKeys = new Set<string>();
        data.forEach(item => {
            Object.keys(item).forEach(key => {
                if (!AI_STATIC_FIELDS.has(key)) allKeys.add(key);
            });
        });
        return Array.from(allKeys).sort();
    };

    const renderFieldValue = (value: any): React.ReactNode => {
        if (value === null || value === undefined) return <span className="text-gray-400">-</span>;
        if (typeof value === 'string') return value.length > 50 ? `${value.substring(0, 50)}...` : value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (Array.isArray(value)) {
            if (value.length === 0) return <span className="text-gray-400">Empty</span>;
            if (value.every(item => typeof item === 'string')) return value.join(', ');
            return `${value.length} items`;
        }
        if (typeof value === 'object') {
            const jsonStr = JSON.stringify(value);
            return jsonStr.length > 50 ? `${jsonStr.substring(0, 50)}...` : jsonStr;
        }
        return String(value);
    };

    const formatFieldLabel = (field: string): string => {
        // Take the last segment after the last dot for display
        const lastPart = field.includes('.') ? field.split('.').pop()! : field;
        return lastPart.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    if (!isMounted || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-[#47577d]">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-0">
            <Navigation user={user} onLogout={handleLogout} currentPage="Master Database" pageIcon={FaDatabase} />
            <div className="px-6 mt-6">
                {/* Simplified Filter Bar - Only Customer and Controls */}
                <div className="bg-white shadow-md rounded-lg p-2 mb-4 flex items-start gap-4">
                    {/* Left side: Customer and Prospects Filters */}
                    <div className="flex items-start gap-4">
                        {activeTab === 'ai_analysis' ? (
                            /* AI Prompt filter for AI Analysis tab */
                            <>
                            <div className="w-64">
                                {filterOptionsLoading ? (
                                    <div className="border border-gray-300 rounded-md bg-white p-2 flex items-center justify-center h-[30px]">
                                        <ClipLoader size={16} color="#364570" />
                                    </div>
                                ) : (
                                    <MultiSelect
                                        options={aiPromptSelectOptions}
                                        selectedValues={selectedAiPromptId ? [selectedAiPromptId] : []}
                                        onChange={(values) => setSelectedAiPromptId(values.length > 0 ? values[values.length - 1] : '')}
                                        title="AI Prompt"
                                        onExpandedChange={(isExpanded) => handleFilterExpandedChange('aiPrompt', isExpanded)}
                                        isExpanded={expandedFilters.has('aiPrompt')}
                                        singleSelect={true}
                                        showAllOption={false}
                                    />
                                )}
                            </div>
                            {/* List filter for AI Analysis tab */}
                            {companyLists.length > 0 && (
                                <div className="w-56">
                                    <MultiSelect
                                        options={companyLists.map(l => ({ value: String(l.id), label: l.name }))}
                                        selectedValues={selectedAiListId ? [selectedAiListId] : []}
                                        onChange={(values) => {
                                            const newVal = values.length > 0 ? values[values.length - 1] : '';
                                            setSelectedAiListId(newVal);
                                            if (!newVal) setSelectedAiListStatus('');
                                        }}
                                        title="List"
                                        onExpandedChange={(isExpanded) => handleFilterExpandedChange('aiList', isExpanded)}
                                        isExpanded={expandedFilters.has('aiList')}
                                        singleSelect={true}
                                        showAllOption={false}
                                    />
                                </div>
                            )}
                            {selectedAiListId && (
                                <div className="w-44">
                                    <MultiSelect
                                        options={[
                                            { value: 'accepted', label: 'Accepted' },
                                            { value: 'declined', label: 'Declined' },
                                            { value: 'empty', label: 'No status' },
                                        ]}
                                        selectedValues={selectedAiListStatus ? [selectedAiListStatus] : []}
                                        onChange={(values) => setSelectedAiListStatus(values.length > 0 ? values[values.length - 1] : '')}
                                        title="List Status"
                                        onExpandedChange={(isExpanded) => handleFilterExpandedChange('aiListStatus', isExpanded)}
                                        isExpanded={expandedFilters.has('aiListStatus')}
                                        singleSelect={true}
                                        showAllOption={false}
                                    />
                                </div>
                            )}
                            </>
                        ) : (
                            /* Customer Selection for other tabs */
                            <div className="w-64">
                                {filterOptionsLoading ? (
                                    <div className="border border-gray-300 rounded-md bg-white p-2 flex items-center justify-center h-[30px]">
                                        <ClipLoader size={16} color="#364570" />
                                    </div>
                                ) : (
                                    <MultiSelect
                                        options={sortedCustomerOptions}
                                        selectedValues={selectedCustomers}
                                        onChange={(values) => {
                                            if (activeTab === 'companies') {
                                                // Single-select: keep only the newest value
                                                if (values.length === 0) {
                                                    setSelectedCustomers([]);
                                                } else {
                                                    const newValue = values.find(v => !selectedCustomers.includes(v));
                                                    setSelectedCustomers(newValue ? [newValue] : values.slice(-1));
                                                }
                                            } else {
                                                setSelectedCustomers(values);
                                            }
                                        }}
                                        title="Customer"
                                        onExpandedChange={(isExpanded) => handleFilterExpandedChange('customer', isExpanded)}
                                        isExpanded={expandedFilters.has('customer')}
                                        showEmptyOption={true}
                                        emptyMeansAll={true}
                                    />
                                )}
                            </div>
                        )}

                        {/* Prospects Filters */}
                        {activeTab === 'prospects' && (
                            <>
                                {/* Profile Selection */}
                                <div className="w-64">
                                    {selectedCustomers.length === 0 ? (
                                        <div className="border border-gray-300 rounded-md bg-gray-100 p-2 h-[30px] flex items-center">
                                            <span className="text-xs text-gray-500">Select customer(s)</span>
                                        </div>
                                    ) : (
                                        <MultiSelect
                                            options={profileOptions}
                                            selectedValues={selectedProfiles}
                                            onChange={(values) => {
                                                console.log('📝 Profile selection changed:', values);
                                                setSelectedProfiles(values);
                                            }}
                                            title="Profile"
                                            onExpandedChange={(isExpanded) => handleFilterExpandedChange('profile', isExpanded)}
                                            isExpanded={expandedFilters.has('profile')}
                                            showEmptyOption={true}
                                        />
                                    )}
                                </div>

                                {/* Campaign Selection */}
                                <div className="w-64">
                                    {selectedProfiles.length === 0 ? (
                                        <div className="border border-gray-300 rounded-md bg-gray-100 p-2 h-[30px] flex items-center">
                                            <span className="text-xs text-gray-500">Select profile(s)</span>
                                        </div>
                                    ) : (
                                        <MultiSelect
                                            options={prospectCampaignOptions}
                                            selectedValues={selectedProspectCampaigns}
                                            onChange={(values) => {
                                                console.log('📝 Campaign selection changed:', values);
                                                setSelectedProspectCampaigns(values);
                                            }}
                                            title="Campaign"
                                            onExpandedChange={(isExpanded) => handleFilterExpandedChange('prospectCampaign', isExpanded)}
                                            isExpanded={expandedFilters.has('prospectCampaign')}
                                            showEmptyOption={true}
                                        />
                                    )}
                                </div>

                            </>
                        )}

                        {/* Campaigns Tab Profile Filter */}
                        {activeTab === 'campaigns' && (
                            <div className="w-64">
                                {selectedCustomers.length === 0 ? (
                                    <div className="border border-gray-300 rounded-md bg-gray-100 p-2 h-[30px] flex items-center">
                                        <span className="text-xs text-gray-500">Select customer(s)</span>
                                    </div>
                                ) : (
                                    <MultiSelect
                                        options={campaignProfileNameOptions}
                                        selectedValues={selectedCampaignProfiles}
                                        onChange={setSelectedCampaignProfiles}
                                        title="Profile"
                                        onExpandedChange={(isExpanded) => handleFilterExpandedChange('campaignProfile', isExpanded)}
                                        isExpanded={expandedFilters.has('campaignProfile')}
                                        showEmptyOption={true}
                                    />
                                )}
                            </div>
                        )}

                    </div>

                    {/* Right side: Controls */}
                    <div className="flex items-center gap-2 ml-auto">
                        {/* New Campaign button – Campaigns tab */}
                        {activeTab === 'campaigns' && (
                            <button
                                onClick={() => setShowCreateCampaignModal(true)}
                                disabled={selectedCustomers.length === 0}
                                title={selectedCustomers.length === 0 ? 'Select a customer first' : 'Create a new campaign'}
                                className="h-[30px] px-3 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors border-[#364570] text-[#364570] hover:bg-[#364570] hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                New Campaign
                            </button>
                        )}

                        {/* Export CSV button – Companies tab */}
                        {activeTab === 'companies' && (
                            <button
                                onClick={handleExportCompanies}
                                disabled={companiesData.length === 0 || exportCompaniesLoading}
                                className="h-[30px] px-3 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors border-[#364570] text-[#364570] hover:bg-[#364570] hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {exportCompaniesLoading ? 'Exporting…' : 'Export CSV'}
                            </button>
                        )}

                        {/* Export CSV button – Prospects (Campaigns) tab */}
                        {activeTab === 'prospects' && (
                            <button
                                onClick={handleExportProspects}
                                disabled={prospectsData.length === 0 || exportProspectsLoading}
                                className="h-[30px] px-3 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors border-[#364570] text-[#364570] hover:bg-[#364570] hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {exportProspectsLoading ? 'Exporting…' : 'Export CSV'}
                            </button>
                        )}

                        {/* Actions buttons – Unassigned Prospects tab */}
                        {activeTab === 'unassigned_prospects' && (
                            <>
                            <button
                                onClick={handleExportUnassignedProspects}
                                disabled={unassignedProspectsData.length === 0 || exportUnassignedLoading}
                                className="h-[30px] px-3 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors border-[#364570] text-[#364570] hover:bg-[#364570] hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {exportUnassignedLoading ? 'Exporting…' : selectedRowIds.size > 0 ? `Export CSV (${selectedRowIds.size})` : 'Export CSV'}
                            </button>
                            </>
                        )}

                        {/* Column Visibility */}
                        {(activeTab === 'companies' || activeTab === 'prospects' || activeTab === 'unassigned_prospects' || activeTab === 'campaigns' || activeTab === 'ai_analysis') && (
                            <div className="relative column-dropdown">
                                <button
                                    onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                                    className="h-[30px] px-2 text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
                                >
                                    <BsEye className="w-4 h-4" />
                                    <span>Columns</span>
                                    <BsChevronDown className={`w-4 h-4 transition-transform ${showColumnDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showColumnDropdown && (
                                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[60] min-w-48 max-h-96 overflow-y-auto">
                                        <div className="p-2">
                                            <label className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer border-b border-gray-200 mb-1">
                                                <input
                                                    type="checkbox"
                                                    checked={activeTab === 'companies' ? Object.values(visibleColumns).every(Boolean) : activeTab === 'prospects' ? Object.values(visibleColumnsProspects).every(Boolean) : activeTab === 'unassigned_prospects' ? Object.values(visibleColumnsUnassigned).every(Boolean) : activeTab === 'ai_analysis' ? Object.values(visibleColumnsAiAnalysis).every(Boolean) : Object.values(visibleColumnsCampaigns).every(Boolean)}
                                                    onChange={(e) => {
                                                        const allVisible = e.target.checked;
                                                        if (activeTab === 'companies') {
                                                            setVisibleColumns({
                                                                companyId: allVisible,
                                                                name: allVisible,
                                                                description: allVisible,
                                                                website: allVisible,
                                                                linkedin: allVisible,
                                                                industry: allVisible,
                                                                businessType: allVisible,
                                                                offeringType: allVisible,
                                                                aiPromptFilter: allVisible,
                                                                country: allVisible,
                                                                provincie: allVisible,
                                                                city: allVisible,
                                                                size: allVisible,
                                                                sizeRange: allVisible,
                                                                blacklisted: allVisible,
                                                                inCampaign: allVisible,
                                                                websiteScrape: allVisible,
                                                                scrapingName: allVisible,
                                                                createdAt: allVisible,
                                                                list: allVisible,
                                                            });
                                                        } else if (activeTab === 'prospects') {
                                                            setVisibleColumnsProspects({
                                                                contactId: allVisible,
                                                                linkedinObjectUrn: allVisible,
                                                                prospectId: allVisible,
                                                                linkedinUrl: allVisible,
                                                                firstName: allVisible,
                                                                lastName: allVisible,
                                                                campaignName: allVisible,
                                                                prospectStatus: allVisible,
                                                                email: allVisible,
                                                                phone: allVisible,
                                                                birthday: allVisible,
                                                                jobTitle: allVisible,
                                                                personaAreas: allVisible,
                                                                personaLevels: allVisible,
                                                                personaLevel: allVisible,
                                                                personaCategory: allVisible,
                                                                jobChange: allVisible,
                                                                linkedinGroupName: allVisible,
                                                                groupAreas: allVisible,
                                                                placeholders: allVisible,
                                                                company: allVisible,
                                                                companyCompanyId: allVisible,
                                                                companyWebsiteUrl: allVisible,
                                                                companyLinkedinUrl: allVisible,
                                                                companyCity: allVisible,
                                                                companySize: allVisible,
                                                                companySizeRange: allVisible,
                                                                companyIndustry: allVisible,
                                                                companyBusinessType: allVisible,
                                                                companyCountry: allVisible,
                                                                companyProvincie: allVisible,
                                                                dateConnected: allVisible,
                                                                dateConnectionRequested: allVisible,
                                                                dateReplied: allVisible,
                                                                datePositiveTag: allVisible,
                                                                scrapingName: allVisible,
                                                                country: allVisible,
                                                                stopOutreach: allVisible,
                                                                leadPhase: allVisible,
                                                                emailSent: allVisible,
                                                                blacklisted: allVisible,
                                                                crm: allVisible,
                                                                list: allVisible,
                                                                companyList: allVisible,
                                                            });
                                                        } else if (activeTab === 'unassigned_prospects') {
                                                            setVisibleColumnsUnassigned({
                                                                contactId: allVisible,
                                                                prospectId: allVisible,
                                                                linkedInObjectUrn: allVisible,
                                                                firstName: allVisible,
                                                                lastName: allVisible,
                                                                email: allVisible,
                                                                phone: allVisible,
                                                                jobTitle: allVisible,
                                                                scrapingName: allVisible,
                                                                country: allVisible,
                                                                blacklisted: allVisible,
                                                                personaAreas: allVisible,
                                                                personaLevels: allVisible,
                                                                personaLevel: allVisible,
                                                                personaCategory: allVisible,
                                                                jobChange: allVisible,
                                                                linkedInGroup: allVisible,
                                                                groupAreas: allVisible,
                                                                placeholders: allVisible,
                                                                companyName: allVisible,
                                                                companyCity: allVisible,
                                                                companySizeRange: allVisible,
                                                                companyIndustry: allVisible,
                                                                companyCountry: allVisible,
                                                                inCampaign: allVisible,
                                                                list: allVisible,
                                                                companyList: allVisible,
                                                            });
                                                        } else if (activeTab === 'campaigns') {
                                                            setVisibleColumnsCampaigns({
                                                                profileName: allVisible,
                                                                campaignName: allVisible,
                                                                requestsPerDay: allVisible,
                                                                type: allVisible,
                                                                content: allVisible,
                                                                sector: allVisible,
                                                                companyAttribute: allVisible,
                                                                persona: allVisible,
                                                                connectionRequest: allVisible,
                                                                firstFollowUp: allVisible,
                                                                secondFollowUp: allVisible,
                                                                thirdFollowUp: allVisible,
                                                                fourthFollowUp: allVisible,
                                                                startDate: allVisible,
                                                                live: allVisible,
                                                                stopFollowUp: allVisible,
                                                            });
                                                        } else if (activeTab === 'ai_analysis') {
                                                            setVisibleColumnsAiAnalysis({
                                                                companyName: allVisible,
                                                                companyId: allVisible,
                                                                companyWebsite: allVisible,
                                                                companyLinkedin: allVisible,
                                                                companyIndustry: allVisible,
                                                                companyCountry: allVisible,
                                                                companyCity: allVisible,
                                                                companySizeRange: allVisible,
                                                                description: allVisible,
                                                                size: allVisible,
                                                                provincie: allVisible,
                                                                businessType: allVisible,
                                                                offeringType: allVisible,
                                                                companyType: allVisible,
                                                                analysisStatus: allVisible,
                                                                modelId: allVisible,
                                                                promptVersion: allVisible,
                                                                createdAt: allVisible,
                                                            });
                                                        }
                                                    }}
                                                    className="rounded"
                                                />
                                                <span className="text-sm font-medium">All Columns</span>
                                            </label>
                                            {activeTab === 'companies' ? (
                                                Object.entries(visibleColumns).map(([key, isVisible]) => {
                                                    const columnLabels: Record<string, string> = {
                                                        companyId: 'Company ID',
                                                        name: 'Name',
                                                        description: 'Description',
                                                        website: 'Website',
                                                        linkedin: 'LinkedIn',
                                                        industry: 'Industry',
                                                        businessType: 'Business Type',
                                                        offeringType: 'Offering Type',
                                                        aiPromptFilter: 'AI Prompt Filter',
                                                        country: 'Country',
                                                        provincie: 'Province',
                                                        city: 'City',
                                                        size: 'Size',
                                                        sizeRange: 'Size Range',
                                                        blacklisted: 'Blacklisted',
                                                        websiteScrape: 'Website Scrape',
                                                        scrapingName: 'Scraping Name',
                                                        createdAt: 'Created At',
                                                        list: 'List',
                                                    };
                                                    return (
                                                        <label key={key} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={isVisible}
                                                                onChange={() => toggleColumnVisibility(key as keyof typeof visibleColumns)}
                                                                className="rounded"
                                                            />
                                                            <span className="text-sm">{columnLabels[key]}</span>
                                                        </label>
                                                    );
                                                })
                                            ) : activeTab === 'prospects' ? (
                                                <>
                                                    {/* Company columns group toggle */}
                                                    {(() => {
                                                        const companyColumns = [
                                                            'company',
                                                            'companyCompanyId',
                                                            'companyWebsiteUrl',
                                                            'companyLinkedinUrl',
                                                            'companyCity',
                                                            'companySize',
                                                            'companySizeRange',
                                                            'companyIndustry',
                                                            'companyBusinessType',
                                                            'companyCountry',
                                                            'companyProvincie'
                                                        ];
                                                        const allCompanyVisible = companyColumns.every(col => 
                                                            visibleColumnsProspects[col as keyof typeof visibleColumnsProspects]
                                                        );
                                                        const someCompanyVisible = companyColumns.some(col => 
                                                            visibleColumnsProspects[col as keyof typeof visibleColumnsProspects]
                                                        );
                                                        
                                                        return (
                                                            <label className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer border-b border-gray-200 font-medium">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={allCompanyVisible}
                                                                    ref={(el) => {
                                                                        if (el) {
                                                                            el.indeterminate = someCompanyVisible && !allCompanyVisible;
                                                                        }
                                                                    }}
                                                                    onChange={() => {
                                                                        const newValue = !allCompanyVisible;
                                                                        setVisibleColumnsProspects(prev => {
                                                                            const updated = { ...prev };
                                                                            companyColumns.forEach(col => {
                                                                                updated[col as keyof typeof prev] = newValue;
                                                                            });
                                                                            return updated;
                                                                        });
                                                                    }}
                                                                    className="rounded"
                                                                />
                                                                <span className="text-sm">Company (All)</span>
                                                            </label>
                                                        );
                                                    })()}
                                                    
                                                    {/* Individual column toggles */}
                                                    {Object.entries(visibleColumnsProspects).map(([key, isVisible]) => {
                                                        const columnLabels: Record<string, string> = {
                                                            contactId: 'Contact ID',
                                                            linkedinObjectUrn: 'LinkedIn Object URN',
                                                            prospectId: 'Prospect ID',
                                                            linkedinUrl: 'LinkedIn URL',
                                                            firstName: 'First Name',
                                                            lastName: 'Last Name',
                                                            campaignName: 'Campaign Name',
                                                            prospectStatus: 'Status',
                                                            email: 'Email',
                                                            phone: 'Phone',
                                                            birthday: 'Birthday',
                                                            jobTitle: 'Job Title',
                                                            linkedinGroupName: 'LinkedIn Group Name',
                                                            groupAreas: 'Group Areas',
                                                            placeholders: 'Placeholders',
                                                            company: 'Company',
                                                            companyCompanyId: 'Company ID',
                                                            companyWebsiteUrl: 'Company Website',
                                                            companyLinkedinUrl: 'Company LinkedIn',
                                                            companyCity: 'Company City',
                                                            companySize: 'Company Size',
                                                            companySizeRange: 'Company Size Range',
                                                            companyIndustry: 'Company Industry',
                                                            companyBusinessType: 'Company Business Type',
                                                            companyCountry: 'Company Country',
                                                            companyProvincie: 'Company Provincie',
                                                            dateConnected: 'Connected',
                                                            dateConnectionRequested: 'Connection Requested',
                                                            dateReplied: 'Replied',
                                                            datePositiveTag: 'Positive Tag',
                                                            scrapingName: 'Scraping Name',
                                                            country: 'Prospect Country',
                                                            leadPhase: 'Lead Phase',
                                                            emailSent: 'Email Sent',
                                                            blacklisted: 'Blacklisted',
                                                            stopOutreach: 'Stop Outreach',
                                                            crm: 'CRM',
                                                            personaAreas: 'Persona Areas',
                                                            personaLevels: 'Persona Levels',
                                                            personaLevel: 'Persona Level',
                                                            personaCategory: 'Persona Category',
                                                            jobChange: 'Job Change',
                                                            list: 'Prospect List',
                                                            companyList: 'Company List',
                                                        };
                                                        return (
                                                            <label key={key} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isVisible}
                                                                    onChange={() => setVisibleColumnsProspects(prev => ({
                                                                        ...prev,
                                                                        [key]: !prev[key as keyof typeof prev]
                                                                    }))}
                                                                    className="rounded"
                                                                />
                                                                <span className="text-sm">{columnLabels[key]}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </>
                                            ) : activeTab === 'unassigned_prospects' ? (
                                                Object.entries(visibleColumnsUnassigned).map(([key, isVisible]) => {
                                                    const columnLabels: Record<string, string> = {
                                                        contactId: 'Contact ID',
                                                        prospectId: 'Prospect ID',
                                                        linkedInObjectUrn: 'LinkedIn Object URN',
                                                        firstName: 'First Name',
                                                        lastName: 'Last Name',
                                                        email: 'Email',
                                                        phone: 'Phone',
                                                        jobTitle: 'Job Title',
                                                        scrapingName: 'Scraping Name',
                                                        country: 'Prospect Country',
                                                        blacklisted: 'Blacklisted',
                                                        personaAreas: 'Persona Areas',
                                                        personaLevels: 'Persona Levels',
                                                        personaLevel: 'Persona Level',
                                                        personaCategory: 'Persona Category',
                                                        jobChange: 'Job Change',
                                                        linkedInGroup: 'LinkedIn Group',
                                                        groupAreas: 'Group Areas',
                                                        placeholders: 'Placeholders',
                                                        companyName: 'Company',
                                                        companyCity: 'City',
                                                        companySizeRange: 'Size Range',
                                                        companyIndustry: 'Industry',
                                                        companyCountry: 'Country',
                                                        inCampaign: 'In Connector Campaigns (Company)',
                                                        list: 'Prospect List',
                                                        companyList: 'Company List',
                                                    };
                                                    return (
                                                        <label key={key} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={isVisible}
                                                                onChange={() => setVisibleColumnsUnassigned(prev => ({
                                                                    ...prev,
                                                                    [key]: !prev[key as keyof typeof prev]
                                                                }))}
                                                                className="rounded"
                                                            />
                                                            <span className="text-sm">{columnLabels[key]}</span>
                                                        </label>
                                                    );
                                                })
                                            ) : activeTab === 'campaigns' ? (
                                                Object.entries(visibleColumnsCampaigns).map(([key, isVisible]) => {
                                                    const columnLabels: Record<string, string> = {
                                                        profileName: 'Profile Name',
                                                        campaignName: 'Campaign Name',
                                                        requestsPerDay: 'Requests/Day',
                                                        type: 'Type',
                                                        content: 'Content',
                                                        sector: 'Sector',
                                                        companyAttribute: 'Company Attribute',
                                                        persona: 'Persona',
                                                        connectionRequest: 'Connection Request',
                                                        firstFollowUp: 'First Follow-up',
                                                        secondFollowUp: 'Second Follow-up',
                                                        thirdFollowUp: 'Third Follow-up',
                                                        fourthFollowUp: 'Fourth Follow-up',
                                                        startDate: 'Start Date',
                                                        live: 'Live',
                                                        stopFollowUp: 'Stop Follow Up',
                                                    };
                                                    return (
                                                        <label key={key} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={isVisible}
                                                                onChange={() => setVisibleColumnsCampaigns(prev => ({
                                                                    ...prev,
                                                                    [key]: !prev[key as keyof typeof prev]
                                                                }))}
                                                                className="rounded"
                                                            />
                                                            <span className="text-sm">{columnLabels[key]}</span>
                                                        </label>
                                                    );
                                                })
                                            ) : activeTab === 'ai_analysis' ? (
                                                Object.entries(visibleColumnsAiAnalysis).map(([key, isVisible]) => {
                                                    const columnLabels: Record<string, string> = {
                                                        companyName: 'Company',
                                                        companyId: 'Company ID',
                                                        companyWebsite: 'Website',
                                                        companyLinkedin: 'LinkedIn',
                                                        companyIndustry: 'Industry',
                                                        companyCountry: 'Country',
                                                        companyCity: 'City',
                                                        companySizeRange: 'Size Range',
                                                        description: 'Description',
                                                        size: 'Size',
                                                        provincie: 'Province',
                                                        businessType: 'Business Type',
                                                        offeringType: 'Offering Type',
                                                        companyType: 'Company Type',
                                                        analysisStatus: 'Status',
                                                        modelId: 'Model',
                                                        promptVersion: 'Prompt Ver.',
                                                        createdAt: 'Created At',
                                                    };
                                                    return (
                                                        <label key={key} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={isVisible}
                                                                onChange={() => setVisibleColumnsAiAnalysis(prev => ({
                                                                    ...prev,
                                                                    [key]: !prev[key as keyof typeof prev]
                                                                }))}
                                                                className="rounded"
                                                            />
                                                            <span className="text-sm">{columnLabels[key]}</span>
                                                        </label>
                                                    );
                                                })
                                            ) : null}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Manage Prompts – AI Analysis tab only */}
                        {activeTab === 'ai_analysis' && user?.type === 'Admin' && (
                            <button
                                onClick={() => { fetchAllAiPrompts(); setShowPromptModal(true); setPromptModalMode('view'); setEditingPrompt(null); }}
                                className="h-[30px] px-3 text-xs font-medium border border-[#364570] text-[#364570] rounded-md hover:bg-[#364570] hover:text-white transition-colors flex items-center gap-1.5"
                            >
                                <FaSlidersH className="w-3.5 h-3.5" />
                                Manage Prompts
                            </button>
                        )}



                        {/* Apply Filters Button */}
                        <button
                            onClick={applyFilters}
                            disabled={dataLoading || isCountLoading}
                            className="h-[30px] px-3 bg-[#364570] text-white rounded-md shadow-sm text-xs font-medium hover:bg-[#2a3654] focus:ring-2 focus:ring-[#364570] focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors duration-200"
                        >
                            {(dataLoading || isCountLoading) ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <FaFilter className="w-4 h-4" />
                                    <span>Apply</span>
                                    {isResetNeeded && <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />}
                                </>
                            )}
                        </button>

                        {/* Reset Button */}
                        <button
                            onClick={resetFilters}
                            title={isResetNeeded ? "Reset Filters" : "All filters are already at default settings"}
                            disabled={!isResetNeeded}
                            className={`h-[30px] px-3 bg-[#364570] text-white rounded-md shadow-sm text-xs font-medium flex items-center justify-center gap-2 transition-colors duration-200 ${
                                isResetNeeded 
                                    ? 'hover:bg-[#2a3654] focus:ring-2 focus:ring-[#364570] focus:ring-offset-2' 
                                    : 'opacity-50 cursor-not-allowed'
                            }`}
                        >
                            <RiResetLeftFill className="w-4 h-4" />
                            <span>Reset</span>
                        </button>
                    </div>
                </div>

                {/* Move Prospects Widget */}
                {activeTab === 'prospects' && showMoveProspectsWidget && (
                    <div className="bg-white shadow-md rounded-lg p-4 mb-4 border border-blue-200 bg-blue-50/40">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-800">Move Prospects between Campaigns</h3>
                            <button
                                onClick={() => setShowMoveProspectsWidget(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="Close"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* From Campaign (read-only) */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">From Campaign</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={moveProspectsFromCampaignName}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-default"
                                />
                            </div>

                            {/* Target Profile */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Target Profile</label>
                                <select
                                    value={moveWidgetTargetProfileId}
                                    onChange={e => {
                                        const pid = e.target.value;
                                        setMoveWidgetTargetProfileId(pid);
                                        setMoveWidgetTargetCampaignId('');
                                        setMoveWidgetCampaigns([]);
                                        if (pid) fetchMoveWidgetCampaigns(pid);
                                    }}
                                    className="w-full px-2 py-1.5 text-xs border border-blue-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">Select profile...</option>
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Target Campaign */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Target Campaign</label>
                                <select
                                    value={moveWidgetTargetCampaignId}
                                    onChange={e => setMoveWidgetTargetCampaignId(e.target.value)}
                                    disabled={!moveWidgetTargetProfileId || moveWidgetCampaignsLoading}
                                    className="w-full px-2 py-1.5 text-xs border border-blue-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    <option value="">
                                        {moveWidgetCampaignsLoading
                                            ? 'Loading...'
                                            : !moveWidgetTargetProfileId
                                                ? 'Select a profile first'
                                                : moveWidgetCampaigns.length === 0
                                                    ? 'No campaigns found'
                                                    : 'Select campaign...'}
                                    </option>
                                    {moveWidgetCampaigns.filter(c => c.id !== moveProspectsFromCampaignId).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {/* Move button + validation message */}
                        <div className="mt-4 flex items-center gap-3">
                            <button
                                onClick={handleMoveProspects}
                                disabled={!canExecuteMove || moveProspectsLoading}
                                title={
                                    !moveProspectsFromCampaignName ? 'From Campaign is not set' :
                                    !moveWidgetTargetProfileId ? 'Select a Target Profile' :
                                    !moveWidgetTargetCampaignId ? 'Select a Target Campaign' :
                                    moveWidgetTargetCampaignId === moveProspectsFromCampaignId ? 'Target Campaign cannot be the same as From Campaign' :
                                    `Move ${prospectsTotal} prospect(s) to selected campaign`
                                }
                                className={`h-[32px] px-4 text-xs font-medium rounded-md flex items-center gap-2 transition-colors ${
                                    canExecuteMove && !moveProspectsLoading
                                        ? 'bg-[#364570] text-white hover:bg-[#2a3654] cursor-pointer'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                {moveProspectsLoading ? <ClipLoader size={14} color="#fff" /> : null}
                                Move {prospectsTotal > 0 ? `${prospectsTotal} ` : ''}Prospect{prospectsTotal !== 1 ? 's' : ''}
                            </button>
                            {moveWidgetTargetCampaignId && moveWidgetTargetCampaignId === moveProspectsFromCampaignId && (
                                <span className="text-xs text-red-500">Target Campaign cannot be the same as From Campaign</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Assign Prospects Widget */}
                {activeTab === 'unassigned_prospects' && showAssignProspectsWidget && (
                    <div className="bg-white shadow-md rounded-lg p-4 mb-4 border border-green-200 bg-green-50/40">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-800">Assign Prospects to Campaign</h3>
                            <button
                                onClick={() => {
                                    setShowAssignProspectsWidget(false);
                                    setAssignMaxPerCompanyBatch('');
                                    setAssignMaxPerCompanyTotal('');
                                    setAssignLimitCountBasis('total');
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="Close"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Target Profile */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Target Profile</label>
                                <select
                                    value={assignWidgetTargetProfileId}
                                    onChange={e => {
                                        const pid = e.target.value;
                                        setAssignWidgetTargetProfileId(pid);
                                        setAssignWidgetTargetCampaignId('');
                                        setAssignWidgetCampaigns([]);
                                        if (pid) fetchAssignWidgetCampaigns(pid);
                                    }}
                                    className="w-full px-2 py-1.5 text-xs border border-green-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                                >
                                    <option value="">Select profile...</option>
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Target Campaign */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Target Campaign</label>
                                <select
                                    value={assignWidgetTargetCampaignId}
                                    onChange={e => setAssignWidgetTargetCampaignId(e.target.value)}
                                    disabled={!assignWidgetTargetProfileId || assignWidgetCampaignsLoading}
                                    className="w-full px-2 py-1.5 text-xs border border-green-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    <option value="">
                                        {assignWidgetCampaignsLoading
                                            ? 'Loading...'
                                            : !assignWidgetTargetProfileId
                                                ? 'Select a profile first'
                                                : assignWidgetCampaigns.length === 0
                                                    ? 'No campaigns found'
                                                    : 'Select campaign...'}
                                    </option>
                                    {assignWidgetCampaigns.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Per-company limits (optional) */}
                        <div className="mt-4 pt-3 border-t border-green-200">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Limit per company <span className="font-normal text-gray-500">(optional — leave empty for no limit)</span></p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Batch limit */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Max per company in this selection</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={assignMaxPerCompanyTotal || undefined}
                                        value={assignMaxPerCompanyBatch}
                                        onChange={e => {
                                            let v = e.target.value;
                                            // Safeguard: batch limit can never exceed the total limit.
                                            if (v && assignMaxPerCompanyTotal && Number(v) > Number(assignMaxPerCompanyTotal)) {
                                                v = assignMaxPerCompanyTotal;
                                            }
                                            setAssignMaxPerCompanyBatch(v);
                                        }}
                                        placeholder="No limit"
                                        className="w-full px-2 py-1.5 text-xs border border-green-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                                    />
                                </div>
                                {/* Total limit */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Max per company for customer (total count)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={assignMaxPerCompanyTotal}
                                        onChange={e => {
                                            const v = e.target.value;
                                            setAssignMaxPerCompanyTotal(v);
                                            // Keep the batch limit at or below the total limit.
                                            if (v && assignMaxPerCompanyBatch && Number(assignMaxPerCompanyBatch) > Number(v)) {
                                                setAssignMaxPerCompanyBatch(v);
                                            }
                                        }}
                                        placeholder="No limit"
                                        className="w-full px-2 py-1.5 text-xs border border-green-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                                    />
                                </div>
                                {/* Count basis */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Count basis (for total limit)</label>
                                    <select
                                        value={assignLimitCountBasis}
                                        onChange={e => setAssignLimitCountBasis(e.target.value as typeof assignLimitCountBasis)}
                                        className="w-full px-2 py-1.5 text-xs border border-green-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                                    >
                                        <option value="total">Total in campaign</option>
                                        <option value="connected">Connected</option>
                                        <option value="replied">Replied</option>
                                        <option value="pos">POS</option>
                                        <option value="neg">NEG</option>
                                    </select>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-2">
                                {assignLimitCountBasis === 'total'
                                    ? 'Total limit counts everyone of the company already in campaigns (this customer) plus the new ones.'
                                    : 'Total limit acts as a gate: if the company already reached the limit of this status, no new prospects are added; otherwise they are.'}
                            </p>
                        </div>

                        {/* Assign button */}
                        <div className="mt-4 flex items-center gap-3">
                            <button
                                onClick={handleAssignProspects}
                                disabled={!assignWidgetTargetCampaignId || assignProspectsLoading}
                                title={
                                    !assignWidgetTargetProfileId ? 'Select a Target Profile' :
                                    !assignWidgetTargetCampaignId ? 'Select a Target Campaign' :
                                    selectedRowIds.size > 0
                                        ? `Assign ${selectedRowIds.size} selected prospect(s) to campaign`
                                        : `Assign ${unassignedProspectsTotal} prospect(s) matching current filters to campaign`
                                }
                                className={`h-[32px] px-4 text-xs font-medium rounded-md flex items-center gap-2 transition-colors ${
                                    assignWidgetTargetCampaignId && !assignProspectsLoading
                                        ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                {assignProspectsLoading ? <ClipLoader size={14} color="#fff" /> : null}
                                Assign {selectedRowIds.size > 0 ? `${selectedRowIds.size} ` : unassignedProspectsTotal > 0 ? `${unassignedProspectsTotal} ` : ''}Prospect{(selectedRowIds.size > 0 ? selectedRowIds.size : unassignedProspectsTotal) !== 1 ? 's' : ''}
                            </button>
                            {selectedRowIds.size > 0 && (
                                <span className="text-xs text-green-700">Only {selectedRowIds.size} selected prospect(s) will be assigned</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Assign to Messenger Campaign Widget */}
                {activeTab === 'prospects' && showMessengerAssignWidget && (
                    <div className="bg-white shadow-md rounded-lg p-4 mb-4 border border-purple-200 bg-purple-50/40">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-800">Assign to Messenger Campaign</h3>
                            <button
                                onClick={() => setShowMessengerAssignWidget(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="Close"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">Only prospects with status &quot;Checked&quot;, &quot;Completed&quot; or &quot;First connection&quot; can be assigned to a Messenger campaign.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Target Profile */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Target Profile</label>
                                <select
                                    value={messengerAssignTargetProfileId}
                                    onChange={e => {
                                        const pid = e.target.value;
                                        setMessengerAssignTargetProfileId(pid);
                                        setMessengerAssignTargetCampaignId('');
                                        setMessengerAssignCampaigns([]);
                                        if (pid) fetchMessengerCampaigns(pid);
                                    }}
                                    className="w-full px-2 py-1.5 text-xs border border-purple-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                >
                                    <option value="">Select profile...</option>
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Target Messenger Campaign */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Messenger Campaign</label>
                                <select
                                    value={messengerAssignTargetCampaignId}
                                    onChange={e => setMessengerAssignTargetCampaignId(e.target.value)}
                                    disabled={!messengerAssignTargetProfileId || messengerAssignCampaignsLoading}
                                    className="w-full px-2 py-1.5 text-xs border border-purple-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    <option value="">
                                        {messengerAssignCampaignsLoading
                                            ? 'Loading...'
                                            : !messengerAssignTargetProfileId
                                                ? 'Select a profile first'
                                                : messengerAssignCampaigns.length === 0
                                                    ? 'No Messenger campaigns found'
                                                    : 'Select Messenger campaign...'}
                                    </option>
                                    {messengerAssignCampaigns.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {/* Assign button */}
                        <div className="mt-4 flex items-center gap-3">
                            <button
                                onClick={handleAssignToMessenger}
                                disabled={!messengerAssignTargetCampaignId || messengerAssignLoading || selectedRowIds.size === 0}
                                title={
                                    selectedRowIds.size === 0 ? 'Select prospects first' :
                                    !messengerAssignTargetProfileId ? 'Select a Target Profile' :
                                    !messengerAssignTargetCampaignId ? 'Select a Messenger Campaign' :
                                    `Assign ${selectedRowIds.size} selected prospect(s) to Messenger campaign`
                                }
                                className={`h-[32px] px-4 text-xs font-medium rounded-md flex items-center gap-2 transition-colors ${
                                    messengerAssignTargetCampaignId && !messengerAssignLoading && selectedRowIds.size > 0
                                        ? 'bg-purple-600 text-white hover:bg-purple-700 cursor-pointer'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                {messengerAssignLoading ? <ClipLoader size={14} color="#fff" /> : null}
                                Assign {selectedRowIds.size} Prospect{selectedRowIds.size !== 1 ? 's' : ''} to Messenger
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Tabs */}
                <div className="bg-white shadow-md rounded-lg mb-4">
                    <div className="border-b border-gray-200">
                        <nav className="flex">
                            <button
                                onClick={() => setActiveTab('companies')}
                                className={`px-4 py-2 text-xs font-medium border-b-2 ${
                                    activeTab === 'companies'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Companies
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedCustomers.length > 1) {
                                        setSelectedCustomers([selectedCustomers[0]]);
                                    }
                                    setActiveTab('unassigned_prospects');
                                }}
                                className={`px-4 py-2 text-xs font-medium border-b-2 ${
                                    activeTab === 'unassigned_prospects'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Prospects (Unassigned)
                            </button>
                            <button
                                onClick={() => {
                                    // When switching to prospects tab, keep only first customer if multiple selected
                                    if (selectedCustomers.length > 1) {
                                        setSelectedCustomers([selectedCustomers[0]]);
                                    }
                                    setActiveTab('prospects');
                                }}
                                className={`px-4 py-2 text-xs font-medium border-b-2 ${
                                    activeTab === 'prospects'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Prospects (Campaigns)
                            </button>
                            <button
                                onClick={() => setActiveTab('campaigns')}
                                className={`px-4 py-2 text-xs font-medium border-b-2 ${
                                    activeTab === 'campaigns'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Campaigns
                            </button>
                            <button
                                onClick={() => setActiveTab('blacklist')}
                                className={`px-4 py-2 text-xs font-medium border-b-2 ${
                                    activeTab === 'blacklist'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Blacklist
                            </button>
                            <button
                                onClick={() => setActiveTab('ai_analysis')}
                                className={`px-4 py-2 text-xs font-medium border-b-2 ${
                                    activeTab === 'ai_analysis'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                AI Analysis
                            </button>
                            <button
                                onClick={() => { setActiveTab('exports'); fetchExportJobs(); }}
                                className={`px-4 py-2 text-xs font-medium border-b-2 ${
                                    activeTab === 'exports'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Exports
                                {exportJobs.some(j => j.status === 'processing') && (
                                    <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('actions')}
                                className={`px-4 py-2 text-xs font-medium border-b-2 ${
                                    activeTab === 'actions'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Actions
                            </button>
                            <button
                                onClick={() => setActiveTab('audit_receiver_search')}
                                className={`px-4 py-2 text-xs font-medium border-b-2 ${
                                    activeTab === 'audit_receiver_search'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Log Inspector
                            </button>
                        </nav>
                    </div>
                    <div className="p-4">
                        {activeTab === 'audit_receiver_search' && (
                            <div className="space-y-4">
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <div className="grid gap-4 md:grid-cols-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Source</label>
                                            <select
                                                value={adminLookupSource}
                                                onChange={(e) => setAdminLookupSource(e.target.value as 'audit-log' | 'data-receiver')}
                                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                                            >
                                                <option value="audit-log">Audit Log</option>
                                                <option value="data-receiver">Data Receiver</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">URL or Prospect ID</label>
                                            <input
                                                value={adminLookupQuery}
                                                onChange={(e) => setAdminLookupQuery(e.target.value)}
                                                placeholder="e.g. https://... or prospect_id"
                                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Profile</label>
                                            <select
                                                value={adminLookupProfileId}
                                                onChange={(e) => setAdminLookupProfileId(e.target.value)}
                                                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
                                            >
                                                <option value="">Any profile</option>
                                                {[...profiles].sort((a, b) => a.name.localeCompare(b.name)).map((profile) => (
                                                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-xs text-gray-500">Search the selected source by URL, prospect ID, and optional profile. Results are sorted newest first.</div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={clearAdminLookup}
                                                disabled={adminLookupLoading}
                                                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                onClick={fetchAdminAuditLookup}
                                                disabled={adminLookupLoading}
                                                className="inline-flex items-center justify-center rounded-md bg-[#364570] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2f3a5d] disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {adminLookupLoading ? 'Searching…' : 'Search'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white p-4">
                                    {adminLookupLoading ? (
                                        <div className="flex justify-center py-12">
                                            <ClipLoader size={24} color="#364570" />
                                        </div>
                                    ) : adminLookupError ? (
                                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{adminLookupError}</div>
                                    ) : adminLookupResults.length === 0 ? (
                                        <div className="text-sm text-gray-600">No results yet. Run a search above.</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {adminLookupResults.map((item, index) => (
                                                <div key={`${item.id ?? index}-${adminLookupSource}`} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-4">
                                                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                        <span>ID: {item.id ?? 'unknown'}</span>
                                                        <span>{adminLookupSource === 'audit-log' ? `Event: ${item.event_type || '-'}` : `Type: ${item.data_type || '-'}`}</span>
                                                        <span>{item.createdAt || item.timestamp ? new Date(item.createdAt || item.timestamp).toLocaleString() : 'No date'}</span>
                                                    </div>
                                                    <div className="mb-2 text-sm font-semibold text-gray-700">{adminLookupSource === 'audit-log' ? 'Details' : 'Raw Data'}</div>
                                                    <pre className="max-h-56 overflow-auto rounded bg-white p-3 text-[11px] leading-snug text-gray-800">
{JSON.stringify(adminLookupSource === 'audit-log' ? item.details : item.raw_data, null, 2)}
                                                    </pre>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'companies' && (
                            <div>
                                {dataLoading ? (
                                    <div className="flex justify-center py-8">
                                        <ClipLoader size={24} color="#364570" />
                                    </div>
                                ) : (companiesData.length > 0 || selectedCustomers.length > 0) ? (
                                    <>
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-700">Total Companies:</span>
                                            <span className="text-xs font-semibold text-[#364570]">{isCountLoading ? <ClipLoader size={12} color="#364570" /> : companiesTotal.toLocaleString()}</span>
                                            <span className="text-xs text-gray-400">· Page {currentPage} of {totalPages}</span>
                                        </div>
                                        {selectedRowIds.size > 0 && (
                                            <div className="mb-2 flex flex-col gap-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-medium text-blue-800">{selectedRowIds.size} selected</span>
                                                    <button onClick={() => setShowBulkEditModal(true)} className="px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors flex items-center gap-1.5"><FaEdit className="w-3 h-3" />Bulk Edit</button>
                                                    <button onClick={() => { setBulkAssignCustomerName(''); setShowBulkAssignCustomerModal(true); }} className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1.5"><FaUserPlus className="w-3 h-3" />Assign Customer</button>
                                                    <button onClick={handleAnalyzeSelected} className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1.5">
                                                        <GiBrain className="w-3 h-3" />
                                                        AI Analysis
                                                    </button>
                                                    <button onClick={() => setShowAddToListModal(true)} disabled={selectedCustomers.length === 0} title={selectedCustomers.length === 0 ? 'Select a customer first' : `Add ${selectedRowIds.size} selected to a list`} className="px-3 py-1 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"><FaListUl className="w-3 h-3" />{selectedRowIds.size > 0 ? `Add to List (${selectedRowIds.size})` : 'Add to List'}</button>
                                                    <button onClick={() => setSelectedRowIds(new Set())} className="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"><FaTimes className="w-3 h-3" />Clear Selection</button>
                                                </div>
                                                {isAllPageSelected() && getActiveTotalForTab() > selectedRowIds.size && (
                                                    <span className="text-xs text-blue-700">
                                                        All {getActiveDataForTab().length} on this page selected.{' '}
                                                        <button onClick={fetchAllFilteredIds} disabled={selectAllLoading} className="underline font-semibold hover:text-blue-900 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5 align-middle">
                                                            {selectAllLoading && <ClipLoader size={10} color="currentColor" />}
                                                            {selectAllLoading ? 'Selecting…' : `Select all ${Math.min(getActiveTotalForTab(), 50000).toLocaleString()} matching records`}
                                                        </button>
                                                        {' · '}
                                                        <button onClick={fetchAllCompanyIdsForAnalysis} className="underline font-semibold hover:text-blue-900">
                                                            Analyze all {getActiveTotalForTab().toLocaleString()} matching
                                                        </button>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="bg-white shadow-md rounded-lg min-h-[calc(100vh-425px)] md:min-h-[calc(100vh-390px)] lg:min-h-[calc(100vh-370px)] max-h-[calc(100vh-425px)] md:max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-370px)] flex flex-col">
                                        <div ref={companiesScrollRef} className="overflow-x-auto overflow-y-auto flex-1">
                                            <table className="divide-y divide-gray-200 table-fixed">
                                                <thead className="bg-gray-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-2 py-1 w-10 flex-shrink-0">
                                                            <input type="checkbox" checked={isAllPageSelected()} ref={(el) => { if (el) el.indeterminate = isSomePageSelected(); }} onChange={toggleSelectAllOnPage} className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]" />
                                                        </th>
                                                        {visibleColumns.companyId && (
                                                            <ResizableHeader
                                                                width={columnWidths['companyId'] || 150}
                                                                onResize={(w) => handleColumnResize('companyId', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Company ID">Company ID</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'companyId' ? null : 'companyId');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchCompanyId || notEmptyCompanyId || includeEmptyCompanyId ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'companyId' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company ID"
                                                                        type="text"
                                                                        searchValue={searchCompanyId}
                                                                        onSearchChange={setSearchCompanyId}
                                                                        excludeSearch={excludeFlags["CompanyId"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["CompanyId"]: v }))}
                                                                        includeEmpty={includeEmptyCompanyId}
                                                                        onIncludeEmptyChange={setIncludeEmptyCompanyId}
                                                                        notEmpty={notEmptyCompanyId}
                                                                        onNotEmptyChange={setNotEmptyCompanyId}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.name && (
                                                            <ResizableHeader
                                                                width={columnWidths['name'] || 160}
                                                                onResize={(w) => handleColumnResize('name', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Name">Name</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'name' ? null : 'name');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchName || notEmptyName || includeEmptyName ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'name' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Name"
                                                                        type="text"
                                                                        searchValue={searchName}
                                                                        onSearchChange={setSearchName}
                                                                        excludeSearch={excludeFlags["Name"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["Name"]: v }))}
                                                                        includeEmpty={includeEmptyName}
                                                                        onIncludeEmptyChange={setIncludeEmptyName}
                                                                        notEmpty={notEmptyName}
                                                                        onNotEmptyChange={setNotEmptyName}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.description && (
                                                            <ResizableHeader
                                                                width={columnWidths['description'] || 200}
                                                                onResize={(w) => handleColumnResize('description', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Description">Description</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'description' ? null : 'description');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchDescription || notEmptyDescription || includeEmptyDescription ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'description' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Description"
                                                                        type="text"
                                                                        searchValue={searchDescription}
                                                                        onSearchChange={setSearchDescription}
                                                                        excludeSearch={excludeFlags["Description"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["Description"]: v }))}
                                                                        includeEmpty={includeEmptyDescription}
                                                                        onIncludeEmptyChange={setIncludeEmptyDescription}
                                                                        notEmpty={notEmptyDescription}
                                                                        onNotEmptyChange={setNotEmptyDescription}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.website && (
                                                            <ResizableHeader
                                                                width={columnWidths['website'] || 160}
                                                                onResize={(w) => handleColumnResize('website', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Website">Website</span>
                                                                    <div className="flex items-center gap-0.5">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setOpenColumnFilter(openColumnFilter === 'website' ? null : 'website');
                                                                            }}
                                                                            className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                            title="Search website URL"
                                                                        >
                                                                            <FaFilter className={`w-3 h-3 ${searchWebsite || notEmptyWebsite || includeEmptyWebsite ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setOpenColumnFilter(openColumnFilter === 'websiteBoolean' ? null : 'websiteBoolean');
                                                                            }}
                                                                            className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                            title="Has website?"
                                                                        >
                                                                            <span className={`text-[9px] font-bold ${hasWebsiteFilter ? 'text-blue-600' : 'text-gray-400'}`}>?</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {openColumnFilter === 'website' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Website"
                                                                        type="text"
                                                                        searchValue={searchWebsite}
                                                                        onSearchChange={setSearchWebsite}
                                                                        excludeSearch={excludeFlags["Website"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["Website"]: v }))}
                                                                        includeEmpty={includeEmptyWebsite}
                                                                        onIncludeEmptyChange={setIncludeEmptyWebsite}
                                                                        notEmpty={notEmptyWebsite}
                                                                        onNotEmptyChange={setNotEmptyWebsite}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                                {openColumnFilter === 'websiteBoolean' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Has Website"
                                                                        type="boolean"
                                                                        booleanValue={hasWebsiteFilter}
                                                                        onBooleanChange={setHasWebsiteFilter}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.linkedin && (
                                                            <ResizableHeader
                                                                width={columnWidths['linkedin'] || 160}
                                                                onResize={(w) => handleColumnResize('linkedin', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="LinkedIn">LinkedIn</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'linkedin' ? null : 'linkedin');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchLinkedIn || notEmptyLinkedIn || includeEmptyLinkedIn ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'linkedin' && (
                                                                    <ColumnFilterDropdown
                                                                        column="LinkedIn"
                                                                        type="text"
                                                                        searchValue={searchLinkedIn}
                                                                        onSearchChange={setSearchLinkedIn}
                                                                        excludeSearch={excludeFlags["LinkedIn"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["LinkedIn"]: v }))}
                                                                        includeEmpty={includeEmptyLinkedIn}
                                                                        onIncludeEmptyChange={setIncludeEmptyLinkedIn}
                                                                        notEmpty={notEmptyLinkedIn}
                                                                        onNotEmptyChange={setNotEmptyLinkedIn}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.industry && (
                                                            <ResizableHeader
                                                                width={columnWidths['industry'] || 180}
                                                                onResize={(w) => handleColumnResize('industry', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Industry">Industry</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'industry' ? null : 'industry');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedIndustries.length > 0 || notEmptyIndustry || includeEmptyIndustry ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'industry' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Industry"
                                                                        type="multiselect"
                                                                        options={industryOptions}
                                                                        selectedValues={selectedIndustries}
                                                                        onSelectedValuesChange={setSelectedIndustries}
                                                                        includeEmpty={includeEmptyIndustry}
                                                                        onIncludeEmptyChange={setIncludeEmptyIndustry}
                                                                        notEmpty={notEmptyIndustry}
                                                                        onNotEmptyChange={setNotEmptyIndustry}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.businessType && (
                                                            <ResizableHeader
                                                                width={columnWidths['businessType'] || 175}
                                                                onResize={(w) => handleColumnResize('businessType', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Business Type">Business Type</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'businessType' ? null : 'businessType');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedBusinessTypes.length > 0 || notEmptyBusinessType || includeEmptyBusinessType ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'businessType' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Business Type"
                                                                        type="multiselect"
                                                                        options={businessTypeOptions}
                                                                        selectedValues={selectedBusinessTypes}
                                                                        onSelectedValuesChange={setSelectedBusinessTypes}
                                                                        includeEmpty={includeEmptyBusinessType}
                                                                        onIncludeEmptyChange={setIncludeEmptyBusinessType}
                                                                        notEmpty={notEmptyBusinessType}
                                                                        onNotEmptyChange={setNotEmptyBusinessType}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.offeringType && (
                                                            <ResizableHeader
                                                                width={columnWidths['offeringType'] || 150}
                                                                onResize={(w) => handleColumnResize('offeringType', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Offering Type">Offering Type</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'offeringType' ? null : 'offeringType');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedOfferingTypes.length > 0 || notEmptyOfferingType || includeEmptyOfferingType ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'offeringType' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Offering Type"
                                                                        type="multiselect"
                                                                        options={offeringTypeOpts}
                                                                        selectedValues={selectedOfferingTypes}
                                                                        onSelectedValuesChange={setSelectedOfferingTypes}
                                                                        includeEmpty={includeEmptyOfferingType}
                                                                        onIncludeEmptyChange={setIncludeEmptyOfferingType}
                                                                        notEmpty={notEmptyOfferingType}
                                                                        onNotEmptyChange={setNotEmptyOfferingType}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.aiPromptFilter && (
                                                            <ResizableHeader
                                                                width={columnWidths['aiPromptFilter'] || 160}
                                                                onResize={(w) => handleColumnResize('aiPromptFilter', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="AI Prompt Filter">AI Prompt Filter</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'aiPromptFilter' ? null : 'aiPromptFilter');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedCompanyPrompts.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'aiPromptFilter' && (
                                                                    <ColumnFilterDropdown
                                                                        column="AI Prompt Filter"
                                                                        type="multiselect"
                                                                        options={[{ value: 'no_prompt', label: '(No analyses)' }, ...companyPromptOpts]}
                                                                        selectedValues={selectedCompanyPrompts}
                                                                        onSelectedValuesChange={setSelectedCompanyPrompts}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                                {selectedCompanyPrompts.length > 0 && (
                                                                    <div className="mt-1 flex items-center gap-1">
                                                                        <input
                                                                            type="checkbox"
                                                                            id="excludePromptChk"
                                                                            checked={excludeCompanyPrompt}
                                                                            onChange={(e) => setExcludeCompanyPrompt(e.target.checked)}
                                                                            className="w-3 h-3"
                                                                        />
                                                                        <label htmlFor="excludePromptChk" className="text-xs text-gray-600 cursor-pointer">Exclude</label>
                                                                    </div>
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.country && (
                                                            <ResizableHeader
                                                                width={columnWidths['country'] || 120}
                                                                onResize={(w) => handleColumnResize('country', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Country">Country</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'country' ? null : 'country');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedCountries.length > 0 || notEmptyCountry || includeEmptyCountry ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'country' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Country"
                                                                        type="multiselect"
                                                                        options={countryOptions}
                                                                        selectedValues={selectedCountries}
                                                                        onSelectedValuesChange={setSelectedCountries}
                                                                        includeEmpty={includeEmptyCountry}
                                                                        onIncludeEmptyChange={setIncludeEmptyCountry}
                                                                        notEmpty={notEmptyCountry}
                                                                        onNotEmptyChange={setNotEmptyCountry}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.provincie && (
                                                            <ResizableHeader
                                                                width={columnWidths['provincie'] || 140}
                                                                onResize={(w) => handleColumnResize('provincie', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Province">Province</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'provincie' ? null : 'provincie');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedProvincies.length > 0 || notEmptyProvincie || includeEmptyProvincie ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'provincie' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Province"
                                                                        type="multiselect"
                                                                        options={provincieOptions}
                                                                        selectedValues={selectedProvincies}
                                                                        onSelectedValuesChange={setSelectedProvincies}
                                                                        includeEmpty={includeEmptyProvincie}
                                                                        onIncludeEmptyChange={setIncludeEmptyProvincie}
                                                                        notEmpty={notEmptyProvincie}
                                                                        onNotEmptyChange={setNotEmptyProvincie}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.city && (
                                                            <ResizableHeader
                                                                width={columnWidths['city'] || 140}
                                                                onResize={(w) => handleColumnResize('city', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="City">City</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'city' ? null : 'city');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedCities.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'city' && (
                                                                    <ColumnFilterDropdown
                                                                        column="City"
                                                                        type="multiselect"
                                                                        options={cityOptions}
                                                                        selectedValues={selectedCities}
                                                                        onSelectedValuesChange={setSelectedCities}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.size && (
                                                            <ResizableHeader
                                                                width={columnWidths['size'] || 110}
                                                                onResize={(w) => handleColumnResize('size', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('size')} title="Size">
                                                                        Size
                                                                        <SortIndicator field="size" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'size' ? null : 'size');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${minSize || maxSize ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'size' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Size"
                                                                        type="range"
                                                                        minValue={minSize}
                                                                        maxValue={maxSize}
                                                                        onMinChange={setMinSize}
                                                                        onMaxChange={setMaxSize}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.sizeRange && (
                                                            <ResizableHeader
                                                                width={columnWidths['sizeRange'] || 165}
                                                                onResize={(w) => handleColumnResize('sizeRange', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('size_range')} title="Size Range">
                                                                        Size Range
                                                                        <SortIndicator field="size_range" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'sizeRange' ? null : 'sizeRange');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedSizeRanges.length > 0 || notEmptySizeRange || includeEmptySizeRange ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'sizeRange' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Size Range"
                                                                        type="multiselect"
                                                                        options={sizeRangeOptions}
                                                                        selectedValues={selectedSizeRanges}
                                                                        onSelectedValuesChange={setSelectedSizeRanges}
                                                                        includeEmpty={includeEmptySizeRange}
                                                                        onIncludeEmptyChange={setIncludeEmptySizeRange}
                                                                        notEmpty={notEmptySizeRange}
                                                                        onNotEmptyChange={setNotEmptySizeRange}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.blacklisted && (
                                                            <ResizableHeader
                                                                width={columnWidths['blacklisted'] || 155}
                                                                onResize={(w) => handleColumnResize('blacklisted', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Blacklisted">Blacklisted</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'blacklisted' ? null : 'blacklisted');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${blacklistedFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'blacklisted' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Blacklisted"
                                                                        type="boolean"
                                                                        booleanValue={blacklistedFilter}
                                                                        onBooleanChange={setBlacklistedFilter}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.websiteScrape && (
                                                            <ResizableHeader
                                                                width={columnWidths['websiteScrape'] || 155}
                                                                onResize={(w) => handleColumnResize('websiteScrape', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Website Scrape">Website Scrape</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'websiteScrape' ? null : 'websiteScrape');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${websiteScrapeFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'websiteScrape' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Website Scrape"
                                                                        type="boolean"
                                                                        booleanValue={websiteScrapeFilter}
                                                                        onBooleanChange={setWebsiteScrapeFilter}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.scrapingName && (
                                                            <ResizableHeader
                                                                width={columnWidths['scrapingName'] || 175}
                                                                onResize={(w) => handleColumnResize('scrapingName', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Scraping Name">Scraping Name</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'scrapingName' ? null : 'scrapingName');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedScrapingNames.length > 0 || notEmptyScrapingName || includeEmptyScrapingName ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'scrapingName' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Scraping Name"
                                                                        type="multiselect"
                                                                        options={scrapingNameOptions}
                                                                        selectedValues={selectedScrapingNames}
                                                                        onSelectedValuesChange={setSelectedScrapingNames}
                                                                        includeEmpty={includeEmptyScrapingName}
                                                                        onIncludeEmptyChange={setIncludeEmptyScrapingName}
                                                                        notEmpty={notEmptyScrapingName}
                                                                        onNotEmptyChange={setNotEmptyScrapingName}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.createdAt && (
                                                            <ResizableHeader width={columnWidths['createdAt'] || 300} onResize={(w) => handleColumnResize('createdAt', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="flex items-center truncate cursor-pointer" title="Created At" onClick={() => handleSort('created_at')}>
                                                                        Created At
                                                                        <SortIndicator field="created_at" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'createdAt' ? null : 'createdAt'); }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${createdAtFrom || createdAtTo || notEmptyCreatedAt || includeEmptyCreatedAt ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'createdAt' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Created At"
                                                                        type="daterange"
                                                                        dateFromValue={createdAtFrom}
                                                                        dateToValue={createdAtTo}
                                                                        onDateFromChange={setCreatedAtFrom}
                                                                        onDateToChange={setCreatedAtTo}
                                                                        includeEmpty={includeEmptyCreatedAt}
                                                                        onIncludeEmptyChange={setIncludeEmptyCreatedAt}
                                                                        notEmpty={notEmptyCreatedAt}
                                                                        onNotEmptyChange={setNotEmptyCreatedAt}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumns.inCampaign && <ResizableHeader width={columnWidths['inCampaign'] || 210} onResize={(w) => handleColumnResize('inCampaign', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="People of this company already in Connector campaigns of this customer — Total / Connected / Replied / POS / NEG">In Connector Campaigns</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'companiesInCampaign' ? null : 'companiesInCampaign'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${companiesInCampaignMin || companiesInCampaignMax ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'companiesInCampaign' && (
                                                                <ColumnFilterDropdown column="In Connector Campaigns" type="range" statusOptions={[{ value: 'total', label: 'Total in Connector campaigns' }, { value: 'connected', label: 'Connected' }, { value: 'replied', label: 'Replied' }, { value: 'pos', label: 'POS tagged' }, { value: 'neg', label: 'NEG tagged' }]} statusValue={companiesInCampaignBasis} onStatusChange={setCompaniesInCampaignBasis} minValue={companiesInCampaignMin} onMinChange={setCompaniesInCampaignMin} maxValue={companiesInCampaignMax} onMaxChange={setCompaniesInCampaignMax} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumns.list && companyLists.length > 0 && (
                                                            <ResizableHeader width={columnWidths['list'] || 140} onResize={(w) => handleColumnResize('list', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="List">List</span>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'list' ? null : 'list'); }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedListId || selectedListStatus ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'list' && (
                                                                    <ColumnFilterDropdown
                                                                        column="List"
                                                                        type="singleselect"
                                                                        options={companyLists.map(l => ({ value: String(l.id), label: l.name }))}
                                                                        singleSelectValue={selectedListId}
                                                                        onSingleSelectChange={setSelectedListId}
                                                                        statusOptions={[
                                                                            { value: 'accepted', label: 'Accepted' },
                                                                            { value: 'declined', label: 'Declined' },
                                                                            { value: 'empty', label: 'Empty' },
                                                                        ]}
                                                                        statusValue={selectedListStatus}
                                                                        onStatusChange={setSelectedListStatus}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {companiesData.length === 0 && (
                                                        <tr>
                                                            <td colSpan={99} className="px-4 py-6 text-left">
                                                                <p className="text-gray-500 text-sm mb-2">No companies found for the selected filters.</p>
                                                                <button onClick={resetFilters} className="px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors">Reset Filters</button>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {companiesData.map((company, index) => (
                                                        <tr key={company.id || index} title="Double-click to edit" className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${selectedRowIds.has(company.id) ? 'bg-blue-50/60' : ''} hover:bg-blue-50/30 cursor-pointer transition-colors`} style={{ height: `${Math.max(28, getAdaptiveRowHeight(companiesData.length))}px` }} onDoubleClick={() => { setSelectedCompany(company); setEditModalTab('companies'); setEditModalRow(company); setShowEditModal(true); }}>
                                                            <td className="px-2 py-1 w-10" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedRowIds.has(company.id)} onChange={() => toggleRowSelection(company.id)} className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]" /></td>
                                                            {visibleColumns.companyId && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={company.company_id || undefined}>{company.company_id || <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.name && <td className="px-2 py-1 max-w-0 truncate text-xs font-medium text-gray-900" title={company.name || undefined}>{company.name || <span className="font-normal text-gray-300">—</span>}</td>}
                                                            {visibleColumns.description && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={company.description || undefined}>{company.description || <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.website && <td className="px-2 py-1 max-w-0 truncate text-xs" title={company.website_url || undefined}>{company.website_url ? <a href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline">{company.website_url}</a> : <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.linkedin && <td className="px-2 py-1 max-w-0 truncate text-xs" title={company.linkedin_url || undefined}>{company.linkedin_url ? <a href={company.linkedin_url.startsWith('http') ? company.linkedin_url : `https://${company.linkedin_url}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline">{company.linkedin_url}</a> : <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.industry && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={company.industry_company || undefined}>{company.industry_company || <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.businessType && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={company.business_type || undefined}>{company.business_type || <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.offeringType && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={company.offering_type || undefined}>{company.offering_type || <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.aiPromptFilter && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-300">—</td>}
                                                            {visibleColumns.country && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={company.country || undefined}>{company.country || <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.provincie && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={company.provincie || undefined}>{company.provincie || <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.city && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={company.city || undefined}>{company.city || <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.size && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={company.size ? company.size.toString() : undefined}>{company.size ?? <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.sizeRange && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={company.size_range || undefined}>{company.size_range || <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.blacklisted && <td className="px-2 py-1 max-w-0 text-xs">{company.blacklisted ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span> : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">No</span>}</td>}
                                                            {visibleColumns.websiteScrape && <td className="px-2 py-1 max-w-0 text-xs">{company.has_website_scrape ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span> : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">No</span>}</td>}
                                                            {visibleColumns.scrapingName && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={company.scraping_name || undefined}>{company.scraping_name || <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumns.createdAt && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={company.created_at ? new Date(company.created_at).toLocaleDateString() : undefined}>{company.created_at ? new Date(company.created_at).toLocaleDateString() : ''}</td>}
                                                            {visibleColumns.inCampaign && (
                                                                <td className="px-2 py-1 text-xs whitespace-nowrap">
                                                                    {company.in_campaign_counts ? (
                                                                        <span title={`${company.name || 'Company'} in Connector campaigns — Total: ${company.in_campaign_counts.total}, Connected: ${company.in_campaign_counts.connected}, Replied: ${company.in_campaign_counts.replied}, POS: ${company.in_campaign_counts.pos}, NEG: ${company.in_campaign_counts.neg}`}>
                                                                            <span className="font-semibold text-gray-900">{company.in_campaign_counts.total}</span>
                                                                            <span className="text-gray-400"> · </span>
                                                                            <span className="text-blue-700">C {company.in_campaign_counts.connected}</span>
                                                                            <span className="text-gray-400"> · </span>
                                                                            <span className="text-purple-700">R {company.in_campaign_counts.replied}</span>
                                                                            <span className="text-gray-400"> · </span>
                                                                            <span className="text-green-700">P {company.in_campaign_counts.pos}</span>
                                                                            <span className="text-gray-400"> · </span>
                                                                            <span className="text-red-700">N {company.in_campaign_counts.neg}</span>
                                                                        </span>
                                                                    ) : <span className="text-gray-300">—</span>}
                                                                </td>
                                                            )}
                                                            {visibleColumns.list && companyLists.length > 0 && (() => {
                                                                const s = company.list_item_status;
                                                                const listName = companyLists.find(l => String(l.id) === selectedListId)?.name;
                                                                if (s === undefined || !listName) return <td className="px-2 py-1 text-xs text-gray-300">—</td>;
                                                                if (s === 'accepted') return <td className="px-2 py-1 text-xs"><div className="flex flex-col gap-0.5"><span className="truncate text-gray-700" title={listName}>{listName}</span><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Accepted</span></div></td>;
                                                                if (s === 'declined') return <td className="px-2 py-1 text-xs"><div className="flex flex-col gap-0.5"><span className="truncate text-gray-700" title={listName}>{listName}</span><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Declined</span></div></td>;
                                                                return <td className="px-2 py-1 text-xs"><span className="truncate text-gray-700" title={listName}>{listName}</span></td>;
                                                            })()}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    </>
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500 text-sm">No companies found{selectedCustomers.length > 0 ? ' for the selected filters' : ''}.</p>
                                        {selectedCustomers.length === 0 && <p className="text-gray-400 text-xs mt-1">Select a customer and click <span className="font-medium text-gray-500">Apply</span> to load data.</p>}
                                        {selectedCustomers.length > 0 && <button onClick={resetFilters} className="mt-2 px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors">Reset Filters</button>}
                                    </div>
                                )}
                                {companiesData.length > 0 && (
                                    <div className="mt-8">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            totalItems={companiesTotal}
                                            itemsPerPage={pageSize}
                                            onNext={() => { paginationUserAction.current = true; setCurrentPage(Math.min(totalPages, currentPage + 1)); }}
                                            onPrev={() => { paginationUserAction.current = true; setCurrentPage(Math.max(1, currentPage - 1)); }}
                                            isCountLimited={false}
                                            isCountLoading={isCountLoading}
                                            currentItemsCount={companiesData.length}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'prospects' && (
                            <div>
                                {dataLoading ? (
                                    <div className="flex justify-center py-8">
                                        <ClipLoader size={24} color="#364570" />
                                    </div>
                                ) : (prospectsData.length > 0 || selectedCustomers.length > 0) ? (
                                    <>
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-700">Total Prospects:</span>
                                            <span className="text-xs font-semibold text-[#364570]">{isCountLoading ? <ClipLoader size={12} color="#364570" /> : prospectsTotal.toLocaleString()}</span>
                                            <span className="text-xs text-gray-400">· Page {currentPage} of {totalPages}</span>
                                        </div>
                                        {selectedRowIds.size > 0 && (
                                            <div className="mb-2 flex flex-col gap-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="text-xs font-medium text-blue-800">{selectedRowIds.size} selected</span>
                                                    <button onClick={() => setShowBulkEditModal(true)} className="px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors flex items-center gap-1.5"><FaEdit className="w-3 h-3" />Bulk Edit</button>
                                                    <button onClick={() => handleBulkClassify(false)} disabled={classifyLoading} className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"><FaTags className="w-3 h-3" />{classifyLoading ? 'Classifying…' : 'Bulk Classify Job Title'}</button>
                                                    <button onClick={() => handleBulkClassify(true)} disabled={classifyLoading} className="px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"><FaSync className="w-3 h-3" />{classifyLoading ? 'Classifying…' : 'Bulk Reclassify Job Title'}</button>
                                                    <button
                                                        onClick={() => {
                                                            setShowMessengerAssignWidget(true);
                                                            setMessengerAssignTargetProfileId('');
                                                            setMessengerAssignTargetCampaignId('');
                                                            setMessengerAssignCampaigns([]);
                                                        }}
                                                        className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1.5"
                                                    >
                                                        <FaPaperPlane className="w-3 h-3" />
                                                        Assign to Messenger Campaign
                                                    </button>
                                                    <button onClick={() => setShowAddToProspectListModal(true)} title={`Add ${selectedRowIds.size} selected to a prospect list`} className="px-3 py-1 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center gap-1.5"><FaListUl className="w-3 h-3" />{selectedRowIds.size > 0 ? `Add to List (${selectedRowIds.size})` : 'Add to List'}</button>
                                                    {canMoveProspects && (
                                                        <button
                                                            onClick={() => {
                                                                setShowMoveProspectsWidget(true);
                                                                setMoveWidgetTargetProfileId('');
                                                                setMoveWidgetTargetCampaignId('');
                                                                setMoveWidgetCampaigns([]);
                                                            }}
                                                            className="px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors flex items-center gap-1.5"
                                                        >
                                                            <FaExchangeAlt className="w-3 h-3" />
                                                            Move Prospects
                                                        </button>
                                                    )}
                                                    {canDeleteProspects && (
                                                        <button
                                                            onClick={() => setShowDeleteProspectsConfirm(true)}
                                                            className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-1.5"
                                                        >
                                                            <FaTrash className="w-3 h-3" />
                                                            Delete Prospects
                                                        </button>
                                                    )}
                                                    <button onClick={() => setSelectedRowIds(new Set())} className="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"><FaTimes className="w-3 h-3" />Clear Selection</button>
                                                </div>
                                                {selectedRowIds.size > 0 && isAllPageSelected() && getActiveTotalForTab() > selectedRowIds.size && (
                                                    <span className="text-xs text-blue-700">
                                                        All {getActiveDataForTab().length} on this page selected.{' '}
                                                        <button onClick={fetchAllFilteredIds} disabled={selectAllLoading} className="underline font-semibold hover:text-blue-900 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5 align-middle">
                                                            {selectAllLoading && <ClipLoader size={10} color="currentColor" />}
                                                            {selectAllLoading ? 'Selecting…' : `Select all ${Math.min(getActiveTotalForTab(), 50000).toLocaleString()} matching records`}
                                                        </button>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="bg-white shadow-md rounded-lg min-h-[calc(100vh-425px)] md:min-h-[calc(100vh-390px)] lg:min-h-[calc(100vh-370px)] max-h-[calc(100vh-425px)] md:max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-370px)] flex flex-col">
                                        <div ref={prospectsScrollRef} className="overflow-x-auto overflow-y-auto flex-1">
                                            <table className="divide-y divide-gray-200 table-fixed">
                                                <thead className="bg-gray-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-2 py-1 w-10 flex-shrink-0">
                                                            <input type="checkbox" checked={isAllPageSelected()} ref={(el) => { if (el) el.indeterminate = isSomePageSelected(); }} onChange={toggleSelectAllOnPage} className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]" />
                                                        </th>
                                                        {visibleColumnsProspects.contactId && (
                                                            <ResizableHeader width={columnWidths['contactId'] || 155} onResize={(w) => handleColumnResize('contactId', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Contact ID">Contact ID</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectContactId' ? null : 'prospectContactId');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectContactId || includeEmptyProspectContactId || notEmptyProspectContactId ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectContactId' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Contact ID"
                                                                        type="text"
                                                                        searchValue={searchProspectContactId}
                                                                        onSearchChange={setSearchProspectContactId}
                                                                        excludeSearch={excludeFlags["ProspectContactId"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectContactId"]: v }))}
                                                                        includeEmpty={includeEmptyProspectContactId}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectContactId}
                                                                        notEmpty={notEmptyProspectContactId}
                                                                        onNotEmptyChange={setNotEmptyProspectContactId}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.linkedinObjectUrn && (
                                                            <ResizableHeader width={columnWidths['linkedinObjectUrn'] || 220} onResize={(w) => handleColumnResize('linkedinObjectUrn', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="LinkedIn Object URN">LinkedIn Object URN</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectLinkedinObjectUrn' ? null : 'prospectLinkedinObjectUrn');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectLinkedInUrl ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectLinkedinObjectUrn' && (
                                                                    <ColumnFilterDropdown
                                                                        column="LinkedIn Object URN"
                                                                        type="text"
                                                                        searchValue={searchProspectLinkedInUrl}
                                                                        onSearchChange={setSearchProspectLinkedInUrl}
                                                                        excludeSearch={excludeFlags["ProspectLinkedInUrl"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectLinkedInUrl"]: v }))}
                                                                        includeEmpty={includeEmptyProspectLinkedInUrl}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectLinkedInUrl}
                                                                        notEmpty={notEmptyProspectLinkedInUrl}
                                                                        onNotEmptyChange={setNotEmptyProspectLinkedInUrl}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.prospectId && (
                                                            <ResizableHeader width={columnWidths['prospectId'] || 155} onResize={(w) => handleColumnResize('prospectId', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Prospect ID">Prospect ID</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectId' ? null : 'prospectId');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectId ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectId' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Prospect ID"
                                                                        type="text"
                                                                        searchValue={searchProspectId}
                                                                        onSearchChange={setSearchProspectId}
                                                                        excludeSearch={excludeFlags["ProspectId"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectId"]: v }))}
                                                                        includeEmpty={includeEmptyProspectId}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectId}
                                                                        notEmpty={notEmptyProspectId}
                                                                        onNotEmptyChange={setNotEmptyProspectId}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.linkedinUrl && (
                                                            <ResizableHeader width={columnWidths['linkedinUrl'] || 160} onResize={(w) => handleColumnResize('linkedinUrl', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="LinkedIn URL">LinkedIn URL</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectLinkedInUrl' ? null : 'prospectLinkedInUrl');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectLinkedInUrl ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectLinkedInUrl' && (
                                                                    <ColumnFilterDropdown
                                                                        column="LinkedIn URL"
                                                                        type="text"
                                                                        searchValue={searchProspectLinkedInUrl}
                                                                        onSearchChange={setSearchProspectLinkedInUrl}
                                                                        excludeSearch={excludeFlags["ProspectLinkedInUrl"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectLinkedInUrl"]: v }))}
                                                                        includeEmpty={includeEmptyProspectLinkedInUrl}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectLinkedInUrl}
                                                                        notEmpty={notEmptyProspectLinkedInUrl}
                                                                        onNotEmptyChange={setNotEmptyProspectLinkedInUrl}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.firstName && (
                                                            <ResizableHeader width={columnWidths['firstName'] || 165} onResize={(w) => handleColumnResize('firstName', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('first_name')} title="First Name">
                                                                        First Name
                                                                        <SortIndicator field="first_name" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectFirstName' ? null : 'prospectFirstName');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectFirstName ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectFirstName' && (
                                                                    <ColumnFilterDropdown
                                                                        column="First Name"
                                                                        type="text"
                                                                        searchValue={searchProspectFirstName}
                                                                        onSearchChange={setSearchProspectFirstName}
                                                                        excludeSearch={excludeFlags["ProspectFirstName"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectFirstName"]: v }))}
                                                                        includeEmpty={includeEmptyProspectFirstName}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectFirstName}
                                                                        notEmpty={notEmptyProspectFirstName}
                                                                        onNotEmptyChange={setNotEmptyProspectFirstName}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.lastName && (
                                                            <ResizableHeader width={columnWidths['lastName'] || 155} onResize={(w) => handleColumnResize('lastName', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('last_name')} title="Last Name">
                                                                        Last Name
                                                                        <SortIndicator field="last_name" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectLastName' ? null : 'prospectLastName');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectLastName ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectLastName' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Last Name"
                                                                        type="text"
                                                                        searchValue={searchProspectLastName}
                                                                        onSearchChange={setSearchProspectLastName}
                                                                        excludeSearch={excludeFlags["ProspectLastName"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectLastName"]: v }))}
                                                                        includeEmpty={includeEmptyProspectLastName}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectLastName}
                                                                        notEmpty={notEmptyProspectLastName}
                                                                        onNotEmptyChange={setNotEmptyProspectLastName}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.campaignName && (
                                                            <ResizableHeader width={columnWidths['campaignName'] || 200} onResize={(w) => handleColumnResize('campaignName', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Campaign Name">Campaign Name</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCampaignName' ? null : 'prospectCampaignName');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedCampaignNames.length > 0 || notEmptyProspectCampaignName || includeEmptyProspectCampaignName ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCampaignName' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Campaign Name"
                                                                        type="multiselect"
                                                                        options={campaignNameOptions}
                                                                        selectedValues={selectedCampaignNames}
                                                                        onSelectedValuesChange={setSelectedCampaignNames}
                                                                        includeEmpty={includeEmptyProspectCampaignName}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectCampaignName}
                                                                        notEmpty={notEmptyProspectCampaignName}
                                                                        onNotEmptyChange={setNotEmptyProspectCampaignName}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.prospectStatus && (
                                                            <ResizableHeader width={columnWidths['prospectStatus'] || 250} onResize={(w) => handleColumnResize('prospectStatus', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Status">Status</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectStatus' ? null : 'prospectStatus');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedProspectStatuses.length > 0 || notEmptyProspectStatus || includeEmptyProspectStatus ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectStatus' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Status"
                                                                        type="multiselect"
                                                                        options={prospectStatusOptions}
                                                                        selectedValues={selectedProspectStatuses}
                                                                        onSelectedValuesChange={setSelectedProspectStatuses}
                                                                        includeEmpty={includeEmptyProspectStatus}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectStatus}
                                                                        notEmpty={notEmptyProspectStatus}
                                                                        onNotEmptyChange={setNotEmptyProspectStatus}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.email && (
                                                            <ResizableHeader width={columnWidths['email'] || 160} onResize={(w) => handleColumnResize('email', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Email">Email</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectEmail' ? null : 'prospectEmail');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectEmail || emailFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectEmail' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Email"
                                                                        type="boolean"
                                                                        booleanValue={emailFilter}
                                                                        onBooleanChange={setEmailFilter}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.phone && (
                                                            <ResizableHeader width={columnWidths['phone'] || 110} onResize={(w) => handleColumnResize('phone', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Phone">Phone</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectPhone' ? null : 'prospectPhone');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectPhone || phoneFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectPhone' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Phone"
                                                                        type="boolean"
                                                                        booleanValue={phoneFilter}
                                                                        onBooleanChange={setPhoneFilter}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.birthday && (
                                                            <ResizableHeader width={columnWidths['birthday'] || 125} onResize={(w) => handleColumnResize('birthday', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Birthday">Birthday</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectBirthday' ? null : 'prospectBirthday');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectBirthday || birthdayFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectBirthday' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Birthday"
                                                                        type="boolean"
                                                                        booleanValue={birthdayFilter}
                                                                        onBooleanChange={setBirthdayFilter}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.jobTitle && (
                                                            <ResizableHeader width={columnWidths['jobTitle'] || 220} onResize={(w) => handleColumnResize('jobTitle', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Job Title">Job Title</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectJobTitle' ? null : 'prospectJobTitle');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectJobTitle ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectJobTitle' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Job Title"
                                                                        type="text"
                                                                        searchValue={searchProspectJobTitle}
                                                                        onSearchChange={setSearchProspectJobTitle}
                                                                        excludeSearch={excludeFlags["ProspectJobTitle"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectJobTitle"]: v }))}
                                                                        includeEmpty={includeEmptyProspectJobTitle}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectJobTitle}
                                                                        notEmpty={notEmptyProspectJobTitle}
                                                                        onNotEmptyChange={setNotEmptyProspectJobTitle}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.personaAreas && (
                                                            <ResizableHeader width={columnWidths['personaAreas'] || 140} onResize={(w) => handleColumnResize('personaAreas', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Persona Areas">Persona Areas</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectPersonaAreas' ? null : 'prospectPersonaAreas');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedPersonaAreas.length > 0 || notEmptyPersonaAreas || includeEmptyPersonaAreas ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectPersonaAreas' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Persona Areas"
                                                                        type="multiselect"
                                                                        options={personaAreaOptions}
                                                                        selectedValues={selectedPersonaAreas}
                                                                        onSelectedValuesChange={setSelectedPersonaAreas}
                                                                        includeEmpty={includeEmptyPersonaAreas}
                                                                        onIncludeEmptyChange={setIncludeEmptyPersonaAreas}
                                                                        notEmpty={notEmptyPersonaAreas}
                                                                        onNotEmptyChange={setNotEmptyPersonaAreas}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.personaLevels && (
                                                            <ResizableHeader width={columnWidths['personaLevels'] || 140} onResize={(w) => handleColumnResize('personaLevels', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Persona Levels">Persona Levels</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectPersonaLevels' ? null : 'prospectPersonaLevels');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedPersonaLevels.length > 0 || notEmptyPersonaLevels || includeEmptyPersonaLevels ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectPersonaLevels' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Persona Levels"
                                                                        type="multiselect"
                                                                        options={personaLevelsOpts}
                                                                        selectedValues={selectedPersonaLevels}
                                                                        onSelectedValuesChange={setSelectedPersonaLevels}
                                                                        includeEmpty={includeEmptyPersonaLevels}
                                                                        onIncludeEmptyChange={setIncludeEmptyPersonaLevels}
                                                                        notEmpty={notEmptyPersonaLevels}
                                                                        onNotEmptyChange={setNotEmptyPersonaLevels}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.personaLevel && (
                                                            <ResizableHeader width={columnWidths['personaLevel'] || 130} onResize={(w) => handleColumnResize('personaLevel', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Persona Level">Persona Level</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectPersonaLevel' ? null : 'prospectPersonaLevel');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedPersonaLevel.length > 0 || notEmptyPersonaLevel || includeEmptyPersonaLevel ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectPersonaLevel' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Persona Level"
                                                                        type="multiselect"
                                                                        options={personaLevelOpts}
                                                                        selectedValues={selectedPersonaLevel}
                                                                        onSelectedValuesChange={setSelectedPersonaLevel}
                                                                        includeEmpty={includeEmptyPersonaLevel}
                                                                        onIncludeEmptyChange={setIncludeEmptyPersonaLevel}
                                                                        notEmpty={notEmptyPersonaLevel}
                                                                        onNotEmptyChange={setNotEmptyPersonaLevel}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.personaCategory && (
                                                            <ResizableHeader width={columnWidths['personaCategory'] || 180} onResize={(w) => handleColumnResize('personaCategory', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Persona Category">Persona Category</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectPersonaCategory' ? null : 'prospectPersonaCategory');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedPersonaCategory.length > 0 || notEmptyPersonaCategory || includeEmptyPersonaCategory ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectPersonaCategory' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Persona Category"
                                                                        type="multiselect"
                                                                        options={personaCategoryOpts}
                                                                        selectedValues={selectedPersonaCategory}
                                                                        onSelectedValuesChange={setSelectedPersonaCategory}
                                                                        includeEmpty={includeEmptyPersonaCategory}
                                                                        onIncludeEmptyChange={setIncludeEmptyPersonaCategory}
                                                                        notEmpty={notEmptyPersonaCategory}
                                                                        onNotEmptyChange={setNotEmptyPersonaCategory}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.jobChange && (
                                                            <ResizableHeader width={columnWidths['prospectJobChange'] || 180} onResize={(w) => handleColumnResize('prospectJobChange', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate">Job Change</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectJobChange' ? null : 'prospectJobChange');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${prospectJobChangeFilter.length > 0 || includeEmptyProspectJobChange || notEmptyProspectJobChange || prospectJobChangeDateFrom || prospectJobChangeDateTo ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectJobChange' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Job Change"
                                                                        type="multiselect-daterange"
                                                                        options={[{ value: 'lt3months', label: '< 3 Months' }, { value: 'lt6months', label: '< 6 Months' }, { value: 'lt12months', label: '< 12 Months' }, { value: '12to24months', label: '12 - 24 Months' }]}
                                                                        selectedValues={prospectJobChangeFilter}
                                                                        onSelectedValuesChange={setProspectJobChangeFilter}
                                                                        includeEmpty={includeEmptyProspectJobChange}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectJobChange}
                                                                        notEmpty={notEmptyProspectJobChange}
                                                                        onNotEmptyChange={setNotEmptyProspectJobChange}
                                                                        dateFromValue={prospectJobChangeDateFrom}
                                                                        onDateFromChange={setProspectJobChangeDateFrom}
                                                                        dateToValue={prospectJobChangeDateTo}
                                                                        onDateToChange={setProspectJobChangeDateTo}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.linkedinGroupName && (
                                                            <ResizableHeader width={columnWidths['linkedinGroupName'] || 230} onResize={(w) => handleColumnResize('linkedinGroupName', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="LinkedIn Group Name">LinkedIn Group Name</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectLinkedInGroupName' ? null : 'prospectLinkedInGroupName');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectLinkedInGroupName || linkedInGroupNameFilter || includeEmptyProspectLinkedInGroupName || notEmptyProspectLinkedInGroupName ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectLinkedInGroupName' && (
                                                                    <ColumnFilterDropdown
                                                                        column="LinkedIn Group Name"
                                                                        type="text"
                                                                        searchValue={searchProspectLinkedInGroupName}
                                                                        onSearchChange={setSearchProspectLinkedInGroupName}
                                                                        excludeSearch={excludeFlags["ProspectLinkedInGroupName"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectLinkedInGroupName"]: v }))}
                                                                        includeEmpty={includeEmptyProspectLinkedInGroupName}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectLinkedInGroupName}
                                                                        notEmpty={notEmptyProspectLinkedInGroupName}
                                                                        onNotEmptyChange={setNotEmptyProspectLinkedInGroupName}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.groupAreas && (
                                                            <ResizableHeader width={columnWidths['groupAreas'] || 200} onResize={(w) => handleColumnResize('groupAreas', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Group Areas">Group Areas</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectGroupAreas' ? null : 'prospectGroupAreas');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedGroupAreas.length > 0 || notEmptyGroupAreas || includeEmptyGroupAreas ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectGroupAreas' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Group Areas"
                                                                        type="multiselect"
                                                                        options={groupAreaOptions}
                                                                        selectedValues={selectedGroupAreas}
                                                                        onSelectedValuesChange={setSelectedGroupAreas}
                                                                        includeEmpty={includeEmptyGroupAreas}
                                                                        onIncludeEmptyChange={setIncludeEmptyGroupAreas}
                                                                        notEmpty={notEmptyGroupAreas}
                                                                        onNotEmptyChange={setNotEmptyGroupAreas}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.placeholders && (
                                                            <ResizableHeader width={columnWidths['prospectPlaceholders'] || 130} onResize={(w) => handleColumnResize('prospectPlaceholders', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Placeholders">Placeholders</span>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'prospectPlaceholders' ? null : 'prospectPlaceholders'); }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${includeEmptyProspectPlaceholders || notEmptyProspectPlaceholders ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectPlaceholders' && (
                                                                    <ColumnFilterDropdown column="Placeholders" type="text" includeEmpty={includeEmptyProspectPlaceholders} onIncludeEmptyChange={setIncludeEmptyProspectPlaceholders} notEmpty={notEmptyProspectPlaceholders} onNotEmptyChange={setNotEmptyProspectPlaceholders} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.company && (
                                                            <ResizableHeader width={columnWidths['company'] || 140} onResize={(w) => handleColumnResize('company', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('company_name')} title="Company">
                                                                        Company
                                                                        <SortIndicator field="company_name" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCompany' ? null : 'prospectCompany');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectCompany ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCompany' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company"
                                                                        type="text"
                                                                        searchValue={searchProspectCompany}
                                                                        onSearchChange={setSearchProspectCompany}
                                                                        excludeSearch={excludeFlags["ProspectCompany"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectCompany"]: v }))}
                                                                        includeEmpty={includeEmptyProspectCompany}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectCompany}
                                                                        notEmpty={notEmptyProspectCompany}
                                                                        onNotEmptyChange={setNotEmptyProspectCompany}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.companyCompanyId && (
                                                            <ResizableHeader width={columnWidths['companyCompanyId'] || 150} onResize={(w) => handleColumnResize('companyCompanyId', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Company ID">Company ID</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCompanyCompanyId' ? null : 'prospectCompanyCompanyId');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectCompanyCompanyId ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCompanyCompanyId' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company ID"
                                                                        type="text"
                                                                        searchValue={searchProspectCompanyCompanyId}
                                                                        onSearchChange={setSearchProspectCompanyCompanyId}
                                                                        excludeSearch={excludeFlags["ProspectCompanyCompanyId"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectCompanyCompanyId"]: v }))}
                                                                        includeEmpty={includeEmptyProspectCompanyCompanyId}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectCompanyCompanyId}
                                                                        notEmpty={notEmptyProspectCompanyCompanyId}
                                                                        onNotEmptyChange={setNotEmptyProspectCompanyCompanyId}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.companyWebsiteUrl && (
                                                            <ResizableHeader width={columnWidths['companyWebsiteUrl'] || 195} onResize={(w) => handleColumnResize('companyWebsiteUrl', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Company Website">Company Website</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCompanyWebsite' ? null : 'prospectCompanyWebsite');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectCompanyWebsite ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCompanyWebsite' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company Website"
                                                                        type="text"
                                                                        searchValue={searchProspectCompanyWebsite}
                                                                        onSearchChange={setSearchProspectCompanyWebsite}
                                                                        excludeSearch={excludeFlags["ProspectCompanyWebsite"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectCompanyWebsite"]: v }))}
                                                                        includeEmpty={includeEmptyProspectCompanyWebsite}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectCompanyWebsite}
                                                                        notEmpty={notEmptyProspectCompanyWebsite}
                                                                        onNotEmptyChange={setNotEmptyProspectCompanyWebsite}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.companyLinkedinUrl && (
                                                            <ResizableHeader width={columnWidths['companyLinkedinUrl'] || 200} onResize={(w) => handleColumnResize('companyLinkedinUrl', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Company LinkedIn">Company LinkedIn</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCompanyLinkedIn' ? null : 'prospectCompanyLinkedIn');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectCompanyLinkedIn ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCompanyLinkedIn' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company LinkedIn"
                                                                        type="text"
                                                                        searchValue={searchProspectCompanyLinkedIn}
                                                                        onSearchChange={setSearchProspectCompanyLinkedIn}
                                                                        excludeSearch={excludeFlags["ProspectCompanyLinkedIn"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectCompanyLinkedIn"]: v }))}
                                                                        includeEmpty={includeEmptyProspectCompanyLinkedIn}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectCompanyLinkedIn}
                                                                        notEmpty={notEmptyProspectCompanyLinkedIn}
                                                                        onNotEmptyChange={setNotEmptyProspectCompanyLinkedIn}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.companyCity && (
                                                            <ResizableHeader width={columnWidths['companyCity'] || 165} onResize={(w) => handleColumnResize('companyCity', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Company City">Company City</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCompanyCity' ? null : 'prospectCompanyCity');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectCompanyCity ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCompanyCity' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company City"
                                                                        type="text"
                                                                        searchValue={searchProspectCompanyCity}
                                                                        onSearchChange={setSearchProspectCompanyCity}
                                                                        excludeSearch={excludeFlags["ProspectCompanyCity"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectCompanyCity"]: v }))}
                                                                        includeEmpty={includeEmptyProspectCompanyCity}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectCompanyCity}
                                                                        notEmpty={notEmptyProspectCompanyCity}
                                                                        onNotEmptyChange={setNotEmptyProspectCompanyCity}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.companySize && (
                                                            <ResizableHeader width={columnWidths['companySize'] || 180} onResize={(w) => handleColumnResize('companySize', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('company_size')} title="Company Size">
                                                                        Company Size
                                                                        <SortIndicator field="company_size" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCompanySize' ? null : 'prospectCompanySize');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${minProspectCompanySize || maxProspectCompanySize ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCompanySize' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company Size"
                                                                        type="range"
                                                                        minValue={minProspectCompanySize}
                                                                        maxValue={maxProspectCompanySize}
                                                                        onMinChange={setMinProspectCompanySize}
                                                                        onMaxChange={setMaxProspectCompanySize}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.companySizeRange && (
                                                            <ResizableHeader width={columnWidths['companySizeRange'] || 240} onResize={(w) => handleColumnResize('companySizeRange', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('company_size_range')} title="Company Size Range">
                                                                        Company Size Range
                                                                        <SortIndicator field="company_size_range" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCompanySizeRange' ? null : 'prospectCompanySizeRange');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedProspectCompanySizeRanges.length > 0 || notEmptyProspectCompanySizeRange || includeEmptyProspectCompanySizeRange ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCompanySizeRange' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company Size Range"
                                                                        type="multiselect"
                                                                        options={prospectCompanySizeRangeOptions}
                                                                        selectedValues={selectedProspectCompanySizeRanges}
                                                                        onSelectedValuesChange={setSelectedProspectCompanySizeRanges}
                                                                        includeEmpty={includeEmptyProspectCompanySizeRange}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectCompanySizeRange}
                                                                        notEmpty={notEmptyProspectCompanySizeRange}
                                                                        onNotEmptyChange={setNotEmptyProspectCompanySizeRange}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.companyIndustry && (
                                                            <ResizableHeader width={columnWidths['companyIndustry'] || 200} onResize={(w) => handleColumnResize('companyIndustry', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Company Industry">Company Industry</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCompanyIndustry' ? null : 'prospectCompanyIndustry');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedProspectCompanyIndustries.length > 0 || notEmptyProspectCompanyIndustry || includeEmptyProspectCompanyIndustry ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCompanyIndustry' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company Industry"
                                                                        type="multiselect"
                                                                        options={prospectCompanyIndustryOptions}
                                                                        selectedValues={selectedProspectCompanyIndustries}
                                                                        onSelectedValuesChange={setSelectedProspectCompanyIndustries}
                                                                        includeEmpty={includeEmptyProspectCompanyIndustry}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectCompanyIndustry}
                                                                        notEmpty={notEmptyProspectCompanyIndustry}
                                                                        onNotEmptyChange={setNotEmptyProspectCompanyIndustry}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.companyBusinessType && (
                                                            <ResizableHeader width={columnWidths['companyBusinessType'] || 250} onResize={(w) => handleColumnResize('companyBusinessType', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Company Business Type">Company Business Type</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCompanyBusinessType' ? null : 'prospectCompanyBusinessType');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectCompanyBusinessType ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCompanyBusinessType' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company Business Type"
                                                                        type="text"
                                                                        searchValue={searchProspectCompanyBusinessType}
                                                                        onSearchChange={setSearchProspectCompanyBusinessType}
                                                                        excludeSearch={excludeFlags["ProspectCompanyBusinessType"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectCompanyBusinessType"]: v }))}
                                                                        includeEmpty={includeEmptyProspectCompanyBusinessType}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectCompanyBusinessType}
                                                                        notEmpty={notEmptyProspectCompanyBusinessType}
                                                                        onNotEmptyChange={setNotEmptyProspectCompanyBusinessType}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.companyCountry && (
                                                            <ResizableHeader width={columnWidths['companyCountry'] || 195} onResize={(w) => handleColumnResize('companyCountry', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Company Country">Company Country</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCompanyCountry' ? null : 'prospectCompanyCountry');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectCompanyCountry ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCompanyCountry' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company Country"
                                                                        type="text"
                                                                        searchValue={searchProspectCompanyCountry}
                                                                        onSearchChange={setSearchProspectCompanyCountry}
                                                                        excludeSearch={excludeFlags["ProspectCompanyCountry"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectCompanyCountry"]: v }))}
                                                                        includeEmpty={includeEmptyProspectCompanyCountry}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectCompanyCountry}
                                                                        notEmpty={notEmptyProspectCompanyCountry}
                                                                        onNotEmptyChange={setNotEmptyProspectCompanyCountry}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.companyProvincie && (
                                                            <ResizableHeader width={columnWidths['companyProvincie'] || 210} onResize={(w) => handleColumnResize('companyProvincie', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Company Provincie">Company Provincie</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCompanyProvincie' ? null : 'prospectCompanyProvincie');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectCompanyProvincie ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCompanyProvincie' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company Provincie"
                                                                        type="text"
                                                                        searchValue={searchProspectCompanyProvincie}
                                                                        onSearchChange={setSearchProspectCompanyProvincie}
                                                                        excludeSearch={excludeFlags["ProspectCompanyProvincie"]}
                                                                        onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["ProspectCompanyProvincie"]: v }))}
                                                                        includeEmpty={includeEmptyProspectCompanyProvincie}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectCompanyProvincie}
                                                                        notEmpty={notEmptyProspectCompanyProvincie}
                                                                        onNotEmptyChange={setNotEmptyProspectCompanyProvincie}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.dateConnectionRequested && (
                                                            <ResizableHeader width={columnWidths['dateConnectionRequested'] || 155} onResize={(w) => handleColumnResize('dateConnectionRequested', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('date_connection_requested')} title="Requested">
                                                                        Requested
                                                                        <SortIndicator field="date_connection_requested" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectDateConnectionRequested' ? null : 'prospectDateConnectionRequested');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectDateConnectionRequested ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectDateConnectionRequested' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Connection Requested"
                                                                        type="text"
                                                                        searchValue={searchProspectDateConnectionRequested}
                                                                        onSearchChange={setSearchProspectDateConnectionRequested}
                                                                        includeEmpty={includeEmptyProspectDateConnectionRequested}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectDateConnectionRequested}
                                                                        notEmpty={notEmptyProspectDateConnectionRequested}
                                                                        onNotEmptyChange={setNotEmptyProspectDateConnectionRequested}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.dateConnected && (
                                                            <ResizableHeader width={columnWidths['dateConnected'] || 155} onResize={(w) => handleColumnResize('dateConnected', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('date_connected')} title="Connected">
                                                                        Connected
                                                                        <SortIndicator field="date_connected" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectDateConnected' ? null : 'prospectDateConnected');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectDateConnected ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectDateConnected' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Connected"
                                                                        type="text"
                                                                        searchValue={searchProspectDateConnected}
                                                                        onSearchChange={setSearchProspectDateConnected}
                                                                        includeEmpty={includeEmptyProspectDateConnected}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectDateConnected}
                                                                        notEmpty={notEmptyProspectDateConnected}
                                                                        onNotEmptyChange={setNotEmptyProspectDateConnected}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.dateReplied && (
                                                            <ResizableHeader width={columnWidths['dateReplied'] || 135} onResize={(w) => handleColumnResize('dateReplied', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('date_replied')} title="Replied">
                                                                        Replied
                                                                        <SortIndicator field="date_replied" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectDateReplied' ? null : 'prospectDateReplied');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectDateReplied ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectDateReplied' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Replied"
                                                                        type="text"
                                                                        searchValue={searchProspectDateReplied}
                                                                        onSearchChange={setSearchProspectDateReplied}
                                                                        includeEmpty={includeEmptyProspectDateReplied}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectDateReplied}
                                                                        notEmpty={notEmptyProspectDateReplied}
                                                                        onNotEmptyChange={setNotEmptyProspectDateReplied}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.datePositiveTag && (
                                                            <ResizableHeader width={columnWidths['datePositiveTag'] || 180} onResize={(w) => handleColumnResize('datePositiveTag', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('date_positive_tag')} title="Positive Tag">
                                                                        Positive Tag
                                                                        <SortIndicator field="date_positive_tag" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectDatePositiveTag' ? null : 'prospectDatePositiveTag');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchProspectDatePositiveTag ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectDatePositiveTag' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Positive Tag"
                                                                        type="text"
                                                                        searchValue={searchProspectDatePositiveTag}
                                                                        onSearchChange={setSearchProspectDatePositiveTag}
                                                                        includeEmpty={includeEmptyProspectDatePositiveTag}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectDatePositiveTag}
                                                                        notEmpty={notEmptyProspectDatePositiveTag}
                                                                        onNotEmptyChange={setNotEmptyProspectDatePositiveTag}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.country && (
                                                            <ResizableHeader width={columnWidths['prospectCountry'] || 165} onResize={(w) => handleColumnResize('prospectCountry', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Prospect Country">Prospect Country</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCountry' ? null : 'prospectCountry');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedProspectCountry.length > 0 || notEmptyProspectCountry || includeEmptyProspectCountry ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCountry' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Prospect Country"
                                                                        type="multiselect"
                                                                        options={prospectCountryOpts}
                                                                        selectedValues={selectedProspectCountry}
                                                                        onSelectedValuesChange={setSelectedProspectCountry}
                                                                        includeEmpty={includeEmptyProspectCountry}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectCountry}
                                                                        notEmpty={notEmptyProspectCountry}
                                                                        onNotEmptyChange={setNotEmptyProspectCountry}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.scrapingName && (
                                                            <ResizableHeader width={columnWidths['scrapingName'] || 175} onResize={(w) => handleColumnResize('scrapingName', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Scraping Name">Scraping Name</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectScrapingName' ? null : 'prospectScrapingName');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedProspectScrapingNames.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectScrapingName' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Scraping Name"
                                                                        type="multiselect"
                                                                        options={prospectScrapingNameOpts}
                                                                        selectedValues={selectedProspectScrapingNames}
                                                                        onSelectedValuesChange={setSelectedProspectScrapingNames}
                                                                        includeEmpty={includeEmptyProspectScrapingName}
                                                                        onIncludeEmptyChange={setIncludeEmptyProspectScrapingName}
                                                                        notEmpty={notEmptyProspectScrapingName}
                                                                        onNotEmptyChange={setNotEmptyProspectScrapingName}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.leadPhase && (
                                                            <ResizableHeader width={columnWidths['leadPhase'] || 145} onResize={(w) => handleColumnResize('leadPhase', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Lead Phase">Lead Phase</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectLeadPhase' ? null : 'prospectLeadPhase');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedLeadPhases.length > 0 || notEmptyLeadPhase || includeEmptyLeadPhase ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectLeadPhase' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Lead Phase"
                                                                        type="multiselect"
                                                                        options={leadPhaseOptions}
                                                                        selectedValues={selectedLeadPhases}
                                                                        onSelectedValuesChange={setSelectedLeadPhases}
                                                                        includeEmpty={includeEmptyLeadPhase}
                                                                        onIncludeEmptyChange={setIncludeEmptyLeadPhase}
                                                                        notEmpty={notEmptyLeadPhase}
                                                                        onNotEmptyChange={setNotEmptyLeadPhase}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.emailSent && (
                                                            <ResizableHeader width={columnWidths['emailSent'] || 145} onResize={(w) => handleColumnResize('emailSent', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Email Sent">Email Sent</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectEmailSent' ? null : 'prospectEmailSent');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${emailSentFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectEmailSent' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Email Sent"
                                                                        type="boolean"
                                                                        booleanValue={emailSentFilter}
                                                                        onBooleanChange={setEmailSentFilter}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.blacklisted && (
                                                            <ResizableHeader width={columnWidths['blacklisted'] || 155} onResize={(w) => handleColumnResize('blacklisted', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Blacklisted">Blacklisted</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectBlacklisted' ? null : 'prospectBlacklisted');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${blacklistedProspectFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectBlacklisted' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Blacklisted"
                                                                        type="boolean"
                                                                        booleanValue={blacklistedProspectFilter}
                                                                        onBooleanChange={setBlacklistedProspectFilter}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.stopOutreach && (
                                                            <ResizableHeader width={columnWidths['stopOutreach'] || 175} onResize={(w) => handleColumnResize('stopOutreach', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Stop Outreach">Stop Outreach</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectStopOutreach' ? null : 'prospectStopOutreach');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${stopOutreachFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectStopOutreach' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Stop Outreach"
                                                                        type="boolean"
                                                                        booleanValue={stopOutreachFilter}
                                                                        onBooleanChange={setStopOutreachFilter}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.crm && (
                                                            <ResizableHeader width={columnWidths['crm'] || 85} onResize={(w) => handleColumnResize('crm', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="CRM">CRM</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCrm' ? null : 'prospectCrm');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${crmFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCrm' && (
                                                                    <ColumnFilterDropdown
                                                                        column="CRM"
                                                                        type="boolean"
                                                                        booleanValue={crmFilter}
                                                                        onBooleanChange={setCrmFilter}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.list && (
                                                            <ResizableHeader
                                                                width={columnWidths['prospectList'] || 140}
                                                                onResize={(w) => handleColumnResize('prospectList', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Prospect List">Prospect List</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectList' ? null : 'prospectList');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedProspectListId || selectedProspectListStatus ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectList' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Prospect List"
                                                                        type="singleselect"
                                                                        options={prospectLists.map(l => ({ value: String(l.id), label: l.name }))}
                                                                        singleSelectValue={selectedProspectListId}
                                                                        onSingleSelectChange={setSelectedProspectListId}
                                                                        statusOptions={[
                                                                            { value: 'accepted', label: 'Accepted' },
                                                                            { value: 'declined', label: 'Declined' },
                                                                            { value: 'empty', label: 'Empty' },
                                                                        ]}
                                                                        statusValue={selectedProspectListStatus}
                                                                        onStatusChange={setSelectedProspectListStatus}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsProspects.companyList && (
                                                            <ResizableHeader
                                                                width={columnWidths['prospectCompanyList'] || 140}
                                                                onResize={(w) => handleColumnResize('prospectCompanyList', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Company List">Company List</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'prospectCompanyList' ? null : 'prospectCompanyList');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedProspectCompanyListId || selectedProspectCompanyListStatus ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'prospectCompanyList' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company List"
                                                                        type="singleselect"
                                                                        options={companyLists.map(l => ({ value: String(l.id), label: l.name }))}
                                                                        singleSelectValue={selectedProspectCompanyListId}
                                                                        onSingleSelectChange={setSelectedProspectCompanyListId}
                                                                        statusOptions={[
                                                                            { value: 'accepted', label: 'Accepted' },
                                                                            { value: 'declined', label: 'Declined' },
                                                                            { value: 'empty', label: 'Empty' },
                                                                        ]}
                                                                        statusValue={selectedProspectCompanyListStatus}
                                                                        onStatusChange={setSelectedProspectCompanyListStatus}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        <th className="px-2 py-1 text-left text-xs font-semibold text-amber-800 uppercase tracking-wider bg-amber-50 border-l border-amber-200 whitespace-nowrap">
                                                            <div className="flex flex-col gap-1">
                                                                <span>AI Analysis</span>
                                                                <select
                                                                    value={prospectsAiPromptName}
                                                                    onChange={e => setProspectsAiPromptName(e.target.value)}
                                                                    onClick={e => e.stopPropagation()}
                                                                    className="text-[10px] border border-amber-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-normal normal-case tracking-normal min-w-[120px]"
                                                                >
                                                                    <option value="">— all —</option>
                                                                    {companyPromptOptions.map(p => (
                                                                        <option key={p} value={p}>{p}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </th>
                                                        {prospectsAiPromptName && prospectsAiSelectedFields.map(field => (
                                                            <ResizableHeader
                                                                key={field}
                                                                width={columnWidths[`prospectsAiField_${field}`] || 150}
                                                                onResize={(w) => handleColumnResize(`prospectsAiField_${field}`, w)}
                                                                className="px-2 py-1 text-left bg-amber-50 border-l border-amber-100 relative"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider capitalize truncate">{field.replace(/_/g, ' ')}</span>
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === `prospectsAi_${field}` ? null : `prospectsAi_${field}`); }}
                                                                        className="flex-shrink-0 p-1 hover:bg-amber-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${(prospectsAiFieldFilters.find(f => f.field === field)?.value || prospectsAiFieldExclude[field] || (prospectsAiMultiSelectFilters[field] && prospectsAiMultiSelectFilters[field].length > 0)) ? 'text-amber-700' : 'text-amber-400'}`} />
                                                                    </button>
                                                                    {openColumnFilter === `prospectsAi_${field}` && (
                                                                        prospectsAiFieldOptions[field] ? (
                                                                            <ColumnFilterDropdown
                                                                                column={field.replace(/_/g, ' ')}
                                                                                type="multiselect"
                                                                                options={prospectsAiFieldOptions[field]}
                                                                                selectedValues={prospectsAiMultiSelectFilters[field] || []}
                                                                                onSelectedValuesChange={vals => setProspectsAiMultiSelectFilters(prev => ({ ...prev, [field]: vals }))}
                                                                                searchValue={prospectsAiFieldFilters.find(f => f.field === field)?.value || ''}
                                                                                onSearchChange={val => setProspectsAiFieldFilters(prev => {
                                                                                    const without = prev.filter(f => f.field !== field);
                                                                                    return val ? [...without, { field, value: val }] : without;
                                                                                })}
                                                                                excludeSearch={prospectsAiFieldExclude[field] || false}
                                                                                onExcludeSearchChange={v => setProspectsAiFieldExclude(prev => ({ ...prev, [field]: v }))}
                                                                                isOpen={true}
                                                                                onClose={() => setOpenColumnFilter(null)}
                                                                            />
                                                                        ) : (
                                                                            <ColumnFilterDropdown
                                                                                column={field.replace(/_/g, ' ')}
                                                                                type="text"
                                                                                searchValue={prospectsAiFieldFilters.find(f => f.field === field)?.value || ''}
                                                                                onSearchChange={val => setProspectsAiFieldFilters(prev => {
                                                                                    const without = prev.filter(f => f.field !== field);
                                                                                    return val ? [...without, { field, value: val }] : without;
                                                                                })}
                                                                                excludeSearch={prospectsAiFieldExclude[field] || false}
                                                                                onExcludeSearchChange={v => setProspectsAiFieldExclude(prev => ({ ...prev, [field]: v }))}
                                                                                isOpen={true}
                                                                                onClose={() => setOpenColumnFilter(null)}
                                                                            />
                                                                        )
                                                                    )}
                                                                </div>
                                                            </ResizableHeader>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {prospectsData.length === 0 && (
                                                        <tr>
                                                            <td colSpan={99} className="px-4 py-6 text-left">
                                                                <p className="text-gray-500 text-sm mb-2">No prospects found for the selected filters.</p>
                                                                <button onClick={resetFilters} className="px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors">Reset Filters</button>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {prospectsData.map((prospect, index) => (
                                                        <tr key={prospect.id || index} title="Double-click to edit" className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${selectedRowIds.has(prospect.id) ? 'bg-blue-50/60' : ''} hover:bg-blue-50/30 cursor-pointer transition-colors`} style={{ height: `${Math.max(28, getAdaptiveRowHeight(prospectsData.length))}px` }} onDoubleClick={() => { setEditModalTab('prospects'); setEditModalRow(prospect); setShowEditModal(true); }}>
                                                            <td className="px-2 py-1 w-10" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedRowIds.has(prospect.id)} onChange={() => toggleRowSelection(prospect.id)} className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]" /></td>
                                                            {visibleColumnsProspects.contactId && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.contact_id || undefined}>{prospect.contact_id}</td>}
                                                            {visibleColumnsProspects.linkedinObjectUrn && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.linkedin_object_urn || undefined}>{prospect.linkedin_object_urn}</td>}
                                                            {visibleColumnsProspects.prospectId && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.prospect_id || undefined}>{prospect.prospect_id}</td>}
                                                            {visibleColumnsProspects.linkedinUrl && <td className="px-2 py-1 max-w-0 truncate text-xs" title={prospect.linkedin_url || undefined}>{prospect.linkedin_url ? <a href={prospect.linkedin_url.startsWith('http') ? prospect.linkedin_url : `https://${prospect.linkedin_url}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline">{prospect.linkedin_url}</a> : <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumnsProspects.firstName && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-900" title={prospect.first_name || undefined}>{prospect.first_name}</td>}
                                                            {visibleColumnsProspects.lastName && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-900" title={prospect.last_name || undefined}>{prospect.last_name}</td>}
                                                            {visibleColumnsProspects.campaignName && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.campaign_name || undefined}>{prospect.campaign_name}</td>}
                                                            {visibleColumnsProspects.prospectStatus && <td className="px-2 py-1 max-w-0 text-xs" title={prospect.prospect_status || undefined}>{prospect.prospect_status ? (() => { const statusDisplay = getStatusDisplay(prospect.prospect_status); return <span className={`text-xs font-semibold text-center px-2 py-1 rounded-md w-52 inline-block ${statusDisplay.bgColor} ${statusDisplay.textColor}`}>{statusDisplay.displayName}</span>; })() : <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumnsProspects.email && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.email || undefined}>{prospect.email}</td>}
                                                            {visibleColumnsProspects.phone && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.phone || undefined}>{prospect.phone}</td>}
                                                            {visibleColumnsProspects.birthday && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.birthday || undefined}>{prospect.birthday ? new Date(prospect.birthday).toLocaleDateString() : ''}</td>}
                                                            {visibleColumnsProspects.jobTitle && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.job_title || undefined}>{prospect.job_title}</td>}
                                                            {visibleColumnsProspects.personaAreas && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.persona_areas || undefined}>{prospect.persona_areas}</td>}
                                                            {visibleColumnsProspects.personaLevels && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.persona_levels || undefined}>{prospect.persona_levels}</td>}
                                                            {visibleColumnsProspects.personaLevel && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.persona_level || undefined}>{prospect.persona_level}</td>}
                                                            {visibleColumnsProspects.personaCategory && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.persona_category || undefined}>{prospect.persona_category}</td>}
                                                            {visibleColumnsProspects.jobChange && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.job_change || undefined}>{prospect.job_change || ''}</td>}
                                                            {visibleColumnsProspects.linkedinGroupName && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.linkedin_group_name || undefined}>{prospect.linkedin_group_name}</td>}
                                                            {visibleColumnsProspects.groupAreas && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.group_areas || undefined}>{prospect.group_areas}</td>}
                                                            {visibleColumnsProspects.placeholders && (
                                                                <td className="px-2 py-1 text-xs">
                                                                    {(prospect.placeholders || []).length > 0 && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-medium whitespace-nowrap">+{(prospect.placeholders || []).length}</span>
                                                                    )}
                                                                </td>
                                                            )}
                                                            {visibleColumnsProspects.company && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.company?.name || undefined}>{prospect.company?.name}</td>}
                                                            {visibleColumnsProspects.companyCompanyId && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.company?.company_id || undefined}>{prospect.company?.company_id}</td>}
                                                            {visibleColumnsProspects.companyWebsiteUrl && <td className="px-2 py-1 max-w-0 truncate text-xs" title={prospect.company?.website_url || undefined}>{prospect.company?.website_url ? <a href={prospect.company.website_url.startsWith('http') ? prospect.company.website_url : `https://${prospect.company.website_url}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline">{prospect.company.website_url}</a> : <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumnsProspects.companyLinkedinUrl && <td className="px-2 py-1 max-w-0 truncate text-xs" title={prospect.company?.linkedin_url || undefined}>{prospect.company?.linkedin_url ? <a href={prospect.company.linkedin_url.startsWith('http') ? prospect.company.linkedin_url : `https://${prospect.company.linkedin_url}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline">{prospect.company.linkedin_url}</a> : <span className="text-gray-300">—</span>}</td>}
                                                            {visibleColumnsProspects.companyCity && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.company?.city || undefined}>{prospect.company?.city}</td>}
                                                            {visibleColumnsProspects.companySize && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.company?.size?.toString() || undefined}>{prospect.company?.size}</td>}
                                                            {visibleColumnsProspects.companySizeRange && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.company?.size_range || undefined}>{prospect.company?.size_range}</td>}
                                                            {visibleColumnsProspects.companyIndustry && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.company?.industry_company || undefined}>{prospect.company?.industry_company}</td>}
                                                            {visibleColumnsProspects.companyBusinessType && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.company?.business_type || undefined}>{prospect.company?.business_type}</td>}
                                                                {visibleColumnsProspects.companyCountry && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.company?.country || undefined}>{prospect.company?.country}</td>}
                                                            {visibleColumnsProspects.companyProvincie && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.company?.provincie || undefined}>{prospect.company?.provincie}</td>}
                                                            {visibleColumnsProspects.dateConnectionRequested && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.date_connection_requested || undefined}>{prospect.date_connection_requested ? new Date(prospect.date_connection_requested).toLocaleDateString() : ''}</td>}
                                                            {visibleColumnsProspects.dateConnected && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.date_connected || undefined}>{prospect.date_connected ? new Date(prospect.date_connected).toLocaleDateString() : ''}</td>}
                                                            {visibleColumnsProspects.dateReplied && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.date_replied || undefined}>{prospect.date_replied ? new Date(prospect.date_replied).toLocaleDateString() : ''}</td>}
                                                            {visibleColumnsProspects.datePositiveTag && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.date_positive_tag || undefined}>{prospect.date_positive_tag ? new Date(prospect.date_positive_tag).toLocaleDateString() : ''}</td>}
                                                            {visibleColumnsProspects.country && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.country || undefined}>{prospect.country}</td>}
                                                            {visibleColumnsProspects.scrapingName && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.scraping_name || undefined}>{prospect.scraping_name}</td>}
                                                            {visibleColumnsProspects.leadPhase && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={prospect.lead_phase || undefined}>{prospect.lead_phase}</td>}
                                                            {visibleColumnsProspects.emailSent && <td className="px-2 py-1 max-w-0 text-xs">{prospect.email_sent ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span> : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">No</span>}</td>}
                                                            {visibleColumnsProspects.blacklisted && <td className="px-2 py-1 max-w-0 text-xs">{prospect.blacklisted ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span> : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">No</span>}</td>}
                                                            {visibleColumnsProspects.stopOutreach && <td className="px-2 py-1 max-w-0 text-xs">{prospect.stop_outreach ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span> : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">No</span>}</td>}
                                                            {visibleColumnsProspects.crm && <td className="px-2 py-1 max-w-0 text-xs">{prospect.crm ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span> : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">No</span>}</td>}
                                                            {visibleColumnsProspects.list && (() => {
                                                                const s = prospect.list_item_status;
                                                                const listName = prospectLists.find(l => String(l.id) === selectedProspectListId)?.name;
                                                                if (s === undefined || !listName) return <td className="px-2 py-1 text-xs text-gray-300">—</td>;
                                                                if (s === 'accepted') return <td className="px-2 py-1 text-xs"><div className="flex flex-col gap-0.5"><span className="truncate text-gray-700" title={listName}>{listName}</span><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Accepted</span></div></td>;
                                                                if (s === 'declined') return <td className="px-2 py-1 text-xs"><div className="flex flex-col gap-0.5"><span className="truncate text-gray-700" title={listName}>{listName}</span><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Declined</span></div></td>;
                                                                return <td className="px-2 py-1 text-xs"><span className="truncate text-gray-700" title={listName}>{listName}</span></td>;
                                                            })()}
                                                            {visibleColumnsProspects.companyList && (() => {
                                                                const s = prospect.company_list_item_status;
                                                                const listName = companyLists.find(l => String(l.id) === selectedProspectCompanyListId)?.name;
                                                                if (s === undefined || !listName) return <td className="px-2 py-1 text-xs text-gray-300">—</td>;
                                                                if (s === 'accepted') return <td className="px-2 py-1 text-xs"><div className="flex flex-col gap-0.5"><span className="truncate text-gray-700" title={listName}>{listName}</span><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Accepted</span></div></td>;
                                                                if (s === 'declined') return <td className="px-2 py-1 text-xs"><div className="flex flex-col gap-0.5"><span className="truncate text-gray-700" title={listName}>{listName}</span><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Declined</span></div></td>;
                                                                return <td className="px-2 py-1 text-xs"><span className="truncate text-gray-700" title={listName}>{listName}</span></td>;
                                                            })()}
                                                            <td className="px-2 py-1 text-xs bg-amber-50 border-l border-amber-200 whitespace-nowrap">
                                                                {prospect.ai_fields !== undefined
                                                                    ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 font-medium">{prospectsAiPromptName}</span>
                                                                    : null}
                                                            </td>
                                                            {prospectsAiPromptName && prospectsAiSelectedFields.map(field => (
                                                                <td key={field} className="px-2 py-1 text-xs bg-amber-50 border-l border-amber-100 max-w-0 truncate" title={prospect.ai_fields?.[field] ?? undefined}>
                                                                    {prospect.ai_fields?.[field] ?? <span className="text-gray-300">—</span>}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    </>
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500 text-sm">No prospects found{selectedCustomers.length > 0 ? ' for the selected filters' : ''}.</p>
                                        {selectedCustomers.length === 0 && <p className="text-gray-400 text-xs mt-1">Select a customer and click <span className="font-medium text-gray-500">Apply</span> to load data.</p>}
                                        {selectedCustomers.length > 0 && <button onClick={resetFilters} className="mt-2 px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors">Reset Filters</button>}
                                    </div>
                                )}
                                {prospectsData.length > 0 && (
                                    <div className="mt-4 flex flex-col gap-3">
                                            <div className="mt-4">
                                                <Pagination
                                                    currentPage={currentPage}
                                                    totalPages={totalPages}
                                                    totalItems={prospectsTotal}
                                                    itemsPerPage={pageSize}
                                                    onNext={() => { paginationUserAction.current = true; setCurrentPage(Math.min(totalPages, currentPage + 1)); }}
                                                    onPrev={() => { paginationUserAction.current = true; setCurrentPage(Math.max(1, currentPage - 1)); }}
                                                    isCountLimited={false}
                                                    isCountLoading={isCountLoading}
                                                    currentItemsCount={prospectsData.length}
                                                />
                                            </div>

                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'unassigned_prospects' && (
                            <div>
                                {dataLoading ? (
                                    <div className="flex justify-center py-8">
                                        <ClipLoader size={24} color="#364570" />
                                    </div>
                                ) : (unassignedProspectsData.length > 0 || selectedCustomers.length > 0) ? (
                                    <>
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-700">Total Unassigned Prospects:</span>
                                            <span className="text-xs font-semibold text-[#364570]">{isCountLoading ? <ClipLoader size={12} color="#364570" /> : unassignedProspectsTotal.toLocaleString()}</span>
                                            <span className="text-xs text-gray-400">&middot; Page {currentPage} of {totalPages}</span>
                                        </div>
                                        {selectedRowIds.size > 0 && (
                                            <div className="mb-2 flex flex-col gap-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-medium text-blue-800">{selectedRowIds.size} selected</span>
                                                    <button onClick={() => setShowBulkEditModal(true)} className="px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors flex items-center gap-1.5"><FaEdit className="w-3 h-3" />Bulk Edit</button>
                                                    <button onClick={() => handleBulkClassify(false)} disabled={classifyLoading} className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"><FaTags className="w-3 h-3" />{classifyLoading ? 'Classifying…' : 'Bulk Classify Job Title'}</button>
                                                    <button onClick={() => handleBulkClassify(true)} disabled={classifyLoading} className="px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"><FaSync className="w-3 h-3" />{classifyLoading ? 'Classifying…' : 'Bulk Reclassify Job Title'}</button>
                                                    <button
                                                        onClick={() => {
                                                            setShowAssignProspectsWidget(true);
                                                            setAssignWidgetTargetProfileId('');
                                                            setAssignWidgetTargetCampaignId('');
                                                            setAssignWidgetCampaigns([]);
                                                        }}
                                                        className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1.5"
                                                    >
                                                        <FaUserPlus className="w-3 h-3" />
                                                        Assign to Campaign
                                                    </button>
                                                    <button onClick={() => setShowAddToProspectListModal(true)} title={`Add ${selectedRowIds.size} selected to a prospect list`} className="px-3 py-1 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center gap-1.5"><FaListUl className="w-3 h-3" />{selectedRowIds.size > 0 ? `Add to List (${selectedRowIds.size})` : 'Add to List'}</button>
                                                    <button onClick={() => setSelectedRowIds(new Set())} className="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"><FaTimes className="w-3 h-3" />Clear Selection</button>
                                                </div>
                                                {isAllPageSelected() && getActiveTotalForTab() > selectedRowIds.size && (
                                                    <span className="text-xs text-blue-700">
                                                        All {getActiveDataForTab().length} on this page selected.{' '}
                                                        <button onClick={fetchAllFilteredIds} disabled={selectAllLoading} className="underline font-semibold hover:text-blue-900 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5 align-middle">
                                                            {selectAllLoading && <ClipLoader size={10} color="currentColor" />}
                                                            {selectAllLoading ? 'Selecting…' : `Select all ${Math.min(getActiveTotalForTab(), 50000).toLocaleString()} matching records`}
                                                        </button>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="bg-white shadow-md rounded-lg min-h-[calc(100vh-425px)] md:min-h-[calc(100vh-390px)] lg:min-h-[calc(100vh-370px)] max-h-[calc(100vh-425px)] md:max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-370px)] flex flex-col">
                                        <div ref={unassignedProspectsScrollRef} className="overflow-x-auto overflow-y-auto flex-1">
                                            <table className="divide-y divide-gray-200 table-fixed">
                                                <thead className="bg-gray-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-2 py-1 w-10 flex-shrink-0">
                                                            <input type="checkbox" checked={isAllPageSelected()} ref={(el) => { if (el) el.indeterminate = isSomePageSelected(); }} onChange={toggleSelectAllOnPage} className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]" />
                                                        </th>
                                                        {visibleColumnsUnassigned.contactId && <ResizableHeader width={columnWidths['unassignedContactId'] || 155} onResize={(w) => handleColumnResize('unassignedContactId', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="Contact ID">Contact ID</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedContactId' ? null : 'unassignedContactId'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchUnassignedContactId || includeEmptyUnassignedContactId || notEmptyUnassignedContactId ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedContactId' && (
                                                                <ColumnFilterDropdown column="Contact ID" type="text" searchValue={searchUnassignedContactId} onSearchChange={setSearchUnassignedContactId} excludeSearch={excludeFlags["UnassignedContactId"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["UnassignedContactId"]: v }))} includeEmpty={includeEmptyUnassignedContactId} onIncludeEmptyChange={setIncludeEmptyUnassignedContactId} notEmpty={notEmptyUnassignedContactId} onNotEmptyChange={setNotEmptyUnassignedContactId} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.prospectId && <ResizableHeader width={columnWidths['unassignedProspectId'] || 155} onResize={(w) => handleColumnResize('unassignedProspectId', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="Prospect ID">Prospect ID</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedProspectId' ? null : 'unassignedProspectId'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchUnassignedProspectId || includeEmptyUnassignedProspectId || notEmptyUnassignedProspectId ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedProspectId' && (
                                                                <ColumnFilterDropdown column="Prospect ID" type="text" searchValue={searchUnassignedProspectId} onSearchChange={setSearchUnassignedProspectId} excludeSearch={excludeFlags["UnassignedProspectId"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["UnassignedProspectId"]: v }))} includeEmpty={includeEmptyUnassignedProspectId} onIncludeEmptyChange={setIncludeEmptyUnassignedProspectId} notEmpty={notEmptyUnassignedProspectId} onNotEmptyChange={setNotEmptyUnassignedProspectId} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.linkedInObjectUrn && <ResizableHeader width={columnWidths['unassignedLinkedInObjectUrn'] || 220} onResize={(w) => handleColumnResize('unassignedLinkedInObjectUrn', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <span className="truncate" title="LinkedIn Object URN">LinkedIn Object URN</span>
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.firstName && <ResizableHeader width={columnWidths['unassignedFirstName'] || 130} onResize={(w) => handleColumnResize('unassignedFirstName', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">First Name</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedFirstName' ? null : 'unassignedFirstName'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchUnassignedFirstName || includeEmptyUnassignedFirstName || notEmptyUnassignedFirstName ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedFirstName' && (
                                                                <ColumnFilterDropdown column="First Name" type="text" searchValue={searchUnassignedFirstName} onSearchChange={setSearchUnassignedFirstName} excludeSearch={excludeFlags["UnassignedFirstName"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["UnassignedFirstName"]: v }))} includeEmpty={includeEmptyUnassignedFirstName} onIncludeEmptyChange={setIncludeEmptyUnassignedFirstName} notEmpty={notEmptyUnassignedFirstName} onNotEmptyChange={setNotEmptyUnassignedFirstName} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.lastName && <ResizableHeader width={columnWidths['unassignedLastName'] || 130} onResize={(w) => handleColumnResize('unassignedLastName', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">Last Name</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedLastName' ? null : 'unassignedLastName'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchUnassignedLastName || includeEmptyUnassignedLastName || notEmptyUnassignedLastName ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedLastName' && (
                                                                <ColumnFilterDropdown column="Last Name" type="text" searchValue={searchUnassignedLastName} onSearchChange={setSearchUnassignedLastName} excludeSearch={excludeFlags["UnassignedLastName"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["UnassignedLastName"]: v }))} includeEmpty={includeEmptyUnassignedLastName} onIncludeEmptyChange={setIncludeEmptyUnassignedLastName} notEmpty={notEmptyUnassignedLastName} onNotEmptyChange={setNotEmptyUnassignedLastName} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.email && <ResizableHeader width={columnWidths['unassignedEmail'] || 200} onResize={(w) => handleColumnResize('unassignedEmail', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">Email</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedEmail' ? null : 'unassignedEmail'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${unassignedEmailFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedEmail' && (
                                                                <ColumnFilterDropdown column="Email" type="boolean" booleanValue={unassignedEmailFilter} onBooleanChange={setUnassignedEmailFilter} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.phone && <ResizableHeader width={columnWidths['unassignedPhone'] || 140} onResize={(w) => handleColumnResize('unassignedPhone', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">Phone</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedPhone' ? null : 'unassignedPhone'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${unassignedPhoneFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedPhone' && (
                                                                <ColumnFilterDropdown column="Phone" type="boolean" booleanValue={unassignedPhoneFilter} onBooleanChange={setUnassignedPhoneFilter} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.jobTitle && <ResizableHeader width={columnWidths['unassignedJobTitle'] || 180} onResize={(w) => handleColumnResize('unassignedJobTitle', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">Job Title</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedJobTitle' ? null : 'unassignedJobTitle'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchUnassignedJobTitle || includeEmptyUnassignedJobTitle || notEmptyUnassignedJobTitle ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedJobTitle' && (
                                                                <ColumnFilterDropdown column="Job Title" type="text" searchValue={searchUnassignedJobTitle} onSearchChange={setSearchUnassignedJobTitle} excludeSearch={excludeFlags["UnassignedJobTitle"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["UnassignedJobTitle"]: v }))} includeEmpty={includeEmptyUnassignedJobTitle} onIncludeEmptyChange={setIncludeEmptyUnassignedJobTitle} notEmpty={notEmptyUnassignedJobTitle} onNotEmptyChange={setNotEmptyUnassignedJobTitle} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.scrapingName && <ResizableHeader width={columnWidths['unassignedScrapingName'] || 150} onResize={(w) => handleColumnResize('unassignedScrapingName', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">Scraping Name</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedScrapingName' ? null : 'unassignedScrapingName'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${selectedUnassignedScrapingNames.length > 0 || includeEmptyUnassignedScrapingName || notEmptyUnassignedScrapingName ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedScrapingName' && (
                                                                <ColumnFilterDropdown column="Scraping Name" type="multiselect" options={unassignedScrapingNameOpts} selectedValues={selectedUnassignedScrapingNames} onSelectedValuesChange={setSelectedUnassignedScrapingNames} includeEmpty={includeEmptyUnassignedScrapingName} onIncludeEmptyChange={setIncludeEmptyUnassignedScrapingName} notEmpty={notEmptyUnassignedScrapingName} onNotEmptyChange={setNotEmptyUnassignedScrapingName} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.country && <ResizableHeader width={columnWidths['unassignedCountry'] || 165} onResize={(w) => handleColumnResize('unassignedCountry', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">Prospect Country</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedCountry' ? null : 'unassignedCountry'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${selectedUnassignedCountry.length > 0 || notEmptyUnassignedCountry || includeEmptyUnassignedCountry ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedCountry' && (
                                                                <ColumnFilterDropdown column="Prospect Country" type="multiselect" options={unassignedCountryOpts} selectedValues={selectedUnassignedCountry} onSelectedValuesChange={setSelectedUnassignedCountry} includeEmpty={includeEmptyUnassignedCountry} onIncludeEmptyChange={setIncludeEmptyUnassignedCountry} notEmpty={notEmptyUnassignedCountry} onNotEmptyChange={setNotEmptyUnassignedCountry} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.blacklisted && <ResizableHeader width={columnWidths['unassignedBlacklisted'] || 130} onResize={(w) => handleColumnResize('unassignedBlacklisted', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">Blacklisted</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedBlacklisted' ? null : 'unassignedBlacklisted'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${unassignedBlacklistedFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedBlacklisted' && (
                                                                <ColumnFilterDropdown column="Blacklisted" type="boolean" booleanValue={unassignedBlacklistedFilter} onBooleanChange={setUnassignedBlacklistedFilter} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.personaAreas && <ResizableHeader width={columnWidths['unassignedPersonaAreas'] || 140} onResize={(w) => handleColumnResize('unassignedPersonaAreas', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="Persona Areas">Persona Areas</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedPersonaAreas' ? null : 'unassignedPersonaAreas'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${selectedUnassignedPersonaAreas.length > 0 || notEmptyUnassignedPersonaAreas || includeEmptyUnassignedPersonaAreas ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedPersonaAreas' && (
                                                                <ColumnFilterDropdown column="Persona Areas" type="multiselect" options={unassignedPersonaAreasOpts} selectedValues={selectedUnassignedPersonaAreas} onSelectedValuesChange={setSelectedUnassignedPersonaAreas} includeEmpty={includeEmptyUnassignedPersonaAreas} onIncludeEmptyChange={setIncludeEmptyUnassignedPersonaAreas} notEmpty={notEmptyUnassignedPersonaAreas} onNotEmptyChange={setNotEmptyUnassignedPersonaAreas} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.personaLevels && <ResizableHeader width={columnWidths['unassignedPersonaLevels'] || 140} onResize={(w) => handleColumnResize('unassignedPersonaLevels', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="Persona Levels">Persona Levels</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedPersonaLevels' ? null : 'unassignedPersonaLevels'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${selectedUnassignedPersonaLevels.length > 0 || notEmptyUnassignedPersonaLevels || includeEmptyUnassignedPersonaLevels ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedPersonaLevels' && (
                                                                <ColumnFilterDropdown column="Persona Levels" type="multiselect" options={unassignedPersonaLevelsOpts} selectedValues={selectedUnassignedPersonaLevels} onSelectedValuesChange={setSelectedUnassignedPersonaLevels} includeEmpty={includeEmptyUnassignedPersonaLevels} onIncludeEmptyChange={setIncludeEmptyUnassignedPersonaLevels} notEmpty={notEmptyUnassignedPersonaLevels} onNotEmptyChange={setNotEmptyUnassignedPersonaLevels} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.personaLevel && <ResizableHeader width={columnWidths['unassignedPersonaLevel'] || 130} onResize={(w) => handleColumnResize('unassignedPersonaLevel', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="Persona Level">Persona Level</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedPersonaLevel' ? null : 'unassignedPersonaLevel'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${selectedUnassignedPersonaLevel.length > 0 || notEmptyUnassignedPersonaLevel || includeEmptyUnassignedPersonaLevel ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedPersonaLevel' && (
                                                                <ColumnFilterDropdown column="Persona Level" type="multiselect" options={unassignedPersonaLevelOpts} selectedValues={selectedUnassignedPersonaLevel} onSelectedValuesChange={setSelectedUnassignedPersonaLevel} includeEmpty={includeEmptyUnassignedPersonaLevel} onIncludeEmptyChange={setIncludeEmptyUnassignedPersonaLevel} notEmpty={notEmptyUnassignedPersonaLevel} onNotEmptyChange={setNotEmptyUnassignedPersonaLevel} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.personaCategory && <ResizableHeader width={columnWidths['unassignedPersonaCategory'] || 180} onResize={(w) => handleColumnResize('unassignedPersonaCategory', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="Persona Category">Persona Category</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedPersonaCategory' ? null : 'unassignedPersonaCategory'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${selectedUnassignedPersonaCategory.length > 0 || notEmptyUnassignedPersonaCategory || includeEmptyUnassignedPersonaCategory ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedPersonaCategory' && (
                                                                <ColumnFilterDropdown column="Persona Category" type="multiselect" options={unassignedPersonaCategoryOpts} selectedValues={selectedUnassignedPersonaCategory} onSelectedValuesChange={setSelectedUnassignedPersonaCategory} includeEmpty={includeEmptyUnassignedPersonaCategory} onIncludeEmptyChange={setIncludeEmptyUnassignedPersonaCategory} notEmpty={notEmptyUnassignedPersonaCategory} onNotEmptyChange={setNotEmptyUnassignedPersonaCategory} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.jobChange && <ResizableHeader width={columnWidths['unassignedJobChange'] || 180} onResize={(w) => handleColumnResize('unassignedJobChange', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">Job Change</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedJobChange' ? null : 'unassignedJobChange'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${unassignedJobChangeFilter.length > 0 || includeEmptyUnassignedJobChange || notEmptyUnassignedJobChange || unassignedJobChangeDateFrom || unassignedJobChangeDateTo ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedJobChange' && (
                                                                <ColumnFilterDropdown column="Job Change" type="multiselect-daterange" options={[{ value: 'lt3months', label: '< 3 Months' }, { value: 'lt6months', label: '< 6 Months' }, { value: 'lt12months', label: '< 12 Months' }, { value: '12to24months', label: '12 - 24 Months' }]} selectedValues={unassignedJobChangeFilter} onSelectedValuesChange={setUnassignedJobChangeFilter} includeEmpty={includeEmptyUnassignedJobChange} onIncludeEmptyChange={setIncludeEmptyUnassignedJobChange} notEmpty={notEmptyUnassignedJobChange} onNotEmptyChange={setNotEmptyUnassignedJobChange} dateFromValue={unassignedJobChangeDateFrom} onDateFromChange={setUnassignedJobChangeDateFrom} dateToValue={unassignedJobChangeDateTo} onDateToChange={setUnassignedJobChangeDateTo} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.linkedInGroup && <ResizableHeader width={columnWidths['unassignedLinkedInGroup'] || 230} onResize={(w) => handleColumnResize('unassignedLinkedInGroup', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="LinkedIn Group">LinkedIn Group</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedLinkedInGroupName' ? null : 'unassignedLinkedInGroupName'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchUnassignedLinkedInGroupName || includeEmptyUnassignedLinkedInGroupName || notEmptyUnassignedLinkedInGroupName ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedLinkedInGroupName' && (
                                                                <ColumnFilterDropdown column="LinkedIn Group" type="text" searchValue={searchUnassignedLinkedInGroupName} onSearchChange={setSearchUnassignedLinkedInGroupName} excludeSearch={excludeFlags["UnassignedLinkedInGroupName"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["UnassignedLinkedInGroupName"]: v }))} includeEmpty={includeEmptyUnassignedLinkedInGroupName} onIncludeEmptyChange={setIncludeEmptyUnassignedLinkedInGroupName} notEmpty={notEmptyUnassignedLinkedInGroupName} onNotEmptyChange={setNotEmptyUnassignedLinkedInGroupName} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.groupAreas && <ResizableHeader width={columnWidths['unassignedGroupAreas'] || 200} onResize={(w) => handleColumnResize('unassignedGroupAreas', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="Group Areas">Group Areas</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedGroupAreas' ? null : 'unassignedGroupAreas'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${selectedUnassignedGroupAreas.length > 0 || notEmptyUnassignedGroupAreas || includeEmptyUnassignedGroupAreas ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedGroupAreas' && (
                                                                <ColumnFilterDropdown column="Group Areas" type="multiselect" options={unassignedGroupAreaOpts} selectedValues={selectedUnassignedGroupAreas} onSelectedValuesChange={setSelectedUnassignedGroupAreas} includeEmpty={includeEmptyUnassignedGroupAreas} onIncludeEmptyChange={setIncludeEmptyUnassignedGroupAreas} notEmpty={notEmptyUnassignedGroupAreas} onNotEmptyChange={setNotEmptyUnassignedGroupAreas} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.placeholders && <ResizableHeader width={columnWidths['unassignedPlaceholders'] || 200} onResize={(w) => handleColumnResize('unassignedPlaceholders', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="Placeholders">Placeholders</span>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedPlaceholders' ? null : 'unassignedPlaceholders'); }}
                                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                >
                                                                    <FaFilter className={`w-3 h-3 ${includeEmptyUnassignedPlaceholders || notEmptyUnassignedPlaceholders ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedPlaceholders' && (
                                                                <ColumnFilterDropdown column="Placeholders" type="text" includeEmpty={includeEmptyUnassignedPlaceholders} onIncludeEmptyChange={setIncludeEmptyUnassignedPlaceholders} notEmpty={notEmptyUnassignedPlaceholders} onNotEmptyChange={setNotEmptyUnassignedPlaceholders} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.companyName && <ResizableHeader width={columnWidths['unassignedCompanyName'] || 180} onResize={(w) => handleColumnResize('unassignedCompanyName', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('company_name')} title="Company">
                                                                    Company
                                                                    <SortIndicator field="company_name" sortField={sortField} sortDirection={sortDirection} />
                                                                </span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedCompanyName' ? null : 'unassignedCompanyName'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchUnassignedCompany || includeEmptyUnassignedCompany || notEmptyUnassignedCompany ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedCompanyName' && (
                                                                <ColumnFilterDropdown column="Company" type="text" searchValue={searchUnassignedCompany} onSearchChange={setSearchUnassignedCompany} excludeSearch={excludeFlags["UnassignedCompany"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["UnassignedCompany"]: v }))} includeEmpty={includeEmptyUnassignedCompany} onIncludeEmptyChange={setIncludeEmptyUnassignedCompany} notEmpty={notEmptyUnassignedCompany} onNotEmptyChange={setNotEmptyUnassignedCompany} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.companyCity && <ResizableHeader width={columnWidths['unassignedCompanyCity'] || 120} onResize={(w) => handleColumnResize('unassignedCompanyCity', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">City</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedCompanyCity' ? null : 'unassignedCompanyCity'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchUnassignedCompanyCity || includeEmptyUnassignedCompanyCity || notEmptyUnassignedCompanyCity ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedCompanyCity' && (
                                                                <ColumnFilterDropdown column="City" type="text" searchValue={searchUnassignedCompanyCity} onSearchChange={setSearchUnassignedCompanyCity} excludeSearch={excludeFlags["UnassignedCompanyCity"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["UnassignedCompanyCity"]: v }))} includeEmpty={includeEmptyUnassignedCompanyCity} onIncludeEmptyChange={setIncludeEmptyUnassignedCompanyCity} notEmpty={notEmptyUnassignedCompanyCity} onNotEmptyChange={setNotEmptyUnassignedCompanyCity} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.companySizeRange && <ResizableHeader width={columnWidths['unassignedCompanySizeRange'] || 120} onResize={(w) => handleColumnResize('unassignedCompanySizeRange', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">Size Range</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedCompanySizeRange' ? null : 'unassignedCompanySizeRange'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${selectedUnassignedCompanySizeRanges.length > 0 || includeEmptyUnassignedCompanySizeRange || notEmptyUnassignedCompanySizeRange ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedCompanySizeRange' && (
                                                                <ColumnFilterDropdown column="Size Range" type="multiselect" options={unassignedSizeRangeOpts} selectedValues={selectedUnassignedCompanySizeRanges} onSelectedValuesChange={setSelectedUnassignedCompanySizeRanges} includeEmpty={includeEmptyUnassignedCompanySizeRange} onIncludeEmptyChange={setIncludeEmptyUnassignedCompanySizeRange} notEmpty={notEmptyUnassignedCompanySizeRange} onNotEmptyChange={setNotEmptyUnassignedCompanySizeRange} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.companyIndustry && <ResizableHeader width={columnWidths['unassignedCompanyIndustry'] || 150} onResize={(w) => handleColumnResize('unassignedCompanyIndustry', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">Industry</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedCompanyIndustry' ? null : 'unassignedCompanyIndustry'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${selectedUnassignedCompanyIndustries.length > 0 || includeEmptyUnassignedCompanyIndustry || notEmptyUnassignedCompanyIndustry ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedCompanyIndustry' && (
                                                                <ColumnFilterDropdown column="Industry" type="multiselect" options={unassignedIndustryOpts} selectedValues={selectedUnassignedCompanyIndustries} onSelectedValuesChange={setSelectedUnassignedCompanyIndustries} includeEmpty={includeEmptyUnassignedCompanyIndustry} onIncludeEmptyChange={setIncludeEmptyUnassignedCompanyIndustry} notEmpty={notEmptyUnassignedCompanyIndustry} onNotEmptyChange={setNotEmptyUnassignedCompanyIndustry} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.companyCountry && <ResizableHeader width={columnWidths['unassignedCompanyCountry'] || 120} onResize={(w) => handleColumnResize('unassignedCompanyCountry', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate">Country</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedCompanyCountry' ? null : 'unassignedCompanyCountry'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchUnassignedCompanyCountry || includeEmptyUnassignedCompanyCountry || notEmptyUnassignedCompanyCountry ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedCompanyCountry' && (
                                                                <ColumnFilterDropdown column="Country" type="text" searchValue={searchUnassignedCompanyCountry} onSearchChange={setSearchUnassignedCompanyCountry} excludeSearch={excludeFlags["UnassignedCompanyCountry"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["UnassignedCompanyCountry"]: v }))} includeEmpty={includeEmptyUnassignedCompanyCountry} onIncludeEmptyChange={setIncludeEmptyUnassignedCompanyCountry} notEmpty={notEmptyUnassignedCompanyCountry} onNotEmptyChange={setNotEmptyUnassignedCompanyCountry} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.inCampaign && <ResizableHeader width={columnWidths['unassignedInCampaign'] || 210} onResize={(w) => handleColumnResize('unassignedInCampaign', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="People of this prospect's company already in Connector campaigns of this customer — Total / Connected / Replied / POS / NEG">In Connector Campaigns</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedInCampaign' ? null : 'unassignedInCampaign'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${unassignedInCampaignMin || unassignedInCampaignMax ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'unassignedInCampaign' && (
                                                                <ColumnFilterDropdown column="In Connector Campaigns" type="range" statusOptions={[{ value: 'total', label: 'Total in Connector campaigns' }, { value: 'connected', label: 'Connected' }, { value: 'replied', label: 'Replied' }, { value: 'pos', label: 'POS tagged' }, { value: 'neg', label: 'NEG tagged' }]} statusValue={unassignedInCampaignBasis} onStatusChange={setUnassignedInCampaignBasis} minValue={unassignedInCampaignMin} onMinChange={setUnassignedInCampaignMin} maxValue={unassignedInCampaignMax} onMaxChange={setUnassignedInCampaignMax} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>}
                                                        {visibleColumnsUnassigned.list && (
                                                            <ResizableHeader width={columnWidths['unassignedList'] || 140} onResize={(w) => handleColumnResize('unassignedList', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Prospect List">Prospect List</span>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedList' ? null : 'unassignedList'); }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedUnassignedListId || selectedUnassignedListStatus ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'unassignedList' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Prospect List"
                                                                        type="singleselect"
                                                                        options={prospectLists.map(l => ({ value: String(l.id), label: l.name }))}
                                                                        singleSelectValue={selectedUnassignedListId}
                                                                        onSingleSelectChange={setSelectedUnassignedListId}
                                                                        statusOptions={[
                                                                            { value: 'accepted', label: 'Accepted' },
                                                                            { value: 'declined', label: 'Declined' },
                                                                            { value: 'empty', label: 'Empty' },
                                                                        ]}
                                                                        statusValue={selectedUnassignedListStatus}
                                                                        onStatusChange={setSelectedUnassignedListStatus}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsUnassigned.companyList && (
                                                            <ResizableHeader width={columnWidths['unassignedCompanyList'] || 140} onResize={(w) => handleColumnResize('unassignedCompanyList', w)} className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Company List">Company List</span>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'unassignedCompanyList' ? null : 'unassignedCompanyList'); }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedUnassignedCompanyListId || selectedUnassignedCompanyListStatus ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'unassignedCompanyList' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company List"
                                                                        type="singleselect"
                                                                        options={companyLists.map(l => ({ value: String(l.id), label: l.name }))}
                                                                        singleSelectValue={selectedUnassignedCompanyListId}
                                                                        onSingleSelectChange={setSelectedUnassignedCompanyListId}
                                                                        statusOptions={[
                                                                            { value: 'accepted', label: 'Accepted' },
                                                                            { value: 'declined', label: 'Declined' },
                                                                            { value: 'empty', label: 'Empty' },
                                                                        ]}
                                                                        statusValue={selectedUnassignedCompanyListStatus}
                                                                        onStatusChange={setSelectedUnassignedCompanyListStatus}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        <th className="px-2 py-1 text-left text-xs font-semibold text-amber-800 uppercase tracking-wider bg-amber-50 border-l border-amber-200 whitespace-nowrap">
                                                            <div className="flex flex-col gap-1">
                                                                <span>AI Analysis</span>
                                                                <select
                                                                    value={unassignedAiPromptName}
                                                                    onChange={e => setUnassignedAiPromptName(e.target.value)}
                                                                    onClick={e => e.stopPropagation()}
                                                                    className="text-[10px] border border-amber-300 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-normal normal-case tracking-normal min-w-[120px]"
                                                                >
                                                                    <option value="">— all —</option>
                                                                    {companyPromptOptions.map(p => (
                                                                        <option key={p} value={p}>{p}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </th>
                                                        {unassignedAiPromptName && unassignedAiSelectedFields.map(field => (
                                                            <ResizableHeader
                                                                key={field}
                                                                width={columnWidths[`unassignedAiField_${field}`] || 150}
                                                                onResize={(w) => handleColumnResize(`unassignedAiField_${field}`, w)}
                                                                className="px-2 py-1 text-left bg-amber-50 border-l border-amber-100 relative"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider capitalize truncate">{field.replace(/_/g, ' ')}</span>
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === `unassignedAi_${field}` ? null : `unassignedAi_${field}`); }}
                                                                        className="flex-shrink-0 p-1 hover:bg-amber-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${(unassignedAiFieldFilters.find(f => f.field === field)?.value || unassignedAiFieldExclude[field] || (unassignedAiMultiSelectFilters[field] && unassignedAiMultiSelectFilters[field].length > 0)) ? 'text-amber-700' : 'text-amber-400'}`} />
                                                                    </button>
                                                                    {openColumnFilter === `unassignedAi_${field}` && (
                                                                        unassignedAiFieldOptions[field] ? (
                                                                            <ColumnFilterDropdown
                                                                                column={field.replace(/_/g, ' ')}
                                                                                type="multiselect"
                                                                                options={unassignedAiFieldOptions[field]}
                                                                                selectedValues={unassignedAiMultiSelectFilters[field] || []}
                                                                                onSelectedValuesChange={vals => setUnassignedAiMultiSelectFilters(prev => ({ ...prev, [field]: vals }))}
                                                                                searchValue={unassignedAiFieldFilters.find(f => f.field === field)?.value || ''}
                                                                                onSearchChange={val => setUnassignedAiFieldFilters(prev => {
                                                                                    const without = prev.filter(f => f.field !== field);
                                                                                    return val ? [...without, { field, value: val }] : without;
                                                                                })}
                                                                                excludeSearch={unassignedAiFieldExclude[field] || false}
                                                                                onExcludeSearchChange={v => setUnassignedAiFieldExclude(prev => ({ ...prev, [field]: v }))}
                                                                                isOpen={true}
                                                                                onClose={() => setOpenColumnFilter(null)}
                                                                            />
                                                                        ) : (
                                                                            <ColumnFilterDropdown
                                                                                column={field.replace(/_/g, ' ')}
                                                                                type="text"
                                                                                searchValue={unassignedAiFieldFilters.find(f => f.field === field)?.value || ''}
                                                                                onSearchChange={val => setUnassignedAiFieldFilters(prev => {
                                                                                    const without = prev.filter(f => f.field !== field);
                                                                                    return val ? [...without, { field, value: val }] : without;
                                                                                })}
                                                                                excludeSearch={unassignedAiFieldExclude[field] || false}
                                                                                onExcludeSearchChange={v => setUnassignedAiFieldExclude(prev => ({ ...prev, [field]: v }))}
                                                                                isOpen={true}
                                                                                onClose={() => setOpenColumnFilter(null)}
                                                                            />
                                                                        )
                                                                    )}
                                                                </div>
                                                            </ResizableHeader>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {unassignedProspectsData.length === 0 && (
                                                        <tr>
                                                            <td colSpan={99} className="px-4 py-6 text-left">
                                                                <p className="text-gray-500 text-sm mb-2">No unassigned prospects found for the selected filters.</p>
                                                                <button onClick={resetFilters} className="px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors">Reset Filters</button>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {unassignedProspectsData.map((row: any) => (
                                                        <tr key={row.customer_prospect_id || row.id} title="Double-click to edit" className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedRowIds.has(row.customer_prospect_id || row.id) ? 'bg-blue-50' : ''}`} onDoubleClick={() => { setEditModalTab('unassigned_prospects'); setEditModalRow(row); setShowEditModal(true); }}>
                                                            <td className="px-2 py-1 w-10 flex-shrink-0">
                                                                <input type="checkbox" checked={selectedRowIds.has(row.customer_prospect_id || row.id)} onChange={() => { const id = row.customer_prospect_id || row.id; setSelectedRowIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }} className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]" />
                                                            </td>
                                                            {visibleColumnsUnassigned.contactId && <td className="px-2 py-1 text-xs text-gray-900 truncate" title={row.contact_id || undefined}>{row.contact_id || ''}</td>}
                                                            {visibleColumnsUnassigned.prospectId && <td className="px-2 py-1 text-xs text-gray-900 truncate" title={row.prospect_id || undefined}>{row.prospect_id || ''}</td>}
                                                            {visibleColumnsUnassigned.linkedInObjectUrn && <td className="px-2 py-1 text-xs text-gray-900 truncate" title={row.linkedin_object_urn || undefined}>{row.linkedin_object_urn || ''}</td>}
                                                            {visibleColumnsUnassigned.firstName && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.first_name || ''}</td>}
                                                            {visibleColumnsUnassigned.lastName && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.last_name || ''}</td>}
                                                            {visibleColumnsUnassigned.email && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.email || ''}</td>}
                                                            {visibleColumnsUnassigned.phone && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.phone || ''}</td>}
                                                            {visibleColumnsUnassigned.jobTitle && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.job_title || ''}</td>}
                                                            {visibleColumnsUnassigned.scrapingName && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.scraping_name || ''}</td>}
                                                            {visibleColumnsUnassigned.country && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.country || ''}</td>}
                                                            {visibleColumnsUnassigned.blacklisted && <td className="px-2 py-1 text-xs text-center">{row.blacklisted ? <span className="text-red-600 font-semibold">Yes</span> : <span className="text-gray-400">No</span>}</td>}
                                                            {visibleColumnsUnassigned.personaAreas && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={row.persona_areas || undefined}>{row.persona_areas}</td>}
                                                            {visibleColumnsUnassigned.personaLevels && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={row.persona_levels || undefined}>{row.persona_levels}</td>}
                                                            {visibleColumnsUnassigned.personaLevel && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={row.persona_level || undefined}>{row.persona_level}</td>}
                                                            {visibleColumnsUnassigned.personaCategory && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={row.persona_category || undefined}>{row.persona_category}</td>}
                                                            {visibleColumnsUnassigned.jobChange && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.job_change || ''}</td>}
                                                            {visibleColumnsUnassigned.linkedInGroup && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={row.linkedin_group_name || undefined}>{row.linkedin_group_name}</td>}
                                                            {visibleColumnsUnassigned.groupAreas && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={row.group_areas || undefined}>{row.group_areas}</td>}
                                                            {visibleColumnsUnassigned.placeholders && (
                                                                <td className="px-2 py-1 text-xs">
                                                                    {(row.placeholders || []).length > 0 && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-medium whitespace-nowrap">
                                                                            +{(row.placeholders || []).length}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            )}
                                                            {visibleColumnsUnassigned.companyName && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.company?.name || ''}</td>}
                                                            {visibleColumnsUnassigned.companyCity && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.company?.city || ''}</td>}
                                                            {visibleColumnsUnassigned.companySizeRange && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.company?.size_range || ''}</td>}
                                                            {visibleColumnsUnassigned.companyIndustry && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.company?.industry_company || ''}</td>}
                                                            {visibleColumnsUnassigned.companyCountry && <td className="px-2 py-1 text-xs text-gray-900 truncate">{row.company?.country || ''}</td>}
                                                            {visibleColumnsUnassigned.inCampaign && (
                                                                <td className="px-2 py-1 text-xs whitespace-nowrap">
                                                                    {row.in_campaign_counts ? (
                                                                        <span title={`${row.company?.name || 'Company'} in Connector campaigns — Total: ${row.in_campaign_counts.total}, Connected: ${row.in_campaign_counts.connected}, Replied: ${row.in_campaign_counts.replied}, POS: ${row.in_campaign_counts.pos}, NEG: ${row.in_campaign_counts.neg}`}>
                                                                            <span className="font-semibold text-gray-900">{row.in_campaign_counts.total}</span>
                                                                            <span className="text-gray-400"> · </span>
                                                                            <span className="text-blue-700">C {row.in_campaign_counts.connected}</span>
                                                                            <span className="text-gray-400"> · </span>
                                                                            <span className="text-purple-700">R {row.in_campaign_counts.replied}</span>
                                                                            <span className="text-gray-400"> · </span>
                                                                            <span className="text-green-700">P {row.in_campaign_counts.pos}</span>
                                                                            <span className="text-gray-400"> · </span>
                                                                            <span className="text-red-700">N {row.in_campaign_counts.neg}</span>
                                                                        </span>
                                                                    ) : <span className="text-gray-300">—</span>}
                                                                </td>
                                                            )}
                                                            {visibleColumnsUnassigned.list && (() => {
                                                                const s = row.list_item_status;
                                                                const listName = prospectLists.find(l => String(l.id) === selectedUnassignedListId)?.name;
                                                                if (s === undefined || !listName) return <td className="px-2 py-1 text-xs text-gray-300">—</td>;
                                                                if (s === 'accepted') return <td className="px-2 py-1 text-xs"><div className="flex flex-col gap-0.5"><span className="truncate text-gray-700" title={listName}>{listName}</span><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Accepted</span></div></td>;
                                                                if (s === 'declined') return <td className="px-2 py-1 text-xs"><div className="flex flex-col gap-0.5"><span className="truncate text-gray-700" title={listName}>{listName}</span><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Declined</span></div></td>;
                                                                return <td className="px-2 py-1 text-xs"><span className="truncate text-gray-700" title={listName}>{listName}</span></td>;
                                                            })()}
                                                            {visibleColumnsUnassigned.companyList && (() => {
                                                                const s = row.company_list_item_status;
                                                                const listName = companyLists.find(l => String(l.id) === selectedUnassignedCompanyListId)?.name;
                                                                if (s === undefined || !listName) return <td className="px-2 py-1 text-xs text-gray-300">—</td>;
                                                                if (s === 'accepted') return <td className="px-2 py-1 text-xs"><div className="flex flex-col gap-0.5"><span className="truncate text-gray-700" title={listName}>{listName}</span><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Accepted</span></div></td>;
                                                                if (s === 'declined') return <td className="px-2 py-1 text-xs"><div className="flex flex-col gap-0.5"><span className="truncate text-gray-700" title={listName}>{listName}</span><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Declined</span></div></td>;
                                                                return <td className="px-2 py-1 text-xs"><span className="truncate text-gray-700" title={listName}>{listName}</span></td>;
                                                            })()}
                                                            <td className="px-2 py-1 text-xs bg-amber-50 border-l border-amber-200 whitespace-nowrap">
                                                                {row.ai_fields !== undefined
                                                                    ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 font-medium">{unassignedAiPromptName}</span>
                                                                    : null}
                                                            </td>
                                                            {unassignedAiPromptName && unassignedAiSelectedFields.map(field => (
                                                                <td key={field} className="px-2 py-1 text-xs bg-amber-50 border-l border-amber-100 max-w-0 truncate" title={row.ai_fields?.[field] ?? undefined}>
                                                                    {row.ai_fields?.[field] ?? <span className="text-gray-300">—</span>}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        </div>
                                        <div className="mt-3">
                                            <Pagination
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                totalItems={unassignedProspectsTotal}
                                                itemsPerPage={pageSize}
                                                onNext={() => { paginationUserAction.current = true; setCurrentPage(Math.min(totalPages, currentPage + 1)); }}
                                                onPrev={() => { paginationUserAction.current = true; setCurrentPage(Math.max(1, currentPage - 1)); }}
                                                isCountLimited={false}
                                                isCountLoading={isCountLoading}
                                                currentItemsCount={unassignedProspectsData.length}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        {selectedCustomers.length === 0
                                            ? 'Select a customer and click Apply to view unassigned prospects'
                                            : <>
                                                No unassigned prospects found. Try adjusting your filters.
                                                <br />
                                                <button onClick={resetFilters} className="mt-2 px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors">Reset Filters</button>
                                            </>}
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'campaigns' && (
                            <div>
                                {dataLoading ? (
                                    <div className="flex justify-center py-8">
                                        <ClipLoader size={24} color="#364570" />
                                    </div>
                                ) : (campaignsData.length > 0 || selectedCustomers.length > 0) ? (
                                    <>
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-700">Total Campaigns:</span>
                                            <span className="text-xs font-semibold text-[#364570]">{isCountLoading ? <ClipLoader size={12} color="#364570" /> : campaignsTotal.toLocaleString()}</span>
                                            <span className="text-xs text-gray-400">· Page {currentPage} of {totalPages}</span>
                                        </div>
                                        {selectedRowIds.size > 0 && (
                                            <div className="mb-2 flex flex-col gap-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-medium text-blue-800">{selectedRowIds.size} selected</span>
                                                    <button onClick={() => setShowBulkEditModal(true)} className="px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors flex items-center gap-1.5"><FaEdit className="w-3 h-3" />Bulk Edit</button>
                                                    <button onClick={() => setSelectedRowIds(new Set())} className="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"><FaTimes className="w-3 h-3" />Clear Selection</button>
                                                </div>
                                                {isAllPageSelected() && getActiveTotalForTab() > selectedRowIds.size && (
                                                    <span className="text-xs text-blue-700">
                                                        All {getActiveDataForTab().length} on this page selected.{' '}
                                                        <button onClick={fetchAllFilteredIds} disabled={selectAllLoading} className="underline font-semibold hover:text-blue-900 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5 align-middle">
                                                            {selectAllLoading && <ClipLoader size={10} color="currentColor" />}
                                                            {selectAllLoading ? 'Selecting…' : `Select all ${Math.min(getActiveTotalForTab(), 50000).toLocaleString()} matching records`}
                                                        </button>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="bg-white shadow-md rounded-lg min-h-[calc(100vh-425px)] md:min-h-[calc(100vh-390px)] lg:min-h-[calc(100vh-370px)] max-h-[calc(100vh-425px)] md:max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-370px)] flex flex-col">
                                        <div ref={campaignsScrollRef} className="overflow-x-auto overflow-y-auto flex-1">
                                            <table className="divide-y divide-gray-200 table-fixed">
                                                <thead className="bg-gray-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-2 py-1 w-10 flex-shrink-0">
                                                            <input type="checkbox" checked={isAllPageSelected()} ref={(el) => { if (el) el.indeterminate = isSomePageSelected(); }} onChange={toggleSelectAllOnPage} className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]" />
                                                        </th>
                                                        {visibleColumnsCampaigns.profileName && (
                                                            <ResizableHeader
                                                                width={columnWidths['campaignProfileName'] || 180}
                                                                onResize={(w) => handleColumnResize('campaignProfileName', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group cursor-pointer hover:bg-gray-100"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('profile_name')} title="Profile Name">
                                                                        Profile Name
                                                                        <SortIndicator field="profile_name" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'campaignProfileName' ? null : 'campaignProfileName');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedCampaignProfiles.length > 0 || notEmptyCampaignProfile || includeEmptyCampaignProfile ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'campaignProfileName' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Profile Name"
                                                                        type="multiselect"
                                                                        options={campaignProfileNameOptions}
                                                                        selectedValues={selectedCampaignProfiles}
                                                                        onSelectedValuesChange={setSelectedCampaignProfiles}
                                                                        includeEmpty={includeEmptyCampaignProfile}
                                                                        onIncludeEmptyChange={setIncludeEmptyCampaignProfile}
                                                                        notEmpty={notEmptyCampaignProfile}
                                                                        onNotEmptyChange={setNotEmptyCampaignProfile}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsCampaigns.campaignName && (
                                                            <ResizableHeader
                                                                width={columnWidths['campaignName'] || 180}
                                                                onResize={(w) => handleColumnResize('campaignName', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group cursor-pointer hover:bg-gray-100"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('campaign_name')} title="Campaign Name">
                                                                        Campaign Name
                                                                        <SortIndicator field="campaign_name" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'campaignName' ? null : 'campaignName');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedCampaignNamesFilter.length > 0 || notEmptyCampaignName || includeEmptyCampaignName ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'campaignName' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Campaign Name"
                                                                        type="multiselect"
                                                                        options={campaignNameFilterOptions}
                                                                        selectedValues={selectedCampaignNamesFilter}
                                                                        onSelectedValuesChange={setSelectedCampaignNamesFilter}
                                                                        includeEmpty={includeEmptyCampaignName}
                                                                        onIncludeEmptyChange={setIncludeEmptyCampaignName}
                                                                        notEmpty={notEmptyCampaignName}
                                                                        onNotEmptyChange={setNotEmptyCampaignName}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsCampaigns.requestsPerDay && (
                                                            <ResizableHeader
                                                                width={columnWidths['campaignRequestsPerDay'] || 165}
                                                                onResize={(w) => handleColumnResize('campaignRequestsPerDay', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group cursor-pointer hover:bg-gray-100"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('requests_per_day')} title="Requests/Day">
                                                                        Requests/Day
                                                                        <SortIndicator field="requests_per_day" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'requestsPerDay' ? null : 'requestsPerDay');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${minRequestsPerDay || maxRequestsPerDay ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'requestsPerDay' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Requests Per Day"
                                                                        type="range"
                                                                        minValue={minRequestsPerDay}
                                                                        maxValue={maxRequestsPerDay}
                                                                        onMinChange={setMinRequestsPerDay}
                                                                        onMaxChange={setMaxRequestsPerDay}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsCampaigns.type && (
                                                            <ResizableHeader
                                                                width={columnWidths['campaignType'] || 100}
                                                                onResize={(w) => handleColumnResize('campaignType', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group hover:bg-gray-100"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" title="Type">
                                                                        Type
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'campaignType' ? null : 'campaignType');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedCampaignTypes.length > 0 || notEmptyCampaignType || includeEmptyCampaignType ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'campaignType' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Type"
                                                                        type="multiselect"
                                                                        options={campaignTypeOptions}
                                                                        selectedValues={selectedCampaignTypes}
                                                                        onSelectedValuesChange={setSelectedCampaignTypes}
                                                                        includeEmpty={includeEmptyCampaignType}
                                                                        onIncludeEmptyChange={setIncludeEmptyCampaignType}
                                                                        notEmpty={notEmptyCampaignType}
                                                                        onNotEmptyChange={setNotEmptyCampaignType}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsCampaigns.content && (
                                                            <ResizableHeader
                                                                width={columnWidths['campaignContent'] || 120}
                                                                onResize={(w) => handleColumnResize('campaignContent', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group hover:bg-gray-100"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" title="Content">
                                                                        Content
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'campaignContent' ? null : 'campaignContent');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedCampaignContents.length > 0 || notEmptyCampaignContent || includeEmptyCampaignContent ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'campaignContent' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Content"
                                                                        type="multiselect"
                                                                        options={campaignContentOptions}
                                                                        selectedValues={selectedCampaignContents}
                                                                        onSelectedValuesChange={setSelectedCampaignContents}
                                                                        includeEmpty={includeEmptyCampaignContent}
                                                                        onIncludeEmptyChange={setIncludeEmptyCampaignContent}
                                                                        notEmpty={notEmptyCampaignContent}
                                                                        onNotEmptyChange={setNotEmptyCampaignContent}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsCampaigns.sector && (
                                                            <ResizableHeader
                                                                width={columnWidths['campaignSector'] || 110}
                                                                onResize={(w) => handleColumnResize('campaignSector', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Sector">Sector</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'campaignSector' ? null : 'campaignSector');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedCampaignSectors.length > 0 || notEmptyCampaignSector || includeEmptyCampaignSector ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'campaignSector' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Sector"
                                                                        type="multiselect"
                                                                        options={campaignSectorOptions}
                                                                        selectedValues={selectedCampaignSectors}
                                                                        onSelectedValuesChange={setSelectedCampaignSectors}
                                                                        includeEmpty={includeEmptyCampaignSector}
                                                                        onIncludeEmptyChange={setIncludeEmptyCampaignSector}
                                                                        notEmpty={notEmptyCampaignSector}
                                                                        onNotEmptyChange={setNotEmptyCampaignSector}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsCampaigns.companyAttribute && (
                                                            <ResizableHeader
                                                                width={columnWidths['campaignCompanyAttribute'] || 210}
                                                                onResize={(w) => handleColumnResize('campaignCompanyAttribute', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Company Attribute">Company Attribute</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'campaignCompanyAttribute' ? null : 'campaignCompanyAttribute');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedCampaignCompanyAttributes.length > 0 || notEmptyCampaignCompanyAttribute || includeEmptyCampaignCompanyAttribute ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'campaignCompanyAttribute' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Company Attribute"
                                                                        type="multiselect"
                                                                        options={campaignCompanyAttributeOptions}
                                                                        selectedValues={selectedCampaignCompanyAttributes}
                                                                        onSelectedValuesChange={setSelectedCampaignCompanyAttributes}
                                                                        includeEmpty={includeEmptyCampaignCompanyAttribute}
                                                                        onIncludeEmptyChange={setIncludeEmptyCampaignCompanyAttribute}
                                                                        notEmpty={notEmptyCampaignCompanyAttribute}
                                                                        onNotEmptyChange={setNotEmptyCampaignCompanyAttribute}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsCampaigns.persona && (
                                                            <ResizableHeader
                                                                width={columnWidths['campaignPersona'] || 120}
                                                                onResize={(w) => handleColumnResize('campaignPersona', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="truncate" title="Persona">Persona</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'campaignPersona' ? null : 'campaignPersona');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${selectedCampaignPersonas.length > 0 || notEmptyCampaignPersona || includeEmptyCampaignPersona ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'campaignPersona' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Persona"
                                                                        type="multiselect"
                                                                        options={campaignPersonaOptions}
                                                                        selectedValues={selectedCampaignPersonas}
                                                                        onSelectedValuesChange={setSelectedCampaignPersonas}
                                                                        includeEmpty={includeEmptyCampaignPersona}
                                                                        onIncludeEmptyChange={setIncludeEmptyCampaignPersona}
                                                                        notEmpty={notEmptyCampaignPersona}
                                                                        onNotEmptyChange={setNotEmptyCampaignPersona}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsCampaigns.connectionRequest && (
                                                            <>
                                                                <ResizableHeader
                                                                    width={columnWidths['campaignConnectionRequest'] || 200}
                                                                    onResize={(w) => handleColumnResize('campaignConnectionRequest', w)}
                                                                    className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                                >
                                                                    <span className="truncate" title="Connection Request">Connection Request</span>
                                                                </ResizableHeader>
                                                                <ResizableHeader
                                                                    width={columnWidths['campaignConnectionRequestDelay'] || 60}
                                                                    onResize={(w) => handleColumnResize('campaignConnectionRequestDelay', w)}
                                                                    className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                                >
                                                                    <span className="truncate" title="Delay">Delay</span>
                                                                </ResizableHeader>
                                                            </>
                                                        )}
                                                        {visibleColumnsCampaigns.firstFollowUp && (
                                                            <>
                                                                <ResizableHeader
                                                                    width={columnWidths['campaignFirstFollowUp'] || 200}
                                                                    onResize={(w) => handleColumnResize('campaignFirstFollowUp', w)}
                                                                    className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                                >
                                                                    <span className="truncate" title="First Follow-up">First Follow-up</span>
                                                                </ResizableHeader>
                                                                <ResizableHeader
                                                                    width={columnWidths['campaignFirstFollowUpDelay'] || 60}
                                                                    onResize={(w) => handleColumnResize('campaignFirstFollowUpDelay', w)}
                                                                    className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                                >
                                                                    <span className="truncate" title="Delay">Delay</span>
                                                                </ResizableHeader>
                                                            </>
                                                        )}
                                                        {visibleColumnsCampaigns.secondFollowUp && (
                                                            <>
                                                                <ResizableHeader
                                                                    width={columnWidths['campaignSecondFollowUp'] || 200}
                                                                    onResize={(w) => handleColumnResize('campaignSecondFollowUp', w)}
                                                                    className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                                >
                                                                    <span className="truncate" title="Second Follow-up">Second Follow-up</span>
                                                                </ResizableHeader>
                                                                <ResizableHeader
                                                                    width={columnWidths['campaignSecondFollowUpDelay'] || 60}
                                                                    onResize={(w) => handleColumnResize('campaignSecondFollowUpDelay', w)}
                                                                    className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                                >
                                                                    <span className="truncate" title="Delay">Delay</span>
                                                                </ResizableHeader>
                                                            </>
                                                        )}
                                                        {visibleColumnsCampaigns.thirdFollowUp && (
                                                            <>
                                                                <ResizableHeader
                                                                    width={columnWidths['campaignThirdFollowUp'] || 200}
                                                                    onResize={(w) => handleColumnResize('campaignThirdFollowUp', w)}
                                                                    className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                                >
                                                                    <span className="truncate" title="Third Follow-up">Third Follow-up</span>
                                                                </ResizableHeader>
                                                                <ResizableHeader
                                                                    width={columnWidths['campaignThirdFollowUpDelay'] || 60}
                                                                    onResize={(w) => handleColumnResize('campaignThirdFollowUpDelay', w)}
                                                                    className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                                >
                                                                    <span className="truncate" title="Delay">Delay</span>
                                                                </ResizableHeader>
                                                            </>
                                                        )}
                                                        {visibleColumnsCampaigns.fourthFollowUp && (
                                                            <>
                                                                <ResizableHeader
                                                                    width={columnWidths['campaignFourthFollowUp'] || 200}
                                                                    onResize={(w) => handleColumnResize('campaignFourthFollowUp', w)}
                                                                    className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                                >
                                                                    <span className="truncate" title="Fourth Follow-up">Fourth Follow-up</span>
                                                                </ResizableHeader>
                                                                <ResizableHeader
                                                                    width={columnWidths['campaignFourthFollowUpDelay'] || 60}
                                                                    onResize={(w) => handleColumnResize('campaignFourthFollowUpDelay', w)}
                                                                    className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                                >
                                                                    <span className="truncate" title="Delay">Delay</span>
                                                                </ResizableHeader>
                                                            </>
                                                        )}
                                                        {visibleColumnsCampaigns.startDate && (
                                                            <ResizableHeader
                                                                width={columnWidths['campaignStartDate'] || 145}
                                                                onResize={(w) => handleColumnResize('campaignStartDate', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group cursor-pointer hover:bg-gray-100"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" onClick={() => handleSort('start_date')} title="Start Date">
                                                                        Start Date
                                                                        <SortIndicator field="start_date" sortField={sortField} sortDirection={sortDirection} />
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'startDate' ? null : 'startDate');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${searchCampaignStartDate ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'startDate' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Start Date"
                                                                        type="text"
                                                                        searchValue={searchCampaignStartDate}
                                                                        onSearchChange={setSearchCampaignStartDate}
                                                                        includeEmpty={includeEmptyCampaignStartDate}
                                                                        onIncludeEmptyChange={setIncludeEmptyCampaignStartDate}
                                                                        notEmpty={notEmptyCampaignStartDate}
                                                                        onNotEmptyChange={setNotEmptyCampaignStartDate}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsCampaigns.live && (
                                                            <ResizableHeader
                                                                width={columnWidths['campaignLive'] || 90}
                                                                onResize={(w) => handleColumnResize('campaignLive', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group hover:bg-gray-100"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" title="Live">
                                                                        Live
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'live' ? null : 'live');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${liveFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'live' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Live"
                                                                        type="boolean"
                                                                        booleanValue={liveFilter}
                                                                        onBooleanChange={setLiveFilter}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                        {visibleColumnsCampaigns.stopFollowUp && (
                                                            <ResizableHeader
                                                                width={columnWidths['campaignStopFollowUp'] || 185}
                                                                onResize={(w) => handleColumnResize('campaignStopFollowUp', w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group hover:bg-gray-100"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <span className="flex items-center whitespace-nowrap truncate" title="Stop Follow Up">
                                                                        Stop Follow Up
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === 'stopFollowUp' ? null : 'stopFollowUp');
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${stopFollowUpFilter ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === 'stopFollowUp' && (
                                                                    <ColumnFilterDropdown
                                                                        column="Stop Follow Up"
                                                                        type="boolean"
                                                                        booleanValue={stopFollowUpFilter}
                                                                        onBooleanChange={setStopFollowUpFilter}
                                                                        isOpen={true}
                                                                        onClose={() => setOpenColumnFilter(null)}
                                                                        position="right"
                                                                    />
                                                                )}
                                                            </ResizableHeader>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {campaignsData.length === 0 && (
                                                        <tr>
                                                            <td colSpan={99} className="px-4 py-6 text-left">
                                                                <p className="text-gray-500 text-sm mb-2">No campaigns found for the selected filters.</p>
                                                                <button onClick={resetFilters} className="px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors">Reset Filters</button>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {campaignsData.map((campaign, index) => (
                                                        <tr key={campaign.id || index} title="Double-click to edit" className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${selectedRowIds.has(campaign.id) ? 'bg-blue-50/60' : ''} hover:bg-blue-50/30 cursor-pointer transition-colors`} style={{ height: `${Math.max(28, getAdaptiveRowHeight(campaignsData.length))}px` }} onDoubleClick={() => { setEditModalTab('campaigns'); setEditModalRow(campaign); setShowEditModal(true); }}>
                                                            <td className="px-2 py-1 w-10" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedRowIds.has(campaign.id)} onChange={() => toggleRowSelection(campaign.id)} className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]" /></td>
                                                            {visibleColumnsCampaigns.profileName && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-900" title={campaign.profile_name || undefined}>{campaign.profile_name}</td>}
                                                            {visibleColumnsCampaigns.campaignName && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-900" title={campaign.campaign_name || undefined}>{campaign.campaign_name}</td>}
                                                            {visibleColumnsCampaigns.requestsPerDay && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500">{campaign.requests_per_day}</td>}
                                                            {visibleColumnsCampaigns.type && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={campaign.campaign_type || undefined}>{campaign.campaign_type}</td>}
                                                            {visibleColumnsCampaigns.content && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={campaign.campaign_content || undefined}>{campaign.campaign_content}</td>}
                                                            {visibleColumnsCampaigns.sector && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={campaign.campaign_sector || undefined}>{campaign.campaign_sector}</td>}
                                                            {visibleColumnsCampaigns.companyAttribute && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={campaign.campaign_company_attribute || undefined}>{campaign.campaign_company_attribute}</td>}
                                                            {visibleColumnsCampaigns.persona && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={campaign.campaign_persona || undefined}>{campaign.campaign_persona}</td>}
                                                            {visibleColumnsCampaigns.connectionRequest && (
                                                                <>
                                                                    <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={campaign.content?.[0]?.message_content || undefined}>
                                                                        {campaign.content?.[0]?.message_content ? (
                                                                            campaign.content[0].message_content
                                                                        ) : (
                                                                            <span className="text-gray-400">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500">
                                                                        {campaign.content?.[0]?.message_delay || 0}
                                                                    </td>
                                                                </>
                                                            )}
                                                            {visibleColumnsCampaigns.firstFollowUp && (
                                                                <>
                                                                    <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={campaign.content?.[1]?.message_content || undefined}>
                                                                        {campaign.content?.[1]?.message_content ? (
                                                                            campaign.content[1].message_content
                                                                        ) : (
                                                                            <span className="text-gray-400">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500">
                                                                        {campaign.content?.[1]?.message_delay !== undefined ? campaign.content[1].message_delay : <span className="text-gray-400">-</span>}
                                                                    </td>
                                                                </>
                                                            )}
                                                            {visibleColumnsCampaigns.secondFollowUp && (
                                                                <>
                                                                    <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={campaign.content?.[2]?.message_content || undefined}>
                                                                        {campaign.content?.[2]?.message_content ? (
                                                                            campaign.content[2].message_content
                                                                        ) : (
                                                                            <span className="text-gray-400">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500">
                                                                        {campaign.content?.[2]?.message_delay !== undefined ? campaign.content[2].message_delay : <span className="text-gray-400">-</span>}
                                                                    </td>
                                                                </>
                                                            )}
                                                            {visibleColumnsCampaigns.thirdFollowUp && (
                                                                <>
                                                                    <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={campaign.content?.[3]?.message_content || undefined}>
                                                                        {campaign.content?.[3]?.message_content ? (
                                                                            campaign.content[3].message_content
                                                                        ) : (
                                                                            <span className="text-gray-400">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500">
                                                                        {campaign.content?.[3]?.message_delay !== undefined ? campaign.content[3].message_delay : <span className="text-gray-400">-</span>}
                                                                    </td>
                                                                </>
                                                            )}
                                                            {visibleColumnsCampaigns.fourthFollowUp && (
                                                                <>
                                                                    <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500" title={campaign.content?.[4]?.message_content || undefined}>
                                                                        {campaign.content?.[4]?.message_content ? (
                                                                            campaign.content[4].message_content
                                                                        ) : (
                                                                            <span className="text-gray-400">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500">
                                                                        {campaign.content?.[4]?.message_delay !== undefined ? campaign.content[4].message_delay : <span className="text-gray-400">-</span>}
                                                                    </td>
                                                                </>
                                                            )}
                                                            {visibleColumnsCampaigns.startDate && <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-500">{campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : ''}</td>}
                                                            {visibleColumnsCampaigns.live && <td className="px-2 py-1 max-w-0 text-xs">{campaign.live ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span> : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">No</span>}</td>}
                                                            {visibleColumnsCampaigns.stopFollowUp && <td className="px-2 py-1 max-w-0 text-xs">{campaign.stop_follow_up ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span> : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">No</span>}</td>}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    </>
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500 text-sm">No campaigns found{selectedCustomers.length > 0 ? ' for the selected filters' : ''}.</p>
                                        {selectedCustomers.length === 0 && <p className="text-gray-400 text-xs mt-1">Select a customer and click <span className="font-medium text-gray-500">Apply</span> to load data.</p>}
                                        {selectedCustomers.length > 0 && <button onClick={resetFilters} className="mt-2 px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors">Reset Filters</button>}
                                    </div>
                                )}
                                {campaignsData.length > 0 && (
                                    <div className="mt-8">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            totalItems={campaignsTotal}
                                            itemsPerPage={pageSize}
                                            onNext={() => { paginationUserAction.current = true; setCurrentPage(Math.min(totalPages, currentPage + 1)); }}
                                            onPrev={() => { paginationUserAction.current = true; setCurrentPage(Math.max(1, currentPage - 1)); }}
                                            isCountLimited={false}
                                            isCountLoading={isCountLoading}
                                            currentItemsCount={campaignsData.length}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'blacklist' && (
                            <div>
                                {dataLoading ? (
                                    <div className="flex justify-center py-8">
                                        <ClipLoader size={24} color="#364570" />
                                    </div>
                                ) : (blacklistData.length > 0 || selectedCustomers.length > 0) ? (
                                    <>
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-700">Total Blacklist Entries:</span>
                                            <span className="text-xs font-semibold text-[#364570]">{isCountLoading ? <ClipLoader size={12} color="#364570" /> : blacklistTotal.toLocaleString()}</span>
                                            <span className="text-xs text-gray-400">· Page {currentPage} of {totalPages}</span>
                                        </div>
                                        {selectedRowIds.size > 0 && (
                                            <div className="mb-2 flex flex-col gap-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-medium text-blue-800">{selectedRowIds.size} selected</span>
                                                    <button onClick={() => setShowBulkEditModal(true)} className="px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors flex items-center gap-1.5"><FaEdit className="w-3 h-3" />Bulk Edit</button>
                                                    <button onClick={() => setSelectedRowIds(new Set())} className="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"><FaTimes className="w-3 h-3" />Clear Selection</button>
                                                </div>
                                                {isAllPageSelected() && getActiveTotalForTab() > selectedRowIds.size && (
                                                    <span className="text-xs text-blue-700">
                                                        All {getActiveDataForTab().length} on this page selected.{' '}
                                                        <button onClick={fetchAllFilteredIds} disabled={selectAllLoading} className="underline font-semibold hover:text-blue-900 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5 align-middle">
                                                            {selectAllLoading && <ClipLoader size={10} color="currentColor" />}
                                                            {selectAllLoading ? 'Selecting…' : `Select all ${Math.min(getActiveTotalForTab(), 50000).toLocaleString()} matching records`}
                                                        </button>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="bg-white shadow-md rounded-lg min-h-[calc(100vh-425px)] md:min-h-[calc(100vh-390px)] lg:min-h-[calc(100vh-370px)] max-h-[calc(100vh-425px)] md:max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-370px)] flex flex-col">
                                        <div ref={blacklistScrollRef} className="overflow-x-auto overflow-y-auto flex-1">
                                            <table className="divide-y divide-gray-200 table-fixed">
                                                <thead className="bg-gray-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-2 py-1 w-10 flex-shrink-0">
                                                            <input type="checkbox" checked={isAllPageSelected()} ref={(el) => { if (el) el.indeterminate = isSomePageSelected(); }} onChange={toggleSelectAllOnPage} className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]" />
                                                        </th>
                                                        <ResizableHeader
                                                            width={columnWidths['blacklistFieldTarget'] || 165}
                                                            onResize={(w) => handleColumnResize('blacklistFieldTarget', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="Field Target">Field Target</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenColumnFilter(openColumnFilter === 'fieldTarget' ? null : 'fieldTarget');
                                                                    }}
                                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                >
                                                                    <FaFilter className={`w-3 h-3 ${selectedFieldTargets.length > 0 || notEmptyFieldTarget || includeEmptyFieldTarget ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'fieldTarget' && (
                                                                <ColumnFilterDropdown
                                                                    column="Field Target"
                                                                    type="multiselect"
                                                                    options={fieldTargetOptions}
                                                                    selectedValues={selectedFieldTargets}
                                                                    onSelectedValuesChange={setSelectedFieldTargets}
                                                                    includeEmpty={includeEmptyFieldTarget}
                                                                    onIncludeEmptyChange={setIncludeEmptyFieldTarget}
                                                                    notEmpty={notEmptyFieldTarget}
                                                                    onNotEmptyChange={setNotEmptyFieldTarget}
                                                                    isOpen={openColumnFilter === 'fieldTarget'}
                                                                    onClose={() => setOpenColumnFilter(null)}
                                                                />
                                                            )}
                                                        </ResizableHeader>
                                                        <ResizableHeader
                                                            width={columnWidths['blacklistComparisonType'] || 195}
                                                            onResize={(w) => handleColumnResize('blacklistComparisonType', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="Comparison Type">Comparison Type</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenColumnFilter(openColumnFilter === 'comparisonType' ? null : 'comparisonType');
                                                                    }}
                                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                >
                                                                    <FaFilter className={`w-3 h-3 ${selectedComparisonTypes.length > 0 || notEmptyComparisonType || includeEmptyComparisonType ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'comparisonType' && (
                                                                <ColumnFilterDropdown
                                                                    column="Comparison Type"
                                                                    type="multiselect"
                                                                    options={comparisonTypeOptions}
                                                                    selectedValues={selectedComparisonTypes}
                                                                    onSelectedValuesChange={setSelectedComparisonTypes}
                                                                    includeEmpty={includeEmptyComparisonType}
                                                                    onIncludeEmptyChange={setIncludeEmptyComparisonType}
                                                                    notEmpty={notEmptyComparisonType}
                                                                    onNotEmptyChange={setNotEmptyComparisonType}
                                                                    isOpen={openColumnFilter === 'comparisonType'}
                                                                    onClose={() => setOpenColumnFilter(null)}
                                                                />
                                                            )}
                                                        </ResizableHeader>
                                                        <ResizableHeader
                                                            width={columnWidths['blacklistValue'] || 200}
                                                            onResize={(w) => handleColumnResize('blacklistValue', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <span className="truncate" title="Value">Value</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenColumnFilter(openColumnFilter === 'blacklistValue' ? null : 'blacklistValue');
                                                                    }}
                                                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                >
                                                                    <FaFilter className={`w-3 h-3 ${searchBlacklistValue ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'blacklistValue' && (
                                                                <ColumnFilterDropdown
                                                                    column="Value"
                                                                    type="text"
                                                                    searchValue={searchBlacklistValue}
                                                                    onSearchChange={setSearchBlacklistValue}
                                                                    excludeSearch={excludeFlags["BlacklistValue"]}
                                                                    onExcludeSearchChange={(v) => setExcludeFlags(f => ({ ...f, ["BlacklistValue"]: v }))}
                                                                    isOpen={openColumnFilter === 'blacklistValue'}
                                                                    onClose={() => setOpenColumnFilter(null)}
                                                                />
                                                            )}
                                                        </ResizableHeader>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {blacklistData.length === 0 && (
                                                        <tr>
                                                            <td colSpan={99} className="px-4 py-6 text-left">
                                                                <p className="text-gray-500 text-sm mb-2">No blacklist entries found for the selected filters.</p>
                                                                <button onClick={resetFilters} className="px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors">Reset Filters</button>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {blacklistData.map((entry, index) => (
                                                        <tr key={entry.id || index} title="Double-click to edit" className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${selectedRowIds.has(entry.id) ? 'bg-blue-50/60' : ''} hover:bg-blue-50/30 cursor-pointer transition-colors`} onDoubleClick={() => { setEditModalTab('blacklist'); setEditModalRow(entry); setShowEditModal(true); }}>
                                                            <td className="px-2 py-1 w-10" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedRowIds.has(entry.id)} onChange={() => toggleRowSelection(entry.id)} className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]" /></td>
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-900" title={entry.field_target || undefined}>
                                                                {entry.field_target || '-'}
                                                            </td>
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={entry.comparison_type || undefined}>
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                                    entry.comparison_type === 'exact' 
                                                                        ? 'bg-blue-100 text-blue-800' 
                                                                        : 'bg-purple-100 text-purple-800'
                                                                }`}>
                                                                    {entry.comparison_type || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-900" title={entry.value || undefined}>
                                                                {entry.value || '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    </>
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500 text-sm">No blacklist entries found{selectedCustomers.length > 0 ? ' for the selected customer' : ''}.</p>
                                        {selectedCustomers.length === 0 && <p className="text-gray-400 text-xs mt-1">Select a customer and click <span className="font-medium text-gray-500">Apply</span> to load data.</p>}
                                        {selectedCustomers.length > 0 && <button onClick={resetFilters} className="mt-2 px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors">Reset Filters</button>}
                                    </div>
                                )}
                                {blacklistData.length > 0 && (
                                    <div className="mt-8">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            totalItems={blacklistTotal}
                                            itemsPerPage={pageSize}
                                            onNext={() => { paginationUserAction.current = true; setCurrentPage(Math.min(totalPages, currentPage + 1)); }}
                                            onPrev={() => { paginationUserAction.current = true; setCurrentPage(Math.max(1, currentPage - 1)); }}
                                            isCountLimited={false}
                                            isCountLoading={isCountLoading}
                                            currentItemsCount={blacklistData.length}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'ai_analysis' && (
                            <div>
                                {dataLoading ? (
                                    <div className="flex justify-center py-8">
                                        <ClipLoader size={24} color="#364570" />
                                    </div>
                                ) : (aiAnalysisData.length > 0 || !!selectedAiPromptId) ? (
                                    <>
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-700">Total Analyses:</span>
                                            <span className="text-xs font-semibold text-[#364570]">{isCountLoading ? <ClipLoader size={12} color="#364570" /> : aiAnalysisTotal.toLocaleString()}</span>
                                            <span className="text-xs text-gray-400">· Page {currentPage} of {totalPages}</span>
                                        </div>
                                        {selectedRowIds.size > 0 && (
                                            <div className="mb-2 flex flex-col gap-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-medium text-blue-800">{selectedRowIds.size} selected</span>
                                                    <button
                                                        onClick={handleStartExport}
                                                        className="px-3 py-1 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors flex items-center gap-1.5"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        Export CSV
                                                    </button>
                                                    <button onClick={() => { setBulkAssignCustomerName(''); setShowBulkAssignCustomerModal(true); }} className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1.5"><FaUserPlus className="w-3 h-3" />Assign Customer</button>
                                                    <button onClick={handleAnalyzeSelectedFromAiTab} className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1.5">
                                                        <GiBrain className="w-3 h-3" />
                                                        AI Analysis
                                                    </button>
                                                    <button onClick={() => setShowAddToListModal(true)} title={`Add ${selectedRowIds.size} selected to a list`} className="px-3 py-1 text-xs font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center gap-1.5"><FaListUl className="w-3 h-3" />{selectedRowIds.size > 0 ? `Add to List (${selectedRowIds.size})` : 'Add to List'}</button>
                                                    <button onClick={() => setSelectedRowIds(new Set())} className="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"><FaTimes className="w-3 h-3" />Clear Selection</button>
                                                </div>
                                                {isAllPageSelected() && getActiveTotalForTab() > selectedRowIds.size && (
                                                    <span className="text-xs text-blue-700">
                                                        All {getActiveDataForTab().length} on this page selected.{' '}
                                                        <button onClick={fetchAllFilteredIds} disabled={selectAllLoading} className="underline font-semibold hover:text-blue-900 disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5 align-middle">
                                                            {selectAllLoading && <ClipLoader size={10} color="currentColor" />}
                                                            {selectAllLoading ? 'Selecting…' : `Select all ${Math.min(getActiveTotalForTab(), 50000).toLocaleString()} matching records`}
                                                        </button>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="bg-white shadow-md rounded-lg min-h-[calc(100vh-425px)] md:min-h-[calc(100vh-390px)] lg:min-h-[calc(100vh-370px)] max-h-[calc(100vh-425px)] md:max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-370px)] flex flex-col">
                                        <div ref={aiAnalysisScrollRef} className="overflow-x-auto overflow-y-auto flex-1">
                                            <table className="divide-y divide-gray-200 table-fixed">
                                                <thead className="bg-gray-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-2 py-1 w-10 flex-shrink-0">
                                                            <input type="checkbox" checked={isAllPageSelected()} ref={(el) => { if (el) el.indeterminate = isSomePageSelected(); }} onChange={toggleSelectAllOnPage} className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]" />
                                                        </th>
                                                        {visibleColumnsAiAnalysis.companyName && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanyName'] || 280}
                                                            onResize={(w) => handleColumnResize('aiCompanyName', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort('company_name')}>
                                                                    <span className="truncate">Company</span>
                                                                    <SortIndicator field="company_name" sortField={sortField} sortDirection={sortDirection} />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'aiCompanyName' ? null : 'aiCompanyName'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchAiCompanyName || includeEmptyAiCompanyName || notEmptyAiCompanyName ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'aiCompanyName' && (
                                                                <ColumnFilterDropdown column="Company" type="text" searchValue={searchAiCompanyName} onSearchChange={setSearchAiCompanyName} excludeSearch={excludeFlags["AiCompanyName"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["AiCompanyName"]: v }))} includeEmpty={includeEmptyAiCompanyName} onIncludeEmptyChange={setIncludeEmptyAiCompanyName} notEmpty={notEmptyAiCompanyName} onNotEmptyChange={setNotEmptyAiCompanyName} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.companyId && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanyId'] || 180}
                                                            onResize={(w) => handleColumnResize('aiCompanyId', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-1" onClick={() => handleSort('company_company_id')}>
                                                                <span className="truncate">Company ID</span>
                                                                <SortIndicator field="company_company_id" sortField={sortField} sortDirection={sortDirection} />
                                                            </div>
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.companyWebsite && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiWebsite'] || 220}
                                                            onResize={(w) => handleColumnResize('aiWebsite', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort('company_website')}>
                                                                    <span className="truncate">Website</span>
                                                                    <SortIndicator field="company_website" sortField={sortField} sortDirection={sortDirection} />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'aiCompanyWebsite' ? null : 'aiCompanyWebsite'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchAiCompanyWebsite || includeEmptyAiCompanyWebsite || notEmptyAiCompanyWebsite ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'aiCompanyWebsite' && (
                                                                <ColumnFilterDropdown column="Website" type="text" searchValue={searchAiCompanyWebsite} onSearchChange={setSearchAiCompanyWebsite} excludeSearch={excludeFlags["AiCompanyWebsite"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["AiCompanyWebsite"]: v }))} includeEmpty={includeEmptyAiCompanyWebsite} onIncludeEmptyChange={setIncludeEmptyAiCompanyWebsite} notEmpty={notEmptyAiCompanyWebsite} onNotEmptyChange={setNotEmptyAiCompanyWebsite} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.companyLinkedin && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanyLinkedin'] || 220}
                                                            onResize={(w) => handleColumnResize('aiCompanyLinkedin', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-1" onClick={() => handleSort('company_linkedin')}>
                                                                <span className="truncate">LinkedIn</span>
                                                                <SortIndicator field="company_linkedin" sortField={sortField} sortDirection={sortDirection} />
                                                            </div>
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.companyIndustry && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanyIndustry'] || 160}
                                                            onResize={(w) => handleColumnResize('aiCompanyIndustry', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort('company_industry')}>
                                                                    <span className="truncate">Industry</span>
                                                                    <SortIndicator field="company_industry" sortField={sortField} sortDirection={sortDirection} />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'aiCompanyIndustry' ? null : 'aiCompanyIndustry'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchAiCompanyIndustry || includeEmptyAiCompanyIndustry || notEmptyAiCompanyIndustry ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'aiCompanyIndustry' && (
                                                                <ColumnFilterDropdown column="Industry" type="text" searchValue={searchAiCompanyIndustry} onSearchChange={setSearchAiCompanyIndustry} excludeSearch={excludeFlags["AiCompanyIndustry"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["AiCompanyIndustry"]: v }))} includeEmpty={includeEmptyAiCompanyIndustry} onIncludeEmptyChange={setIncludeEmptyAiCompanyIndustry} notEmpty={notEmptyAiCompanyIndustry} onNotEmptyChange={setNotEmptyAiCompanyIndustry} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.companyCountry && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanyCountry'] || 140}
                                                            onResize={(w) => handleColumnResize('aiCompanyCountry', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort('company_country')}>
                                                                    <span className="truncate">Country</span>
                                                                    <SortIndicator field="company_country" sortField={sortField} sortDirection={sortDirection} />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'aiCompanyCountry' ? null : 'aiCompanyCountry'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchAiCompanyCountry || includeEmptyAiCompanyCountry || notEmptyAiCompanyCountry ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'aiCompanyCountry' && (
                                                                <ColumnFilterDropdown column="Country" type="text" searchValue={searchAiCompanyCountry} onSearchChange={setSearchAiCompanyCountry} excludeSearch={excludeFlags["AiCompanyCountry"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["AiCompanyCountry"]: v }))} includeEmpty={includeEmptyAiCompanyCountry} onIncludeEmptyChange={setIncludeEmptyAiCompanyCountry} notEmpty={notEmptyAiCompanyCountry} onNotEmptyChange={setNotEmptyAiCompanyCountry} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.companyCity && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanyCity'] || 130}
                                                            onResize={(w) => handleColumnResize('aiCompanyCity', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort('company_city')}>
                                                                    <span className="truncate">City</span>
                                                                    <SortIndicator field="company_city" sortField={sortField} sortDirection={sortDirection} />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'aiCompanyCity' ? null : 'aiCompanyCity'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchAiCompanyCity || includeEmptyAiCompanyCity || notEmptyAiCompanyCity ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'aiCompanyCity' && (
                                                                <ColumnFilterDropdown column="City" type="text" searchValue={searchAiCompanyCity} onSearchChange={setSearchAiCompanyCity} excludeSearch={excludeFlags["AiCompanyCity"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["AiCompanyCity"]: v }))} includeEmpty={includeEmptyAiCompanyCity} onIncludeEmptyChange={setIncludeEmptyAiCompanyCity} notEmpty={notEmptyAiCompanyCity} onNotEmptyChange={setNotEmptyAiCompanyCity} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.companySizeRange && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanySizeRange'] || 130}
                                                            onResize={(w) => handleColumnResize('aiCompanySizeRange', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort('company_size_range')}>
                                                                    <span className="truncate">Size Range</span>
                                                                    <SortIndicator field="company_size_range" sortField={sortField} sortDirection={sortDirection} />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'aiCompanySizeRange' ? null : 'aiCompanySizeRange'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchAiCompanySizeRange || includeEmptyAiCompanySizeRange || notEmptyAiCompanySizeRange ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'aiCompanySizeRange' && (
                                                                <ColumnFilterDropdown column="Size Range" type="text" searchValue={searchAiCompanySizeRange} onSearchChange={setSearchAiCompanySizeRange} excludeSearch={excludeFlags["AiCompanySizeRange"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["AiCompanySizeRange"]: v }))} includeEmpty={includeEmptyAiCompanySizeRange} onIncludeEmptyChange={setIncludeEmptyAiCompanySizeRange} notEmpty={notEmptyAiCompanySizeRange} onNotEmptyChange={setNotEmptyAiCompanySizeRange} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.description && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanyDescription'] || 150}
                                                            onResize={(w) => handleColumnResize('aiCompanyDescription', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort('company_description')}>
                                                                    <span className="truncate">Description</span>
                                                                    <SortIndicator field="company_description" sortField={sortField} sortDirection={sortDirection} />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'aiCompanyDescription' ? null : 'aiCompanyDescription'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchAiCompanyDescription || includeEmptyAiCompanyDescription || notEmptyAiCompanyDescription ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'aiCompanyDescription' && (
                                                                <ColumnFilterDropdown column="Description" type="text" searchValue={searchAiCompanyDescription} onSearchChange={setSearchAiCompanyDescription} excludeSearch={excludeFlags["AiCompanyDescription"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["AiCompanyDescription"]: v }))} includeEmpty={includeEmptyAiCompanyDescription} onIncludeEmptyChange={setIncludeEmptyAiCompanyDescription} notEmpty={notEmptyAiCompanyDescription} onNotEmptyChange={setNotEmptyAiCompanyDescription} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.size && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanySize'] || 100}
                                                            onResize={(w) => handleColumnResize('aiCompanySize', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort('company_size')}>
                                                                    <span className="truncate">Size</span>
                                                                    <SortIndicator field="company_size" sortField={sortField} sortDirection={sortDirection} />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'aiCompanySize' ? null : 'aiCompanySize'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${minAiCompanySize || maxAiCompanySize ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'aiCompanySize' && (
                                                                <ColumnFilterDropdown column="Size" type="range" minValue={minAiCompanySize} maxValue={maxAiCompanySize} onMinChange={setMinAiCompanySize} onMaxChange={setMaxAiCompanySize} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.provincie && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanyProvincie'] || 120}
                                                            onResize={(w) => handleColumnResize('aiCompanyProvincie', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort('company_provincie')}>
                                                                    <span className="truncate">Province</span>
                                                                    <SortIndicator field="company_provincie" sortField={sortField} sortDirection={sortDirection} />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'aiCompanyProvincie' ? null : 'aiCompanyProvincie'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${selectedAiCompanyProvincies.length > 0 || includeEmptyAiCompanyProvincie || notEmptyAiCompanyProvincie ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'aiCompanyProvincie' && (
                                                                <ColumnFilterDropdown column="Province" type="multiselect" options={provincieOptions} selectedValues={selectedAiCompanyProvincies} onSelectedValuesChange={setSelectedAiCompanyProvincies} includeEmpty={includeEmptyAiCompanyProvincie} onIncludeEmptyChange={setIncludeEmptyAiCompanyProvincie} notEmpty={notEmptyAiCompanyProvincie} onNotEmptyChange={setNotEmptyAiCompanyProvincie} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.businessType && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanyBusinessType'] || 130}
                                                            onResize={(w) => handleColumnResize('aiCompanyBusinessType', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort('company_business_type')}>
                                                                    <span className="truncate">Business Type</span>
                                                                    <SortIndicator field="company_business_type" sortField={sortField} sortDirection={sortDirection} />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'aiCompanyBusinessType' ? null : 'aiCompanyBusinessType'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${selectedAiCompanyBusinessTypes.length > 0 || includeEmptyAiCompanyBusinessType || notEmptyAiCompanyBusinessType ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'aiCompanyBusinessType' && (
                                                                <ColumnFilterDropdown column="Business Type" type="multiselect" options={businessTypeOptions} selectedValues={selectedAiCompanyBusinessTypes} onSelectedValuesChange={setSelectedAiCompanyBusinessTypes} includeEmpty={includeEmptyAiCompanyBusinessType} onIncludeEmptyChange={setIncludeEmptyAiCompanyBusinessType} notEmpty={notEmptyAiCompanyBusinessType} onNotEmptyChange={setNotEmptyAiCompanyBusinessType} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.offeringType && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanyOfferingType'] || 130}
                                                            onResize={(w) => handleColumnResize('aiCompanyOfferingType', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort('company_offering_type')}>
                                                                    <span className="truncate">Offering Type</span>
                                                                    <SortIndicator field="company_offering_type" sortField={sortField} sortDirection={sortDirection} />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'aiCompanyOfferingType' ? null : 'aiCompanyOfferingType'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${searchAiCompanyOfferingType || includeEmptyAiCompanyOfferingType || notEmptyAiCompanyOfferingType ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'aiCompanyOfferingType' && (
                                                                <ColumnFilterDropdown column="Offering Type" type="text" searchValue={searchAiCompanyOfferingType} onSearchChange={setSearchAiCompanyOfferingType} excludeSearch={excludeFlags["AiCompanyOfferingType"]} onExcludeSearchChange={(v) => setExcludeFlags(ff => ({ ...ff, ["AiCompanyOfferingType"]: v }))} includeEmpty={includeEmptyAiCompanyOfferingType} onIncludeEmptyChange={setIncludeEmptyAiCompanyOfferingType} notEmpty={notEmptyAiCompanyOfferingType} onNotEmptyChange={setNotEmptyAiCompanyOfferingType} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.companyType && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCompanyType'] || 120}
                                                            onResize={(w) => handleColumnResize('aiCompanyType', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                                                <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort('company_type')}>
                                                                    <span className="truncate">Company Type</span>
                                                                    <SortIndicator field="company_type" sortField={sortField} sortDirection={sortDirection} />
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); setOpenColumnFilter(openColumnFilter === 'aiCompanyType' ? null : 'aiCompanyType'); }} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown">
                                                                    <FaFilter className={`w-3 h-3 ${selectedAiCompanyTypes.length > 0 || includeEmptyAiCompanyType || notEmptyAiCompanyType ? 'text-blue-600' : 'text-gray-400'}`} />
                                                                </button>
                                                            </div>
                                                            {openColumnFilter === 'aiCompanyType' && (
                                                                <ColumnFilterDropdown column="Company Type" type="multiselect" options={[{value:'Customer',label:'Customer'},{value:'Prospect',label:'Prospect'}]} selectedValues={selectedAiCompanyTypes} onSelectedValuesChange={setSelectedAiCompanyTypes} includeEmpty={includeEmptyAiCompanyType} onIncludeEmptyChange={setIncludeEmptyAiCompanyType} notEmpty={notEmptyAiCompanyType} onNotEmptyChange={setNotEmptyAiCompanyType} isOpen={true} onClose={() => setOpenColumnFilter(null)} />
                                                            )}
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.analysisStatus && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiStatus'] || 120}
                                                            onResize={(w) => handleColumnResize('aiStatus', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-1" onClick={() => handleSort('analysis_status')}>
                                                                <span className="truncate">Status</span>
                                                                <SortIndicator field="analysis_status" sortField={sortField} sortDirection={sortDirection} />
                                                            </div>
                                                        </ResizableHeader>
                                                        )}
                                                        {/* Dynamic analysis_data columns */}
                                                        {analysisFields.map(field => (
                                                            <ResizableHeader
                                                                key={field}
                                                                width={columnWidths[`ai_${field}`] || 150}
                                                                onResize={(w) => handleColumnResize(`ai_${field}`, w)}
                                                                className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                            >
                                                                <div className="flex items-center justify-between gap-1 min-w-0">
                                                                    <div className="flex items-center gap-1 min-w-0" onClick={() => handleSort(field)}>
                                                                        <span className="truncate">{formatFieldLabel(field)}</span>
                                                                        <SortIndicator field={field} sortField={sortField} sortDirection={sortDirection} />
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setOpenColumnFilter(openColumnFilter === `ai_${field}` ? null : `ai_${field}`);
                                                                        }}
                                                                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded column-filter-dropdown"
                                                                    >
                                                                        <FaFilter className={`w-3 h-3 ${
                                                                            aiDataFilters[field] || aiDataIncludeEmpty[field] || aiDataNotEmpty[field] || aiExclude[field] ||
                                                                            (aiFieldOptions[field] && (aiDataMultiSelectFilters[field] || []).length > 0)
                                                                                ? 'text-blue-600' : 'text-gray-400'
                                                                        }`} />
                                                                    </button>
                                                                </div>
                                                                {openColumnFilter === `ai_${field}` && (
                                                                    aiFieldOptions[field] ? (
                                                                        <ColumnFilterDropdown
                                                                            column={formatFieldLabel(field)}
                                                                            type="multiselect"
                                                                            options={aiFieldOptions[field]}
                                                                            selectedValues={aiDataMultiSelectFilters[field] || []}
                                                                            onSelectedValuesChange={(vals) => setAiDataMultiSelectFilters(prev => ({ ...prev, [field]: vals }))}
                                                                            searchValue={aiDataFilters[field] || ''}
                                                                            onSearchChange={(val) => setAiDataFilters(prev => ({ ...prev, [field]: val }))}
                                                                            excludeSearch={aiExclude[field] || false}
                                                                            onExcludeSearchChange={(v) => setAiExclude(prev => ({ ...prev, [field]: v }))}
                                                                            isOpen={true}
                                                                            onClose={() => setOpenColumnFilter(null)}
                                                                        />
                                                                    ) : (
                                                                        <ColumnFilterDropdown
                                                                            column={formatFieldLabel(field)}
                                                                            type="text"
                                                                            searchValue={aiDataFilters[field] || ''}
                                                                            onSearchChange={(val) => setAiDataFilters(prev => ({ ...prev, [field]: val }))}
                                                                            excludeSearch={aiExclude[field] || false}
                                                                            onExcludeSearchChange={(v) => setAiExclude(prev => ({ ...prev, [field]: v }))}
                                                                            includeEmpty={aiDataIncludeEmpty[field] || false}
                                                                            onIncludeEmptyChange={(val) => setAiDataIncludeEmpty(prev => ({ ...prev, [field]: val }))}
                                                                            notEmpty={aiDataNotEmpty[field] || false}
                                                                            onNotEmptyChange={(val) => setAiDataNotEmpty(prev => ({ ...prev, [field]: val }))}
                                                                            isOpen={true}
                                                                            onClose={() => setOpenColumnFilter(null)}
                                                                        />
                                                                    )
                                                                )}
                                                            </ResizableHeader>
                                                        ))}
                                                        {visibleColumnsAiAnalysis.modelId && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiModelId'] || 140}
                                                            onResize={(w) => handleColumnResize('aiModelId', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-1" onClick={() => handleSort('model_id')}>
                                                                <span className="truncate">Model</span>
                                                                <SortIndicator field="model_id" sortField={sortField} sortDirection={sortDirection} />
                                                            </div>
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.promptVersion && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiPromptVersion'] || 100}
                                                            onResize={(w) => handleColumnResize('aiPromptVersion', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                        >
                                                            <span className="truncate">Prompt Ver.</span>
                                                        </ResizableHeader>
                                                        )}
                                                        {visibleColumnsAiAnalysis.createdAt && (
                                                        <ResizableHeader
                                                            width={columnWidths['aiCreatedAt'] || 150}
                                                            onResize={(w) => handleColumnResize('aiCreatedAt', w)}
                                                            className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-1" onClick={() => handleSort('created_at')}>
                                                                <span className="truncate">Created At</span>
                                                                <SortIndicator field="created_at" sortField={sortField} sortDirection={sortDirection} />
                                                            </div>
                                                        </ResizableHeader>
                                                        )}
                                                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                                            JSON
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {aiAnalysisData.length === 0 && (
                                                        <tr>
                                                            <td colSpan={99} className="px-4 py-6 text-left">
                                                                <p className="text-gray-500 text-sm">No analyses found for the selected prompt.</p>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {aiAnalysisData.map((row, index) => (
                                                        <tr key={row.id || index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${selectedRowIds.has(row.id) ? 'bg-blue-50/60' : ''} hover:bg-blue-50/30 transition-colors`}>
                                                            <td className="px-2 py-1 w-10" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedRowIds.has(row.id)} onChange={() => toggleRowSelection(row.id)} className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]" /></td>
                                                            {visibleColumnsAiAnalysis.companyName && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-900" title={row.company_name || undefined}>
                                                                {row.company_name || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.companyId && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.company_company_id || undefined}>
                                                                {row.company_company_id || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.companyWebsite && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.company_website || undefined}>
                                                                {row.company_website ? (
                                                                    <a href={row.company_website.startsWith('http') ? row.company_website : `https://${row.company_website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                        {row.company_website}
                                                                    </a>
                                                                ) : '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.companyLinkedin && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.company_linkedin || undefined}>
                                                                {row.company_linkedin ? (
                                                                    <a href={row.company_linkedin.startsWith('http') ? row.company_linkedin : `https://${row.company_linkedin}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                        {row.company_linkedin}
                                                                    </a>
                                                                ) : '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.companyIndustry && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.company_industry || undefined}>
                                                                {row.company_industry || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.companyCountry && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.company_country || undefined}>
                                                                {row.company_country || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.companyCity && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.company_city || undefined}>
                                                                {row.company_city || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.companySizeRange && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.company_size_range || undefined}>
                                                                {row.company_size_range || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.description && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.company_description || undefined}>
                                                                {row.company_description || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.size && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700">
                                                                {row.company_size ?? '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.provincie && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.company_provincie || undefined}>
                                                                {row.company_provincie || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.businessType && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.company_business_type || undefined}>
                                                                {row.company_business_type || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.offeringType && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.company_offering_type || undefined}>
                                                                {row.company_offering_type || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.companyType && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.company_type || undefined}>
                                                                {row.company_type || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.analysisStatus && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                                    row.analysis_status === 'success' ? 'bg-green-100 text-green-800'
                                                                    : row.analysis_status === 'failed' ? 'bg-red-100 text-red-800'
                                                                    : row.analysis_status === 'running' ? 'bg-yellow-100 text-yellow-800'
                                                                    : row.analysis_status === 'queued' ? 'bg-gray-100 text-gray-800'
                                                                    : 'bg-orange-100 text-orange-800'
                                                                }`}>
                                                                    {row.analysis_status || '-'}
                                                                </span>
                                                            </td>
                                                            )}
                                                            {/* Dynamic analysis_data cells */}
                                                            {analysisFields.map(field => (
                                                                <td key={field} className="px-2 py-1 max-w-0 truncate text-xs text-gray-900" title={typeof row[field] === 'string' ? row[field] : row[field] != null ? JSON.stringify(row[field]) : undefined}>
                                                                    {renderFieldValue(row[field])}
                                                                </td>
                                                            ))}
                                                            {visibleColumnsAiAnalysis.modelId && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.model_id || undefined}>
                                                                {row.model_id || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.promptVersion && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700">
                                                                {row.prompt_version || '-'}
                                                            </td>
                                                            )}
                                                            {visibleColumnsAiAnalysis.createdAt && (
                                                            <td className="px-2 py-1 max-w-0 truncate text-xs text-gray-700" title={row.created_at || undefined}>
                                                                {row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'}
                                                            </td>
                                                            )}
                                                            <td className="px-2 py-1 text-xs">
                                                                {row.analysis_data ? (
                                                                    <button
                                                                        onClick={() => { setSelectedAnalysisRow(row); setShowAnalysisDetailModal(true); }}
                                                                        className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                                                                    >
                                                                        View
                                                                    </button>
                                                                ) : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    </>
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500 text-sm">
                                            {selectedAiPromptId
                                                ? 'No analyses found for the selected prompt.'
                                                : 'Select an AI Prompt and click Apply to load analysis data.'}
                                        </p>
                                    </div>
                                )}
                                {aiAnalysisData.length > 0 && (
                                    <div className="mt-8">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            totalItems={aiAnalysisTotal}
                                            itemsPerPage={pageSize}
                                            onNext={() => { paginationUserAction.current = true; setCurrentPage(Math.min(totalPages, currentPage + 1)); }}
                                            onPrev={() => { paginationUserAction.current = true; setCurrentPage(Math.max(1, currentPage - 1)); }}
                                            isCountLimited={false}
                                            isCountLoading={isCountLoading}
                                            currentItemsCount={aiAnalysisData.length}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'actions' && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Actions</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                                {/* Run Daily Task card */}
                                <div className="border border-gray-200 rounded-lg bg-white shadow-sm p-5">
                                    <div className="mb-3">
                                        <h4 className="text-sm font-semibold text-gray-900">Run Daily Task</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">Manually trigger task creation for a specific customer. Useful when things have changed after the nightly run.</p>
                                    </div>
                                    <div className="flex items-end gap-3 mb-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
                                            <select
                                                value={actionCustomerName}
                                                onChange={e => { setActionCustomerName(e.target.value); setDailyTaskResult(null); }}
                                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#364570]"
                                            >
                                                <option value="">— Select a customer —</option>
                                                {customers.map(c => (
                                                    <option key={c.value} value={c.label}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            disabled={!actionCustomerName || dailyTaskRunning}
                                            onClick={async () => {
                                                if (!user || !actionCustomerName) return;
                                                const backendUrl = getBackendUrl();
                                                const token = getCookie('token');
                                                if (!token) { toast.error('Authentication token not found'); return; }
                                                setDailyTaskRunning(true);
                                                setDailyTaskResult(null);
                                                try {
                                                    const res = await fetch(`${backendUrl}/api/master-database/run-daily-task`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                        body: JSON.stringify({ userUuid: user.uuid, customerName: actionCustomerName }),
                                                        signal: AbortSignal.timeout(5 * 60 * 1000),
                                                    });
                                                    const json = await res.json();
                                                    if (!res.ok) throw new Error(json?.error?.message || `Status ${res.status}`);
                                                    setDailyTaskResult(json);
                                                    toast.success('Daily task completed');
                                                } catch (err: any) {
                                                    toast.error(err?.message || 'Failed to run daily task');
                                                } finally {
                                                    setDailyTaskRunning(false);
                                                }
                                            }}
                                            className="px-4 py-1.5 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                                        >
                                            {dailyTaskRunning ? <><ClipLoader size={12} color="#fff" /> Running…</> : 'Run Daily Task'}
                                        </button>
                                    </div>
                                    {dailyTaskResult && (
                                        <div className={`rounded-lg p-4 border ${
                                            dailyTaskResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                        }`}>
                                            <p className="text-xs font-semibold text-gray-800 mb-2">Result — {dailyTaskResult.customerName ?? 'All customers'}</p>
                                            {dailyTaskResult.applicable === false ? (
                                                <p className="text-xs text-gray-500">No applicable profiles found for this customer today.</p>
                                            ) : dailyTaskResult.message ? (
                                                <p className="text-xs text-gray-700">{dailyTaskResult.message}</p>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-4 mb-2">
                                                        <div className="text-center">
                                                            <p className="text-lg font-bold text-[#364570]">{dailyTaskResult.tasksCreated ?? 0}</p>
                                                            <p className="text-xs text-gray-500">Tasks created</p>
                                                        </div>
                                                        <div className="text-gray-300 text-xl">/</div>
                                                        <div className="text-center">
                                                            <p className="text-lg font-bold text-gray-700">{dailyTaskResult.tasksPossible ?? 0}</p>
                                                            <p className="text-xs text-gray-500">Tasks possible</p>
                                                        </div>
                                                    </div>
                                                    {dailyTaskResult.reasons && Object.keys(dailyTaskResult.reasons).length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-700 mb-1">Shortfall reasons:</p>
                                                            <ul className="space-y-0.5">
                                                                {Object.entries(dailyTaskResult.reasons).map(([reason, count]) => (
                                                                    <li key={reason} className="flex items-center justify-between text-xs text-gray-600">
                                                                        <span className="font-mono">{reason.replace(/_/g, ' ')}</span>
                                                                        <span className="font-semibold ml-4">{count as number}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Run Content Update card */}
                                <div className="border border-gray-200 rounded-lg bg-white shadow-sm p-5">
                                    <div className="mb-3">
                                        <h4 className="text-sm font-semibold text-gray-900">Run Content Update</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">Update task content for all profiles of a customer to match the latest campaign messages. Useful after campaign content changes.</p>
                                    </div>
                                    <div className="flex items-end gap-3 mb-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
                                            <select
                                                value={contentUpdateCustomerName}
                                                onChange={e => { setContentUpdateCustomerName(e.target.value); setContentUpdateResult(null); }}
                                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#364570]"
                                            >
                                                <option value="">— Select a customer —</option>
                                                {customers.map(c => (
                                                    <option key={c.value} value={c.label}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            disabled={!contentUpdateCustomerName || contentUpdateRunning}
                                            onClick={async () => {
                                                if (!user || !contentUpdateCustomerName) return;
                                                const backendUrl = getBackendUrl();
                                                const token = getCookie('token');
                                                if (!token) { toast.error('Authentication token not found'); return; }
                                                setContentUpdateRunning(true);
                                                setContentUpdateResult(null);
                                                try {
                                                    const res = await fetch(`${backendUrl}/api/master-database/run-content-update`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                        body: JSON.stringify({ userUuid: user.uuid, customerName: contentUpdateCustomerName }),
                                                        signal: AbortSignal.timeout(10 * 60 * 1000),
                                                    });
                                                    const json = await res.json();
                                                    if (!res.ok) throw new Error(json?.error?.message || `Status ${res.status}`);
                                                    setContentUpdateResult(json);
                                                    toast.success('Content update completed');
                                                } catch (err: any) {
                                                    toast.error(err?.message || 'Failed to run content update');
                                                } finally {
                                                    setContentUpdateRunning(false);
                                                }
                                            }}
                                            className="px-4 py-1.5 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                                        >
                                            {contentUpdateRunning ? <><ClipLoader size={12} color="#fff" /> Running…</> : 'Run Content Update'}
                                        </button>
                                    </div>
                                    {contentUpdateResult && (
                                        <div className={`rounded-lg p-4 border ${
                                            contentUpdateResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                        }`}>
                                            <p className="text-xs font-semibold text-gray-800 mb-2">Result — {contentUpdateResult.customerName}</p>
                                            {contentUpdateResult.error ? (
                                                <p className="text-xs text-red-700">{contentUpdateResult.error}</p>
                                            ) : (
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-[#364570]">{contentUpdateResult.totalContentUpdates ?? 0}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">Content updates applied</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'exports' && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900">Export Jobs</h3>
                                </div>

                                {exportJobsLoading && exportJobs.length === 0 ? (
                                    <div className="flex justify-center py-8">
                                        <ClipLoader size={24} color="#364570" />
                                    </div>
                                ) : exportJobs.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500 text-sm">No exports yet. Select an AI Prompt on the AI Analysis tab, then click &quot;+ New Export&quot; to start a background export.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {exportJobs.map((job) => (
                                            <div key={job.exportId} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-medium text-gray-900 truncate">{job.promptName || 'Export'}</span>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                                job.status === 'completed' ? 'bg-green-100 text-green-800'
                                                                : job.status === 'failed' ? 'bg-red-100 text-red-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                                {job.status === 'processing' ? 'Processing' : job.status === 'completed' ? 'Completed' : job.status === 'failed' ? 'Failed' : job.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                                            <span>Started: {new Date(job.createdAt).toLocaleString()}</span>
                                                            {job.totalRows > 0 && (
                                                                <span>{job.processedRows.toLocaleString()} / {job.totalRows.toLocaleString()} rows</span>
                                                            )}
                                                        </div>
                                                        {job.error && (
                                                            <p className="text-xs text-red-600 mt-1">{job.error}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                                        {job.status === 'completed' && (
                                                            <button
                                                                onClick={() => handleDownloadExport(job.exportId)}
                                                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                                                            >
                                                                Download
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteExport(job.exportId)}
                                                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                                {job.status === 'processing' && (
                                                    <div className="mt-2">
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-[#364570] h-2 rounded-full transition-all duration-500"
                                                                style={{ width: `${Math.min(100, job.progress)}%` }}
                                                            />
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(job.progress)}%</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Analysis Data Detail Modal */}
            {showAnalysisDetailModal && selectedAnalysisRow && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-sm font-semibold text-gray-900">
                                Analysis Data — {selectedAnalysisRow.company_name || 'Unknown Company'}
                            </h3>
                            <button onClick={() => setShowAnalysisDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                {typeof selectedAnalysisRow.analysis_data === 'string'
                                    ? selectedAnalysisRow.analysis_data
                                    : JSON.stringify(selectedAnalysisRow.analysis_data, null, 2)}
                            </pre>
                        </div>
                        <div className="p-4 border-t flex justify-end">
                            <button onClick={() => setShowAnalysisDetailModal(false)} className="px-4 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Analysis Field Selection Modal */}
            {aiFieldModalTarget !== null && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-sm font-semibold text-gray-900">Select AI Output Fields</h3>
                            <button onClick={handleAiFieldModalCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                        </div>
                        <div className="p-4">
                            <p className="text-xs text-gray-500 mb-3">
                                Check all the output fields you want to fetch for these prospects.
                            </p>
                            {pendingAiFields.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">No fields available for this prompt.</p>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 mb-3">
                                        <button
                                            onClick={() => setPendingAiSelectedFields([...pendingAiFields])}
                                            className="text-xs text-amber-600 hover:underline"
                                        >
                                            Select all
                                        </button>
                                        <span className="text-gray-300">|</span>
                                        <button
                                            onClick={() => setPendingAiSelectedFields([])}
                                            className="text-xs text-amber-600 hover:underline"
                                        >
                                            Deselect all
                                        </button>
                                        <span className="ml-auto text-xs text-gray-400">{pendingAiSelectedFields.length} / {pendingAiFields.length} selected</span>
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                        {pendingAiFields.map(field => (
                                            <label key={field} className="flex items-center gap-2.5 cursor-pointer hover:bg-amber-50 px-2 py-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={pendingAiSelectedFields.includes(field)}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setPendingAiSelectedFields(prev => [...prev, field]);
                                                        } else {
                                                            setPendingAiSelectedFields(prev => prev.filter(f => f !== field));
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                                />
                                                <span className="text-xs text-gray-700 capitalize">{field.replace(/_/g, ' ')}</span>
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-4 border-t flex items-center justify-end gap-2">
                            <button
                                onClick={handleAiFieldModalCancel}
                                className="px-4 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAiFieldModalFetch}
                                disabled={pendingAiSelectedFields.length === 0}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    pendingAiSelectedFields.length > 0
                                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                Fetch{pendingAiSelectedFields.length > 0 ? ` (${pendingAiSelectedFields.length} field${pendingAiSelectedFields.length !== 1 ? 's' : ''})` : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Prospects Confirmation Modal */}
            {showDeleteProspectsConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Delete Unknown Prospects</h3>
                        <p className="text-sm text-gray-600 mb-1">
                            {selectedRowIds.size > 0
                                ? <>This will permanently delete <span className="font-semibold text-gray-900">{selectedRowIds.size.toLocaleString()}</span> selected prospect(s) with status <span className="font-semibold text-red-700">Unknown</span>.</>
                                : <>This will permanently delete <span className="font-semibold text-gray-900">{prospectsTotal.toLocaleString()}</span> prospect(s) with status <span className="font-semibold text-red-700">Unknown</span> matching the current filters.</>
                            }
                        </p>
                        <p className="text-xs text-red-600 mb-5">This action cannot be undone.</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowDeleteProspectsConfirm(false)}
                                disabled={deleteProspectsLoading}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteProspects}
                                disabled={deleteProspectsLoading}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleteProspectsLoading ? 'Deleting…' : `Delete ${selectedRowIds.size > 0 ? selectedRowIds.size.toLocaleString() : prospectsTotal.toLocaleString()} Prospect(s)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Prompt Management Modal */}
            {showPromptModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-sm font-semibold text-gray-900">
                                {promptModalMode === 'create' ? 'Create New Prompt' : promptModalMode === 'edit' ? 'Edit Prompt' : 'Manage AI Prompts'}
                            </h3>
                            <button onClick={() => { setShowPromptModal(false); setEditingPrompt(null); setPromptModalMode('view'); }} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            {promptModalMode === 'view' && (
                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                placeholder="Search prompts..."
                                                value={promptSearchTerm}
                                                onChange={(e) => setPromptSearchTerm(e.target.value)}
                                                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 pr-7"
                                            />
                                            {promptSearchTerm && (
                                                <button onClick={() => setPromptSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">×</button>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => { setPromptModalMode('create'); setEditingPrompt({ prompt_name: '', prompt_description: '', prompt_text: '', version: '', active: true, allow_without_website: false, output_structure: '' }); }}
                                            className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors whitespace-nowrap"
                                        >
                                            + New Prompt
                                        </button>
                                    </div>
                                    {allAiPrompts.length === 0 ? (
                                        <p className="text-gray-500 text-sm text-center py-4">No prompts found.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {allAiPrompts.filter(prompt => {
                                                if (!promptSearchTerm.trim()) return true;
                                                const term = promptSearchTerm.toLowerCase();
                                                return (prompt.prompt_name || '').toLowerCase().includes(term)
                                                    || (prompt.prompt_description || '').toLowerCase().includes(term)
                                                    || (prompt.version || '').toLowerCase().includes(term);
                                            }).map(prompt => (
                                                <div key={prompt.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-gray-900">{prompt.prompt_name}</span>
                                                            <span className="text-xs text-gray-500">v{prompt.version}</span>
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${prompt.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                                {prompt.active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => { const edited = { ...prompt, output_structure: prompt.output_structure ? (typeof prompt.output_structure === 'string' ? prompt.output_structure : JSON.stringify(prompt.output_structure, null, 2)) : '' }; setEditingPrompt(edited); originalPromptRef.current = { ...edited }; setPromptModalMode('edit'); }}
                                                            className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                    {prompt.prompt_description && (
                                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{prompt.prompt_description}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {(promptModalMode === 'edit' || promptModalMode === 'create') && editingPrompt && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Prompt Name *</label>
                                        <input
                                            type="text"
                                            value={editingPrompt.prompt_name || ''}
                                            onChange={(e) => setEditingPrompt({ ...editingPrompt, prompt_name: e.target.value })}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            value={editingPrompt.prompt_description || ''}
                                            onChange={(e) => setEditingPrompt({ ...editingPrompt, prompt_description: e.target.value })}
                                            rows={2}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Prompt Text</label>
                                        <textarea
                                            value={editingPrompt.prompt_text || ''}
                                            onChange={(e) => setEditingPrompt({ ...editingPrompt, prompt_text: e.target.value })}
                                            rows={10}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Version</label>
                                            <input
                                                type="text"
                                                value={editingPrompt.version || ''}
                                                onChange={(e) => setEditingPrompt({ ...editingPrompt, version: e.target.value })}
                                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="flex items-center pt-4">
                                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingPrompt.active ?? true}
                                                    onChange={(e) => setEditingPrompt({ ...editingPrompt, active: e.target.checked })}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]"
                                                />
                                                Active
                                            </label>
                                        </div>
                                        <div className="flex items-center pt-4">
                                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingPrompt.allow_without_website ?? false}
                                                    onChange={(e) => setEditingPrompt({ ...editingPrompt, allow_without_website: e.target.checked })}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#364570] focus:ring-[#364570]"
                                                />
                                                Allow Without Website
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Output Structure (JSON)</label>
                                        <textarea
                                            value={editingPrompt.output_structure || ''}
                                            onChange={(e) => setEditingPrompt({ ...editingPrompt, output_structure: e.target.value })}
                                            rows={5}
                                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            placeholder='{"key": "type"}'
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            {promptModalMode === 'view' ? (
                                <button onClick={() => { setShowPromptModal(false); setEditingPrompt(null); }} className="px-4 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50">Close</button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { setPromptModalMode('view'); setEditingPrompt(null); }}
                                        className="px-4 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleSavePrompt()}
                                        disabled={promptSaving || !editingPrompt?.prompt_name}
                                        className="px-4 py-1.5 text-xs font-medium bg-[#364570] text-white rounded-md hover:bg-[#2a3654] transition-colors disabled:opacity-50"
                                    >
                                        {promptSaving ? <ClipLoader size={12} color="#fff" /> : (promptModalMode === 'create' ? 'Create' : 'Save')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Campaign Modal */}
            <CreateCampaignModal
                isOpen={showCreateCampaignModal}
                profiles={profiles}
                userUuid={user?.uuid ?? ''}
                selectedCustomers={selectedCustomers}
                onClose={() => setShowCreateCampaignModal(false)}
                onCreated={() => {
                    setShowCreateCampaignModal(false);
                    const refreshFilters = buildCurrentFilters();
                    fetchMasterData('campaigns', selectedCustomers.length > 0 ? selectedCustomers[0] : '', 1, refreshFilters);
                }}
            />

            {/* Edit Row Modal */}
            {editModalTab && editModalRow && (
                <EditRowModal
                    isOpen={showEditModal}
                    tabType={editModalTab}
                    rowData={editModalRow}
                    userUuid={user?.uuid ?? ''}
                    selectedCustomers={selectedCustomers}
                    onClose={() => { setShowEditModal(false); setEditModalRow(null); setEditModalTab(null); }}
                    onSaved={() => {
                        const refreshFilters = buildCurrentFilters();
                        fetchMasterData(editModalTab ?? activeTab, selectedCustomers.length > 0 ? selectedCustomers[0] : '', currentPage, refreshFilters);
                    }}
                />
            )}

            {/* Bulk Edit Modal */}
            <BulkEditModal
                isOpen={showBulkEditModal}
                tabType={activeTab as EditTabType}
                selectedIds={selectedRowIds}
                userUuid={user?.uuid ?? ''}
                onClose={() => setShowBulkEditModal(false)}
                aiPromptName={
                  activeTab === 'unassigned_prospects' ? unassignedAiPromptName
                  : activeTab === 'prospects' ? prospectsAiPromptName
                  : ''
                }
                aiFieldTokens={
                  activeTab === 'unassigned_prospects' && unassignedAiPromptName
                    ? unassignedAiSelectedFields
                    : activeTab === 'prospects' && prospectsAiPromptName
                    ? prospectsAiSelectedFields
                    : []
                }
                onSaved={(changes) => {
                    if (Object.keys(changes).length === 0) {
                        // Placeholder save or similar — re-fetch to pick up nested changes
                        const refreshCustomer = selectedCustomers.length > 0 ? selectedCustomers[0] : '';
                        const refreshFilters = buildCurrentFilters();
                        fetchMasterData(activeTab, refreshCustomer, currentPage, refreshFilters);
                        setSelectedRowIds(new Set());
                        return;
                    }
                    // Patch changed fields directly into local state
                    const patch = (rows: any[]) =>
                        rows.map(row => selectedRowIds.has(row.id) ? { ...row, ...changes } : row);

                    if (activeTab === 'companies') setCompaniesData(d => patch(d));
                    else if (activeTab === 'prospects') setProspectsData(d => patch(d));
                    else if (activeTab === 'unassigned_prospects') setUnassignedProspectsData(d => patch(d));
                    else if (activeTab === 'campaigns') setCampaignsData(d => patch(d));
                    else if (activeTab === 'blacklist') setBlacklistData(d => patch(d));
                    else if (activeTab === 'ai_analysis') setAiAnalysisData(d => patch(d));

                    setSelectedRowIds(new Set());
                    setShowBulkEditModal(false);
                }}
            />

            {/* Bulk Assign Customer Modal */}
            {showBulkAssignCustomerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-1">Assign Customer</h2>
                        <p className="text-xs text-gray-500 mb-4">
                            Link <span className="font-semibold text-gray-700">{selectedRowIds.size}</span> selected compan{selectedRowIds.size !== 1 ? 'ies' : 'y'} to a customer. Already linked companies are skipped.
                        </p>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Customer</label>
                        <select
                            value={bulkAssignCustomerName}
                            onChange={e => setBulkAssignCustomerName(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#364570] mb-5"
                        >
                            <option value="">— Select a customer —</option>
                            {customers.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => { setShowBulkAssignCustomerModal(false); setBulkAssignCustomerName(''); }}
                                disabled={bulkAssignLoading}
                                className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkAssignCustomer}
                                disabled={bulkAssignLoading || !bulkAssignCustomerName}
                                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                                {bulkAssignLoading ? 'Assigning…' : 'Assign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add to List Modal */}
            <AddToListModal
                isOpen={showAddToListModal}
                onClose={() => setShowAddToListModal(false)}
                selectedCompanyIds={
                    activeTab === 'ai_analysis'
                        ? Array.from(new Set(
                            Array.from(selectedRowIds)
                                .map(id => aiAnalysisIdToCompanyIdRef.current.get(id))
                                .filter((id): id is number => typeof id === 'number')
                          ))
                        : Array.from(selectedRowIds)
                }
                selectedCustomers={selectedCustomers}
                userUuid={user?.uuid || ''}
                sourceTab={activeTab === 'ai_analysis' ? 'ai_analysis' : 'companies'}
                aiPromptId={selectedAiPromptId ? parseInt(selectedAiPromptId, 10) : null}
                availableCustomers={customers}
            />

            {/* Add to Prospect List Modal */}
            <AddToProspectListModal
                isOpen={showAddToProspectListModal}
                onClose={() => setShowAddToProspectListModal(false)}
                selectedCustomerProspectIds={Array.from(selectedRowIds)}
                campaignProspectIds={
                    // On the prospects tab every row's `id` IS its campaign_prospect_id
                    // (master-database controller maps `id: prospect.campaign_prospect_id`),
                    // so selectedRowIds already holds the campaign_prospect_ids. Use it as
                    // the single source of truth. Deriving from prospectsData would only see
                    // the rows on the current page, so "Select all N matching" silently
                    // dropped everything past the first page (the 282-selected-but-100-added bug).
                    activeTab === 'prospects'
                        ? Array.from(selectedRowIds)
                        : undefined
                }
                selectedCustomers={selectedCustomers}
            />
        </div>
    );
}