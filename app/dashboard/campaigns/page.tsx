'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
// Chart component removed - using TotalsChart in statistics page instead
import { MdCampaign } from "react-icons/md";
import { getBackendUrl } from '@/lib/api-config';

interface Profile {
    profile_name: string;
    start_date: string;
    end_date: string;
    customer_name: string;
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

// Define the structure of each campaign
interface Campaign {
    profile_name: string;
    campaign_name: string;
    requests_per_day: number;
    campaign_type: string;
    start_date: string;
    campaign_id: string;
}

// CampaignStats interface removed - moved to statistics page

export default function CampaignsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]); // Now campaigns is strongly typed
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedProfile, setSelectedProfile] = useState<string>('All'); // New filter state
    const [error, setError] = useState<string | null>(null);
    const [hasProfile, setHasProfile] = useState<boolean>(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    // Chart state removed - charts are now in statistics page

    const getCookie = (name: string): string | undefined => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return undefined;
    };

    useEffect(() => {
        
        const fetchCustomerData = async (userUuid: string, token: string) => {
            const backendUrl = getBackendUrl();
            try {
                const response = await fetch(
                    `${backendUrl}/api/users-permissions/users/uuid/${userUuid}?` +
                        new URLSearchParams({
                            'populate[profile]': 'true',
                            'populate[customers][populate][profiles][populate][campaigns]': 'true',
                        }),
                    {
                        method: 'GET',
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                if (!response.ok)
                    throw new Error(`Failed to fetch customers: ${response.status} - ${await response.text()}`);

                const userData = await response.json();
                const profile = userData.profile;
                if (profile) {
                    setUserProfile(profile);
                    setHasProfile(true);
                    setSelectedProfile(profile.profile_name);
                } else {
                    setHasProfile(false);
                    setUserProfile(null);
                    setSelectedProfile('All');
                }
                const fetchedCustomers = userData.customers || [];
                // Process and populate campaigns
                const activeCampaigns = fetchedCustomers.flatMap((customer: any) =>
                    customer.profiles.flatMap((profile: any) =>
                        profile.campaigns
                            .filter((campaign: any) => campaign.live) // Assuming `live` is a boolean indicating if the campaign is active
                            .map((campaign: any) => ({
                                profile_name: profile.profile_name,
                                campaign_name: campaign.campaign_name,
                                requests_per_day: campaign.requests_per_day,
                                campaign_type: campaign.campaign_type,
                                start_date: campaign.start_date,
                                campaign_id: campaign.documentId
                            }))
                    )
                );

                // Sort by profile name
                const sortedCampaigns = activeCampaigns.sort((a, b) => a.profile_name.localeCompare(b.profile_name));
                setCampaigns(sortedCampaigns);
            } catch (error) {
                console.error('Error fetching customer data:', error);
            } finally {
                setLoading(false);
            }
        };

        const token = getCookie('token');
        const storedUser = localStorage.getItem('user');

        if (!token || !storedUser) {
            router.push('/auth/login');
            return;
        }

        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);

        fetchCustomerData(parsedUser.uuid, token);
    }, [router]);

    // Chart fetching removed - charts are now in statistics page

    useEffect(() => {
        if (user && !['Admin'].includes(user.type)) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
    
            // Clear all relevant localStorage data
            localStorage.clear();
            // Clear cookies if needed
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
            // Reset all state variables
            setUser(null);
            setCampaigns([]);
            setSelectedProfile('All');
    
            // Redirect to login
            router.push('/auth/login');
        } catch (error) {
            console.error('Logout error:', error);
            router.push('/auth/login');
        }
    };

    // Get unique profile names for filtering
    const uniqueProfiles = ['All', ...Array.from(new Set(campaigns.map(c => c.profile_name))).sort((a, b) => a.localeCompare(b))];

    // Filter campaigns based on selected profile
    const filteredCampaigns = selectedProfile === 'All'
        ? campaigns
        : campaigns.filter(c => c.profile_name === selectedProfile);

    return (
        <div className="min-h-screen bg-gray-0">
            {user && <Navigation user={user} onLogout={handleLogout} />}

            <div className="max-w-7xl mx-auto px-6 flex gap-6 items-start">
                <div className="w-56 flex-shrink-0 bg-white shadow-md rounded-lg p-4 h-fit mt-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">Filters</h2>
                    <label className="block text-sm font-medium text-gray-700">Profile</label>
                    <select
                        value={selectedProfile}
                        onChange={(e) => setSelectedProfile(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        {uniqueProfiles.map(profile => (
                            <option key={profile} value={profile}>
                                {profile}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-grow overflow-hidden">
                    <h1 className="text-primary mb-6 mt-5">Campaigns</h1>

                    {/* Chart moved to statistics page */}

                    {loading ? (
                        <p className="text-gray-600 text-lg">Loading campaigns...</p>
                    ) : filteredCampaigns.length === 0 ? (
                        <p className="text-gray-600 text-lg">No campaigns found.</p>
                    ) : (
                        <>
                            {/* Header row for the list */}
                            <div className="flex items-center px-6 py-2 mb-2 bg-gray-100 rounded-t-lg shadow-sm font-semibold text-gray-600 text-sm">
                                <div className="flex-1 min-w-0 flex-shrink-0 text-left">Campaign</div>
                                <div className="w-[250px] text-left">Details</div>
                                <div className="w-[200px] flex-shrink-0 text-right">Actions</div>
                            </div>
                            {/* Render campaigns */}
                            <div className="flex flex-col gap-4">
                                {filteredCampaigns.map((campaign, index) => (
                                    <div key={index} className="bg-white shadow-lg rounded-lg p-0 w-full flex items-center">
                                        {/* Campaign name column */}
                                        <div className="flex-1 min-w-0 flex-shrink-0 px-4 py-6">
                                            <h2 className="text-primary hover:underline">
                                                <a>{campaign.campaign_name}</a>
                                            </h2>
                                            <p className="text-gray-700">{campaign.profile_name}</p>
                                        </div>
                                        {/* Campaign details column */}
                                        <div className="w-[250px] px-4 py-6">
                                            <p className="text-gray-700"><strong>Type:</strong> {campaign.campaign_type}</p>
                                            <p className="text-gray-700"><strong>Requests/day:</strong> {campaign.requests_per_day}</p>
                                            <p className="text-gray-700"><strong>Start Date:</strong> {campaign.start_date}</p>
                                        </div>
                                        {/* Actions column */}
                                        <div className="w-[200px] flex items-center gap-2 flex-shrink-0 justify-end px-4">
                                            {user?.type === "Admin" && (
                                                <a
                                                    href={`https://backend.leadblocks.nl/admin/content-manager/collection-types/api::campaign.campaign/${campaign.campaign_id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2 py-2 btn btn-primary-alt flex items-center gap-1"
                                                >
                                                    <MdCampaign className="inline-block text-2xl" />Edit
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Chart function removed - moved to statistics page