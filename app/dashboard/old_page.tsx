'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaRegComments, FaUserTie, FaPlus, FaTasks, FaDatabase, FaListUl } from 'react-icons/fa';
import { GrOrganization } from "react-icons/gr";
import { MdCampaign } from "react-icons/md";
import { GiTargetDummy, GiBrain } from "react-icons/gi";
import { MdDoNotDisturb } from "react-icons/md";
import { IoIosChatboxes } from "react-icons/io";
import { BsRobot } from "react-icons/bs";
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import { FcStatistics } from "react-icons/fc";
import { MdPeopleAlt } from "react-icons/md";
import { HiUsers } from "react-icons/hi";
import { IoPeopleOutline } from "react-icons/io5";
import { VscDebugDisconnect } from "react-icons/vsc";
import { LuFileJson2 } from "react-icons/lu";
import { FiFileText } from "react-icons/fi";
import { IoRefreshOutline, IoClose, IoChevronDown, IoChevronUp } from "react-icons/io5";
import { safeLocalStorage } from '@/lib/storage';
import { getBackendUrl } from '@/lib/api-config';
import { ClipLoader, PulseLoader } from 'react-spinners';
import { toast } from 'react-hot-toast';


interface Campaign {
    id: number;
    campaign_name: string;
    // Add other campaign properties if needed
}

interface Profile {
    id: number;
    profile_name: string;
    campaigns: Campaign[];
    // Add other profile properties if needed
}

interface Customer {
    id: number;
    customer_name: string;
    profiles: Profile[]; // Array of profiles for each customer
}

interface User {
    id: string; // Now a UUID string
    username: string;
    email: string;
    customers: Customer[];
    uuid: string;
    type: string;
}

interface Task {
    id: string;
    title: string;
    due_date: string; // ISO format
    data_category: string;
}

interface OngoingAnalysis {
    id: string;
    percentage: number;
    processed_companies: number;
    total_companies: number;
    current_status: string;
    errors?: any[];
    createdAt?: string;
    companyCount?: number;
    completed?: number;
    failed?: number;
    skipped?: number;
    pending?: number;
    processed?: boolean;
    processedAt?: string | null;
    promptName?: string | null;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [customers, setCustomers] = useState<Customer[] | null>(null); // Customers state
    const [isLoading, setIsLoading] = useState(true);
    const [totalProfiles, setTotalProfiles] = useState(0); // State to hold total profile count
    const [uniqueLiveCampaignCount, setUniqueLiveCampaignsCount] = useState(0); // State to hold total profile count
    const [followUpCount, setFollowUpCount] = useState(0) // State to hold the count of interesting follow-up people
    const [totalCustomers, setTotalCustomers] = useState(0); // New state for all Customers count
    const [showNotifications, setShowNotifications] = useState(false);
    const [receiverErrorCount, setReceiverErrorCount] = useState(0);
    const [senderErrorCount, setSenderErrorCount] = useState(0);
    const [isMounted, setIsMounted] = useState(false);
    const [ongoingAnalyses, setOngoingAnalyses] = useState<OngoingAnalysis[]>([]);
    const [refreshingAnalyses, setRefreshingAnalyses] = useState(false);
    const [analysesExpanded, setAnalysesExpanded] = useState(true);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const navigateTo = (path: string) => {
        (window as any).__setNavigating?.(true);
        router.push(path);
    };

    const navigateToProfiles = () => navigateTo('/dashboard/profiles');
    const navigateToCampaigns = () => navigateTo('/dashboard/campaigns');
    const navigateToFollowUp = () => navigateTo('/dashboard/follow_up');
    const navigateToImportProspects = () => navigateTo('/dashboard/import_prospects');
    const navigateToImportCompanies = () => navigateTo('/dashboard/import_companies');
    const navigateToImportCampaigns = () => navigateTo('/dashboard/import_campaigns');
    const navigateToImportBlacklist = () => navigateTo('/dashboard/import_blacklist');
    const navigateToImportChats = () => navigateTo('/dashboard/import_chats');
    const navigateToRobotTasks = () => navigateTo('/dashboard/robot_tasks');
    const navigateToChatterTasks = () => navigateTo('/dashboard/chatter_tasks');
    const navigateToLinkedInChats = () => navigateTo('/dashboard/linked_in_chats');
    const navigateToImportTasks = () => navigateTo('/dashboard/import_tasks');
    const navigateToStatistics = () => navigateTo('/dashboard/statistics');
    const navigateToAllProspects = () => navigateTo('/dashboard/all_prospects');
    const navigateToDisconnectedProspects = () => navigateTo('/dashboard/disconnect_prospects');
    const navigateToImportScrapes = () => navigateTo('/dashboard/import_scrapes');
    const navigateToCreateChatterTasks = () => navigateTo('/dashboard/create_chatter_tasks');
    const navigateToMasterDatabase = () => navigateTo('/dashboard/master_database');
    const navigateToLists = () => navigateTo('/dashboard/lists');
    const navigateToRobotTasksOverview = () => navigateTo('/dashboard/robot_tasks_overview');
    const navigateToCustomerSetups = () => navigateTo('/dashboard/customer-setups');
    const navigateToSetup = () => navigateTo('/dashboard/setup');

