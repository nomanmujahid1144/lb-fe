'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import ChatPopUp from '@/components/layout/ChatPopUp';
import NoteHistoryPopup from '@/components/layout/NoteHistoryPopup';
import InternalNoteHistoryPopup from '@/components/layout/InternalNoteHistoryPopup';
import Pagination from '@/components/layout/Pagination';
import { FaCheckCircle, FaEnvelope, FaPhoneAlt, FaRegComments, FaSave, FaCalendarPlus, FaFilter, FaRegCheckSquare, FaFileExcel } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { BiTask } from 'react-icons/bi';
import { FcAlarmClock } from "react-icons/fc";
import { FaPeopleGroup } from "react-icons/fa6";
import { FiSend } from "react-icons/fi";
import { RiResetLeftFill, RiChatHistoryLine } from "react-icons/ri";
import { IoCreateOutline } from "react-icons/io5";
import { FaStickyNote } from "react-icons/fa";
import { MdBlock } from "react-icons/md";
import { getCookie } from '@/lib/auth';
import { getBackendUrl } from '@/lib/api-config';
import MultiSelect from '@/components/MultiSelect';

interface LeadNote {
  content: string;
  date: string;
  creator: string;
}

interface Tag {
  id: string;
  tag_name: string;
  colour: string;
  is_standard: boolean;
}

interface Profile {
    profile_name: string;
    start_date: string;
    end_date: string;
    customer_name: string;
    campaigns?: Array<{
        campaign_name: string;
        campaign_type: string;
    }>;
}

interface Customer {
    id: number;
    customer_name: string;
    profiles: Profile[]; // Array of profiles for each customer
}


interface User {
    id: number; // Change from string to number
    username: string;
    email: string;
    customers: Customer[];
    uuid: string;
    type: string;
}

interface AwaitingReplyTask {
    id: string;
    due_date: string;
}

interface InternalTask {
    id: string;
    due_date: string;
    data_type?: string;
    note?: LeadNote[];
    task_status?: string;
}

interface Prospect {
    id: string;
    profile_name: string; 
    prospect_status: string;
    first_name: string;
    last_name: string;
    job_title: string;
    phone: string;
    email: string;
    linkedin_url: string;
    campaign_name: string;
    prospect_id: string;
    profile_id: string; 
    lead_note?: LeadNote;
    chatter_note: LeadNote[];
    internal_note: LeadNote[];
    lead_phase?: string; 
    campaign_prospect_id: string; 
    company_name?: string;
    last_prospect_message_date?: Date;
    awaiting_reply_task?: AwaitingReplyTask;
    internal_task?: InternalTask;
    tags_relation: Tag[];
    crm?: boolean;
    blacklisted?: boolean;
}

interface Message {
    content: string;
    messageDate: string;
    senderId: string;  // This could be used to differentiate between customer and prospect messages.
}

// Component for displaying tags as colored widgets
const TagsDisplay = ({ tags }: { tags: Tag[] }) => {
    if (!tags || tags.length === 0) {
        return <span className="text-gray-400 italic">No sentiment</span>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
                <span
                    key={tag.id}
                    className="inline-block px-2 py-1 rounded-full text-xs text-white font-medium"
                    style={{ backgroundColor: tag.colour }}
                >
                    {tag.tag_name}
                </span>
            ))}
        </div>
    );
};

