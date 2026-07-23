'use client';

import React, { useEffect, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import Pagination from '@/components/layout/Pagination';
import TotalsChart from '@/components/charts/TotalsChart';
import { MdCampaign } from "react-icons/md";
import { useRouter } from 'next/navigation';
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { LuMessageCircleCode } from "react-icons/lu";
import { TfiDashboard } from "react-icons/tfi";
import { getBackendUrl } from '@/lib/api-config';

interface Profile {
    profile_name: string;
    start_end?: {
    start_date: string;
    end_date: string;
    };
    customer_name: string;
    customer?: {
        customer_name: string;
    };
}

interface Customer {
    id: number;
    customer_name: string;
    lead_phase?: string;
    profiles: Profile[];
}

interface User {
    id: number;
    username: string;
    email: string;
    customers: Customer[];
    uuid: string;
    type: string;
}

interface Campaign {
    id: string;
    campaign_name: string;
    start_date: string;
    end_date: string;
    profile: Profile | null;
    requests_per_day: string;
    live: Boolean;
    campaign_type: string;
    campaign_prospects: {
        date_positive_tag: string | undefined;
        date_connected: string | undefined;
        date_connection_requested: string | undefined;
        date_replied: string | undefined;
        blacklisted: boolean | undefined;
        stop_outreach: boolean | undefined;
    }[];
    messages: {
        message_date: string | undefined;
    }[];
    Content?: any[]; 
}

export default function CampaignsPage() {
    const router = useRouter();

    // Helper function to check if user is Admin
    const isAdmin = (user: User | null): boolean => {
        return user?.type === 'Admin';
    };

    // Utility function to calculate date ranges
    const calculateDateRange = (weeksBack: number, isCurrentWeek: boolean = false): [Date, Date] => {
        const today = new Date();
        if (isCurrentWeek) {
            // Calculate current week Monday to Friday
            const dayOfWeek = today.getDay();
            const monday = new Date(today);
            monday.setDate(today.getDate() - dayOfWeek + 1);
            const friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            return [monday, friday];
        } else {
            // Calculate weeks back from today
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - (weeksBack * 7));
            return [startDate, today];
        }
    };

    // State declarations
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<string>('');
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [error, setError] = useState(false);
    const [liveFilter, setLiveFilter] = useState<'All' | 'Live' | 'NotLive'>('Live');
    const [campaignFilter, setCampaignFilter] = useState<'All' | 'Connector' | 'Messenger' | 'First Connections' | 'AI Campaign'>('All');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15; 
    const [sortKey, setSortKey] = useState<string>('live');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [managementSortKey, setManagementSortKey] = useState<string>('profile_name');
    const [managementSortOrder, setManagementSortOrder] = useState<'asc' | 'desc'>('asc');
    const [chatPopupOpen, setChatPopupOpen] = useState(false);
    const [chatPopupContent, setChatPopupContent] = useState<any[]>([]);
    const [chatPopupTitle, setChatPopupTitle] = useState<string>("");
    const [activeTab, setActiveTab] = useState<'charts' | 'performance' | 'management'>('charts');

    // Update activeTab when user is loaded - redirect non-admins from management tab
    useEffect(() => {
        if (user && !isAdmin(user) && activeTab === 'management') {
            setActiveTab('charts');
        }
    }, [user, activeTab]);

    // Update date filter state - remove dateFilter enum, use actual dates
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Management dashboard date strings
    const [managementStartDate, setManagementStartDate] = useState<string>('');
    const [managementEndDate, setManagementEndDate] = useState<string>('');

    // Date range picker state (default last 4 weeks)
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

    // Management dashboard date range (current week Mon-Fri)
    const [managementDateRange, setManagementDateRange] = useState<[Date | null, Date | null]>([null, null]);

    // Initialise date states on the client only to avoid hydration mismatch
    useEffect(() => {
        const fmt = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        const [s4, e4] = calculateDateRange(4);
        const [sm, em] = calculateDateRange(0, true);
        setStartDate(fmt(s4));
        setEndDate(fmt(e4));
        setManagementStartDate(fmt(sm));
        setManagementEndDate(fmt(em));
        setDateRange([s4, e4]);
        setManagementDateRange([sm, em]);
    }, []);
    
    const [startDateObj, endDateObj] = dateRange;
    const [managementStartDateObj, managementEndDateObj] = managementDateRange;

    // Custom input component
    const CustomDateInput = React.forwardRef<HTMLInputElement, any>(
    ({ value, onClick, placeholder }, ref) => (
        <div
        className="p-2 border border-gray-300 rounded-md text-xs w-full flex items-center justify-between cursor-pointer"
        onClick={onClick}
        >
        <span>{value || placeholder}</span>
        <FaCalendarAlt className="text-gray-500" />
        </div>
    )
    );

    CustomDateInput.displayName = "CustomDateInput";

    // Keep string dates in sync for filtering logic
    useEffect(() => {
        if (startDateObj && endDateObj) {
            // Use local date formatting to avoid timezone issues
            const startYear = startDateObj.getFullYear();
            const startMonth = String(startDateObj.getMonth() + 1).padStart(2, '0');
            const startDay = String(startDateObj.getDate()).padStart(2, '0');
            const endYear = endDateObj.getFullYear();
            const endMonth = String(endDateObj.getMonth() + 1).padStart(2, '0');
            const endDay = String(endDateObj.getDate()).padStart(2, '0');

            setStartDate(`${startYear}-${startMonth}-${startDay}`);
            setEndDate(`${endYear}-${endMonth}-${endDay}`);
        }
    }, [startDateObj, endDateObj]);

    // Keep management string dates in sync
    useEffect(() => {
        if (managementStartDateObj && managementEndDateObj) {
            // Use local date formatting to avoid timezone issues
            const startYear = managementStartDateObj.getFullYear();
            const startMonth = String(managementStartDateObj.getMonth() + 1).padStart(2, '0');
            const startDay = String(managementStartDateObj.getDate()).padStart(2, '0');
            const endYear = managementEndDateObj.getFullYear();
            const endMonth = String(managementEndDateObj.getMonth() + 1).padStart(2, '0');
            const endDay = String(managementEndDateObj.getDate()).padStart(2, '0');

            setManagementStartDate(`${startYear}-${startMonth}-${startDay}`);
            setManagementEndDate(`${endYear}-${endMonth}-${endDay}`);
        }
    }, [managementStartDateObj, managementEndDateObj]);

    // Chart stats (date-filtered for graph)
    const [chartStats, setChartStats] = useState<{
        requestsLeft: Record<string, number>;
        requestsSent: Record<string, number>;
        connectedCounts: Record<string, number>;
        connectedRates: Record<string, number>;
        repliedCounts: Record<string, number>;
        repliedRates: Record<string, number>;
        positiveCounts: Record<string, number>;
        positiveRates: Record<string, number>;
        totalRates: Record<string, number>;
        totals: {
            requestsLeft: number;
            requestsSent: number;
            connectedCounts: number;
            repliedCounts: number;
            positiveCounts: number;
        };
        averages: {
            connectedRates: number;
            repliedRates: number;
            positiveRates: number;
            totalRates: number;
        };
        dailyStats: Array<{ date: string, requestsSent: number, connectedCounts: number, repliedCounts: number, positiveCounts: number }>;
    }>({
        requestsLeft: {},
        requestsSent: {},
        connectedCounts: {},
        connectedRates: {},
        repliedCounts: {},
        repliedRates: {},
        positiveCounts: {},
        positiveRates: {},
        totalRates: {},
        totals: { requestsLeft: 0, requestsSent: 0, connectedCounts: 0, repliedCounts: 0, positiveCounts: 0 },
        averages: { connectedRates: 0, repliedRates: 0, positiveRates: 0, totalRates: 0 },
        dailyStats: []
    });

    // Table stats (all-time totals for table)
    const [tableStats, setTableStats] = useState<{
        requestsLeft: Record<string, number>;
        requestsSent: Record<string, number>;
        connectedCounts: Record<string, number>;
        connectedRates: Record<string, number>;
        repliedCounts: Record<string, number>;
        repliedRates: Record<string, number>;
        positiveCounts: Record<string, number>;
        positiveRates: Record<string, number>;
        totalRates: Record<string, number>;
        totals: {
            requestsLeft: number;
            requestsSent: number;
            connectedCounts: number;
            repliedCounts: number;
            positiveCounts: number;
        };
        averages: {
            connectedRates: number;
            repliedRates: number;
            positiveRates: number;
            totalRates: number;
        };
        dailyStats: Array<{ date: string, requestsSent: number, connectedCounts: number, repliedCounts: number, positiveCounts: number }>;
    }>({
        requestsLeft: {},
        requestsSent: {},
        connectedCounts: {},
        connectedRates: {},
        repliedCounts: {},
        repliedRates: {},
        positiveCounts: {},
        positiveRates: {},
        totalRates: {},
        totals: { requestsLeft: 0, requestsSent: 0, connectedCounts: 0, repliedCounts: 0, positiveCounts: 0 },
        averages: { connectedRates: 0, repliedRates: 0, positiveRates: 0, totalRates: 0 },
        dailyStats: []
    });
    
    // Get the cookie value by name
    const getCookie = (name: string): string | undefined => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return undefined;
    };

    // Fetch customer data for the logged-in user
    const fetchCustomerData = async (userUuid: string, token: string) => {
        const backendUrl = getBackendUrl();
        try {
        const params = new URLSearchParams({
            'populate[profile]': 'true',
            'populate[customers][populate][profiles][fields][0]': 'profile_name',
            'populate[customers][populate][profiles][populate][start_end]': 'true',
            'populate[customers][fields][0]': 'customer_name',
            'populate[customers][fields][1]': 'lead_phase',
        });
        const response = await fetch(
            `${backendUrl}/api/users-permissions/users/uuid/${userUuid}?${params.toString()}`,
            { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error(`Failed to fetch customers`);
        const userData = await response.json();
        const fetchedCustomers = userData.customers || [];

        // console.log('Fetched customers with phases:', fetchedCustomers.map(c => ({ name: c.customer_name, phase: c.lead_phase })));

        // Sort customers by lead_phase in the order: Active, Onboarding, Demo, Deactivated
        const phaseOrder = { 'Active': 1, 'Onboarding': 2, 'Demo': 3, 'Deactivated': 4 };
        const sortedCustomers = [...fetchedCustomers].sort((a: any, b: any) => {
            const aPhase = a.lead_phase || 'Deactivated';
            const bPhase = b.lead_phase || 'Deactivated';
            const aOrder = phaseOrder[aPhase as keyof typeof phaseOrder] || 4;
            const bOrder = phaseOrder[bPhase as keyof typeof phaseOrder] || 4;
            // console.log(`Comparing ${a.customer_name} (${aPhase}: ${aOrder}) vs ${b.customer_name} (${bPhase}: ${bOrder})`);
            return aOrder - bOrder;
        });

        // console.log('Sorted customers:', sortedCustomers.map(c => ({ name: c.customer_name, phase: c.lead_phase })));

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeProfiles = sortedCustomers.flatMap((customer: any) =>
            customer.profiles
            .filter((profile: any) => {
                if (profile.start_end?.end_date) {
                    const endDate = new Date(profile.start_end.end_date);
                    endDate.setHours(0, 0, 0, 0);
                    return endDate >= today;
                }
                return true;
            })
            .map((profile: any) => ({
                profile_name: profile.profile_name,
                customer_name: customer.customer_name,
            }))
        );
        // console.log('Active Profiles:', activeProfiles);

        const sortedProfiles = activeProfiles.sort((a, b) =>
            a.customer_name.localeCompare(b.customer_name)
        );

        setProfiles(sortedProfiles);
        setCustomers(sortedCustomers);

        // Set the first customer as default if available
        if (sortedCustomers.length > 0) {
            setSelectedCustomer(sortedCustomers[0].customer_name);
        }

        // If the user has a linked profile, auto-select it; otherwise fall back to first profile
        const userLinkedProfile = userData.profile;
        if (userLinkedProfile && sortedProfiles.some(p => p.profile_name === userLinkedProfile.profile_name)) {
            setSelectedProfile(userLinkedProfile.profile_name);
        } else if (sortedProfiles.length > 0) {
            setSelectedProfile(sortedProfiles[0].profile_name);
        }
        } catch (error) {
        console.error('Error fetching customer data:', error);
        }
    };

    useEffect(() => {
        const token = getCookie('token');
        const storedUser = localStorage.getItem('user');

        if (!token || !storedUser) {
            router.push('/auth/login');
            return;
        }

        // Check if user is an Admin or Customer
        const parsedUser: User = JSON.parse(storedUser);
        if (parsedUser.type !== 'Admin' && parsedUser.type !== 'Customer' && parsedUser.type !== 'Manager') {
            router.push('/auth/login');
            return;
        }

        setUser(parsedUser);
        setLoading(true);
        fetchCustomerData(parsedUser.uuid, token);
    }, [router]);

    // Fetch and process statistics when profile/customer/dates change
    useEffect(() => {
        const token = getCookie('token');
        if (!token) return;

        setLoading(true);

        const emptyStats = {
            requestsLeft: {}, requestsSent: {}, connectedCounts: {}, connectedRates: {},
            repliedCounts: {}, repliedRates: {}, positiveCounts: {}, positiveRates: {},
            totalRates: {},
            totals: { requestsLeft: 0, requestsSent: 0, connectedCounts: 0, repliedCounts: 0, positiveCounts: 0 },
            averages: { connectedRates: 0, repliedRates: 0, positiveRates: 0, totalRates: 0 },
            dailyStats: [] as Array<{ date: string; requestsSent: number; connectedCounts: number; repliedCounts: number; positiveCounts: number }>,
        };

        if (activeTab === 'management' && selectedCustomer) {
            setStatsLoading(true);

            const customerProfiles = selectedCustomer === 'All Customers'
                ? profiles
                : profiles.filter(p => p.customer_name === selectedCustomer);
            const profileNameList = customerProfiles.map(p => p.profile_name);

            if (profileNameList.length > 0) {
                fetchStatistics(token, profileNameList, managementStartDate || undefined, managementEndDate || undefined)
                    .then(result => {
                        setCampaigns(result.campaigns.map(rowToCampaign));
                        setError(false);
                        // Management tab: use filtered counts when dates are provided, else all-time
                        const useFiltered = !!(managementStartDate && managementEndDate);
                        const stats = buildStatsFromRows(result.campaigns, 'profile', useFiltered);
                        setTableStats(stats);
                        setChartStats({ ...stats, dailyStats: result.dailyStats });
                    })
                    .catch(err => {
                        console.error('Error fetching management statistics:', err);
                        setError(true);
                        setTableStats(emptyStats);
                        setChartStats(emptyStats);
                    })
                    .finally(() => {
                        setLoading(false);
                        setStatsLoading(false);
                    });
            } else {
                setLoading(false);
                setStatsLoading(false);
            }
        } else if ((activeTab === 'charts' || activeTab === 'performance') && selectedProfile) {
            setStatsLoading(true);

            fetchStatistics(token, [selectedProfile], startDate || undefined, endDate || undefined)
                .then(result => {
                    setCampaigns(result.campaigns.map(rowToCampaign));
                    setError(false);
                    // tableStats: always all-time counts (useFiltered=false)
                    const tStats = buildStatsFromRows(result.campaigns, 'campaign', false);
                    setTableStats(tStats);
                    // chartStats: date-filtered counts + daily chart data
                    const cStats = buildStatsFromRows(result.campaigns, 'campaign', true);
                    setChartStats({ ...cStats, dailyStats: result.dailyStats });
                })
                .catch(err => {
                    console.error('Error fetching statistics:', err);
                    setError(true);
                    setTableStats(emptyStats);
                    setChartStats(emptyStats);
                })
                .finally(() => {
                    setLoading(false);
                    setStatsLoading(false);
                });
        }
    }, [selectedProfile, selectedCustomer, activeTab, startDate, endDate, managementStartDate, managementEndDate, profiles]);

    // Set the selected profile to the first profile if none is selected
    useEffect(() => {
        if (profiles.length > 0 && !selectedProfile) {
            setSelectedProfile(profiles[0].profile_name);
        } else if (profiles.length === 0 && selectedProfile) {
            setSelectedProfile('');
        }
    }, [profiles, selectedProfile]);

    // Set the first customer as default when switching to management tab
    useEffect(() => {
        // console.log('Customer selection useEffect:', {
        //     activeTab,
        //     customersLength: customers.length,
        //     selectedCustomer,
        //     hasSelectedCustomer: !!selectedCustomer
        // });
        if (activeTab === 'management' && customers.length > 0 && !selectedCustomer) {
            // console.log('Setting first customer:', customers[0].customer_name);
            setSelectedCustomer(customers[0].customer_name);
        }
    }, [activeTab, customers, selectedCustomer]);

    // Reset customer selection when switching tabs
    // Apply filters and pagination to campaigns
    const filteredCampaigns = campaigns.filter(c => {
        let profileMatch = false;
        
        if (activeTab === 'management') {
            // For management dashboard, match profiles of the selected customer
            const profileInList = profiles.find(p => p.profile_name === c.profile?.profile_name);
            profileMatch = selectedCustomer === 'All Customers' 
                ? !!profileInList  // Include all profiles when "All Customers" is selected
                : !!(profileInList && profileInList.customer_name === selectedCustomer);
            // console.log('Management tab filtering:', {
            //     campaign: c.campaign_name,
            //     campaignProfileName: c.profile?.profile_name,
            //     selectedCustomer,
            //     profileMatch,
            //     campaignProfile: c.profile
            // });
            // For management dashboard, only filter by customer (no live or campaign type filters)
            return profileMatch;
        } else {
            // For other tabs, match the selected profile
            profileMatch = !!(c.profile && c.profile.profile_name === selectedProfile);
        }
        
        const liveMatch =
            liveFilter === 'All' ||
            (liveFilter === 'Live' && c.live === true) ||
            (liveFilter === 'NotLive' && c.live === false);
        const campaignTypeMatch =
            campaignFilter === 'All' ||
            (campaignFilter === 'Connector' && c.campaign_type === 'Connector') ||
            (campaignFilter === 'Messenger' && c.campaign_type === 'Messenger') ||
            (campaignFilter === 'First Connections' && c.campaign_type === 'First Connections') ||
            (campaignFilter === 'AI Campaign' && c.campaign_type === 'AI Campaign');
        return profileMatch && liveMatch && campaignTypeMatch;
    });

    // console.log('Filtered campaigns result:', {
    //     totalCampaigns: campaigns.length,
    //     filteredCampaigns: filteredCampaigns.length,
    //     activeTab,
    //     selectedCustomer
    // });

    // For management dashboard, aggregate campaigns by profile
    const aggregatedProfiles = activeTab === 'management' ? (() => {
        const profileMap = new Map<string, {
            profile: Profile;
            campaigns: Campaign[];
            totalRequestsPerDay: number;
        }>();

        filteredCampaigns.forEach(campaign => {
            const profileName = campaign.profile?.profile_name;
            if (!profileName) return;

            if (!profileMap.has(profileName)) {
                profileMap.set(profileName, {
                    profile: campaign.profile!,
                    campaigns: [],
                    totalRequestsPerDay: 0
                });
            }

            const profileData = profileMap.get(profileName)!;
            profileData.campaigns.push(campaign);
            profileData.totalRequestsPerDay += parseInt(campaign.requests_per_day) || 0;
        });

        // Log final results
        // console.log('Final profile aggregation results:');
        // Array.from(profileMap.values()).forEach(profileData => {
        //     console.log(`Profile: ${profileData.profile.profile_name}, profile_start_date: "${profileData.profile.start_end?.start_date}", campaigns: ${profileData.campaigns.length}`);
        // });

        return Array.from(profileMap.values());
    })() : [];

    const totalProfiles = aggregatedProfiles.length;

    // Sorting logic for profiles (management dashboard)
    const sortedProfiles = [...aggregatedProfiles].sort((a, b) => {
        let aValue: any, bValue: any;
        switch (managementSortKey) {
            case 'profile_name':
                aValue = a.profile.profile_name;
                bValue = b.profile.profile_name;
                break;
            case 'customer_name':
                aValue = a.profile.customer_name || a.profile.customer?.customer_name || '';
                bValue = b.profile.customer_name || b.profile.customer?.customer_name || '';
                break;
            case 'requestsLeft':
                aValue = tableStats.requestsLeft[a.profile.profile_name] || 0;
                bValue = tableStats.requestsLeft[b.profile.profile_name] || 0;
                break;
            case 'requestsSent':
                aValue = tableStats.requestsSent[a.profile.profile_name] || 0;
                bValue = tableStats.requestsSent[b.profile.profile_name] || 0;
                break;
            case 'connectedCounts':
                aValue = tableStats.connectedRates[a.profile.profile_name] || 0;
                bValue = tableStats.connectedRates[b.profile.profile_name] || 0;
                break;
            case 'repliedCounts':
                aValue = tableStats.repliedRates[a.profile.profile_name] || 0;
                bValue = tableStats.repliedRates[b.profile.profile_name] || 0;
                break;
            case 'positiveCounts':
                aValue = tableStats.positiveRates[a.profile.profile_name] || 0;
                bValue = tableStats.positiveRates[b.profile.profile_name] || 0;
                break;
            case 'totalRates':
                aValue = tableStats.totalRates[a.profile.profile_name] || 0;
                bValue = tableStats.totalRates[b.profile.profile_name] || 0;
                break;
            case 'start_date':
                const aDate = new Date(a.profile.start_end?.start_date || '');
                const bDate = new Date(b.profile.start_end?.start_date || '');
                aValue = (aDate instanceof Date && !isNaN(aDate.getTime())) ? aDate.getTime() : 0;
                bValue = (bDate instanceof Date && !isNaN(bDate.getTime())) ? bDate.getTime() : 0;
                break;
            case 'requestsPerDay':
                aValue = a.totalRequestsPerDay;
                bValue = b.totalRequestsPerDay;
                break;
            default:
                aValue = a.profile.profile_name;
                bValue = b.profile.profile_name;
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }
        if (aValue < bValue) return managementSortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return managementSortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const paginatedProfiles = sortedProfiles.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const totalCampaigns = filteredCampaigns.length; // Keep this for other tabs
    const totalPagesCampaigns = Math.ceil(totalCampaigns / pageSize);
    const totalPages = activeTab === 'management' ? Math.ceil(totalProfiles / pageSize) : totalPagesCampaigns;

    // Sorting logic for campaigns
    const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
        // First level: Always sort by live status (live campaigns first)
        const aLive = a.live ? 1 : 0;
        const bLive = b.live ? 1 : 0;
        if (aLive !== bLive) {
            return bLive - aLive; // Live campaigns first
        }
        
        // Second level: Sort by start_date (newest first within same live status)
        const aStartDate = new Date(a.start_date).getTime();
        const bStartDate = new Date(b.start_date).getTime();
        if (aStartDate !== bStartDate) {
            return bStartDate - aStartDate; // Newest first
        }
        
        // Third level: If user clicked on a specific column, apply that sorting
        if (sortKey !== 'live' && sortKey !== 'start_date') {
            let aValue: any, bValue: any;
            switch (sortKey) {
                case 'requestsLeft':
                    aValue = tableStats.requestsLeft[a.campaign_name] || 0;
                    bValue = tableStats.requestsLeft[b.campaign_name] || 0;
                    break;
                case 'requestsSent':
                    aValue = tableStats.requestsSent[a.campaign_name] || 0;
                    bValue = tableStats.requestsSent[b.campaign_name] || 0;
                    break;
                case 'connectedCounts':
                    aValue = tableStats.connectedRates[a.campaign_name] || 0;
                    bValue = tableStats.connectedRates[b.campaign_name] || 0;
                    break;
                case 'repliedCounts':
                    aValue = tableStats.repliedRates[a.campaign_name] || 0;
                    bValue = tableStats.repliedRates[b.campaign_name] || 0;
                    break;
                case 'positiveCounts':
                    aValue = tableStats.positiveRates[a.campaign_name] || 0;
                    bValue = tableStats.positiveRates[b.campaign_name] || 0;
                    break;
                case 'totalRates':
                    aValue = tableStats.totalRates[a.campaign_name] || 0;
                    bValue = tableStats.totalRates[b.campaign_name] || 0;
                    break;
                default:
                    aValue = a[sortKey];
                    bValue = b[sortKey];
            }
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        }
        
        return 0;
    });


    // Calculate start and end index for the current page
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, activeTab === 'management' ? totalProfiles : totalCampaigns);

    // Slice the appropriate array based on active tab
    const paginatedCampaigns = activeTab === 'management' 
        ? paginatedProfiles 
        : sortedCampaigns.slice(startIndex, endIndex);
    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    // Inside CampaignsPage component, after other useEffect hooks
    useEffect(() => {
        // Reset current page to 1 when filters or the total number of filtered campaigns change
        setCurrentPage(1);
    }, [selectedProfile, selectedCustomer, activeTab, liveFilter, campaignFilter, startDate, endDate, managementStartDate, managementEndDate, totalCampaigns, sortKey, sortOrder, managementSortKey, managementSortOrder]);


    // Extract campaign names of filtered campaigns
    const filteredCampaignNames = new Set(filteredCampaigns.map(c => c.campaign_name));
    const filteredTotals = {
        requestsLeft: 0,
        requestsSent: 0,
        connectedCounts: 0,
        repliedCounts: 0,
        positiveCounts: 0,
    };
    const filteredConnectedRatesArr: number[] = [];
    const filteredRepliedRatesArr: number[] = [];
    const filteredPositiveRatesArr: number[] = [];
    const filteredTotalRatesArr: number[] = [];

    filteredCampaignNames.forEach(name => {
        const rl = tableStats.requestsLeft[name] || 0;
        const rs = tableStats.requestsSent[name] || 0;
        const cc = tableStats.connectedCounts[name] || 0;
        const rc = tableStats.repliedCounts[name] || 0;
        const pc = tableStats.positiveCounts[name] || 0;
        const connectedRate = tableStats.connectedRates[name] ?? 0;
        const repliedRate = tableStats.repliedRates[name] ?? 0;
        const positiveRate = tableStats.positiveRates[name] ?? 0;
        const totalRate = tableStats.totalRates[name] ?? 0;

        filteredTotals.requestsLeft += rl;
        filteredTotals.requestsSent += rs;
        filteredTotals.connectedCounts += cc;
        filteredTotals.repliedCounts += rc;
        filteredTotals.positiveCounts += pc;
        filteredConnectedRatesArr.push(connectedRate);
        filteredRepliedRatesArr.push(repliedRate);
        filteredPositiveRatesArr.push(positiveRate);
        filteredTotalRatesArr.push(totalRate);
    });

    // Utility to average an array of numbers
    function averageArr(arr: number[]) {
        if (arr.length === 0) return 0;
        const sum = arr.reduce((acc, val) => acc + val, 0);
        return Math.round(sum / arr.length);
    }

    function handleSort(key: string) {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    }

    function handleManagementSort(key: string) {
        if (managementSortKey === key) {
            setManagementSortOrder(managementSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setManagementSortKey(key);
            setManagementSortOrder('asc');
        }
    }

    // Calculate totals and averages based on active tab
    const displayTotals = activeTab === 'management' 
        ? tableStats.totals || {
            requestsLeft: 0,
            requestsSent: 0,
            connectedCounts: 0,
            repliedCounts: 0,
            positiveCounts: 0,
        }
        : filteredTotals;

    const displayAverages = activeTab === 'management'
        ? tableStats.averages || {
            connectedRates: 0,
            repliedRates: 0,
            positiveRates: 0,
            totalRates: 0,
        }
        : {
            connectedRates: filteredTotals.requestsSent > 0 
                ? Math.round((filteredTotals.connectedCounts / filteredTotals.requestsSent) * 100)
                : 0,
            repliedRates: filteredTotals.connectedCounts > 0 
                ? Math.round((filteredTotals.repliedCounts / filteredTotals.connectedCounts) * 100)
                : 0,
            positiveRates: filteredTotals.repliedCounts > 0 
                ? Math.round((filteredTotals.positiveCounts / filteredTotals.repliedCounts) * 100)
                : 0,
            totalRates: filteredTotals.requestsSent > 0 
                ? Math.round((filteredTotals.positiveCounts / filteredTotals.requestsSent) * 100)
                : 0,
        };

    // Handle user logout
    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            localStorage.clear();
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            setUser(null);
            setSelectedProfile('');
            router.push('/auth/login');
            } catch (error) {
            console.error('Logout error:', error);
            router.push('/auth/login');
        }
    };

    const handleShowCampaignContent = async (campaignName: string) => {
        const backendUrl = getBackendUrl();
        try {
            const token = getCookie('token');
            const response = await fetch(
                `${backendUrl}/api/campaigns?filters[campaign_name][$eq]=${encodeURIComponent(campaignName)}&populate=Content`,
                { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error('Failed to fetch campaign content');
            const data = await response.json();
            // Strapi v5 returns data.data[0].Content
            const contentArr = (data.data && data.data[0] && data.data[0].Content) ? data.data[0].Content : [];
            setChatPopupContent(contentArr);
            setChatPopupTitle(campaignName);
            setChatPopupOpen(true);
        } catch (err) {
            setChatPopupContent([]);
            setChatPopupTitle(campaignName);
            setChatPopupOpen(true);
        }
    };

    // Skeleton component for loading state
    const Skeleton = () => (
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
    );

    return (
    <div className="min-h-screen bg-gray-0">
        {user && <Navigation user={user} onLogout={handleLogout} currentPage={activeTab === 'management' ? 'Management Dashboard' : 'Statistics'} pageIcon={MdCampaign} />}
        <div className="max-w-7xl mx-auto px-6 mt-6">

        {/* Profile Selection - Global Filter */}
        <div className="bg-white shadow-md rounded-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                
                {activeTab !== 'management' && (
                    <div className="w-full md:w-80">
                        <select
                            value={selectedProfile}
                            onChange={(e) => setSelectedProfile(e.target.value)}
                            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500"
                            disabled={profiles.length === 0}
                        >
                            {profiles.length === 0 ? (
                                <option value="" disabled>No profiles</option>
                            ) : (
                                profiles.map((profile) => (
                                    <option key={profile.profile_name} value={profile.profile_name}>
                                        {profile.customer_name} - {profile.profile_name}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                )}
            </div>
        </div>

        {/* Tabbed Content */}
        <div className="bg-white shadow-lg rounded-lg mb-6">{/* Tab Headers */}
            {/* Tab Headers */}
            <div className="border-b border-gray-200">
                <nav className="flex" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('charts')}
                        className={`flex-1 py-4 px-6 text-base font-medium border-b-2 transition-colors text-center ${
                            activeTab === 'charts'
                                ? 'border-[#374570] text-[#374570]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Daily Statistics
                    </button>
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`flex-1 py-4 px-6 text-base font-medium border-b-2 transition-colors text-center ${
                            activeTab === 'performance'
                                ? 'border-[#374570] text-[#374570]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Overall Campaign Performance
                    </button>
                    {isAdmin(user) && (
                        <button
                            onClick={() => setActiveTab('management')}
                            className={`flex-1 py-4 px-6 text-base font-medium border-b-2 transition-colors text-center ${
                                activeTab === 'management'
                                    ? 'border-[#374570] text-[#374570]'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Management Dashboard
                        </button>
                    )}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {activeTab === 'charts' ? (
                    /* Charts Tab Content */
                    <>
                        {/* Date Range Picker for Charts */}
                        <div className="mb-6 flex justify-end">
                            <div className="w-full md:w-56">
                                <ReactDatePicker
                                    selectsRange
                                    startDate={startDateObj}
                                    endDate={endDateObj}
                                    onChange={(update: [Date | null, Date | null]) => setDateRange(update)}
                                    dateFormat="yyyy-MM-dd"
                                    placeholderText="Select date range"
                                    customInput={<CustomDateInput />}
                                    wrapperClassName="w-full"
                                />
                            </div>
                        </div>
                        <TotalsChart
                            campaignStats={chartStats}
                            totalsStats={tableStats}
                            profileName={selectedProfile || undefined}
                            loading={statsLoading}
                            dailyStats={chartStats.dailyStats}
                        />
                    </>
                ) : activeTab === 'performance' ? (
                    /* Performance Tab Content */
                    <>
                        {/* Filter Bar for Campaign Performance */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-medium text-[#47577d]">
                                        Campaign Filters
                                    </h3>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                    <div className="w-full md:w-40">
                                        <select
                                            value={liveFilter}
                                            onChange={(e) => setLiveFilter(e.target.value as "All" | "Live" | "NotLive")}
                                            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="All">Live and not live</option>
                                            <option value="Live">Live</option>
                                            <option value="NotLive">Not live</option>
                                        </select>
                                    </div>
                                    <div className="w-full md:w-56">
                                        <select
                                            value={campaignFilter}
                                            onChange={(e) =>
                                                setCampaignFilter(
                                                    e.target.value as
                                                        | "All"
                                                        | "Connector"
                                                        | "Messenger"
                                                        | "First Connections"
                                                        | "AI Campaign"
                                                )
                                            }
                                            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="All">All campaign types</option>
                                            <option value="Connector">Connector</option>
                                            <option value="Messenger">Messenger</option>
                                            <option value="First Connections">First Connections</option>
                                            <option value="AI Campaign">AI Campaign</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Overall Campaign Performance Cards */}
                        <div className="mb-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#DC304420' }}>
                                    <div className="text-2xl font-bold" style={{ color: '#DC3044' }}>
                                        {statsLoading ? <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div> : (tableStats.totals?.requestsSent || 0)}
                                    </div>
                                    <div className="text-sm text-gray-600">Total Requests Sent</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#A5375220' }}>
                                    <div className="text-2xl font-bold" style={{ color: '#A53752' }}>
                                        {statsLoading ? <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div> : (tableStats.totals?.connectedCounts || 0)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Connected ({statsLoading ? '...' : (tableStats.totals?.requestsSent > 0 ? Math.round(((tableStats.totals?.connectedCounts || 0) / tableStats.totals.requestsSent) * 100) : 0)}%)
                                    </div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#6E3E6120' }}>
                                    <div className="text-2xl font-bold" style={{ color: '#6E3E61' }}>
                                        {statsLoading ? <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div> : (tableStats.totals?.repliedCounts || 0)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Replied ({statsLoading ? '...' : (tableStats.totals?.connectedCounts > 0 ? Math.round(((tableStats.totals?.repliedCounts || 0) / tableStats.totals.connectedCounts) * 100) : 0)}%)
                                    </div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#37457020' }}>
                                    <div className="text-2xl font-bold" style={{ color: '#374570' }}>
                                        {statsLoading ? <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div> : (tableStats.totals?.positiveCounts || 0)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Positive ({statsLoading ? '...' : (tableStats.totals?.repliedCounts > 0 ? Math.round(((tableStats.totals?.positiveCounts || 0) / tableStats.totals.repliedCounts) * 100) : 0)}%)
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Campaigns Table */}
                        <div className="overflow-x-auto">
            {loading ? (
            <p className="text-gray-600 text-lg p-6">Loading campaigns...</p>
            ) : error ? (
            <p className="text-red-600 text-lg p-6">Failed to load campaigns.</p>
            ) : filteredCampaigns.length === 0 ? (
            <p className="text-gray-600 text-lg p-6">No campaigns found.</p>
            ) : (
            <>
                <div className="overflow-x-auto">
                    <table className="min-w-full table-auto border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 font-medium">
                                <th className="px-2 py-2 text-left whitespace-nowrap">Campaign</th>
                                {user && user.type === 'Admin' && (
                                    <th
                                        className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                        onClick={() => handleSort('requestsLeft')}
                                    >
                                        Requests Left
                                        {sortKey === 'requestsLeft' ? (
                                            sortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                        ) : <FaSort className="inline ml-1" />}
                                    </th>
                                )}
                                <th
                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                    onClick={() => handleSort('requestsSent')}
                                >
                                    Requests Sent
                                    {sortKey === 'requestsSent' ? (
                                        sortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                    ) : <FaSort className="inline ml-1" />}
                                </th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Requests/Day</th>
                                <th
                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                    onClick={() => handleSort('connectedCounts')}
                                >
                                    Connected (%)
                                    {sortKey === 'connectedCounts' ? (
                                        sortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                    ) : <FaSort className="inline ml-1" />}
                                </th>
                                <th
                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                    onClick={() => handleSort('repliedCounts')}
                                >
                                    Replied (%)
                                    {sortKey === 'repliedCounts' ? (
                                        sortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                    ) : <FaSort className="inline ml-1" />}
                                </th>
                                <th
                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                    onClick={() => handleSort('positiveCounts')}
                                >
                                    Positive (%)
                                    {sortKey === 'positiveCounts' ? (
                                        sortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                    ) : <FaSort className="inline ml-1" />}
                                </th>
                                <th
                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                    onClick={() => handleSort('totalRates')}
                                >
                                    Total (%)
                                    {sortKey === 'totalRates' ? (
                                        sortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                    ) : <FaSort className="inline ml-1" />}
                                </th>
                                <th
                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                    onClick={() => handleSort('start_date')}
                                >
                                    Start Date
                                    {sortKey === 'start_date' ? (
                                        sortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                    ) : <FaSort className="inline ml-1" />}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                        {paginatedCampaigns.map((campaign) => (
                            <tr key={campaign.id} className="border-b">
                            <td className="px-2 py-2 whitespace-nowrap flex items-center gap-2" title={campaign.campaign_name}>
                                <button
                                    onClick={() => handleShowCampaignContent(campaign.campaign_name)}
                                    style={{ color: '#374570' }}
                                    className="hover:text-blue-700"
                                    title="View Campaign Content"
                                >
                                    <LuMessageCircleCode className="w-4 h-4" />
                                </button>
                                {campaign.campaign_name.length > 50
                                    ? campaign.campaign_name.slice(0, 50) + "..."
                                    : campaign.campaign_name
                                }
                            </td>
                            {user && user.type === 'Admin' && (
                                <td className="px-2 py-2 whitespace-nowrap">
                                    {statsLoading ? <Skeleton /> : (tableStats.requestsLeft[campaign.campaign_name] || 0)}
                                </td>
                            )}
                            <td className="px-2 py-2 whitespace-nowrap">
                                {statsLoading ? <Skeleton /> : (tableStats.requestsSent[campaign.campaign_name] || 0)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                                {campaign.requests_per_day}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                                {statsLoading ? <Skeleton /> : (
                                <>
                                    {tableStats.connectedCounts[campaign.campaign_name] || 0} (
                                    {tableStats.connectedRates[campaign.campaign_name] || 0}%)
                                </>
                                )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                                {statsLoading ? <Skeleton /> : (
                                <>
                                    {tableStats.repliedCounts[campaign.campaign_name] || 0} (
                                    {tableStats.repliedRates[campaign.campaign_name] || 0}%)
                                </>
                                )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                                {statsLoading ? <Skeleton /> : (
                                <>
                                    {tableStats.positiveCounts[campaign.campaign_name] || 0} (
                                    {tableStats.positiveRates[campaign.campaign_name] || 0}%)
                                </>
                                )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                                {statsLoading ? <Skeleton /> : (
                                <>
                                    {tableStats.totalRates[campaign.campaign_name] || 0}%
                                </>
                                )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                                {campaign.start_date}
                            </td>
                            </tr>
                        ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-100 font-medium">
                                <td className="px-2 py-2 whitespace-nowrap">Totals</td>

                                {user && user.type === 'Admin' && (
                                    <td className="px-2 py-2 whitespace-nowrap">
                                        {statsLoading ? <Skeleton /> : displayTotals.requestsLeft}
                                    </td>
                                )}

                                <td className="px-2 py-2 whitespace-nowrap">
                                {statsLoading ? <Skeleton /> : displayTotals.requestsSent}
                                </td>

                                <td className="px-2 py-2 whitespace-nowrap"></td>

                                <td className="px-2 py-2 whitespace-nowrap">
                                {statsLoading ? <Skeleton /> : (
                                    <>
                                    {displayTotals.connectedCounts} ({displayAverages.connectedRates}%)
                                    </>
                                )}
                                </td>

                                <td className="px-2 py-2 whitespace-nowrap">
                                {statsLoading ? <Skeleton /> : (
                                    <>
                                    {displayTotals.repliedCounts} ({displayAverages.repliedRates}%)
                                    </>
                                )}
                                </td>

                                <td className="px-2 py-2 whitespace-nowrap">
                                {statsLoading ? <Skeleton /> : (
                                    <>
                                    {displayTotals.positiveCounts} ({displayAverages.positiveRates}%)
                                    </>
                                )}
                                </td>

                                <td className="px-2 py-2 whitespace-nowrap">
                                {statsLoading ? <Skeleton /> : `${displayAverages.totalRates}%`}
                                </td>

                                <td className="px-2 py-2 whitespace-nowrap"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between text-xs text-gray-600 font-medium">
                    <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalCampaigns}
                    itemsPerPage={pageSize}
                    onNext={handleNextPage}
                    onPrev={handlePrevPage}
                    />
                                </div>
                            </>
                        )}
                    </div>
                </>
            ) : activeTab === 'management' && isAdmin(user) ? (
                /* Management Dashboard Tab Content */
                <>
                    {/* Customer Selection and Filters */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-medium text-[#47577d]">
                                    Management Filters
                                </h3>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                <div className="w-full md:w-48">
                                    <select
                                        value={selectedCustomer}
                                        onChange={(e) => setSelectedCustomer(e.target.value)}
                                        className="block w-full p-2 border border-gray-300 rounded-md shadow-sm text-xs focus:ring-blue-500 focus:border-blue-500"
                                        disabled={customers.length === 0}
                                    >
                                        <option value="All Customers">All Customers</option>
                                        {customers.filter(customer => customer.lead_phase === 'Active').sort((a, b) => a.customer_name.localeCompare(b.customer_name)).map((customer) => (
                                            <option key={customer.id} value={customer.customer_name}>
                                                {customer.customer_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-full md:w-56">
                                    <ReactDatePicker
                                        selectsRange
                                        startDate={managementStartDateObj}
                                        endDate={managementEndDateObj}
                                        onChange={(update: [Date | null, Date | null]) => setManagementDateRange(update)}
                                        dateFormat="yyyy-MM-dd"
                                        placeholderText="Select date range"
                                        customInput={<CustomDateInput />}
                                        wrapperClassName="w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Management Table - Similar to Performance Table */}
                    <div className="overflow-x-auto">
                        {loading ? (
                            <p className="text-gray-600 text-lg p-6">Loading profiles...</p>
                        ) : error ? (
                            <p className="text-red-600 text-lg p-6">Failed to load profiles.</p>
                        ) : filteredCampaigns.length === 0 ? (
                            <p className="text-gray-600 text-lg p-6">No profiles found.</p>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full table-auto border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-gray-100 text-gray-700 font-medium">
                                                <th
                                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                                    onClick={() => handleManagementSort('profile_name')}
                                                >
                                                    Profile
                                                    {managementSortKey === 'profile_name' ? (
                                                        managementSortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                                    ) : <FaSort className="inline ml-1" />}
                                                </th>
                                                <th
                                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                                    onClick={() => handleManagementSort('customer_name')}
                                                >
                                                    Customer
                                                    {managementSortKey === 'customer_name' ? (
                                                        managementSortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                                    ) : <FaSort className="inline ml-1" />}
                                                </th>
                                                {user && user.type === 'Admin' && (
                                                    <th
                                                        className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                                        onClick={() => handleManagementSort('requestsLeft')}
                                                    >
                                                        Requests Left
                                                        {managementSortKey === 'requestsLeft' ? (
                                                            managementSortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                                        ) : <FaSort className="inline ml-1" />}
                                                    </th>
                                                )}
                                                <th
                                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                                    onClick={() => handleManagementSort('requestsSent')}
                                                >
                                                    Requests Sent
                                                    {managementSortKey === 'requestsSent' ? (
                                                        managementSortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                                    ) : <FaSort className="inline ml-1" />}
                                                </th>
                                                <th
                                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                                    onClick={() => handleManagementSort('requestsPerDay')}
                                                >
                                                    Requests/Day
                                                    {managementSortKey === 'requestsPerDay' ? (
                                                        managementSortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                                    ) : <FaSort className="inline ml-1" />}
                                                </th>
                                                <th
                                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                                    onClick={() => handleManagementSort('connectedCounts')}
                                                >
                                                    Connected (%)
                                                    {managementSortKey === 'connectedCounts' ? (
                                                        managementSortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                                    ) : <FaSort className="inline ml-1" />}
                                                </th>
                                                <th
                                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                                    onClick={() => handleManagementSort('repliedCounts')}
                                                >
                                                    Replied (%)
                                                    {managementSortKey === 'repliedCounts' ? (
                                                        managementSortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                                    ) : <FaSort className="inline ml-1" />}
                                                </th>
                                                <th
                                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                                    onClick={() => handleManagementSort('positiveCounts')}
                                                >
                                                    Positive (%)
                                                    {managementSortKey === 'positiveCounts' ? (
                                                        managementSortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                                    ) : <FaSort className="inline ml-1" />}
                                                </th>
                                                <th
                                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                                    onClick={() => handleManagementSort('totalRates')}
                                                >
                                                    Total (%)
                                                    {managementSortKey === 'totalRates' ? (
                                                        managementSortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                                    ) : <FaSort className="inline ml-1" />}
                                                </th>
                                                <th
                                                    className="px-2 py-2 text-left whitespace-nowrap cursor-pointer"
                                                    onClick={() => handleManagementSort('start_date')}
                                                >
                                                    Start Date
                                                    {managementSortKey === 'start_date' ? (
                                                        managementSortOrder === 'asc' ? <FaSortUp className="inline ml-1" /> : <FaSortDown className="inline ml-1" />
                                                    ) : <FaSort className="inline ml-1" />}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedProfiles.map((profileData) => (
                                                <tr key={profileData.profile.profile_name} className="border-b">
                                                    <td className="px-2 py-2 whitespace-nowrap font-medium">
                                                        {profileData.profile.profile_name}
                                                    </td>
                                                    <td className="px-2 py-2 whitespace-nowrap">
                                                        {profileData.profile.customer_name || profileData.profile.customer?.customer_name || 'N/A'}
                                                    </td>
                                                    {user && user.type === 'Admin' && (
                                                        <td className="px-2 py-2 whitespace-nowrap">
                                                            {statsLoading ? <Skeleton /> : (tableStats.requestsLeft[profileData.profile.profile_name] || 0)}
                                                        </td>
                                                    )}
                                                    <td className="px-2 py-2 whitespace-nowrap">
                                                        {statsLoading ? <Skeleton /> : (tableStats.requestsSent[profileData.profile.profile_name] || 0)}
                                                    </td>
                                                    <td className="px-2 py-2 whitespace-nowrap">
                                                        {profileData.totalRequestsPerDay}
                                                    </td>
                                                    <td className="px-2 py-2 whitespace-nowrap">
                                                        {statsLoading ? <Skeleton /> : (
                                                            <>
                                                                {tableStats.connectedCounts[profileData.profile.profile_name] || 0} (
                                                                {tableStats.connectedRates[profileData.profile.profile_name] || 0}%)
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2 whitespace-nowrap">
                                                        {statsLoading ? <Skeleton /> : (
                                                            <>
                                                                {tableStats.repliedCounts[profileData.profile.profile_name] || 0} (
                                                                {tableStats.repliedRates[profileData.profile.profile_name] || 0}%)
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2 whitespace-nowrap">
                                                        {statsLoading ? <Skeleton /> : (
                                                            <>
                                                                {tableStats.positiveCounts[profileData.profile.profile_name] || 0} (
                                                                {tableStats.positiveRates[profileData.profile.profile_name] || 0}%)
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2 whitespace-nowrap">
                                                        {statsLoading ? <Skeleton /> : `${tableStats.totalRates[profileData.profile.profile_name] || 0}%`}
                                                    </td>
                                                    <td className="px-2 py-2 whitespace-nowrap">
                                                        {(() => {
                                                            const date = new Date(profileData.profile.start_end?.start_date || '');
                                                            return date instanceof Date && !isNaN(date.getTime()) 
                                                                ? date.toLocaleDateString() 
                                                                : 'N/A';
                                                        })()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-100 font-medium">
                                                <td className="px-2 py-2 whitespace-nowrap" colSpan={2}>Totals</td>
                                                {user && user.type === 'Admin' && (
                                                    <td className="px-2 py-2 whitespace-nowrap">
                                                        {statsLoading ? <Skeleton /> : displayTotals.requestsLeft}
                                                    </td>
                                                )}
                                                <td className="px-2 py-2 whitespace-nowrap">
                                                    {statsLoading ? <Skeleton /> : displayTotals.requestsSent}
                                                </td>
                                                <td className="px-2 py-2 whitespace-nowrap">
                                                    {paginatedProfiles.reduce((sum, p) => sum + p.totalRequestsPerDay, 0)}
                                                </td>
                                                <td className="px-2 py-2 whitespace-nowrap">
                                                    {statsLoading ? <Skeleton /> : (
                                                        <>
                                                            {displayTotals.connectedCounts} (
                                                            {displayAverages.connectedRates}%)
                                                        </>
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 whitespace-nowrap">
                                                    {statsLoading ? <Skeleton /> : (
                                                        <>
                                                            {displayTotals.repliedCounts} (
                                                            {displayAverages.repliedRates}%)
                                                        </>
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 whitespace-nowrap">
                                                    {statsLoading ? <Skeleton /> : (
                                                        <>
                                                            {displayTotals.positiveCounts} (
                                                            {displayAverages.positiveRates}%)
                                                        </>
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 whitespace-nowrap">
                                                    {statsLoading ? <Skeleton /> : `${displayAverages.totalRates}%`}
                                                </td>
                                                <td className="px-2 py-2 whitespace-nowrap"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between text-xs text-gray-600 font-medium">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={activeTab === 'management' ? totalProfiles : totalCampaigns}
                                        itemsPerPage={pageSize}
                                        onNext={handleNextPage}
                                        onPrev={handlePrevPage}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </>
            ) : null}
        </div>
    </div>
        
    {/* Campaign Content Chat Popup (same style as linked_in_chats) */}
    {chatPopupOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh]">
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                        <h2 className="text-lg font-bold text-gray-800">
                            Content for {chatPopupTitle}
                        </h2>
                        <button onClick={() => setChatPopupOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
    
                    {/* Chat Body */}
                    <div className="flex-grow p-6 space-y-4 overflow-y-auto bg-gray-50">
                        {chatPopupContent.length === 0 ? (
                            <div className="flex justify-center items-center h-full">
                                <p className="text-gray-500">No content found for this campaign.</p>
                            </div>
                        ) : (
                            chatPopupContent.map((msg: any, idx: number) => {
                                // All bubbles right-aligned
                                return (
                                    <div key={idx} className="flex w-full justify-end">
                                        <div className="px-4 py-2 rounded-xl max-w-lg bg-leadblocks-navy text-white rounded-br-none">
                                            <div className="text-sm whitespace-pre-line">{msg.message_content}</div>
                                            {msg.message_delay !== undefined && (
                                                <div className="text-xs mt-1 text-gray-200 text-right">
                                                    Delay: {msg.message_delay} days
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {/* Footer with close button */}
                    <div className="p-4 border-t border-gray-200 bg-white flex justify-end flex-shrink-0">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setChatPopupOpen(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}
        </div>
    </div>
    );
}

// -----------------------------------------------------------------------
// Helper: convert a raw statistics API row into a Campaign-compatible
// object that the existing UI rendering code can consume.
// -----------------------------------------------------------------------
function rowToCampaign(row: any): any {
    return {
        id: String(row.id),
        campaign_name: row.campaign_name,
        campaign_type: row.campaign_type,
        live: row.live,
        start_date: row.start_date,
        end_date: '',
        requests_per_day: String(row.requests_per_day ?? ''),
        profile: {
            profile_name: row.profile_name,
            customer_name: row.customer_name,
            customer: undefined,
            start_end: row.profile_start_date
                ? { start_date: row.profile_start_date, end_date: '' }
                : undefined,
        },
        campaign_prospects: [],
        messages: [],
    };
}

// -----------------------------------------------------------------------
// Helper: aggregate raw API rows into the chartStats / tableStats shape.
// groupBy='campaign' keys by campaign_name (charts/performance tabs).
// groupBy='profile'  keys by profile_name (management tab).
// useFiltered=true   uses the date-filtered _filtered counts.
// useFiltered=false  uses the all-time _all counts.
// -----------------------------------------------------------------------
function buildStatsFromRows(
    rows: any[],
    groupBy: 'campaign' | 'profile',
    useFiltered: boolean
): {
    requestsLeft: Record<string, number>;
    requestsSent: Record<string, number>;
    connectedCounts: Record<string, number>;
    connectedRates: Record<string, number>;
    repliedCounts: Record<string, number>;
    repliedRates: Record<string, number>;
    positiveCounts: Record<string, number>;
    positiveRates: Record<string, number>;
    totalRates: Record<string, number>;
    totals: { requestsLeft: number; requestsSent: number; connectedCounts: number; repliedCounts: number; positiveCounts: number };
    averages: { connectedRates: number; repliedRates: number; positiveRates: number; totalRates: number };
    dailyStats: any[];
} {
    const requestsLeft: Record<string, number> = {};
    const requestsSent: Record<string, number> = {};
    const connectedCounts: Record<string, number> = {};
    const repliedCounts: Record<string, number> = {};
    const positiveCounts: Record<string, number> = {};

    for (const row of rows) {
        const key = groupBy === 'campaign' ? row.campaign_name : row.profile_name;
        requestsLeft[key]    = (requestsLeft[key]    || 0) + (row.requests_left    || 0);
        requestsSent[key]    = (requestsSent[key]    || 0) + (useFiltered ? (row.requests_sent_filtered || 0) : (row.requests_sent_all || 0));
        connectedCounts[key] = (connectedCounts[key] || 0) + (useFiltered ? (row.connected_filtered    || 0) : (row.connected_all    || 0));
        repliedCounts[key]   = (repliedCounts[key]   || 0) + (useFiltered ? (row.replied_filtered      || 0) : (row.replied_all      || 0));
        positiveCounts[key]  = (positiveCounts[key]  || 0) + (useFiltered ? (row.positive_filtered     || 0) : (row.positive_all     || 0));
    }

    const connectedRates: Record<string, number> = {};
    const repliedRates: Record<string, number>   = {};
    const positiveRates: Record<string, number>  = {};
    const totalRates: Record<string, number>     = {};

    for (const key of Object.keys(requestsSent)) {
        const sent      = requestsSent[key]    || 0;
        const connected = connectedCounts[key] || 0;
        const replied   = repliedCounts[key]   || 0;
        const positive  = positiveCounts[key]  || 0;
        connectedRates[key] = sent      > 0 ? Math.round((connected / sent)      * 100) : 0;
        repliedRates[key]   = connected > 0 ? Math.round((replied   / connected) * 100) : 0;
        positiveRates[key]  = replied   > 0 ? Math.round((positive  / replied)   * 100) : 0;
        totalRates[key]     = sent      > 0 ? Math.round((positive  / sent)      * 100) : 0;
    }

    function average(obj: Record<string, number>): number {
        const vals = Object.values(obj);
        if (!vals.length) return 0;
        return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    }

    const totals = {
        requestsLeft:    Object.values(requestsLeft).reduce((s, v) => s + v, 0),
        requestsSent:    Object.values(requestsSent).reduce((s, v) => s + v, 0),
        connectedCounts: Object.values(connectedCounts).reduce((s, v) => s + v, 0),
        repliedCounts:   Object.values(repliedCounts).reduce((s, v) => s + v, 0),
        positiveCounts:  Object.values(positiveCounts).reduce((s, v) => s + v, 0),
    };

    const averages = {
        connectedRates: average(connectedRates),
        repliedRates:   average(repliedRates),
        positiveRates:  average(positiveRates),
        totalRates:     average(totalRates),
    };

    return {
        requestsLeft, requestsSent,
        connectedCounts, connectedRates,
        repliedCounts, repliedRates,
        positiveCounts, positiveRates,
        totalRates, totals, averages,
        dailyStats: [],
    };
}

// -----------------------------------------------------------------------
// API call: POST /api/statistics
// Returns per-campaign aggregated counts (all-time + filtered) and
// per-day event counts for the chart.
// -----------------------------------------------------------------------
async function fetchStatistics(
    token: string,
    profileNames: string[],
    startDate?: string,
    endDate?: string
): Promise<{
    campaigns: any[];
    dailyStats: Array<{ date: string; requestsSent: number; connectedCounts: number; repliedCounts: number; positiveCounts: number }>;
}> {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/statistics`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profileNames, startDate, endDate }),
    });
    if (!response.ok) {
        throw new Error(`Statistics fetch failed: ${response.status}`);
    }
    return response.json();
}