    const navigateToReceiverErrors = () => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const isoDate = oneMonthAgo.toISOString();

        const url = `https://backend.leadblocks.nl/admin/content-manager/collection-types/api::data-receiver.data-receiver` +
            `?page=1&pageSize=50&sort=id:DESC` +
            `&filters[$and][0][error][$notNull]=true` +
            `&filters[$and][1][createdAt][$gte]=${encodeURIComponent(isoDate)}`;

        window.open(url, "_blank");
    };

    const navigateToSenderErrors = () => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const isoDate = oneMonthAgo.toISOString();

        const url = `https://backend.leadblocks.nl/admin/content-manager/collection-types/api::data-sender.data-sender` +
            `?page=1&pageSize=50&sort=id:DESC` +
            `&filters[$and][0][error][$notNull]=true` +
            `&filters[$and][1][createdAt][$gte]=${encodeURIComponent(isoDate)}`;

        window.open(url, "_blank");
    };


    useEffect(() => {
        const getCookie = (name: string): string | undefined => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return undefined;
        };

        const fetchDashboardStats = async (token) => {
            try {
                setIsLoading(true);

                const backendUrl = getBackendUrl();
                const response = await fetch(`${backendUrl}/api/dashboard`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
                }

                const stats = await response.json();

                setTotalCustomers(stats.totalCustomers);
                setTotalProfiles(stats.totalProfiles);
                setUniqueLiveCampaignsCount(stats.uniqueLiveCampaignsCount);
                setFollowUpCount(stats.followUpCount);
                setCustomers(stats.customers)

                // Optionally cache in localStorage (only on client side)
                safeLocalStorage.setParsedItem('totalCustomers', stats.totalCustomers);
                safeLocalStorage.setParsedItem('totalProfiles', stats.totalProfiles);
                safeLocalStorage.setParsedItem('uniqueLiveCampaignsCount', stats.uniqueLiveCampaignsCount);
                safeLocalStorage.setParsedItem('followUpCount', stats.followUpCount);
            } catch (error) {
                // Error loading dashboard stats
            } finally {
                setIsLoading(false);
            }
        };

        const fetchErrorCounts = async (token: string) => {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            const dateStr = oneMonthAgo.toISOString();

            try {
                const backendUrl = getBackendUrl();
                const [receiverRes, senderRes] = await Promise.all([
                    fetch(`${backendUrl}/api/data-receivers?filters[error][$notNull]=true&filters[createdAt][$gte]=${dateStr}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`${backendUrl}/api/data-senders?filters[error][$notNull]=true&filters[createdAt][$gte]=${dateStr}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                const receiverData = await receiverRes.json();
                const senderData = await senderRes.json();

                setReceiverErrorCount(receiverData?.meta?.pagination?.total || 0);
                setSenderErrorCount(senderData?.meta?.pagination?.total || 0);
            } catch (error) {
                console.error("Error fetching error counts:", error);
                setReceiverErrorCount(0);
                setSenderErrorCount(0);
            }
        };

        const token = getCookie('token');
        const storedUser = safeLocalStorage.getParsedItem<User>('user');

        if (!token || !storedUser) {
            router.push('/auth/login');
            return;
        }

        const parsedUser: User = storedUser;
        setUser(parsedUser);

        // Only use cached values after component is mounted (client-side only)
        if (isMounted) {
            const localTotalCustomers = safeLocalStorage.getParsedItem<number>('totalCustomers');
            const localTotalProfiles = safeLocalStorage.getParsedItem<number>('totalProfiles');
            const localLiveCampaigns = safeLocalStorage.getParsedItem<number>('uniqueLiveCampaignsCount');
            const localFollowUpCount = safeLocalStorage.getParsedItem<number>('followUpCount');

            if (localTotalCustomers && localTotalProfiles && localLiveCampaigns && localFollowUpCount) {
                // Use cached summary values to show something fast
                setTotalCustomers(localTotalCustomers);
                setTotalProfiles(localTotalProfiles);
                setUniqueLiveCampaignsCount(localLiveCampaigns);
                setFollowUpCount(localFollowUpCount);
            }
        }

        // Always fetch fresh data — don't store full customers in localStorage
        //console.log(parsedUser);
        fetchDashboardStats(token);
        //fetchLatestChats(token);
        fetchErrorCounts(token);
    }, [router, isMounted]);

    // Fetch ongoing analyses function
    const fetchOngoingAnalyses = async (showToastOnEmpty: boolean = false) => {
        if (!user || user.type !== 'Admin') return;

        setRefreshingAnalyses(true);

        const getCookie = (name: string): string | undefined => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return undefined;
        };

        const token = getCookie('token');
        if (!token) {
            setRefreshingAnalyses(false);
            return;
        }

        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/all-companies/ai-analysis/in-progress?userUuid=${user.uuid}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Ongoing AI analyses data:', data);

                // Transform the batches data to match our interface
                const ongoing = (data.batches || []).map((batch: any) => {
                    // Use batchStats for completed batches if available, otherwise use direct fields
                    const stats = batch.batchStats || batch;
                    const total = stats.total || batch.companyCount || 0;
                    const completed = stats.completed || 0;
                    const failed = stats.failed || 0;
                    const skipped = stats.skipped || 0;
                    const pending = stats.pending || 0;
                    const status = batch.status || 'active';
                    const isProcessed = batch.processed || false;

                    // Calculate percentage based on status
                    let percentage;
                    if (status === 'active' || status === 'queuing' || status === 'pending' || status === 'cancelled') {
                        percentage = total > 0 ? Math.round(((completed + skipped + failed) / total) * 100) : 0;
                    } else if (status === 'pending') {
                        percentage = 0;
                    } else {
                        percentage = 100;
                    }

                    return {
                        id: batch.batchId || batch.id,
                        percentage: percentage,
                        processed_companies: completed,
                        total_companies: total,
                        current_status: status,
                        errors: failed > 0 ? [`${failed} companies failed`] : [],
                        createdAt: batch.createdAt,
                        companyCount: batch.companyCount,
                        completed: completed,
                        failed: failed,
                        skipped: skipped,
                        pending: pending,
                        processed: isProcessed,
                        processedAt: stats.processed_at || null,
                        promptName: batch.promptName || null
                    };
                });
                // Show all analyses (processing, done, and failed)
                setOngoingAnalyses(ongoing);

                // Show toast message if no analyses are found (only when refresh button is clicked)
                if (ongoing.length === 0 && showToastOnEmpty) {
                    toast('No recent AI analyses found.', {
                        duration: 3000,
                        position: 'top-center',
                        style: {
                            background: '#6B7280',
                            color: '#fff',
                        },
                        icon: <GiBrain className="w-5 h-5" />,
                    });
                }
            }
        } catch (error) {
            setOngoingAnalyses([]);
        } finally {
            setRefreshingAnalyses(false);
        }
    };

    // Fetch ongoing analyses on mount for Admin users
    useEffect(() => {
        if (user && user.type === 'Admin') {
            fetchOngoingAnalyses();
        }
    }, [user]);

    // Remove an analysis from the view
    const handleRemoveAnalysis = (analysisId: string) => {
        setOngoingAnalyses(prev => prev.filter(analysis => analysis.id !== analysisId));
    };

    // Cancel/stop an analysis batch
    const handleCancelAnalysis = async (analysisId: string) => {
        if (!confirm('Are you sure you want to cancel this analysis? This cannot be undone.')) return;

        const getCookie = (name: string): string | undefined => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return undefined;
        };

        const token = getCookie('token');
        if (!token) return;

        try {
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/all-companies/ai-analysis/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ batchId: analysisId }),
            });

            if (response.ok) {
                toast.success('Analysis cancelled', { duration: 3000, position: 'top-center' });
                fetchOngoingAnalyses();
            } else {
                toast.error('Failed to cancel analysis', { duration: 3000, position: 'top-center' });
            }
        } catch (error) {
            toast.error('Failed to cancel analysis', { duration: 3000, position: 'top-center' });
        }
    };

    // const showToaster = (message) => {
    //     const toaster = document.createElement('div');
    //     toaster.className = 'fixed top-20 right-5 bg-primary text-white p-4 rounded-lg shadow-lg';
    //     toaster.innerText = message;
    //     document.body.appendChild(toaster);
    //     setTimeout(() => {
    //         document.body.removeChild(toaster);
    //     }, 3000);
    // };

    const handleLogout = async () => {
        try {
            // Perform server-side logout, if applicable
            await fetch('/api/auth/logout', { method: 'POST' });

            // Clear client-side user data
            localStorage.clear();

            // Clear the authentication cookie
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

            // Reset the user state to null
            setUser(null);

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
            // Logout error

            // In case of any error, still redirect to the login page to ensure the user gets logged out
            router.push('/auth/login');
        }
    };

    const displayCustomers = customers || [];
    const displayProfiles = displayCustomers.flatMap(c => c.profiles).slice(-5).reverse();
    const displayCampaigns = displayCustomers.flatMap(c => c.profiles).flatMap(p => p.campaigns || []).slice(-5).reverse();

    // Prevent hydration mismatch by not rendering until mounted and user is loaded
    if (!isMounted || !user) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <div className="text-[#47577d]">Loading...</div>
            </div>
        );
    }

    /**
     * Converts a string to sentence case.
     * Example: "HELLO WORLD" -> "Hello world"
     * @param {string} str The string to convert.
     * @returns {string} The converted string.
     */
    const toSentenceCase = (str) => {
        if (!str) return "";
        const lowerCaseStr = str.toLowerCase();
        return lowerCaseStr.charAt(0).toUpperCase() + lowerCaseStr.slice(1);
    };
    /**
     * Truncates a string if it's longer than the specified number of characters.
     * @param {string} str The string to truncate.
     * @param {number} maxLength The maximum length of the string before truncation.
     * @returns {string} The truncated string with an ellipsis, or the original string.
     */
    const truncateString = (str, maxLength) => {
        // 1. If the string is falsy (null, undefined, etc.), return an empty string.
        if (!str) {
            return "";
        }

        // 2. If the string is shorter than or equal to the max length, return it as is.
        if (str.length <= maxLength) {
            return str;
        }

        // 3. Otherwise, truncate it and add an ellipsis.
        return str.substring(0, maxLength) + '...';
    };
    return (
        <div className="min-h-[calc(100vh-4rem)]">
            {/* <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <img
                                src="/logo.png"
                                alt="Lead Blocks Logo"
                                className="h-12 mr-2"
                            />
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                                <div className="h-8 w-8 bg-[#47577d] rounded-full flex items-center justify-center text-white">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="ml-2 text-[#47577d] font-medium">
                                    {user.username}
                                </span>
                            </div>
                            <div className="h-6 w-px bg-gray-200"></div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-[#cc4c5c] hover:text-[#b54452] font-medium"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav> */}

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="text-center mb-8 py-6 bg-gray-50 rounded-lg border border-gray-200">
                        <h1 className="text-4xl font-bold text-primary mb-2">Dashboard</h1>
                        <p className="text-gray-600">Manage your leads and track your campaign statistics</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* User Card */}
                        <div className="card">
                            <h3 className="text-lg font-semibold text-primary mb-4">User Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm text-gray-500">Username</label>
                                    <p className="font-medium">{user.username}</p>
                                </div>
                            </div>
                        </div>

                        {/* Customer/Manager Card - Two buttons, one to /statistics and one to /follow_up */}
                        {(user?.type === "Customer" || user?.type === "Manager") && (
                            <div className="card">
                                <h3 className="text-lg font-semibold text-primary mb-4">Statistics & Leads</h3>
                                <div className="space-y-4">
                                    <button
                                        onClick={navigateToStatistics}
                                        className="btn btn-primary w-full flex items-center gap-2"
                                    >
                                        <FcStatistics className="inline-block text-2xl" />
                                        View Statistics
                                    </button>
                                    <button
                                        onClick={navigateToFollowUp}
                                        className="btn btn-fifth w-full flex items-center gap-2"
                                    >
                                        <MdPeopleAlt className="inline-block text-2xl" />
                                        Check Leads ({followUpCount})
                                    </button>
                                    <button
                                        onClick={navigateToCustomerSetups}
                                        className="btn btn-primary w-full flex items-center gap-2"
                                    >
                                        <FiFileText className="inline-block text-2xl" />
                                        Setup Document
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Lists Card for Customer/Manager */}
                        {(user?.type === "Customer" || user?.type === "Manager") && (
                            <div className="card">
                                <h3 className="text-lg font-semibold text-primary mb-4">Lists</h3>
                                <div className="space-y-4">
                                    <button
                                        onClick={navigateToLists}
                                        className="btn btn-primary w-full flex items-center gap-2"
                                    >
                                        <FaListUl className="inline-block text-2xl" />
                                        View Lists
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Stats Card */}
                        {user?.type === "Admin" && (
                            <div className="card">
                                <h3
                                    onClick={navigateToStatistics}
                                    className="text-lg font-semibold text-primary mb-4 cursor-pointer hover:underline hover:decoration-4"
                                >
                                    Statistics
                                </h3>
                                <div className="space-y-4">
                                    {/* Total Customers */}
                                    <div className="flex justify-between items-center">
                                        <div className="cursor-default">
                                            <p className="text-sm text-gray-500">Total Customers</p>
                                            <div className="flex items-center">
                                                {isLoading ? (
                                                    <ClipLoader size={20} color="#47577d" />
                                                ) : (
                                                    <p className="text-xl font-bold text-[#47577d]">{totalCustomers}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Active Profiles + Campaigns (same row) */}
                                    <div className="flex justify-between gap-4">
                                        {/* Active Profiles */}
                                        <div onClick={navigateToProfiles} className="cursor-pointer flex-1">
                                            <p className="text-sm text-gray-500 hover:underline">Active Profiles</p>
                                            <div className="flex items-center">
                                                {isLoading ? (
                                                    <ClipLoader size={16} color="#cc4c5c" />
                                                ) : (
                                                    <p className="text-xl font-bold text-[#cc4c5c]">{totalProfiles}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Active Campaigns */}
                                        <div onClick={navigateToCampaigns} className="cursor-pointer flex-1">
                                            <p className="text-sm text-gray-500 hover:underline">Active Campaigns</p>
                                            <div className="flex items-center">
                                                {isLoading ? (
                                                    <ClipLoader size={16} color="#47577d" />
                                                ) : (
                                                    <p className="text-xl font-bold text-[#47577d]">{uniqueLiveCampaignCount}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Errors (same row) */}
                                    <div className="flex justify-between gap-4">
                                        {/* Data Receiver Errors */}
                                        <div onClick={navigateToReceiverErrors} className="cursor-pointer flex-1">
                                            <p className="text-sm text-gray-500 hover:underline">Receiver Errors &lt;30d</p>
                                            <div className="flex items-center">
                                                {isLoading ? (
                                                    <ClipLoader size={16} color="#dc2626" />
                                                ) : (
                                                    <p className="text-xl font-bold text-red-600">{receiverErrorCount}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Task Errors */}
                                        <div onClick={navigateToSenderErrors} className="cursor-pointer flex-1">
                                            <p className="text-sm text-gray-500 hover:underline">Task Errors &lt;30d</p>
                                            <div className="flex items-center">
                                                {isLoading ? (
                                                    <ClipLoader size={16} color="#dc2626" />
                                                ) : (
                                                    <p className="text-xl font-bold text-red-600">{senderErrorCount}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Ongoing AI Analyses Card */}
                        {user?.type === "Admin" && (
                            <div className="card">
                                <div className="flex justify-between items-center mb-4">
                                    <button
                                        onClick={() => setAnalysesExpanded(prev => !prev)}
                                        className="flex items-center gap-2 text-lg font-semibold text-primary hover:opacity-80 transition-opacity"
                                    >
                                        {analysesExpanded ? <IoChevronUp className="text-base" /> : <IoChevronDown className="text-base" />}
                                        AI Analyses
                                        {ongoingAnalyses.length > 0 && (
                                            <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ongoingAnalyses.length}</span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => fetchOngoingAnalyses(true)}
                                        disabled={refreshingAnalyses}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Refresh analyses"
                                    >
                                        <IoRefreshOutline
                                            className={`text-xl text-[#364570] ${refreshingAnalyses ? 'animate-spin' : ''}`}
                                        />
                                    </button>
                                </div>
                                {analysesExpanded && <div className="space-y-4">
                                    {ongoingAnalyses.length > 0 ? (
                                        ongoingAnalyses.map((analysis) => (
                                            <div key={analysis.id} className="border border-gray-200 rounded-lg p-4 relative">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-semibold text-gray-800">
                                                        {analysis.promptName || `Analysis ${analysis.id.slice(-8)}`}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRemoveAnalysis(analysis.id)}
                                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                                        title="Remove from view"
                                                    >
                                                        <IoClose className="text-gray-500 hover:text-gray-700" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-xs text-gray-400">ID: {analysis.id.slice(-8)}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${analysis.current_status === 'active' ? 'bg-blue-100 text-blue-800' :
                                                            analysis.current_status === 'queuing' ? 'bg-yellow-100 text-yellow-800' :
                                                                analysis.current_status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                                                    analysis.current_status === 'done' ? 'bg-green-100 text-green-800' :
                                                                        analysis.current_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                            analysis.current_status === 'expired' ? 'bg-gray-100 text-gray-800' :
                                                                                'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {analysis.current_status === 'active' ? 'Processing' :
                                                            analysis.current_status === 'queuing' ? 'Queueing jobs' :
                                                                analysis.current_status === 'pending' ? 'Pending' :
                                                                    analysis.current_status === 'done' ? 'Completed' :
                                                                        analysis.current_status === 'cancelled' ? 'Cancelled' :
                                                                            analysis.current_status === 'expired' ? 'Expired (cleanup)' :
                                                                                analysis.current_status}
                                                    </span>
                                                    {analysis.current_status !== 'done' && analysis.current_status !== 'cancelled' && (
                                                        <button
                                                            onClick={() => handleCancelAnalysis(analysis.id)}
                                                            className="text-xs px-2 py-0.5 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                                                            title="Cancel this analysis"
                                                        >
                                                            Stop
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="mb-2">
                                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                                        <span>Progress</span>
                                                        <span>{analysis.percentage}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-300 ${analysis.current_status === 'done' && (analysis.failed ?? 0) === 0 ? 'bg-green-600' :
                                                                    analysis.current_status === 'done' && (analysis.failed ?? 0) > 0 ? 'bg-red-600' :
                                                                        'bg-[#364570]'
                                                                }`}
                                                            style={{ width: `${analysis.percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500">
                                                    <div className="flex flex-col">
                                                        <span>Total: {analysis.total_companies}</span>
                                                        <span>Completed: {analysis.completed || 0}</span>
                                                        {(analysis.skipped ?? 0) > 0 && <span className="text-yellow-600">Skipped: {analysis.skipped ?? 0}</span>}
                                                        {(analysis.current_status === 'active' || analysis.current_status === 'queuing') ? (
                                                            (analysis.pending ?? 0) > 0 && <span className="text-blue-600">Pending: {analysis.pending ?? 0}</span>
                                                        ) : (
                                                            (analysis.failed ?? 0) > 0 && <span className="text-red-600">Failed: {analysis.failed ?? 0}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        {analysis.processed && analysis.processedAt ? (
                                                            <span>Completed: {new Date(analysis.processedAt).toLocaleTimeString()}</span>
                                                        ) : analysis.createdAt ? (
                                                            <span>Started: {new Date(analysis.createdAt).toLocaleTimeString()}</span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>No recent AI analyses</p>
                                        </div>
                                    )}
                                </div>}
                            </div>
                        )}
                        {/* Quick Actions Card */}
                        {(user?.type === "Admin" || user?.type === "Chatter") && (
                            <div className="card flex flex-col">
                                <h3 className="text-lg font-semibold text-primary mb-4">Quick Actions</h3>

                                <div className="flex flex-col gap-3">
                                    <a onClick={navigateToFollowUp}><FaUserTie className="inline-block text-lg" />
                                        &nbsp;Check your {isLoading ? <ClipLoader size={14} color="#47577d" /> : followUpCount} Leads
                                    </a>
                                    <a onClick={navigateToAllProspects}><HiUsers className="inline-block text-lg" />
                                        &nbsp;All Prospects
                                    </a>
                                    {user?.type === "Admin" && (
                                        <a onClick={navigateToMasterDatabase}><FaDatabase className="inline-block text-lg" />
                                            &nbsp;Master Database
                                        </a>
                                    )}
                                    {user?.type === "Admin" && (
                                        <a onClick={navigateToLists}><FaListUl className="inline-block text-lg" />
                                            &nbsp;Lists
                                        </a>
                                    )}
                                    {(user?.type === "Admin" || user?.type === "Chatter") && (
                                        <a onClick={navigateToCustomerSetups}><FiFileText className="inline-block text-lg" />
                                            &nbsp;Customer Setups
                                        </a>
                                    )}
                                </div>

                                {/* TEMPORARY TEST BUTTON */}
                                {/* <button
                                    onClick={() => {
                                    const fakeNotification = {
                                        id: new Date().toISOString(),
                                        message: `Test prospect added: Jane Doe`,
                                        time: new Date(),
                                    };
                                    setNotifications(prev => [fakeNotification, ...prev]);
                                    showToaster(fakeNotification.message);
                                    }}
                                    className="btn btn-secondary mt-4"
                                >
                                    Test Notification
                                </button> */}
                                {/* END TEMPORARY TEST BUTTON */}
                            </div>
                        )}
                        {user?.type === "Admin" && (
                            <>
                                {/* Recent 5 Customers Card */}
                                <div className="card flex flex-col justify-between h-full">
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary mb-4">Recent 5 Customers</h3>
                                        <ul className="divide-y divide-gray-200">
                                            {isLoading ? (
                                                <li className="py-4 flex justify-center">
                                                    <ClipLoader size={24} color="#47577d" />
                                                </li>
                                            ) : displayCustomers.slice(-5).reverse().map((customer) => (
                                                <li key={customer.id} className="py-2">
                                                    <span className="font-medium">{customer.customer_name}</span>
                                                    <span className="ml-2 text-xs text-gray-500">
                                                        ({customer.profiles.length} profiles)
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <a
                                            href="https://backend.leadblocks.nl/admin/content-manager/collection-types/api::customer.customer/create"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-primary hover:underline font-medium text-sm pr-2 pb-2"
                                        >
                                            <FaPlus className="text-xs" />
                                            Add Customer
                                        </a>
                                    </div>
                                </div>

                                {/* Recent 5 Profiles Card */}
                                <div className="card flex flex-col justify-between h-full">
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary mb-4">Recent 5 Profiles</h3>
                                        <ul className="divide-y divide-gray-200">
                                            {isLoading ? (
                                                <li className="py-4 flex justify-center">
                                                    <ClipLoader size={24} color="#47577d" />
                                                </li>
                                            ) : displayProfiles.map((profile, idx) => (
                                                <li key={profile.id || idx} className="py-2">
                                                    <span className="font-medium">{profile.profile_name || "Profile"}</span>
                                                    <span className="ml-2 text-xs text-gray-500">
                                                        {(() => {
                                                            const cust = displayCustomers.find((c) =>
                                                                c.profiles.some((p) => p.id === profile.id)
                                                            );
                                                            return cust ? `(${cust.customer_name})` : "";
                                                        })()}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <a
                                            href="https://backend.leadblocks.nl/admin/content-manager/collection-types/api::profile.profile/create"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-primary hover:underline font-medium text-sm pr-2 pb-2"
                                        >
                                            <FaPlus className="text-xs" />
                                            Add Profile
                                        </a>
                                    </div>
                                </div>

                                {/* Recent 5 Campaigns Card */}
                                <div className="card flex flex-col justify-between h-full">
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary mb-4">Recent 5 Campaigns</h3>
                                        <ul className="divide-y divide-gray-200">
                                            {isLoading ? (
                                                <li className="py-4 flex justify-center">
                                                    <ClipLoader size={24} color="#47577d" />
                                                </li>
                                            ) : displayCampaigns.map((campaign, idx) => (
                                                <li key={campaign.id || idx} className="py-2">
                                                    <div className="font-medium" title={toSentenceCase(campaign.campaign_name || "campaign")}> {truncateString(toSentenceCase(campaign.campaign_name || "campaign"), 38)}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {(() => {
                                                            const cust = displayCustomers.find((c) =>
                                                                c.profiles.some((p) =>
                                                                    (p.campaigns || []).some((cm) => cm.id === campaign.id)
                                                                )
                                                            );
                                                            const prof = cust
                                                                ? cust.profiles.find((p) =>
                                                                    (p.campaigns || []).some((cm) => cm.id === campaign.id)
                                                                )
                                                                : null;
                                                            return prof && cust
                                                                ? `(${prof.profile_name} / ${cust.customer_name})`
                                                                : "";
                                                        })()}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <a
                                            href="https://backend.leadblocks.nl/admin/content-manager/collection-types/api::campaign.campaign/create"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-primary hover:underline font-medium text-sm pr-2 pb-2"
                                        >
                                            <FaPlus className="text-xs" />
                                            Add Campaign
                                        </a>
                                    </div>
                                </div>
                            </>
                        )}

                        {(user?.type === "Admin" || user?.type === "Backoffice" || user?.type === "Chatter") && (
                            <div className="card">
                                <h3 className="text-lg font-semibold text-primary mb-4">Tasks</h3>
                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={navigateToRobotTasks}
                                        className="btn btn-secondary w-full flex items-center gap-2"
                                    >
                                        <BsRobot className="inline-block text-2xl" />
                                        Robot Tasks
                                    </button>
                                    {(user?.type === "Admin" || user?.type === "Backoffice") && (
                                        <button
                                            onClick={navigateToRobotTasksOverview}
                                            className="btn btn-secondary w-full flex items-center gap-2"
                                        >
                                            <BsRobot className="inline-block text-2xl" />
                                            Robot Tasks Overview
                                        </button>
                                    )}
                                    <button
                                        onClick={navigateToChatterTasks}
                                        className="btn btn-primary w-full flex items-center gap-2"
                                    >
                                        <HiOutlineChatBubbleLeftRight className="inline-block text-2xl" />
                                        Chatter Tasks
                                    </button>
                                </div>
                            </div>
                        )}

                        {(user?.type === "Admin" || user?.type === "Backoffice" || user?.type === "Customer") && (
                            <div className="card">
                                <h3 className="text-lg font-semibold text-primary mb-4">Non-Campaign Chats</h3>
                                {/* You can also show this for Admin and Backoffice */}
                                {(user?.type === "Admin" || user?.type === "Backoffice" || user?.type === "Customer") && (
                                    <div className="space-y-4">
                                        <button
                                            onClick={navigateToLinkedInChats}
                                            className="btn btn-primary w-full flex items-center gap-2"
                                        >
                                            <IoIosChatboxes className="inline-block text-2xl" />
                                            View Chats (last month)
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {(user?.type === "Manager" || user?.type === "Customer") && (
                            <div className="card">
                                <h3 className="text-lg font-semibold text-primary mb-4">Prospects</h3>
                                {/* You can also show this for Admin and Backoffice */}
                                {(user?.type === "Manager" || user?.type === "Customer") && (
                                    <div className="space-y-4">
                                        <button
                                            onClick={navigateToAllProspects}
                                            className="btn btn-primary w-full flex items-center gap-2"
                                        >
                                            <IoPeopleOutline className="inline-block text-2xl" />
                                            View Prospects
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Data Import card */}
                        {user?.type === "Admin" && (
                            <div className="card">
                                <h3 className="text-lg font-semibold text-primary mb-4">Data Import</h3>
                                <select
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value) {
                                            switch (value) {
                                                case 'companies': navigateToImportCompanies(); break;
                                                case 'campaigns': navigateToImportCampaigns(); break;
                                                case 'prospects': navigateToImportProspects(); break;
                                                case 'blacklist': navigateToImportBlacklist(); break;
                                                case 'chats': navigateToImportChats(); break;
                                                case 'tasks': navigateToImportTasks(); break;
                                                case 'disconnect': navigateToDisconnectedProspects(); break;
                                                case 'scrapes': navigateToImportScrapes(); break;
                                                case 'chatter': navigateToCreateChatterTasks(); break;
                                            }
                                            e.target.value = '';
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select an import option...</option>
                                    <option value="chatter">Create Chatter Tasks</option>
                                    <option value="disconnect">Disconnect Prospects</option>
                                    <option value="blacklist">Import Blacklist</option>
                                    <option value="campaigns">Import Campaigns</option>
                                    <option value="companies">Import Companies</option>
                                    <option value="chats">Import LinkedIn Chats</option>
                                    <option value="prospects">Import Prospects</option>
                                    <option value="scrapes">Import Scrapes</option>
                                    <option value="tasks">Import Tasks</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}