export default function FollowUpPage() {
    const router = useRouter();
    const [prospects, setProspects] = useState<Prospect[]>([]); // Store paginated prospects for display
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedProfile, setSelectedProfile] = useState<string>(''); 
    const [searchLinkedInUrl, setSearchLinkedInUrl] = useState<string>(''); 
    const [searchCompanyName, setSearchCompanyName] = useState<string>(''); 
    const [selectedStatus, setSelectedStatus] = useState<string>('All statuses'); 
    const [showPopup, setShowPopup] = useState(false);
    const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
    const [showChatHistory, setShowChatHistory] = useState(false);
    const [selectedProspectForHistory, setSelectedProspectForHistory] = useState<Prospect | null>(null);
    const [showInternalNoteHistory, setShowInternalNoteHistory] = useState(false);
    const [selectedProspectForInternalNote, setSelectedProspectForInternalNote] = useState<Prospect | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [dateChatterTask, setdateChatterTask] = useState({});
    const [dateInternalTask, setDateInternalTask] = useState({});
    const [createdChatterTasks, setCreatedChatterTasks] = useState(new Set());
    const [createdInternalTasks, setCreatedInternalTasks] = useState(new Set());
    const [checkedProspects, setCheckedProspects] = useState<Set<string>>(new Set());
    const [sentToCrmProspects, setSentToCrmProspects] = useState<Set<string>>(new Set());
    const [leadData, setLeadData] = useState<{ [key: string]: { note: string; chatterNote: string; internalNote: string; phase: string; selectedView?: 'lead-phase' | 'chatter-task' | 'internal-task' } }>({});
    const [leadPhaseOptions, setLeadPhaseOptions] = useState<string[]>([]);
    const [allLeadPhases, setAllLeadPhases] = useState<string[]>([]);
    const [allSentiments, setAllSentiments] = useState<string[]>([]);
    const [savedLeadPhases, setSavedLeadPhases] = useState<Set<string>>(new Set());
    const pageSize = 10;
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [isSavingLeadPhase, setIsSavingLeadPhase] = useState(false);
    const [isMarkingChecked, setIsMarkingChecked] = useState(false);
    const [isMarkingCheck, setIsMarkingCheck] = useState(false);

    // New filter states
    const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
    const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
    const [selectedProspectStatuses, setSelectedProspectStatuses] = useState<string[]>([]);
    const [selectedLeadPhases, setSelectedLeadPhases] = useState<string[]>([]);
    const [selectedSentiments, setSelectedSentiments] = useState<string[]>([]);
    const [selectedCrm, setSelectedCrm] = useState<string[]>([]); // Array for multi-select
    const [selectedContactDetails, setSelectedContactDetails] = useState<string[]>([]); // Array for contact details filter
    const [selectedTaskDueDates, setSelectedTaskDueDates] = useState<string[]>([]); // Array for task due date filter
    const [selectedBlacklisted, setSelectedBlacklisted] = useState<string[]>([]); // Array for blacklisted filter
    const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
    const [isApplyingFilters, setIsApplyingFilters] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showExportSection, setShowExportSection] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    // Track last applied filter state to disable apply button when unchanged
    const [lastAppliedFilters, setLastAppliedFilters] = useState<{
        selectedProfiles: string[];
        selectedCampaigns: string[];
        selectedProspectStatuses: string[];
        selectedLeadPhases: string[];
        selectedSentiments: string[];
        selectedCrm: string[];
        selectedContactDetails: string[];
        selectedTaskDueDates: string[];
        selectedBlacklisted: string[];
        leadPhaseFilterEnabled: boolean;
        sentimentFilterEnabled: boolean;
        crmFilterEnabled: boolean;
        contactDetailsFilterEnabled: boolean;
        taskDueDateFilterEnabled: boolean;
        blacklistedFilterEnabled: boolean;
        searchLinkedInUrl: string;
        searchCompanyName: string;
    } | null>(null);

    // Toggle states for advanced filters (true = enabled/filtering, false = disabled/no filter)
    const [leadPhaseFilterEnabled, setLeadPhaseFilterEnabled] = useState(false);
    const [sentimentFilterEnabled, setSentimentFilterEnabled] = useState(false);
    const [crmFilterEnabled, setCrmFilterEnabled] = useState(false);
    const [contactDetailsFilterEnabled, setContactDetailsFilterEnabled] = useState(false);
    const [taskDueDateFilterEnabled, setTaskDueDateFilterEnabled] = useState(false);
    const [blacklistedFilterEnabled, setBlacklistedFilterEnabled] = useState(false);

    // State for tracking expanded filters
    const [expandedMainFilters, setExpandedMainFilters] = useState<Set<string>>(new Set());

    const handleMainFilterExpandedChange = (filterName: string, isExpanded: boolean) => {
        setExpandedMainFilters(prev => {
            const newSet = new Set(prev);
            if (isExpanded) {
                newSet.add(filterName);
            } else {
                newSet.delete(filterName);
            }
            return newSet;
        });
    };

    // Additional states for all-prospects style pagination
    const [totalProspects, setTotalProspects] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allProfiles, setAllProfiles] = useState<string[]>([]);
    const [profileToCustomerMap, setProfileToCustomerMap] = useState<Map<string, string>>(new Map());
    const [customerToProfilesMap, setCustomerToProfilesMap] = useState<Map<string, string[]>>(new Map());
    const [profiles, setProfiles] = useState<string[]>([]);
    const [hasProfile, setHasProfile] = useState<boolean>(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [campaigns, setCampaigns] = useState<string[]>([]);
    const [profileCampaigns, setProfileCampaigns] = useState<Map<string, string[]>>(new Map());
    const [isInitializing, setIsInitializing] = useState(true);

    // Follow-up specific statuses
    const followupStatuses = ['Check', 'Checked', 'Awaiting reply'];

    // console.log('Follow-up page filtering to these statuses:', followupStatuses);

    const CRMUsers = ['Luuk_Admin', 'Luuk_Admin_Test', 'laura', 'Jessy', 'Jean_Jiggr', 'Alan', 'Jerome_DeSpeld', 'Melle_DeSpeld', 
                      'Manager_DeSpeld', 'Rob_PostNL', 'Sigrid_PostNL', 'Thomas_PostNL', 'Johan_PostNL', 'Manager_PostNL', 'Manager_Jiggr', 
                      'Nicolas_HealthyMind', 'Manager_HealthyMind', 'Eelco_RolanRobotics', 'Manager_RolanRobotics', 'Laura_Demo',
                      'Reinier_Natwerk', 'Coen_Natwerk', 'Manager_Natwerk', 'Hanneke_Natwerk', 'Daan_Lumiq', 'Manager_Lumiq', 'Joop_Healzzy2GO',
                      'Manager_Healzzy2GO', 'Karin_YourGift', 'Manager_YourGift',
                      'Manager_RoutiGo', 'Patrick_RoutiGo', 'Huub_RoutiGo', 'Anick_RoutiGo'];

    const formatTimeAgo = (date: Date): string => {
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (seconds < 5) return "just now";
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 604800;
        if (interval > 1) return Math.floor(interval) + ` week${Math.floor(interval) > 1 ? 's' : ''} ago`;
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + ` day${Math.floor(interval) > 1 ? 's' : ''} ago`;
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + ` hour${Math.floor(interval) > 1 ? 's' : ''} ago`;
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + ` minute${Math.floor(interval) > 1 ? 's' : ''} ago`;
        return Math.floor(seconds) + " seconds ago";
    };

    // Fetch filter options (customers, profiles, and campaigns) - lightweight call
    const fetchFilterOptions = async (userUuid: string, token: string) => {
        try {
            const backendUrl = getBackendUrl();
            const params = new URLSearchParams({
                'populate[profile]': 'true',
                'populate[customers][populate][profiles][fields][0]': 'profile_name',
                'populate[customers][populate][profiles][populate][campaigns][fields][0]': 'campaign_name',
                'populate[customers][populate][profiles][populate][campaigns][fields][1]': 'campaign_type',
                'populate[customers][populate][profiles][populate][start_end]': 'true',
                'populate[customers][fields][0]': 'customer_name',
            });

            const response = await fetch(
                `${backendUrl}/api/users-permissions/users/uuid/${userUuid}?${params.toString()}`,
                {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch filter options');
            }

            const userData = await response.json();
            const profile = userData.profile;
            if (profile) {
                setUserProfile(profile);
                setHasProfile(true);
                setSelectedProfiles([profile.profile_name]);
                // Auto-select campaigns based on the user profile will be done after profileCampaignMap is set
            } else {
                setHasProfile(false);
                setUserProfile(null);
                // Keep default first profile - will be set after profiles are processed
            }
            const customersData = userData.customers || [];

            // Store customers with their profiles and campaigns
            setCustomers(customersData);

            const profileSet = new Set<string>();
            const campaignSet = new Set<string>();
            const profileCampaignMap = new Map<string, string[]>();
            const profileToCustomerMap = new Map<string, string>();
            const customerToProfilesMap = new Map<string, string[]>();

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            customersData.forEach(customer => {
                const customerProfiles: string[] = [];
                customer.profiles?.forEach(profile => {
                    // Skip inactive profiles where end_date is in the past
                    if (profile.start_end?.end_date) {
                        const endDate = new Date(profile.start_end.end_date);
                        endDate.setHours(0, 0, 0, 0);
                        if (endDate < today) return;
                    }
                    profileSet.add(profile.profile_name);
                    profileToCustomerMap.set(profile.profile_name, customer.customer_name);
                    customerProfiles.push(profile.profile_name);
                    
                    const profileCampaigns: string[] = [];
                    profile.campaigns?.forEach(campaign => {
                        // Exclude campaigns with type "First Connections"
                        if (campaign.campaign_type !== 'First Connections') {
                            campaignSet.add(campaign.campaign_name);
                            profileCampaigns.push(campaign.campaign_name);
                        }
                    });
                    profileCampaignMap.set(profile.profile_name, profileCampaigns);
                });
                
                if (customerProfiles.length > 0) {
                    customerToProfilesMap.set(customer.customer_name, customerProfiles);
                }
            });

            // console.log('Customer to Profiles Map:', customerToProfilesMap);

            const sortedProfiles = Array.from(profileSet).sort();
            const sortedCampaigns = Array.from(campaignSet).sort();

            // console.log('Total campaigns fetched (excluding First Connections):', sortedCampaigns.length);

            setAllProfiles(sortedProfiles);
            setProfiles(sortedProfiles); // Initially show all profiles
            setCampaigns(sortedCampaigns);
            setProfileCampaigns(profileCampaignMap);
            setProfileToCustomerMap(profileToCustomerMap);
            setCustomerToProfilesMap(customerToProfilesMap);

            // Auto-select profile
            if (profile && selectedProfiles.length === 0) {
                setSelectedProfiles([profile.profile_name]);
                // Auto-select campaigns based on the user profile
                const availableCampaigns = new Set<string>();
                const profileCamps = profileCampaignMap.get(profile.profile_name) || [];
                profileCamps.forEach(campaign => availableCampaigns.add(campaign));
                const availableCampaignsArray = Array.from(availableCampaigns).sort();
                setSelectedCampaigns(availableCampaignsArray);
            } else if (sortedProfiles.length > 0 && selectedProfiles.length === 0) {
                setSelectedProfiles([sortedProfiles[0]]);
                // Auto-select campaigns based on the first profile
                const availableCampaigns = new Set<string>();
                const profileCamps = profileCampaignMap.get(sortedProfiles[0]) || [];
                profileCamps.forEach(campaign => availableCampaigns.add(campaign));
                const availableCampaignsArray = Array.from(availableCampaigns).sort();
                setSelectedCampaigns(availableCampaignsArray);
            }

            // Auto-select all prospect statuses (follow-up statuses)
            if (followupStatuses.length > 0 && selectedProspectStatuses.length === 0) {
                setSelectedProspectStatuses(followupStatuses);
            }

            // Fetch lead phase enum values
            await fetchLeadPhaseEnumValues(token);

            setLoading(false);
            setIsInitializing(false);
        } catch (error) {
            // console.error('Error fetching filter options:', error);
            setLoading(false);
        }
    };

    // Fetch lead phase enum values from Strapi content type schema
    const fetchLeadPhaseEnumValues = async (token: string) => {
        const backendUrl = getBackendUrl();
        try {
            const response = await fetch(
                `${backendUrl}/api/content-type-builder/content-types/api::campaign-prospect.campaign-prospect`,
                {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.ok) {
                const contentTypeData = await response.json();
                // console.log('Content type schema data:', contentTypeData);
                const leadPhaseAttribute = contentTypeData?.data?.schema?.attributes?.lead_phase;
                
                if (leadPhaseAttribute?.enum) {
                    setLeadPhaseOptions(leadPhaseAttribute.enum.sort((a, b) => a.localeCompare(b)));
                } else {
                    // console.warn('Lead phase enum not found in content type schema');
                    // Fallback: try to get from existing data
                    setLeadPhaseOptions([]);
                }
            } else {
                // console.error('Failed to fetch content type schema for lead phases');
                setLeadPhaseOptions([]);
            }
        } catch (error) {
            // console.error('Error fetching lead phase enum values:', error);
            setLeadPhaseOptions([]);
        }
    };

    // Fetch prospects using the same endpoint as all_prospects
    const fetchProspects = async (userUuid: string, token: string, page: number = 1, pageSize: number = 10) => {
        // console.log('fetchProspects called with:', { userUuid, selectedProfiles, selectedCampaigns, selectedProspectStatuses, selectedLeadPhases, selectedSentiments, searchLinkedInUrl, searchCompanyName });
        if (selectedProfiles.length === 0 || selectedCampaigns.length === 0) return;
        
        setIsApplyingFilters(true);
        const backendUrl = getBackendUrl();
        try {
            // Build filters object for POST request - use prospectStatuses for filtering
            const filters = {
                profiles: selectedProfiles,
                campaigns: selectedCampaigns,
                prospectStatuses: selectedProspectStatuses,
                linkedinUrl: searchLinkedInUrl,
                companyName: searchCompanyName,
                leadPhases: !leadPhaseFilterEnabled 
                    ? [] 
                    : selectedLeadPhases,
                sentiments: !sentimentFilterEnabled 
                    ? [] 
                    : selectedSentiments,
                crm: !crmFilterEnabled ? [] : selectedCrm,
                contactDetails: !contactDetailsFilterEnabled 
                    ? [] 
                    : selectedContactDetails.includes('all') 
                        ? ['Email', 'Phone'] 
                        : selectedContactDetails.filter(detail => detail !== 'all'),
                taskDueDates: !taskDueDateFilterEnabled 
                    ? [] 
                    : selectedTaskDueDates,
                blacklisted: !blacklistedFilterEnabled ? [] : selectedBlacklisted,
            };

            //console.log('Fetching prospects with filters:', filters);
            //console.log('Sentiment Filter - Enabled:', sentimentFilterEnabled, 'Selected:', selectedSentiments, 'Sent to backend:', filters.sentiments);
            //console.log('Contact Details Filter - Enabled:', contactDetailsFilterEnabled, 'Selected:', selectedContactDetails, 'Sent to backend:', filters.contactDetails);

            const response = await fetch(`${backendUrl}/api/all-prospects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userUuid,
                    filters,
                    page,
                    pageSize,
                    source: 'follow_up' // Identify this request comes from follow-up page
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch prospects: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const allProspectsData = data.data || [];

            // console.log('Raw prospects returned from API:', allProspectsData.length);
            // console.log('Prospect statuses in response:', Array.from(new Set(allProspectsData.map(p => p.prospect_status))));
            // console.log('Sample prospect statuses:', allProspectsData.slice(0, 5).map(p => ({ name: `${p.first_name} ${p.last_name}`, status: p.prospect_status })));
            // Process prospects data to convert date strings to Date objects
            const processedProspectsData = allProspectsData.map(prospect => ({
                ...prospect,
                last_prospect_message_date: prospect.last_prospect_message_date 
                    ? new Date(prospect.last_prospect_message_date) 
                    : undefined,
            }));

            // No need for client-side filtering since API handles it with statuses filter
            setProspects(processedProspectsData);
            setTotalProspects(data.meta?.total || processedProspectsData.length);
            setTotalPages(data.meta?.pageCount || Math.ceil((data.meta?.total || processedProspectsData.length) / pageSize));
            
            // Set current page from response
            if (data.meta?.page) {
                setCurrentPage(data.meta.page);
            }
            
            // Collect unique values for sentiments from current data (always, to accumulate options)
            const allSentimentsFromData = Array.from(new Set(allProspectsData.flatMap(p => p.tags_relation?.map(tag => tag.tag_name) || []).filter(Boolean) as string[])).sort();
            setAllSentiments(prev => Array.from(new Set([...prev, ...allSentimentsFromData])).sort());
            
            // For lead phases, use enum values (fetched separately)
            
            // Auto-select "no_filter" for lead phases and sentiments if not already selected
            // (Removed - now handled by disabled state)

        } catch (error) {
            // console.error('Error fetching prospects:', error);
            setProspects([]);
            setTotalProspects(0);
            setTotalPages(0);
        } finally {
            setIsApplyingFilters(false);
            setHasAppliedFilters(true);
            // Save the current filter state as last applied
            setLastAppliedFilters({
                selectedProfiles: [...selectedProfiles],
                selectedCampaigns: [...selectedCampaigns],
                selectedProspectStatuses: [...selectedProspectStatuses],
                selectedLeadPhases: [...selectedLeadPhases],
                selectedSentiments: [...selectedSentiments],
                selectedCrm: [...selectedCrm],
                selectedContactDetails: [...selectedContactDetails],
                selectedTaskDueDates: [...selectedTaskDueDates],
                selectedBlacklisted: [...selectedBlacklisted],
                leadPhaseFilterEnabled,
                sentimentFilterEnabled,
                crmFilterEnabled,
                contactDetailsFilterEnabled,
                taskDueDateFilterEnabled,
                blacklistedFilterEnabled,
                searchLinkedInUrl,
                searchCompanyName
            });
        }
    };
                

    const handleLogout = async () => {
        try {
            // Log out from the backend (optional, if you have an API endpoint for logging out)
            await fetch('/api/auth/logout', { method: 'POST' });
            
            // Remove user-related data from localStorage
            localStorage.clear(); // Clear all localStorage items related to authentication and customers
    
            // Optionally, clear cookies
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            
            // Reset state to null or empty
            setUser(null);
            setProspects([]); // Clear the prospects data
            setSelectedProfile('All profiles'); // Reset profile filter
            setSelectedStatus('All statuses'); // Reset status filter
            setSearchLinkedInUrl(''); // Reset LinkedIn URL search
            setSearchCompanyName(''); // Reset company name search
            setShowPopup(false); // Close chat popup if it's open
            setCheckedProspects(new Set()); // Clear checked prospects
            setSentToCrmProspects(new Set()); // Clear sent to CRM prospects
            // Reset new filter states
            setSelectedProfiles([]);
            setSelectedCampaigns([]);
            setSelectedProspectStatuses([]);
            setSelectedLeadPhases([]);
            setSelectedSentiments([]);
            setSelectedCrm([]);
            setSelectedContactDetails([]);
            setSelectedTaskDueDates([]);
            setHasAppliedFilters(false);
            setShowAdvancedFilters(false);
            setLastAppliedFilters(null);
            
            // Reset filter enabled states
            setLeadPhaseFilterEnabled(false);
            setSentimentFilterEnabled(false);
            setCrmFilterEnabled(false);
            setContactDetailsFilterEnabled(false);
            setTaskDueDateFilterEnabled(false);
            
            // Reset filter enabled states
            setLeadPhaseFilterEnabled(false);
            setSentimentFilterEnabled(false);
            setCrmFilterEnabled(false);
            setContactDetailsFilterEnabled(false);
            
            toast.success('Successfully logged out!', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                },
            });
            
            // Redirect the user to the login page
            router.push('/auth/login');
        } catch (error) {
            // console.error('Logout error:', error);
            router.push('/auth/login');
        }
    };

    const handleViewChat = (profileId: string, prospectId: string, prospect: Prospect) => {
        setSelectedProspect(prospect);
        setShowPopup(true);
    };

    const handleTriggerZap = async (prospect: Prospect) => {
        const token = getCookie('token');
        if (!token) {
            toast.error('Authentication token is missing. Please log in again.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

        try {
            // console.log('Triggering Zap for prospect:', prospect);
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/trigger-zap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(prospect),
            });

            if (!response.ok) {
                throw new Error(`Failed to trigger Zap: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                setSentToCrmProspects(prev => new Set(prev).add(prospect.prospect_id));
                toast.success('Prospect sent to CRM successfully!', {
                    duration: 3000,
                    position: 'top-center',
                    style: {
                        background: '#10B981',
                        color: '#fff',
                    },
                });
            } else {
                throw new Error(result.message || 'Failed to send to Zapier');
            }
        } catch (error) {
            // console.error('Error triggering Zap:', error);
            toast.error('Failed to send prospect to CRM. Please try again.', {
                duration: 4000,
                position: 'top-center',
            });
        }
    };

    const handleChatterTask = async (dateTask: string, prospect: Prospect) => {
        // console.log(prospect, dateTask)
        // console.log('handleChatterTask called for prospect:', prospect.campaign_prospect_id, 'current status:', prospect.prospect_status);
        if (!dateTask) {
            toast.error('Please select a date for the chatter task.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

        const token = getCookie('token');
        if (!token) {
            toast.error('Authentication token is missing. Please log in again.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

        const chatterNoteData = leadData[prospect.prospect_id]?.chatterNote || '';

        const payload = {
            prospect,
            date_task: dateTask,
            chatter_note: chatterNoteData,
        };

        setIsCreatingTask(true);
        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/data-senders/chatter_task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ data: payload }),
            });

            if (!response.ok) {
            throw new Error(`Failed to create chatter task: ${response.status}`);
            }

            const result = await response.json();
            // console.log('Chatter task created, result:', result);
            setCreatedChatterTasks(prev => new Set(prev).add(prospect.prospect_id));
            
            // Update prospect status to "Awaiting reply" and set the due date, and add the note to chatter_note
            const updatedChatterNote = chatterNoteData ? [
                ...(prospect.chatter_note || []),
                {
                    content: chatterNoteData,
                    date: new Date().toISOString(),
                    creator: user?.username || 'Unknown'
                }
            ] : prospect.chatter_note;
            
            setProspects(prev =>
                prev.map(p =>
                    p.prospect_id === prospect.prospect_id
                        ? { 
                            ...p, 
                            prospect_status: "Awaiting reply",
                            awaiting_reply_task: { 
                                id: result?.id, 
                                due_date: dateTask 
                            },
                            chatter_note: updatedChatterNote
                        }
                        : p
                )
            );
            
            // Reset input fields after successful task creation
            setLeadData(prev => ({
                ...prev,
                [prospect.prospect_id]: {
                    ...prev[prospect.prospect_id],
                    chatterNote: ''
                }
            }));
            setdateChatterTask(prev => ({
                ...prev,
                [prospect.prospect_id]: {
                    ...prev[prospect.prospect_id],
                    date_task: ''
                }
            }));
            
            toast.success('Chatter task created successfully!', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                },
            });
        } catch (error) {
            console.error('Error creating chatter task:', error);
            toast.error('There was an error creating the task.', {
                duration: 4000,
                position: 'top-center',
            });
        } finally {
            setIsCreatingTask(false);
        }
    };

    const handleInternalTask = async (dateTask: string, prospect: Prospect) => {
        if (!dateTask) {
            toast.error('Please select a date for the internal task.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

        const token = getCookie('token');
        if (!token) {
            toast.error('Authentication token is missing. Please log in again.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

        const internalNoteData = leadData[prospect.prospect_id]?.internalNote || '';

        const payload = {
            prospect,
            date_task: dateTask,
            internal_note: internalNoteData,
        };

        setIsCreatingTask(true);
        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/data-senders/internal_task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ data: payload }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create internal task: ${response.status}`);
            }

            const result = await response.json();
            setCreatedInternalTasks(prev => new Set(prev).add(prospect.prospect_id));
            
            // Update prospect status to show internal task immediately underneath the status
            const updatedInternalTask = prospect.internal_task ? {
                ...prospect.internal_task,
                due_date: dateTask,
                task_status: 'open',
                note: internalNoteData ? [
                    ...(prospect.internal_task.note || []),
                    {
                        content: internalNoteData,
                        date: new Date().toISOString(),
                        creator: 'Customer'
                    }
                ] : prospect.internal_task.note
            } : { 
                id: result?.id, 
                due_date: dateTask,
                task_status: 'open',
                note: internalNoteData ? [{
                    content: internalNoteData,
                    date: new Date().toISOString(),
                    creator: 'Customer'
                }] : []
            };

            setProspects(prev =>
                prev.map(p =>
                    p.prospect_id === prospect.prospect_id
                        ? { ...p, internal_task: updatedInternalTask }
                        : p
                )
            );
            
            // Reset input fields after successful task creation
            setLeadData(prev => ({
                ...prev,
                [prospect.prospect_id]: {
                    ...prev[prospect.prospect_id],
                    internalNote: ''
                }
            }));
            setDateInternalTask(prev => ({
                ...prev,
                [prospect.prospect_id]: {
                    ...prev[prospect.prospect_id],
                    date_task: ''
                }
            }));
            
            toast.success('Internal task created successfully!', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                },
            });
        } catch (error) {
            console.error('Error creating internal task:', error);
            toast.error('There was an error creating the internal task.', {
                duration: 4000,
                position: 'top-center',
            });
        } finally {
            setIsCreatingTask(false);
        }
    };

    const handleFinishInternalTask = async (prospect: Prospect) => {
        const token = getCookie('token');
        if (!token) {
            toast.error('Authentication token is missing. Please log in again.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/data-senders/finish_internal_task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ data: prospect }),
            });

            if (!response.ok) {
                throw new Error(`Failed to finish internal task: ${response.status}`);
            }

            // Move internal task notes to internal_note before removing task
            const taskNotes = prospect.internal_task?.note || [];
            
            // Remove internal task from the prospect
            setProspects(prev =>
                prev.map(p =>
                    p.prospect_id === prospect.prospect_id
                        ? { 
                            ...p, 
                            internal_task: undefined,
                            internal_note: [
                                ...(p.internal_note || []),
                                ...taskNotes
                            ]
                        }
                        : p
                )
            );
            
            toast.success('Internal task completed successfully!', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                },
            });
        } catch (error) {
            console.error('Error finishing internal task:', error);
            toast.error('There was an error completing the internal task.', {
                duration: 4000,
                position: 'top-center',
            });
        }
    };

    const handleExportProspects = async () => {
        const token = getCookie('token');
        if (!token) {
            toast.error('Authentication token is missing. Please log in again.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

        if (!user?.uuid) {
            toast.error('User UUID is missing. Please log in again.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

if (totalProspects === 0) {
        toast.error('No prospects to export.', {
            duration: 4000,
            position: 'top-center',
        });
        return;
    }

    // Show warning if there are more than 5000 prospects
    if (totalProspects > 5000) {
        toast(`Only the first 5000 of ${totalProspects} prospects will be exported.`, {
                duration: 5000,
                position: 'top-center',
                style: {
                    background: '#F59E0B',
                    color: '#fff',
                },
            });
        }

        setIsExporting(true);
        try {
            const backendUrl = getBackendUrl();
            
            // First, fetch ALL campaign prospect IDs matching current filters
            const allIds: string[] = [];
            const totalPagesToFetch = Math.ceil(Math.min(totalProspects, 5000) / 1000); // Fetch in batches of 1000
            
            for (let page = 1; page <= totalPagesToFetch; page++) {
                const filters = {
                    profiles: selectedProfiles,
                    campaigns: selectedCampaigns,
                    prospectStatuses: selectedProspectStatuses,
                    linkedinUrl: searchLinkedInUrl,
                    companyName: searchCompanyName,
                    leadPhases: !leadPhaseFilterEnabled 
                        ? [] 
                        : selectedLeadPhases,
                    sentiments: !sentimentFilterEnabled 
                        ? [] 
                        : selectedSentiments,
                    crm: !crmFilterEnabled ? [] : selectedCrm,
                    contactDetails: !contactDetailsFilterEnabled 
                        ? [] 
                        : selectedContactDetails.includes('all') 
                            ? ['Email', 'Phone'] 
                            : selectedContactDetails.filter(detail => detail !== 'all'),
                    taskDueDates: !taskDueDateFilterEnabled 
                        ? [] 
                        : selectedTaskDueDates
                };

                const response = await fetch(`${backendUrl}/api/all-prospects`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        userUuid: user.uuid,
                        filters,
                        page,
                        pageSize: 1000, // Fetch 1000 at a time
                        source: 'follow_up'
                    })
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch prospect IDs for page ${page}`);
                }

                const data = await response.json();
                const pageIds = data.data.map((p: Prospect) => p.campaign_prospect_id).filter((id: string) => id != null);
                allIds.push(...pageIds);
            }
            
            // Now export with all IDs
            const requestBody = { 
                campaignProspectIds: allIds.slice(0, 5000), // Still limit to 5000 for safety
                userUuid: user.uuid,
                format: 'excel'
            };
            
            const response = await fetch(`${backendUrl}/api/export-prospects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Export error response body:', errorText);
                throw new Error(`Failed to export prospects: ${response.status} - ${errorText}`);
            }

            // Get the blob from the response
            const blob = await response.blob();
            
            // Create a download link and trigger the download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Set appropriate filename based on format
            const extension = 'xlsx';
            a.download = `follow_up_export_${new Date().toISOString().split('T')[0]}.${extension}`;
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Export completed! ${Math.min(allIds.length, 5000)} prospects exported.`, {
                duration: 4000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                },
            });
        } catch (error) {
            console.error('Error exporting prospects:', error);
            toast.error('There was an error exporting the prospects. Please try again.', {
                duration: 4000,
                position: 'top-center',
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleMarkAsChecked = async (prospect: Prospect) => {
        const token = getCookie('token');
        if (!token) {
            toast.error('Authentication token is missing. Please log in again.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

        setIsMarkingChecked(true);
        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/data-senders/mark_as_checked`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ data: prospect }),
            });

            if (!response.ok) {
                throw new Error(`Failed to mark as checked: ${response.status}`);
            }

            // const result = await response.json();
            // console.log('Prospect marked as checked:', result);

            // ✅ Update local state to re-render with FaCheckCircle
            setCheckedProspects(prev => new Set(prev).add(prospect.prospect_id));

            toast.success('Prospect marked as checked!', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                },
            });
        } catch (error) {
            console.error('Error marking as checked:', error);
            toast.error('There was an error marking this person as checked.', {
                duration: 4000,
                position: 'top-center',
            });
        } finally {
            setIsMarkingChecked(false);
        }
    };

    const handleMarkAsCheck = async (prospect: Prospect) => {
        const token = getCookie('token');
        if (!token) {
            toast.error('Authentication token is missing. Please log in again.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

        setIsMarkingCheck(true);
        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/data-senders/mark_as_check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ data: prospect }),
            });

            if (!response.ok) {
                throw new Error(`Failed to mark as check: ${response.status}`);
            }

            // Remove from checkedProspects so UI switches back to "Check"
            setCheckedProspects(prev => {
                const newSet = new Set(prev);
                newSet.delete(prospect.prospect_id);
                return newSet;
            });

            // Update the prospect_status in the prospects state
            setProspects(prev =>
                prev.map(p =>
                    p.prospect_id === prospect.prospect_id
                        ? { ...p, prospect_status: "Check" }
                        : p
                )
            );

            toast.success('Prospect status reverted to Check!', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                },
            });
        } catch (error) {
            console.error('Error marking as check:', error);
            toast.error('There was an error reverting to Check.', {
                duration: 4000,
                position: 'top-center',
            });
        } finally {
            setIsMarkingCheck(false);
        }
    };

    const handleSaveLeadPhase = async (prospect: Prospect) => {
        const token = getCookie('token');
        if (!token) {
            toast.error('Authentication token is missing. Please log in again.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

        const data = leadData[prospect.prospect_id];
        if (!data || (!data.note && !data.phase)) {
            toast.error('No lead phase or note to save.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

        setIsSavingLeadPhase(true);
        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/data-senders/lead_phase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    prospect_id: prospect.prospect_id,
                    campaign_prospect_id: prospect.campaign_prospect_id, // ✅ Add this
                    lead_phase: data.phase,
                    lead_note: data.note,
                    date: new Date().toISOString(), // ✅ Add current date
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to save lead phase: ${response.status}`);
            }
            setSavedLeadPhases(prev => new Set(prev).add(prospect.prospect_id));

            toast.success('Lead phase saved successfully!', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                },
            });
        } catch (error) {
            console.error('Error saving lead phase:', error);
            toast.error('There was an error saving the lead phase.', {
                duration: 4000,
                position: 'top-center',
            });
        } finally {
            setIsSavingLeadPhase(false);
        }
    };

    // Get unique values for filters from prospects (current page data)
    const uniqueProfiles = Array.from(new Set(prospects.map(p => p.profile_name).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const uniqueCampaigns = Array.from(new Set(prospects.map(p => p.campaign_name).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const uniqueProspectStatuses = Array.from(new Set(prospects.map(p => p.prospect_status).filter(Boolean))).sort();
    const uniqueLeadPhases = allLeadPhases; // Use the full list from API
    const uniqueSentiments = allSentiments; // Use the full list from API

    // For advanced filters dropdown options
    // Map backend status names to display names
    const statusDisplayMap: Record<string, string> = {
        'Awaiting reply': 'Chatter Task'
    };
    
    const crmFilterOptions = [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' }
    ];

    const contactDetailsFilterOptions = [
        { value: 'all', label: 'All' },
        { value: 'Email', label: 'Email' },
        { value: 'Phone', label: 'Phone' }
    ];

    const allContactDetails = ['Email', 'Phone'];

    const prospectStatusFilterOptions = followupStatuses.map(status => ({
        value: status,
        label: statusDisplayMap[status] || status
    }));
    const leadPhaseFilterOptions = leadPhaseOptions.map(phase => ({ value: phase, label: phase }));
    const sentimentFilterOptions = allSentiments.map(sentiment => ({ value: sentiment, label: sentiment }));

    // Apply filters function - now uses the same endpoint as all_prospects
    const applyFilters = () => {
        if (selectedProfiles.length === 0 || selectedCampaigns.length === 0) return;
        
        // Fold in main filters when applying
        setExpandedMainFilters(new Set());
        setShowAdvancedFilters(false);
        
        // Set advanced filter enabled states based on whether they have selections
        setLeadPhaseFilterEnabled(selectedLeadPhases.length > 0);
        setSentimentFilterEnabled(selectedSentiments.length > 0);
        setCrmFilterEnabled(selectedCrm.length > 0);
        setContactDetailsFilterEnabled(selectedContactDetails.length > 0);
        setTaskDueDateFilterEnabled(selectedTaskDueDates.length > 0);
        setBlacklistedFilterEnabled(selectedBlacklisted.length > 0);
        
        const token = getCookie('token');
        if (token && user) {
            fetchProspects(user.uuid, token, 1, 10);
        }
    };

    // Check if current filters match last applied filters
    const areFiltersUnchanged = () => {
        if (!lastAppliedFilters) return false;
        
        return (
            JSON.stringify(selectedProfiles.sort()) === JSON.stringify(lastAppliedFilters.selectedProfiles.sort()) &&
            JSON.stringify(selectedCampaigns.sort()) === JSON.stringify(lastAppliedFilters.selectedCampaigns.sort()) &&
            JSON.stringify(selectedProspectStatuses.sort()) === JSON.stringify(lastAppliedFilters.selectedProspectStatuses.sort()) &&
            leadPhaseFilterEnabled === (lastAppliedFilters.selectedLeadPhases.length > 0) &&
            sentimentFilterEnabled === (lastAppliedFilters.selectedSentiments.length > 0) &&
            crmFilterEnabled === (lastAppliedFilters.selectedCrm.length > 0) &&
            contactDetailsFilterEnabled === (lastAppliedFilters.selectedContactDetails.length > 0) &&
            taskDueDateFilterEnabled === (lastAppliedFilters.selectedTaskDueDates.length > 0) &&
            blacklistedFilterEnabled === (lastAppliedFilters.selectedBlacklisted.length > 0) &&
            JSON.stringify(selectedLeadPhases.sort()) === JSON.stringify(lastAppliedFilters.selectedLeadPhases.sort()) &&
            JSON.stringify(selectedSentiments.sort()) === JSON.stringify(lastAppliedFilters.selectedSentiments.sort()) &&
            JSON.stringify(selectedCrm.sort()) === JSON.stringify(lastAppliedFilters.selectedCrm.sort()) &&
            JSON.stringify(selectedContactDetails.sort()) === JSON.stringify(lastAppliedFilters.selectedContactDetails.sort()) &&
            JSON.stringify(selectedTaskDueDates.sort()) === JSON.stringify(lastAppliedFilters.selectedTaskDueDates.sort()) &&
            JSON.stringify(selectedBlacklisted.sort()) === JSON.stringify(lastAppliedFilters.selectedBlacklisted.sort()) &&
            searchLinkedInUrl === lastAppliedFilters.searchLinkedInUrl &&
            searchCompanyName === lastAppliedFilters.searchCompanyName
        );
    };

    // Check if reset is needed (any filter differs from reset state)
    // Reset state: first profile, campaigns for first profile, all prospect statuses, all advanced filters disabled, empty search
    const expectedResetProfiles = allProfiles.length > 0 ? [allProfiles[0]] : [];
    const expectedResetCampaigns = allProfiles.length > 0 ? (profileCampaigns.get(allProfiles[0]) || []) : [];
    const isResetNeeded = 
        JSON.stringify(selectedProfiles.sort()) !== JSON.stringify(expectedResetProfiles.sort()) ||
        JSON.stringify(selectedCampaigns.sort()) !== JSON.stringify(expectedResetCampaigns.sort()) ||
        selectedProspectStatuses.length !== followupStatuses.length ||
        !selectedProspectStatuses.every(status => followupStatuses.includes(status)) ||
        leadPhaseFilterEnabled ||
        sentimentFilterEnabled ||
        crmFilterEnabled ||
        contactDetailsFilterEnabled ||
        taskDueDateFilterEnabled ||
        blacklistedFilterEnabled ||
        selectedLeadPhases.length > 0 ||
        selectedSentiments.length > 0 ||
        selectedCrm.length > 0 ||
        selectedContactDetails.length > 0 ||
        selectedTaskDueDates.length > 0 ||
        selectedBlacklisted.length > 0 ||
        searchCompanyName.trim() !== '' ||
        searchLinkedInUrl.trim() !== '';

    // Reset all filters function
    const resetAllFilters = () => {
        // Reset search fields
        setSearchCompanyName('');
        setSearchLinkedInUrl('');

        // Reset to first page
        setCurrentPage(1);

        // Reset to first profile and its campaigns (matching initial load behavior)
        if (allProfiles.length > 0) {
            const firstProfile = allProfiles[0];
            setSelectedProfiles([firstProfile]);

            // Also reset campaigns to match the first profile
            const availableCampaigns = profileCampaigns.get(firstProfile) || [];
            setSelectedCampaigns(availableCampaigns);
        }

        // Reset prospect statuses to follow-up statuses
        setSelectedProspectStatuses(followupStatuses);

        // Reset lead phases and sentiments to "no filter"
        setSelectedLeadPhases([]);
        setSelectedSentiments([]);

        // Clear the static filter option lists so they rebuild on next load
        setAllSentiments([]);

        // Disable advanced filters
        setLeadPhaseFilterEnabled(false);
        setSentimentFilterEnabled(false);
        setCrmFilterEnabled(false);
        setContactDetailsFilterEnabled(false);
        setTaskDueDateFilterEnabled(false);
        setBlacklistedFilterEnabled(false);

        // Reset CRM filter to no filter
        setSelectedCrm([]);

        // Reset Contact Details filter to no filter
        setSelectedContactDetails([]);

        // Reset Task Due Date filter to no filter
        setSelectedTaskDueDates([]);

        // Reset Blacklisted filter to no filter
        setSelectedBlacklisted([]);

        // Clear last applied filters so apply button becomes enabled
        setLastAppliedFilters(null);

        // Clear existing prospect data to force fresh load
        setProspects([]);
        setTotalProspects(0);
        setTotalPages(0);

        // Set flag to trigger fetch after state updates
        setIsResetting(true);
    };    // Function to apply client-side pagination with sorting (same as all_prospects)

    // Initialize data on component mount
    useEffect(() => {
        const initializeData = async () => {
            try {
                const token = getCookie('token');
                const storedUser = localStorage.getItem('user');

                if (!token || !storedUser) {
                    setLoading(false);
                    return;
                }

                const parsedUser: User = JSON.parse(storedUser);
                setUser(parsedUser);

                // Load filter options (profiles and campaigns)
                await fetchFilterOptions(parsedUser.uuid, token);

                // Initialize CRM filter to no filter (disabled by default)
                // Initialize Contact Details filter to no filter (disabled by default)
            } catch (error) {
                console.error('Error in initializeData:', error);
                setLoading(false);
            }
        };

        initializeData();
    }, []); // Empty dependency array - only run once on mount

    // Auto-load prospects when filters are ready
    useEffect(() => {
        if (selectedProfiles.length > 0 && selectedCampaigns.length > 0 && user && !hasAppliedFilters) {
            const token = getCookie('token');
            if (token) {
                fetchProspects(user.uuid, token, 1, 10);
            }
        }
    }, [selectedProfiles, selectedCampaigns, user]);

    // Update profiles dropdown based on selected profiles
    useEffect(() => {
        if (selectedProfiles.length > 0 && customerToProfilesMap.size > 0) {
            // Get the customer name from the first selected profile
            const firstSelectedProfile = selectedProfiles[0];
            const customerName = profileToCustomerMap.get(firstSelectedProfile);

            if (customerName) {
                // Get all profiles from the same customer
                const profilesFromSameCustomer = customerToProfilesMap.get(customerName) || [];
                
                // Always show all profiles from the same customer, regardless of campaigns
                setProfiles(profilesFromSameCustomer.sort());
            } else {
                // Fallback: show all profiles if customer not found
                setProfiles(allProfiles);
            }
        } else {
            // No selections, show all profiles
            setProfiles(allProfiles);
        }
    }, [selectedProfiles, allProfiles, profileToCustomerMap, customerToProfilesMap]);

    // Handle reset filter fetch
    useEffect(() => {
        if (isResetting && selectedProfiles.length > 0 && selectedCampaigns.length > 0 && user) {
            const token = getCookie('token');
            if (token) {
                fetchProspects(user.uuid, token, 1, 10);
            }
            setIsResetting(false);
        }
    }, [isResetting, selectedProfiles, selectedCampaigns, user]);

    // Update campaigns when selected profiles change
    useEffect(() => {
        if (selectedProfiles.length > 0 && profileCampaigns.size > 0) {
            const availableCampaigns = new Set<string>();
            selectedProfiles.forEach(profile => {
                const profileCamps = profileCampaigns.get(profile) || [];
                profileCamps.forEach(campaign => availableCampaigns.add(campaign));
            });
            const availableCampaignsArray = Array.from(availableCampaigns).sort();
            setCampaigns(availableCampaignsArray);

            // Filter selectedCampaigns to only include campaigns that are still available
            const filteredSelectedCampaigns = selectedCampaigns.filter(campaign =>
                availableCampaigns.has(campaign)
            );
            if (filteredSelectedCampaigns.length !== selectedCampaigns.length) {
                setSelectedCampaigns(filteredSelectedCampaigns);
            }
        } else {
            // When no profiles selected, show no campaigns
            setCampaigns([]);
            setSelectedCampaigns([]);
        }
    }, [selectedProfiles, profileCampaigns]);

    // Ensure currentPage is in range
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    // Handlers for pagination buttons
    const handlePrevPage = () => {
        const newPage = Math.max(currentPage - 1, 1);
        const filters = hasAppliedFilters && lastAppliedFilters 
            ? { ...lastAppliedFilters, page: newPage, pageSize }
            : { page: newPage, pageSize };
        const token = getCookie('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            const parsedUser: User = JSON.parse(storedUser);
            fetchProspects(parsedUser.uuid, token, newPage, pageSize);
        }
    };
    const handleNextPage = () => {
        const newPage = Math.min(currentPage + 1, totalPages);
        const filters = hasAppliedFilters && lastAppliedFilters 
            ? { ...lastAppliedFilters, page: newPage, pageSize }
            : { page: newPage, pageSize };
        const token = getCookie('token');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            const parsedUser: User = JSON.parse(storedUser);
            fetchProspects(parsedUser.uuid, token, newPage, pageSize);
        }
    };

    return (
        <div className="min-h-screen bg-gray-0">
            {/* Show navigation even without user for debugging */}
            {user && <Navigation user={user} onLogout={handleLogout} currentPage="Follow-up" pageIcon={FaPeopleGroup} />}

            <div className="max-w-7xl mx-auto px-6 mt-6">
                {/* Filter Bar */}
                <div className="bg-white shadow-md rounded-lg p-4 mb-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-4 w-full">
                        {/* Main Filters Row */}
                        <div className={`flex flex-col md:flex-row ${expandedMainFilters.size > 0 ? 'md:items-start' : 'md:items-center'} gap-4 w-full`}>
                            {/* Profile Filter */}
                            <div className="w-full md:w-46">
                                <MultiSelect
                                    options={profiles.map(profile => ({ value: profile, label: profile }))}
                                    selectedValues={selectedProfiles}
                                    onChange={(values) => {
                                        // If no profiles are currently selected, allow any selection
                                        if (selectedProfiles.length === 0) {
                                            setSelectedProfiles(values);
                                        } else {
                                            // Get the customer of currently selected profiles
                                            const currentCustomer = profileToCustomerMap.get(selectedProfiles[0]);
                                            
                                            if (currentCustomer) {
                                                // Get all valid profiles for this customer
                                                const validProfilesForCustomer = customerToProfilesMap.get(currentCustomer) || [];
                                                
                                                // Filter the new values to only include profiles from the same customer
                                                const validValues = values.filter(profile => 
                                                    validProfilesForCustomer.includes(profile)
                                                );
                                                
                                                setSelectedProfiles(validValues);
                                            } else {
                                                setSelectedProfiles(values);
                                            }
                                        }
                                        
                                        // Only auto-select campaigns if not initializing
                                        if (!isInitializing) {
                                            // Select all campaigns from the selected profiles
                                            const campaignsFromProfiles = new Set<string>();
                                            values.forEach(profile => {
                                                const profileCamps = profileCampaigns.get(profile) || [];
                                                profileCamps.forEach(campaign => campaignsFromProfiles.add(campaign));
                                            });
                                            setSelectedCampaigns(Array.from(campaignsFromProfiles));
                                        }
                                        
                                        setCurrentPage(1);
                                    }}
                                    title="Profiles"
                                    isExpanded={expandedMainFilters.has('profiles')}
                                    onExpandedChange={(isExpanded) => handleMainFilterExpandedChange('profiles', isExpanded)}
                                    showAllOption={false}
                                />
                            </div>
                            {/* Campaign Filter */}
                            <div className="w-full md:w-46">
                                {campaigns.length === 0 ? (
                                    <div className="border border-gray-300 rounded-md bg-gray-50 p-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">Campaigns</span>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500 italic text-center py-4">
                                            No campaigns available for selected profile(s)
                                        </div>
                                    </div>
                                ) : (
                                    <MultiSelect
                                        options={campaigns.map(campaign => ({ value: campaign, label: campaign }))}
                                        selectedValues={selectedCampaigns}
                                        onChange={(values) => {
                                            setSelectedCampaigns(values);
                                            setCurrentPage(1);
                                        }}
                                        title="Campaigns"
                                        isExpanded={expandedMainFilters.has('campaigns')}
                                        onExpandedChange={(isExpanded) => handleMainFilterExpandedChange('campaigns', isExpanded)}
                                    />
                                )}
                            </div>
                            {/* Prospect Status Filter */}
                            <div className="w-full md:w-46">
                                <MultiSelect
                                    options={prospectStatusFilterOptions}
                                    selectedValues={selectedProspectStatuses}
                                    onChange={(values) => {
                                        setSelectedProspectStatuses(values);
                                        setCurrentPage(1);
                                    }}
                                    title="Prospect Status"
                                    isExpanded={expandedMainFilters.has('prospect-status')}
                                    onExpandedChange={(isExpanded) => handleMainFilterExpandedChange('prospect-status', isExpanded)}
                                />
                            </div>
                            {/* Company Name Search */}
                            <div className="w-full md:w-46 relative">
                                <input
                                    id="companyNameSearch"
                                    type="text"
                                    placeholder="Search by Company Name..."
                                    value={searchCompanyName}
                                    onChange={(e) => {
                                        setSearchCompanyName(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !isApplyingFilters && !areFiltersUnchanged()) applyFilters(); }}
                                    className="block w-full p-2 pr-8 border border-gray-300 rounded-md shadow-sm text-sm placeholder:text-xs focus:ring-blue-500 focus:border-blue-500"
                                />
                                {searchCompanyName && (
                                    <button
                                        onClick={() => {
                                            setSearchCompanyName('');
                                            setCurrentPage(1);
                                        }}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                        title="Clear company search"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </button>
                                )}
                            </div>
                            {/* Profile URL Search */}
                            <div className="w-full md:w-46 relative">
                                <input
                                    id="profileUrlSearch"
                                    type="text"
                                    placeholder="Search by LinkedIn URL..."
                                    value={searchLinkedInUrl}
                                    onChange={(e) => {
                                        setSearchLinkedInUrl(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !isApplyingFilters && !areFiltersUnchanged()) applyFilters(); }}
                                    className="block w-full p-2 pr-8 border border-gray-300 rounded-md shadow-sm text-sm placeholder:text-xs focus:ring-blue-500 focus:border-blue-500"
                                />
                                {searchLinkedInUrl && (
                                    <button
                                        onClick={() => {
                                            setSearchLinkedInUrl('');
                                            setCurrentPage(1);
                                        }}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                        title="Clear LinkedIn URL search"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </button>
                                )}
                            </div>
                            {/* Apply Filters Button */}
                            <div className="w-full md:w-auto">
                                <button
                                    onClick={() => {
                                        applyFilters();
                                    }}
                                    disabled={isApplyingFilters || areFiltersUnchanged()}
                                    title={areFiltersUnchanged() ? "Filters are already applied" : "Filter"}
                                    className="h-[38px] px-3 bg-[#364570] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[#2a3654] focus:ring-2 focus:ring-[#364570] focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors duration-200"
                                >
                                    {isApplyingFilters ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                        <FaFilter className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Advanced Filters Toggle and Reset Button Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1 transition-colors duration-200"
                                >
                                    <span>Advanced Filters</span>
                                    <svg
                                        className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </button>

                                {totalProspects > 0 && (
                                    <button
                                        onClick={() => setShowExportSection(!showExportSection)}
                                        className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1 transition-colors duration-200"
                                    >
                                        <span>Export</span>
                                        <svg
                                            className={`w-4 h-4 transition-transform ${showExportSection ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={resetAllFilters}
                                    title={isResetNeeded ? "Reset Filters" : "All filters are already at default settings"}
                                    disabled={!isResetNeeded}
                                    className={`h-[38px] px-3 bg-[#364570] text-white rounded-md shadow-sm text-sm font-medium flex items-center justify-center gap-2 transition-colors duration-200 ${
                                        isResetNeeded 
                                            ? 'hover:bg-[#2a3654] focus:ring-2 focus:ring-[#364570] focus:ring-offset-2' 
                                            : 'opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    <RiResetLeftFill className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Advanced Filters Row */}
                        {showAdvancedFilters && (
                            <div className={`flex flex-col md:flex-row gap-4 w-full border-t border-gray-200 pt-4`}>
                                {/* Lead Phase Filter */}
                                <div className="w-full md:w-46">
                                    <div className="border border-gray-300 rounded-md bg-white">
                                        <div className="p-2 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">Lead Phase</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={leadPhaseFilterEnabled}
                                                    onChange={(e) => {
                                                        setLeadPhaseFilterEnabled(e.target.checked);
                                                        if (!e.target.checked) {
                                                            setSelectedLeadPhases([]);
                                                        }
                                                        setCurrentPage(1);
                                                    }}
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                        {leadPhaseFilterEnabled && (
                                            <MultiSelect
                                                options={leadPhaseFilterOptions}
                                                selectedValues={selectedLeadPhases}
                                                onChange={(values) => {
                                                    setSelectedLeadPhases(values);
                                                    setCurrentPage(1);
                                                }}
                                                title=""
                                                isExpanded={leadPhaseFilterEnabled}
                                                showHeader={false}
                                            />
                                        )}
                                    </div>
                                </div>
                                {/* Sentiment Filter */}
                                <div className="w-full md:w-46">
                                    <div className="border border-gray-300 rounded-md bg-white">
                                        <div className="p-2 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">Sentiment</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={sentimentFilterEnabled}
                                                    onChange={(e) => {
                                                        setSentimentFilterEnabled(e.target.checked);
                                                        if (!e.target.checked) {
                                                            setSelectedSentiments([]);
                                                        }
                                                        setCurrentPage(1);
                                                    }}
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                        {sentimentFilterEnabled && (
                                            <MultiSelect
                                                options={sentimentFilterOptions}
                                                selectedValues={selectedSentiments}
                                                onChange={(values) => {
                                                    setSelectedSentiments(values);
                                                    setCurrentPage(1);
                                                }}
                                                title=""
                                                isExpanded={sentimentFilterEnabled}
                                                showHeader={false}
                                            />
                                        )}
                                    </div>
                                </div>
                                {/* CRM Filter */}
                                <div className="w-full md:w-46">
                                    <div className="border border-gray-300 rounded-md bg-white">
                                        <div className="p-2 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">CRM</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={crmFilterEnabled}
                                                    onChange={(e) => {
                                                        setCrmFilterEnabled(e.target.checked);
                                                        if (!e.target.checked) {
                                                            setSelectedCrm([]);
                                                        }
                                                        setCurrentPage(1);
                                                    }}
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                        {crmFilterEnabled && (
                                            <MultiSelect
                                                options={crmFilterOptions}
                                                selectedValues={selectedCrm}
                                                onChange={(values) => {
                                                    setSelectedCrm(values);
                                                    setCurrentPage(1);
                                                }}
                                                title=""
                                                isExpanded={crmFilterEnabled}
                                                showAllOption={false}
                                                singleSelect={true}
                                                showHeader={false}
                                            />
                                        )}
                                    </div>
                                </div>
                                {/* Contact Details Filter */}
                                <div className="w-full md:w-46">
                                    <div className="border border-gray-300 rounded-md bg-white">
                                        <div className="p-2 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">Contact Details</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={contactDetailsFilterEnabled}
                                                    onChange={(e) => {
                                                        setContactDetailsFilterEnabled(e.target.checked);
                                                        if (!e.target.checked) {
                                                            setSelectedContactDetails([]);
                                                        }
                                                        setCurrentPage(1);
                                                    }}
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                        {contactDetailsFilterEnabled && (
                                            <MultiSelect
                                                options={contactDetailsFilterOptions}
                                                selectedValues={selectedContactDetails}
                                                onChange={(values) => {
                                                    setSelectedContactDetails(values);
                                                    setCurrentPage(1);
                                                }}
                                                title=""
                                                isExpanded={contactDetailsFilterEnabled}
                                                showHeader={false}
                                            />
                                        )}
                                    </div>
                                </div>
                                {/* Task Due Date Filter */}
                                <div className="w-full md:w-46">
                                    <div className="border border-gray-300 rounded-md bg-white">
                                        <div className="p-2 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">Internal Task</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={taskDueDateFilterEnabled}
                                                    onChange={(e) => {
                                                        setTaskDueDateFilterEnabled(e.target.checked);
                                                        if (!e.target.checked) {
                                                            setSelectedTaskDueDates([]);
                                                        }
                                                        setCurrentPage(1);
                                                    }}
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                        {taskDueDateFilterEnabled && (
                                            <MultiSelect
                                                options={[
                                                    { value: 'no_internal_task', label: 'No Internal Task' },
                                                    { value: 'overdue', label: 'Overdue' },
                                                    { value: 'today', label: 'Today' },
                                                    { value: 'future', label: 'Future' }
                                                ]}
                                                selectedValues={selectedTaskDueDates}
                                                onChange={(values) => {
                                                    setSelectedTaskDueDates(values);
                                                    setCurrentPage(1);
                                                }}
                                                title=""
                                                isExpanded={taskDueDateFilterEnabled}
                                                showHeader={false}
                                            />
                                        )}
                                    </div>
                                </div>
                                {/* Blacklisted Filter */}
                                <div className="w-full md:w-46">
                                    <div className="border border-gray-300 rounded-md bg-white">
                                        <div className="p-2 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-700">Blacklisted</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={blacklistedFilterEnabled}
                                                    onChange={(e) => {
                                                        setBlacklistedFilterEnabled(e.target.checked);
                                                        if (!e.target.checked) {
                                                            setSelectedBlacklisted([]);
                                                        }
                                                        setCurrentPage(1);
                                                    }}
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                        {blacklistedFilterEnabled && (
                                            <MultiSelect
                                                options={[
                                                    { value: 'Yes', label: 'Blacklisted' },
                                                    { value: 'No', label: 'Not Blacklisted' }
                                                ]}
                                                selectedValues={selectedBlacklisted}
                                                onChange={(values) => {
                                                    setSelectedBlacklisted(values);
                                                    setCurrentPage(1);
                                                }}
                                                title=""
                                                isExpanded={blacklistedFilterEnabled}
                                                showAllOption={false}
                                                singleSelect={true}
                                                showHeader={false}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Export Section */}
                        {showExportSection && totalProspects > 0 && (
                            <div className={`flex flex-col gap-4 w-full border-t border-gray-200 pt-4`}>
                                <div className="flex flex-wrap gap-3 items-center">
                                    <span className="text-sm font-medium text-gray-700 mr-2">Export {Math.min(totalProspects, 5000)} Prospect{Math.min(totalProspects, 5000) === 1 ? '' : 's'}:</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleExportProspects()}
                                            disabled={isExporting}
                                            className="h-[38px] px-3 bg-green-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors duration-200"
                                            title="Export as Excel file"
                                        >
                                            {isExporting ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            ) : (
                                                <FaFileExcel className="w-4 h-4" />
                                            )}
                                            Excel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Leads List */}
                <div className="overflow-hidden">
                    {loading ? (
                    <p className="text-gray-600 text-lg">Loading leads...</p>
                    ) : isApplyingFilters ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600 text-lg">Loading leads...</p>
                    </div>
                    ) : prospects.length === 0 ? (
                    <p className="text-gray-600 text-lg">No leads found for the current filters.</p>
                    ) : (
                    <>
                        {/* Header row */}
                        <div className="hidden md:flex items-center px-6 py-2 mb-2 bg-gray-100 rounded-t-lg shadow-sm font-semibold text-gray-600 text-sm">
                            <div className="w-[130px] flex-shrink-0 text-left">Status</div>
                            <div className="flex-1 min-w-0 text-left">Prospect</div>
                            <div className="w-[200px] flex-shrink-0 text-left">Primary Action</div>
                            <div className="w-[350px] flex-shrink-0 text-left">Update & Schedule</div>
                        </div>

                        <div className="flex flex-col gap-4">
                            {prospects.map((prospect, index) => {
                                const startIndex = (currentPage - 1) * pageSize;
                                return (
                                <div
                                key={prospect.id || `${prospect.prospect_id}-${index}`}
                                className="bg-white shadow-xl rounded-lg p-4 w-[99%] mx-auto flex flex-col md:flex-row items-stretch gap-4 hover:scale-[1.005] transition-all duration-200 cursor-pointer"
                                >
                                    {/* Column 1: Prospect Info */}
                                    <div className="flex-1 flex items-start gap-x-4 w-full md:w-auto min-w-0">
                                    {/* Status */}
                                        <div className="w-[120px] flex-shrink-0 flex flex-col items-center h-full pt-2">
                                            {prospect.prospect_status === 'Revoked' ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <MdBlock className="text-2xl text-red-600 flex-shrink-0" />
                                                    <span className="text-xs font-semibold text-center text-white bg-red-600 px-2 py-1 rounded-md w-28">
                                                        Revoked
                                                    </span>
                                                    {prospect.blacklisted && (
                                                        <span className="text-xs font-semibold text-center px-2 py-1 rounded-md w-28 bg-red-600 text-white flex items-center justify-center gap-1 mt-1">
                                                            <MdBlock className="text-sm" /> Blacklisted
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (prospect.prospect_status === 'Awaiting reply') ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <FcAlarmClock className="text-2xl flex-shrink-0"/>
                                                    <span className="text-xs font-semibold text-center text-yellow-800 bg-yellow-100 px-2 py-1 rounded-md w-28">
                                                        Chatter Task
                                                    </span>
                                                    
                                                    <div className="mt-2 w-28">
                                                        <div className="bg-gray-50 border border-gray-200 rounded-md p-2 text-center">
                                                            <div className="text-xs font-medium text-gray-600 mb-1">Due Date</div>
                                                            <div className="text-xs text-gray-900 font-semibold">
                                                                {prospect.awaiting_reply_task ? new Date(prospect.awaiting_reply_task.due_date).toLocaleDateString() : 'No Task'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {prospect.internal_task && prospect.internal_task.task_status === 'open' && (
                                                        <div className="mt-2 w-28">
                                                            <div className="bg-gray-50 border border-gray-200 rounded-md p-2 text-center">
                                                                <div className="text-xs font-medium text-gray-600 mb-1">
                                                                    Internal Task Due Date
                                                                </div>
                                                                <div className="text-xs text-gray-900 font-semibold mb-2">
                                                                    {new Date(prospect.internal_task.due_date).toLocaleDateString()}
                                                                </div>
                                                                <div className="flex justify-center">
                                                                    <button
                                                                        onClick={() => handleFinishInternalTask(prospect)}
                                                                        className="text-gray-400 hover:text-green-500 transition-colors cursor-pointer"
                                                                        title="Complete Task"
                                                                    >
                                                                        <FaRegCheckSquare className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : prospect.prospect_status !== 'Checked' && !checkedProspects.has(prospect.prospect_id) ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <button
                                                        title="Mark as Checked"
                                                        aria-label="Mark as Checked"
                                                        onClick={() => handleMarkAsChecked(prospect)}
                                                        className="group flex flex-col items-center gap-1 p-0"
                                                        disabled={isMarkingChecked}
                                                    >
                                                        <BiTask className="text-2xl text-gray-700 group-hover:text-green-600 flex-shrink-0" />
                                                        <span className="text-xs font-semibold text-center text-gray-700 bg-gray-200 group-hover:bg-gray-300 px-2 py-1 rounded-md w-28">
                                                            {isMarkingChecked ? 'Checking...' : 'Check'}
                                                        </span>
                                                    </button>
                                                    {prospect.internal_task && prospect.internal_task.task_status === 'open' && (
                                                        <div className="mt-2 w-28">
                                                            <div className="bg-gray-50 border border-gray-200 rounded-md p-2 text-center">
                                                                <div className="text-xs font-medium text-gray-600 mb-1">
                                                                    Internal Task Due Date
                                                                </div>
                                                                <div className="text-xs text-gray-900 font-semibold mb-2">
                                                                    {new Date(prospect.internal_task.due_date).toLocaleDateString()}
                                                                </div>
                                                                <div className="flex justify-center">
                                                                    <button
                                                                        onClick={() => handleFinishInternalTask(prospect)}
                                                                        className="text-gray-400 hover:text-green-500 transition-colors cursor-pointer"
                                                                        title="Complete Task"
                                                                    >
                                                                        <FaRegCheckSquare className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <button
                                                        title="Revert to Check"
                                                        aria-label="Revert to Check"
                                                        onClick={() => handleMarkAsCheck(prospect)}
                                                        className="group flex flex-col items-center gap-1 p-0"
                                                        style={{ background: 'none', border: 'none' }}
                                                        disabled={isMarkingCheck}
                                                    >
                                                        {/* Show green check icon by default, BiTask on hover */}
                                                        <span className="relative w-full flex flex-col items-center">
                                                            <span className="group-hover:hidden">
                                                                <FaCheckCircle className="text-2xl text-green-500 flex-shrink-0" />
                                                            </span>
                                                            <span className="hidden group-hover:inline">
                                                                <BiTask className="text-2xl text-gray-700 group-hover:text-gray-700 flex-shrink-0" />
                                                            </span>
                                                        </span>
                                                        <span
                                                            className="text-xs font-semibold text-center px-2 py-1 rounded-md w-28
                                                                bg-green-100 text-green-800
                                                                group-hover:bg-gray-200 group-hover:text-gray-700"
                                                        >
                                                            <span className="group-hover:hidden">{isMarkingCheck ? 'Reverting...' : 'Checked'}</span>
                                                            <span className="hidden group-hover:inline">{isMarkingCheck ? 'Reverting...' : 'Back to Check'}</span>
                                                        </span>
                                                    </button>
                                                    {prospect.internal_task && prospect.internal_task.task_status === 'open' && (
                                                        <div className="mt-2 w-28">
                                                            <div className="bg-gray-50 border border-gray-200 rounded-md p-2 text-center">
                                                                <div className="text-xs font-medium text-gray-600 mb-1">
                                                                    Internal Task Due Date
                                                                </div>
                                                                <div className="text-xs text-gray-900 font-semibold mb-2">
                                                                    {new Date(prospect.internal_task.due_date).toLocaleDateString()}
                                                                </div>
                                                                <div className="flex justify-center">
                                                                    <button
                                                                        onClick={() => handleFinishInternalTask(prospect)}
                                                                        className="text-gray-400 hover:text-green-500 transition-colors cursor-pointer"
                                                                        title="Complete Task"
                                                                    >
                                                                        <FaRegCheckSquare className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {prospect.prospect_status !== 'Revoked' && prospect.blacklisted && (
                                                <span className="text-xs font-semibold text-center px-2 py-1 rounded-md w-28 bg-red-600 text-white flex items-center justify-center gap-1 mt-1">
                                                    <MdBlock className="text-sm" /> Blacklisted
                                                </span>
                                            )}
                                        </div>
        
                                        {/* Prospect Info */}
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-lg text-gray-900 mb-2">
                                            <a
                                                href={prospect.linkedin_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline text-md"
                                            >
                                                {prospect.first_name} {prospect.last_name}
                                            </a>
                                            </h2>
                                            <p
                                                className="text-md text-gray-700 truncate"
                                                title={
                                                    prospect.company_name
                                                    ? `${prospect.job_title} at ${prospect.company_name}`
                                                    : prospect.job_title
                                                }
                                                >
                                                {prospect.job_title}
                                                {prospect.company_name ? ` at ${prospect.company_name}` : ''}
                                            </p>
                                            <p className="text-gray-500 text-sm truncate mt-2" title={`Campaign name: ${prospect.campaign_name}`}>
                                                Campaign name: {prospect.campaign_name}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-2">
                                                Date last message received: {
                                                    prospect.last_prospect_message_date ? (
                                                        prospect.last_prospect_message_date.toLocaleDateString()
                                                    ) : (
                                                        <span className="text-gray-400 italic">No messages received</span>
                                                    )
                                                }
                                            </p>
                                            <div className="text-sm text-gray-500 mt-2">
                                                <TagsDisplay tags={prospect.tags_relation} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Column 2: Primary Actions */}
                                    <div className="w-full md:w-[200px] flex-shrink-0 flex flex-col justify-start items-start gap-4">
                                        <div className="flex flex-col gap-2 w-full">
                                            <button
                                                className="btn btn-primary px-4 py-3 rounded text-xs font-semibold flex items-center justify-center gap-1"
                                                onClick={() => handleViewChat(prospect.profile_id, prospect.prospect_id, prospect)}
                                                >
                                                <FaRegComments className="text-sm" />
                                                View Chat
                                            </button>
                                            {CRMUsers.includes(user?.username || '') && (
                                                <button
                                                    className={`btn px-4 py-3 rounded text-xs font-semibold flex items-center justify-center gap-1 btn-secondary ${
                                                        (prospect.crm || sentToCrmProspects.has(prospect.prospect_id)) ? 'opacity-75 cursor-not-allowed' : ''
                                                    }`}
                                                    onClick={() => handleTriggerZap(prospect)}
                                                    disabled={prospect.crm || sentToCrmProspects.has(prospect.prospect_id)}
                                                    {...(prospect.crm || sentToCrmProspects.has(prospect.prospect_id) ? { title: prospect.crm ? 'Already in CRM' : 'Sent to CRM' } : {})}
                                                    >
                                                    <FiSend className="text-sm" />
                                                    Send to CRM
                                                </button>
                                            )}
                                        </div>
                                        <div className="w-full flex flex-col gap-1">
                                            <p className="text-sm text-gray-500 flex items-center gap-2">
                                                <FaPhoneAlt className="text-xs" />
                                                {prospect.phone && prospect.phone !== '.' ? (
                                                    <span>{prospect.phone}</span>
                                                ) : (
                                                    <span className="text-gray-300 italic">not available</span>
                                                )}
                                            </p>
                                            <p className="text-sm text-gray-500 flex items-center gap-2">
                                                <FaEnvelope className="text-xs" />
                                                {prospect.email && prospect.email !== '.' ? (
                                                    <span>{prospect.email}</span>
                                                ) : (
                                                    <span className="text-gray-300 italic">not available</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Column 3: Update & Schedule */}
                                    <div className="w-full md:w-[350px] flex-shrink-0 flex flex-col gap-4">
                                        <div className="border border-gray-300 rounded-md bg-white">
                                            {/* Selector Dropdown */}
                                            <div className="p-2 bg-gray-50 border-b border-gray-300">
                                                <select
                                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-medium text-gray-700 cursor-pointer"
                                                    value={leadData[prospect.prospect_id]?.selectedView ?? 'lead-phase'}
                                                    onChange={(e) => {
                                                        setLeadData((prev) => ({
                                                            ...prev,
                                                            [prospect.prospect_id]: {
                                                                ...prev[prospect.prospect_id],
                                                                selectedView: e.target.value as 'lead-phase' | 'chatter-task' | 'internal-task',
                                                            },
                                                        }));
                                                    }}
                                                >
                                                    <option value="lead-phase">Lead Phase & Note</option>
                                                    {(prospect.prospect_status === 'Check' || prospect.prospect_status === 'Awaiting reply') && (
                                                        <option value="chatter-task">Chatter Task</option>
                                                    )}
                                                    <option value="internal-task">Internal Task</option>
                                                </select>
                                            </div>

                                            {/* Lead Phase View */}
                                            {(leadData[prospect.prospect_id]?.selectedView ?? 'lead-phase') === 'lead-phase' && (
                                                <div className="p-2 flex flex-col gap-2">
                                                    <select
                                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                                        value={leadData[prospect.prospect_id]?.phase ?? prospect.lead_phase ?? ''}
                                                        onChange={(e) =>
                                                            setLeadData((prev) => ({
                                                                ...prev,
                                                                [prospect.prospect_id]: {
                                                                    ...prev[prospect.prospect_id],
                                                                    phase: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    >
                                                        <option value="">Select Lead Phase</option>
                                                        {leadPhaseOptions.map((option) => (
                                                            <option key={option} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <textarea
                                                        placeholder="Lead Phase Note"
                                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                                        rows={3}
                                                        value={leadData[prospect.prospect_id]?.note ?? prospect.lead_note?.content ?? ''}
                                                        onChange={(e) =>
                                                            setLeadData((prev) => ({
                                                                ...prev,
                                                                [prospect.prospect_id]: {
                                                                    ...prev[prospect.prospect_id],
                                                                    note: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                    <button
                                                        className="btn btn-secondary px-3 py-1 text-xs font-semibold flex items-center justify-center gap-1"
                                                        onClick={() => handleSaveLeadPhase(prospect)}
                                                        disabled={isSavingLeadPhase}
                                                    >
                                                        <FaSave className="text-sm" />
                                                        {isSavingLeadPhase ? 'Saving...' : 'Save'}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Chatter Task View */}
                                            {(leadData[prospect.prospect_id]?.selectedView ?? 'lead-phase') === 'chatter-task' && (
                                                <div className="p-2 flex flex-col gap-2">
                                                    <div className="relative">
                                                        <textarea
                                                            placeholder="Chatter Note"
                                                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm pr-8"
                                                            rows={3}
                                                            value={leadData[prospect.prospect_id]?.chatterNote ?? ''}
                                                            onChange={(e) =>
                                                                setLeadData((prev) => ({
                                                                    ...prev,
                                                                    [prospect.prospect_id]: {
                                                                        ...prev[prospect.prospect_id],
                                                                        chatterNote: e.target.value,
                                                                    },
                                                                }))
                                                            }
                                                            disabled={prospect.prospect_status === 'Awaiting reply'}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedProspectForHistory({
                                                                    ...prospect,
                                                                    chatter_note: [
                                                                        ...(prospect.chatter_note || []),
                                                                        ...(leadData[prospect.prospect_id]?.chatterNote ? [{
                                                                            content: leadData[prospect.prospect_id].chatterNote,
                                                                            date: new Date().toISOString(),
                                                                            creator: user?.username || 'Unknown'
                                                                        }] : [])
                                                                    ]
                                                                });
                                                                setShowChatHistory(true);
                                                            }}
                                                            className="absolute top-1 right-1 text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-100"
                                                            title="View Chatter Note History"
                                                        >
                                                            <RiChatHistoryLine className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            type="date"
                                                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm cursor-pointer"
                                                            value={dateChatterTask[prospect.prospect_id]?.date_task || ''}
                                                            onClick={(e) => {
                                                                if (e.currentTarget.showPicker) {
                                                                    e.currentTarget.showPicker();
                                                                } else {
                                                                    e.currentTarget.focus();
                                                                }
                                                            }}
                                                            onChange={(e) =>
                                                                setdateChatterTask((prev) => ({
                                                                    ...prev,
                                                                    [prospect.prospect_id]: {
                                                                        ...prev[prospect.prospect_id],
                                                                        date_task: e.target.value,
                                                                    },
                                                                }))
                                                            }
                                                            disabled={prospect.prospect_status === 'Awaiting reply'}
                                                        />
                                                    </div>
                                                    <button
                                                        className={`btn px-4 py-2 rounded text-xs font-semibold w-full flex items-center justify-center gap-1 ${
                                                            (prospect.prospect_status === 'Awaiting reply' || createdChatterTasks.has(prospect.prospect_id)) ? 'btn-secondary opacity-75 cursor-not-allowed' : 'btn-primary'
                                                        }`}
                                                        onClick={() =>
                                                            handleChatterTask(
                                                                dateChatterTask[prospect.prospect_id]?.date_task,
                                                                prospect
                                                            )
                                                        }
                                                        disabled={prospect.prospect_status === 'Awaiting reply' || createdChatterTasks.has(prospect.prospect_id) || isCreatingTask}
                                                        {...((prospect.prospect_status === 'Awaiting reply' || createdChatterTasks.has(prospect.prospect_id)) ? { title: prospect.prospect_status === 'Awaiting reply' ? 'Already a Chatter Task' : 'Chatter Task Created' } : {})}
                                                    >
                                                        <FaCalendarPlus className="text-sm" />
                                                        {isCreatingTask ? 'Creating...' : 'Create Chatter Task'}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Internal Task View */}
                                            {(leadData[prospect.prospect_id]?.selectedView ?? 'lead-phase') === 'internal-task' && (
                                                <div className="p-2 flex flex-col gap-2">
                                                    <div className="relative">
                                                        <textarea
                                                            placeholder="Internal Task Note"
                                                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm pr-8"
                                                            rows={3}
                                                            value={leadData[prospect.prospect_id]?.internalNote ?? ''}
                                                            onChange={(e) =>
                                                                setLeadData((prev) => ({
                                                                    ...prev,
                                                                    [prospect.prospect_id]: {
                                                                        ...prev[prospect.prospect_id],
                                                                        internalNote: e.target.value,
                                                                    },
                                                                }))
                                                            }
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedProspectForInternalNote({
                                                                    ...prospect,
                                                                    internal_note: [
                                                                        ...(prospect.internal_note || []),
                                                                        ...(prospect.internal_task?.note || [])
                                                                    ]
                                                                });
                                                                setShowInternalNoteHistory(true);
                                                            }}
                                                            className="absolute top-1 right-1 text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-100"
                                                            title="View Internal Task Note History"
                                                        >
                                                            <RiChatHistoryLine className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            type="date"
                                                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm cursor-pointer"
                                                            value={dateInternalTask[prospect.prospect_id]?.date_task || ''}
                                                            onClick={(e) => {
                                                                if (e.currentTarget.showPicker) {
                                                                    e.currentTarget.showPicker();
                                                                } else {
                                                                    e.currentTarget.focus();
                                                                }
                                                            }}
                                                            onChange={(e) =>
                                                                setDateInternalTask((prev) => ({
                                                                    ...prev,
                                                                    [prospect.prospect_id]: {
                                                                        ...prev[prospect.prospect_id],
                                                                        date_task: e.target.value,
                                                                    },
                                                                }))
                                                            }
                                                        />
                                                    </div>
                                                    {createdInternalTasks.has(prospect.prospect_id) ? (
                                                        <button
                                                            disabled
                                                            className="btn btn-secondary px-4 py-2 rounded text-xs font-semibold w-full"
                                                        >
                                                            Created Internal Task
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="btn btn-primary px-4 py-2 rounded text-xs font-semibold w-full flex items-center justify-center gap-1"
                                                            onClick={() =>
                                                                handleInternalTask(
                                                                    dateInternalTask[prospect.prospect_id]?.date_task,
                                                                    prospect
                                                                )
                                                            }
                                                            disabled={isCreatingTask}
                                                        >
                                                            <BiTask className="text-sm" />
                                                            {isCreatingTask ? 'Creating...' : 'Create Internal Task'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        <div className="mt-8">
                        <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalProspects}
                        itemsPerPage={pageSize}
                        onNext={handleNextPage}
                        onPrev={handlePrevPage}
                        />
                        </div>
                    </>
                    )}
                </div>
            </div>

            {/* Chat Popup Component */}
            <ChatPopUp
                isOpen={showPopup}
                onClose={() => setShowPopup(false)}
                prospect={selectedProspect}
                userUuid={user?.uuid}
            />

            {/* Chat History Widget */}
            <NoteHistoryPopup
                isOpen={showChatHistory}
                notes={selectedProspectForHistory?.chatter_note || []}
                title={`Chatter Note History - ${selectedProspectForHistory?.first_name} ${selectedProspectForHistory?.last_name}`}
                onClose={() => {
                    setShowChatHistory(false);
                    setSelectedProspectForHistory(null);
                }}
            />

            {/* Internal Note History Widget */}
            <InternalNoteHistoryPopup
                isOpen={showInternalNoteHistory}
                prospect={selectedProspectForInternalNote}
                onClose={() => {
                    setShowInternalNoteHistory(false);
                    setSelectedProspectForInternalNote(null);
                }}
            />
        </div>
    );
}