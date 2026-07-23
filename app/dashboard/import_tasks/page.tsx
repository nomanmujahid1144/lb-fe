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

export default function ImportPeoplePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [source, setSource] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<{ id: number; name: string }[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<string>("");
    const [prospectsImported, setProspectsImported] = useState<boolean>(false);
    

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

    // Handle source selection
    const handleSourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSource(event.target.value);
    };

    // Handle profile selection
    const handleProfileChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedProfile(event.target.value);
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
    
        // Check if file is selected
        if (!file || !selectedProfile) {
            setError('Please select a profile and upload a file.');
            return;
        }
    
        // Clear any previous errors or success messages
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
    
        const formData = new FormData();
        formData.append('file', file);
        formData.append('profile', selectedProfile);
        formData.append('source', source);
    
        try {
            // Send the POST request to the backend
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/data-senders/import_tasks`, {
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
                const errorMessage = responseBody.message || 'Failed to upload tasks. Please try again.';
                
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
                setSuccessMessage(result.message || 'Tasks imported successfully!');
                setFile(null); // Clear the file
                setSelectedProfile(''); // Clear the selected profile
                setError(null); // Clear any existing error
            } else {
                // Handle errors in the response
                console.log('Error: ', result.message || 'An error occurred while importing the tasks.');
                setError(result.message || 'An error occurred while importing the tasks.');
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
            setProspectsImported(false);
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

    return (
        <div className="min-h-screen bg-gray-100">
             {user && <Navigation user={user} onLogout={handleLogout} />}

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <h1 className="text-4xl font-bold mb-8 text-[#cc4c5c]">Import Tasks</h1>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h3 className="text-lg font-semibold text-[#47577d] mb-4">Upload CSV or Excel File</h3>

                        {error && <p className="text-red-500 mb-4">{error}</p>}
                        {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}

                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                {/* Profile Selection */}
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
                                {/* Source Selection */}
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Select a source</label>
                                    <select
                                        value={source ?? ""}
                                        onChange={handleSourceChange}
                                        className="border border-gray-300 p-2 rounded w-full"
                                    >
                                        <option value="" disabled>Select an option</option>
                                        <option value="backoffice_tasks_import">Backoffice tasks</option>
                                        <option value="chatter_tasks_import">Chatter tasks</option>
                                    </select>
                                </div>
                                {/* File Input */}
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Select a file</label>
                                    <input
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

                                {/* Safety Checkbox */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-yellow-800 mb-3">Please confirm the following before importing:</h4>
                                    <div className="space-y-3">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={prospectsImported}
                                                onChange={(e) => setProspectsImported(e.target.checked)}
                                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <span className="text-sm text-gray-700">Did you import the Prospect(s)?</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="flex items-center space-x-4">
                                    <button
                                        type="submit"
                                        disabled={isLoading || !prospectsImported}
                                        className={`text-sm py-2 px-4 rounded-lg transition ${
                                            isLoading || !prospectsImported
                                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                                : 'bg-green-500 text-white hover:bg-green-600'
                                        }`}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <ClipLoader size={16} color="#ffffff" />
                                                Uploading...
                                            </div>
                                        ) : 'Upload tasks'}
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