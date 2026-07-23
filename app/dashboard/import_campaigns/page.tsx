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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<{ id: number; name: string }[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<string>("");
    

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
                const pageSize = 100; // Fetch up to 100 profiles per page
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
    
        try {
            // Send the POST request to the backend
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/campaigns/import`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });
    
            //console.log('Response:', response);
    
            // Check if the response is OK (status 200-299)
            if (!response.ok) {
                //console.log('Response status:', response.status, response.statusText);
                
                // Try to parse the response body to get the error message
                let responseBody;
                const responseText = await response.text();
                //console.log('Raw response text:', responseText);
                
                try {
                    responseBody = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Failed to parse response as JSON:', parseError);
                    setError(`Server returned ${response.status}: ${response.statusText}`);
                    setIsLoading(false);
                    return;
                }
                
                //console.log('Parsed response body:', responseBody);
                
                // Handle specific error cases
                let errorMessage = 'Failed to upload campaigns file. Please try again.';
                
                if (responseBody.message) {
                    errorMessage = responseBody.message;
                } else if (responseBody.error?.message) {
                    errorMessage = responseBody.error.message;
                } else if (responseBody.data?.message) {
                    errorMessage = responseBody.data.message;
                }
                
                // Handle conflict errors specially
                if (responseBody.conflicts && responseBody.conflicts.length > 0) {
                    const conflictDetails = responseBody.conflicts.map(c => 
                        `"${c.campaign_name}" (exists in profile: ${c.existing_profile}, trying to upload to: ${c.upload_profile})`
                    ).join('\n• ');
                    errorMessage = `Campaign conflicts detected:\n• ${conflictDetails}\n\nCannot update campaigns across different profiles.`;
                }
                
                // Handle missing columns errors
                if (responseBody.missingColumns && responseBody.missingColumns.length > 0) {
                    errorMessage = `Missing required columns:\n• ${responseBody.missingColumns.join('\n• ')}`;
                }
                
                //console.error('Upload error:', responseBody);
                setError(errorMessage);
                setIsLoading(false);
                return;
            }
    
            // If the response is successful, parse the result
            const result = await response.json();
    
            //console.log('Result:', result);
    
            // Handle validation response based on 'success' status
            if (result.success === true) {
                setSuccessMessage(result.message || 'Campaigns imported successfully!');
                setFile(null); // Clear the file
                setSelectedProfile(''); // Clear the selected profile
                setError(null); // Clear any existing error
            } else {
                // Handle errors in the response
                console.log('Error: ', result.message || 'An error occurred while importing the campaigns.');
                setError(result.message || 'An error occurred while importing the campaigns.');
                setSuccessMessage(null); // Clear success message if there's an error
            }
        } catch (error: any) {
            // Handle any unexpected errors (e.g., network issues)
            //console.error('Unexpected error: ', error);
            
            let errorMessage = 'An unexpected error occurred. Please try again later.';
            
            // Handle specific error types
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and try again.';
            } else if (error.name === 'AbortError') {
                errorMessage = 'Request timeout: The upload took too long. Please try again.';
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            
            setError(errorMessage);
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
                    <h1 className="text-4xl font-bold mb-8 text-[#cc4c5c]">Import Campaigns</h1>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h3 className="text-lg font-semibold text-[#47577d] mb-4">Upload CSV or Excel File</h3>

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
                                                Uploading...
                                            </div>
                                        ) : 'Upload campaigns'}
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