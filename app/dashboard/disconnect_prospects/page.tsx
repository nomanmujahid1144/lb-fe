'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import { getBackendUrl } from '@/lib/api-config';
import toast from 'react-hot-toast';
import { ClipLoader } from 'react-spinners';

interface User {
    id: number;
    username: string;
    email: string;
    type: string;
}

export default function ImportPeoplePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<{ id: number; name: string }[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<string>("");
    const [campaigns, setCampaigns] = useState<{ id: string; campaign_name: string }[]>([]);
    const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
    const [isAllSelected, setIsAllSelected] = useState<boolean>(true);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Redirect non-admins to the dashboard
    useEffect(() => {
        if (user && user.type !== 'Admin') {
            router.push('/dashboard');
        }
    }, [user, router]);


    // Get profiles
    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const token = getCookie('token');
                const backendUrl = getBackendUrl();
                let allProfiles: any[] = [];
                let page = 1;
                const pageSize = 100; // Fetch up to 100 profiles per page
                let total = 0;

                while (true) {
                    const queryUrl = new URL(`${backendUrl}/api/profiles`);
                    queryUrl.searchParams.append("pagination[page]", page.toString());
                    queryUrl.searchParams.append("pagination[pageSize]", pageSize.toString());

                    const res = await fetch(queryUrl.toString(), {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });

                    if (!res.ok) throw new Error(`Failed to fetch profiles: ${res.status} - ${await res.text()}`);

                    const result = await res.json();
                    const fetchedProfiles = result.data || [];
                    allProfiles = allProfiles.concat(fetchedProfiles);
                    total = result.meta?.pagination?.total || 0;

                    if (allProfiles.length >= total) break;
                    page += 1;
                }

                const profileOptions = allProfiles.map((p: any) => ({
                    id: p.id,
                    name: p.profile_name
                })).sort((a, b) => a.name.localeCompare(b.name));
                setProfiles(profileOptions);
            } catch (err) {
                console.error("Failed to fetch profiles:", err);
            }
        };

        if (user?.type === 'Admin') {
            fetchProfiles();
        }
    }, [user]);

    // Get campaigns
    useEffect(() => {
        const fetchCampaigns = async () => {
            if (!selectedProfile) {
                setCampaigns([]);
                return;
            }

            try {
                const token = getCookie('token');
                const backendUrl = getBackendUrl();
                let allCampaigns: any[] = [];
                let page = 1;
                const pageSize = 100;
                let total = 0;

                while (true) {
                    const response = await fetch(
                        `${backendUrl}/api/campaigns` +
                            `?filters[profile][profile_name][$eq]=${encodeURIComponent(selectedProfile)}` +
                            `&pagination[page]=${page}` +
                            `&pagination[pageSize]=${pageSize}` +
                            `&populate=profile` +
                            `&sort=campaign_name:asc`,
                        { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
                    );

                    if (!response.ok) throw new Error(`Failed to fetch campaigns: ${response.status} - ${await response.text()}`);

                    const data = await response.json();
                    const campaigns = data.data || [];
                    allCampaigns = allCampaigns.concat(campaigns);
                    total = data.meta?.pagination?.total || 0;

                    if (allCampaigns.length >= total) break;
                    page++;
                }

                const campaignOptions = allCampaigns.map((c: any) => ({
                    id: c.id,
                    campaign_name: c.campaign_name
                }));
                setCampaigns(campaignOptions);
                if (campaignOptions.length > 0) {
                    setSelectedCampaigns(campaignOptions.map(c => c.id)); // Default to all selected
                    setIsAllSelected(true);
                } else {
                    setSelectedCampaigns([]);
                    setIsAllSelected(false);
                }
            } catch (err) {
                console.error("Failed to fetch campaigns:", err);
                setCampaigns([]);
            }
        };

        if (user?.type === 'Admin' && selectedProfile) {
            fetchCampaigns();
        } else {
            setCampaigns([]);
        }
    }, [user, selectedProfile]);

    if (user?.type !== 'Admin') return null; // Prevents rendering if redirecting

    const getCookie = (name: string): string | undefined => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return undefined;
    };

    // Handle file selection
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] || null;
        setFile(selectedFile);
    };

    // Handle profile selection
    const handleProfileChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedProfile(event.target.value);
        setSelectedCampaigns([]); // Clear campaign selection when profile changes
        setIsAllSelected(false); // Don't default to all selected when switching profiles
        setIsExpanded(false);
        setSearchTerm("");
    };

    // Handle campaign selection
    const handleCampaignToggle = (campaignId: string) => {
        if (isAllSelected) {
            // If all selected, deselect all and select only this one
            setSelectedCampaigns([campaignId]);
            setIsAllSelected(false);
        } else {
            setSelectedCampaigns(prev => 
                prev.includes(campaignId) 
                    ? prev.filter(id => id !== campaignId)
                    : [...prev, campaignId]
            );
        }
    };

    const handleSelectAllToggle = () => {
        if (isAllSelected) {
            setSelectedCampaigns([]);
            setIsAllSelected(false);
        } else {
            setSelectedCampaigns(campaigns.map(c => c.id));
            setIsAllSelected(true);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
    
        // Function to get the authentication token from cookies
        const getCookie = (name: string): string | undefined => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return undefined;
        };
    
        const token = getCookie('token');
        if (!token) {
            toast.error('Authentication token is missing. Please log in again.', {
                duration: 4000,
                position: 'top-center',
            });
            return;
        }

        // Check if file and profile are selected
        if (!file || !selectedProfile) {
            setError('Please select a profile and upload a file.');
            return;
        }

        // Check if at least one campaign option is selected
        if (!isAllSelected && selectedCampaigns.length === 0) {
            setError('Please select at least one campaign or choose "Select All".');
            return;
        }

        // Check if there are campaigns available for the selected profile
        if (campaigns.length === 0) {
            setError('No campaigns are available for the selected profile. Please choose a different profile.');
            return;
        }
    
        // Clear any previous errors or success messages
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
    
        const formData = new FormData();
        formData.append('file', file);
        formData.append('profile', selectedProfile);
        
        // Prepare campaign data - always send array of documentIds
        const campaignIds = isAllSelected ? campaigns.map(c => c.id) : selectedCampaigns;
        
        if (campaignIds.length > 0) {
            formData.append('campaigns', JSON.stringify(campaignIds));
        }
    
        try {
            // Send the POST request to the backend
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/prospects/disconnect`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
    
            //console.log('Response:', response);
    
            // Check if the response is OK (status 200-299)
            if (!response.ok) {
                // Parse the response body to get the error message
                const responseBody = await response.json();
                //console.log('Error response:', responseBody);
                const errorMessage = responseBody?.error?.message || 'Failed to upload people file. Please try again.';
                
                // Set the error message in the UI
                setError(errorMessage);
                setIsLoading(false);
                return;
            }
    
            // If the response is successful, parse the result
            const result = await response.json();
    
            //console.log('Result:', result);
    
            // Handle validation response based on 'success' status
            if (result.success === true) {
                setSuccessMessage(result.message || 'People imported successfully!');
                setTimeout(() => setSuccessMessage(null), 5000);
                setFile(null); // Clear the file
                if (fileInputRef.current) fileInputRef.current.value = "";
                setSelectedProfile(""); // Clear the selected profile
                setSelectedCampaigns([]); // Clear the selected campaigns
                setIsAllSelected(true);
                setIsExpanded(false);
                setSearchTerm("");
                setError(null); // Clear any existing error
            } else {
                // Handle errors in the response
                console.log('Error: ', result.message || 'An error occurred while importing the people.');
                setError(result.message || 'An error occurred while importing the people.');
                setSuccessMessage(null); // Clear success message if there's an error
            }
        } catch (error) {
            // Handle any unexpected errors (e.g., network issues)
            console.log('Unexpected error: ', error);
            setError('An unexpected error occurred. Please try again later.');
        } finally {
            // Ensure loading state is cleared
            setIsLoading(false);
        }
    };

    // Handle cancel and navigate back
    const handleCancel = () => {
        router.push('/dashboard');
    };

    const handleLogout = async () => {
        try {
            // Call the API to log out on the server-side
            await fetch('/api/auth/logout', { method: 'POST' });
    
            // Clear items from localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
    
            // Clear cookies related to the authentication token
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
            // Reset relevant state variables
            setUser(null); // Clear user state
            setFile(null); // Reset the file upload state
            setSelectedProfile(""); // Reset the selected profile
            setSelectedCampaigns([]); // Reset the selected campaigns
            setIsAllSelected(true);
            setIsExpanded(false);
            setSearchTerm("");
            setIsLoading(false); // Stop the loading spinner if it was active
            setError(null); // Clear any error messages
            setSuccessMessage(null); // Clear any success messages
    
            toast.success('Successfully logged out!', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                },
            });
    
            // Redirect to the login page
            router.push('/auth/login');
        } catch (error) {
            console.log('Logout error:', error);
            router.push('/auth/login');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
             {user && <Navigation user={user} onLogout={handleLogout} />}

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <h1 className="text-4xl font-bold mb-8 text-[#cc4c5c]">Disconnect Prospects</h1>

                    <div className="bg-white rounded-lg shadow-sm border p-6 overflow-visible">
                        <h3 className="text-lg font-semibold text-[#47577d] mb-4">Upload CSV or Excel File</h3>

                        {error && <p className="text-red-500 mb-4">{error}</p>}
                        {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}

                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                {/* Profile Selection - First */}
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Select a profile</label>
                                    <select
                                        value={selectedProfile}
                                        onChange={handleProfileChange}
                                        className="border border-gray-300 p-2 rounded w-full"
                                    >
                                        <option value="" disabled>Select a profile</option>
                                        {profiles.map((profile) => (
                                            <option key={profile.id} value={profile.name}>
                                                {profile.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Campaign Selection - Second */}
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Select campaigns</label>
                                    <div className={`border border-gray-300 rounded ${campaigns.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <button
                                            type="button"
                                            onClick={() => campaigns.length > 0 && setIsExpanded(!isExpanded)}
                                            disabled={campaigns.length === 0}
                                            className={`w-full p-2 text-left flex justify-between items-center ${
                                                campaigns.length === 0 
                                                    ? 'bg-gray-100 cursor-not-allowed' 
                                                    : 'bg-gray-50 hover:bg-gray-100'
                                            }`}
                                        >
                                            <span>
                                                {campaigns.length === 0 
                                                    ? "No campaigns available" 
                                                    : isAllSelected 
                                                        ? "All campaigns selected" 
                                                        : selectedCampaigns.length === 0 
                                                            ? "No campaigns selected" 
                                                            : `${selectedCampaigns.length} campaign${selectedCampaigns.length > 1 ? 's' : ''} selected`
                                                }
                                            </span>
                                            {campaigns.length > 0 && (
                                                <svg 
                                                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                                </svg>
                                            )}
                                        </button>
                                        {isExpanded && campaigns.length > 0 && (
                                            <div className="p-2 border-t">
                                                <input
                                                    type="text"
                                                    placeholder="Search campaigns..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded mb-2"
                                                />
                                                <div className="max-h-40 overflow-y-auto">
                                                    <label className="flex items-center mb-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={isAllSelected}
                                                            onChange={handleSelectAllToggle}
                                                            className="mr-2"
                                                        />
                                                        <span className="font-medium">Select All</span>
                                                    </label>
                                                    {campaigns
                                                        .filter(campaign => 
                                                            campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())
                                                        )
                                                        .map((campaign) => (
                                                            <label key={campaign.id} className="flex items-center mb-1">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedCampaigns.includes(campaign.id)}
                                                                    onChange={() => handleCampaignToggle(campaign.id)}
                                                                    className="mr-2"
                                                                />
                                                                <span>{campaign.campaign_name}</span>
                                                            </label>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* File Input */}
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Select a file</label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv, .xlsx"
                                        onChange={handleFileChange}
                                        className="border border-gray-300 p-2 rounded w-full"
                                        />
                                    {file && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            Selected file: <span className="font-medium">{file.name}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <div className="flex items-center space-x-4">
                                    <button
                                        type="submit"
                                        disabled={isLoading || campaigns.length === 0}
                                        className={`text-sm py-2 px-4 rounded-lg transition ${
                                            isLoading || campaigns.length === 0
                                                ? 'bg-gray-400 cursor-not-allowed' 
                                                : 'bg-green-500 hover:bg-green-600'
                                        } text-white`}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <ClipLoader size={16} color="#ffffff" />
                                                Disconnecting...
                                            </div>
                                        ) : 'Disconnect Prospects'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="bg-gray-500 text-white text-sm py-2 px-4 rounded-lg hover:bg-gray-600 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}