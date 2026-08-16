'use client';

import { useState, useEffect } from 'react';
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

interface Profile {
    id: number;
    profile_name: string;
}

interface Campaign {
    id: number;
    campaign_name: string;
}

export default function CreateChatterTasksPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<string>("");
    const [selectedCampaign, setSelectedCampaign] = useState<string>("");
    const [note, setNote] = useState<string>("");

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
                let allProfiles: any[] = [];
                let page = 1;
                const pageSize = 100;
                let total = 0;

                while (true) {
                    const backendUrl = getBackendUrl();
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
                    profile_name: p.profile_name
                })).sort((a, b) => a.profile_name.localeCompare(b.profile_name));
                setProfiles(profileOptions);
            } catch (error) {
                console.error('Error fetching profiles:', error);
            }
        };

        if (user && user.type === 'Admin') {
            fetchProfiles();
        }
    }, [user]);

    // Get campaigns when profile is selected
    useEffect(() => {
        const fetchCampaigns = async () => {
            if (!selectedProfile) {
                setCampaigns([]);
                setSelectedCampaign("");
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
                            `?filters[profile][id][$eq]=${selectedProfile}` +
                            `&pagination[page]=${page}` +
                            `&pagination[pageSize]=${pageSize}` +
                            `&populate=profile` +
                            `&sort=campaign_name:asc`,
                        { 
                            method: 'GET', 
                            headers: { Authorization: `Bearer ${token}` } 
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`Failed to fetch campaigns: ${response.status} - ${await response.text()}`);
                    }

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
            } catch (error) {
                console.error('Error fetching campaigns:', error);
                setCampaigns([]);
            }
        };

        if (user?.type === 'Admin' && selectedProfile) {
            fetchCampaigns();
        } else {
            setCampaigns([]);
            setSelectedCampaign("");
        }
    }, [user, selectedProfile]);

    const getCookie = (name: string): string | undefined => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return undefined;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Check if it's an Excel file
            const allowedTypes = [
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ];
            if (!allowedTypes.includes(selectedFile.type)) {
                setError('Please select a valid Excel file (.xls or .xlsx)');
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !selectedProfile || !selectedCampaign) {
            setError('Please select a profile, campaign, and upload a file');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const token = getCookie('token');
            const backendUrl = getBackendUrl();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('profileId', selectedProfile);
            formData.append('campaignId', selectedCampaign);
            formData.append('note', note);

            const response = await fetch(`${backendUrl}/api/prospects/create-chatter-tasks`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                const createdCount = result.created || 0;
                setSuccessMessage('Chatter tasks creation completed.');
                setFile(null);
                setSelectedProfile("");
                setSelectedCampaign("");
                setNote("");
                // Reset file input
                const fileInput = document.getElementById('file') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                const errorData = await response.json();
                let errorMessage = 'Failed to create chatter tasks';
                
                if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (response.status === 400) {
                    errorMessage = 'Invalid request. Please check your file format and selections.';
                } else if (response.status === 401) {
                    errorMessage = 'Authentication failed. Please log in again.';
                } else if (response.status === 403) {
                    errorMessage = 'You do not have permission to create chatter tasks.';
                } else if (response.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                } else {
                    errorMessage = `Upload failed with status ${response.status}`;
                }
                
                setError(errorMessage);
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            let errorMessage = 'An unexpected error occurred while creating chatter tasks.';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
            } else if (error.name === 'AbortError') {
                errorMessage = 'Request was cancelled. Please try again.';
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        router.push('/dashboard');
    };

    const handleLogout = async () => {
        try {
            // Optional: Backend logout request
            await fetch('/api/auth/logout', { method: 'POST' });

            // Clear localStorage
            localStorage.clear();

            // Clear cookies
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

            // Reset state variables
            setUser(null);
            setFile(null);
            setProfiles([]);
            setSelectedProfile('');
            setSelectedCampaign('');
            setNote('');
            setCampaigns([]);
            setIsLoading(false);
            setError(null);
            setSuccessMessage(null);

            toast.success('Successfully logged out!', {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                },
            });

            // Redirect to login page
            router.push('/auth/login');
        } catch (error) {
            console.log('Logout error:', error);

            // In case of error, still redirect to login
            router.push('/auth/login');
        }
    };

    if (user?.type !== 'Admin') return null; // Prevents rendering if redirecting

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-100">
             {/* {user && <Navigation user={user} onLogout={handleLogout} />} */}

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <h1 className="text-4xl font-bold mb-8 text-[#cc4c5c]">Create Chatter Tasks</h1>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h3 className="text-lg font-semibold text-[#47577d] mb-4">Upload Excel File</h3>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                                        <div className="mt-2 text-sm text-red-700 whitespace-pre-line">{error}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {successMessage && (
                            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-green-800">Success</h3>
                                        <div className="mt-2 text-sm text-green-700">{successMessage}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                {/* Profile Selection */}
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Select a profile</label>
                                    <select
                                        value={selectedProfile}
                                        onChange={(e) => setSelectedProfile(e.target.value)}
                                        className="border border-gray-300 p-2 rounded w-full"
                                    >
                                        <option value="" disabled>Select a profile</option>
                                        {profiles.map((profile) => (
                                            <option key={profile.id} value={profile.id}>
                                                {profile.profile_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Campaign Selection */}
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Select a campaign</label>
                                    <select
                                        value={selectedCampaign}
                                        onChange={(e) => setSelectedCampaign(e.target.value)}
                                        disabled={!selectedProfile}
                                        className="border border-gray-300 p-2 rounded w-full"
                                    >
                                        <option value="">
                                            {selectedProfile ? 'Select a campaign' : 'Select a profile first'}
                                        </option>
                                        {campaigns.map((campaign) => (
                                            <option key={campaign.id} value={campaign.id}>
                                                {campaign.campaign_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* File Input */}
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Select a file</label>
                                    <input
                                        type="file"
                                        accept=".xls,.xlsx"
                                        onChange={handleFileChange}
                                        className="border border-gray-300 p-2 rounded w-full"
                                    />
                                    {file && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            Selected file: <span className="font-medium">{file.name}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Note Input */}
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Note (optional)</label>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Add an additional note..."
                                        rows={3}
                                        className="border border-gray-300 p-2 rounded w-full resize-vertical"
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="flex items-center space-x-4">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="bg-green-500 text-white text-sm py-2 px-4 rounded-lg hover:bg-green-600 transition"
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <ClipLoader size={16} color="#ffffff" />
                                                Creating Tasks...
                                            </div>
                                        ) : 'Create Chatter Tasks'}
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