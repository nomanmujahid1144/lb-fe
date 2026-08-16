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
    const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>("");
    const [scrapingName, setScrapingName] = useState<string>("");
    const [missingColumns, setMissingColumns] = useState<string[]>([]);

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

    // Get customers
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const token = getCookie('token');
                const backendUrl = getBackendUrl();
                let allCustomers: any[] = [];
                let page = 1;
                const pageSize = 100;

                while (true) {
                    const queryUrl = new URL(`${backendUrl}/api/customers`);
                    queryUrl.searchParams.append("filters[lead_phase][$eq]", "Active");
                    queryUrl.searchParams.append("pagination[page]", page.toString());
                    queryUrl.searchParams.append("pagination[pageSize]", pageSize.toString());

                    const res = await fetch(queryUrl.toString(), {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });

                    if (!res.ok) throw new Error(`Failed to fetch customers: ${res.status} - ${await res.text()}`);

                    const result = await res.json();
                    const fetchedCustomers = result.data || [];
                    allCustomers = allCustomers.concat(fetchedCustomers);
                    const total = result.meta?.pagination?.total || 0;

                    if (allCustomers.length >= total) break;
                    page += 1;
                }

                const customerOptions = allCustomers.map((c: any) => ({
                    id: c.id,
                    name: c.customer_name
                })).sort((a, b) => a.name.localeCompare(b.name));
                setCustomers(customerOptions);
            } catch (err) {
                console.error("Failed to fetch customers:", err);
            }
        };
    
        if (user?.type === 'Admin') {
            fetchCustomers();
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
        if (!selectedFile) {
            setFile(null);
            return;
        }
        const fileSize = selectedFile.size;
        const fileName = selectedFile.name.toLowerCase();
        const isCsv = fileName.endsWith('.csv');
        const isXlsx = fileName.endsWith('.xlsx');
        if (!isCsv && !isXlsx) {
            setError('Please select a CSV or XLSX file.');
            setFile(null);
            return;
        }
        const maxSize = isCsv ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
        if (fileSize > maxSize) {
            const maxSizeMB = isCsv ? 100 : 50;
            setError(`File size exceeds the maximum limit of ${maxSizeMB}MB for ${isCsv ? 'CSV' : 'XLSX'} files.`);
            setFile(null);
            return;
        }
        setError(null);
        setFile(selectedFile);
    };

    // Handle source selection
    const handleSourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSource(event.target.value);
    };

    // Handle customer selection
    const handleCustomerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCustomer(event.target.value);
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

        // Check if file, source, and customer are selected
        if (!file || !source || !selectedCustomer) {
            setError('Please select a source, customer, and upload a file.');
            return;
        }

        // Clear any previous errors or success messages
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('source', source);
        formData.append('customer', selectedCustomer);
        if (source === 'companies_from_scraper' && scrapingName.trim()) {
            formData.append('scraping_name', scrapingName.trim());
        }

        try {
            // Send the POST request to the backend
            const backendUrl = getBackendUrl();
            const response = await fetch(`${backendUrl}/api/companies/import`, {
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
                
                // Handle different response formats:
                // 1. Direct format: { success, message, missingColumns }
                // 2. Strapi error format: { error: { details: { message, missingColumns } } }
                let errorMessage = 'Failed to upload companies file. Please try again.';
                let missingCols: string[] = [];
                
                if (responseBody.message) {
                    // Direct format
                    errorMessage = responseBody.message;
                    missingCols = responseBody.missingColumns || [];
                    // If there are missing columns, make the message more generic to avoid duplication
                    if (missingCols.length > 0) {
                        errorMessage = 'Validation failed: Missing required columns';
                    }
                } else if (responseBody.error?.details?.message) {
                    // Strapi error format
                    errorMessage = responseBody.error.details.message;
                    missingCols = responseBody.error.details.missingColumns || [];
                    if (missingCols.length > 0) {
                        errorMessage = 'Validation failed: Missing required columns';
                    }
                } else if (responseBody.error?.message) {
                    errorMessage = responseBody.error.message;
                }

                // Set the error message in the UI
                setError(errorMessage);
                setMissingColumns(missingCols);
                setIsLoading(false);
                return;
            }

            // If the response is successful, parse the result
            const result = await response.json();

            //console.log('Result:', result);

            // Handle validation response based on 'success' status
            if (result.success === true && !result.missingColumns) {
                setSuccessMessage(result.message || 'Companies imported successfully!');
                setFile(null); // Clear the file
                setSource(""); // Clear the source
                setSelectedCustomer(""); // Clear the customer
                setScrapingName(""); // Clear the scraping name
                setError(null); // Clear any existing error
                setMissingColumns([]);
            } else {
                // Handle errors in the response, including cases where success is true but missing columns exist
                setError(result.message || 'An error occurred while importing the companies.');
                setMissingColumns(result.missingColumns || []);
                setSuccessMessage(null); // Clear success message if there's an error
            }
        } catch (error) {
            // Handle any unexpected errors (e.g., network issues)
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
            // Send logout request to backend (optional, based on your backend's logout implementation)
            await fetch('/api/auth/logout', { method: 'POST' });
    
            // Clear session data from localStorage
            localStorage.clear();
    
            // Clear cookies (if necessary)
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
            // Reset the state variables to clear data
            setUser(null);
            setFile(null);
            setSource('');
            setSelectedCustomer('');
            setIsLoading(false);
            setError(null);
            setSuccessMessage(null);
            setCustomers([]);
            setMissingColumns([]);
    
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
            router.push('/auth/login');
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-100">
            {/* {user && <Navigation user={user} onLogout={handleLogout} />} */}

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <h1 className="text-4xl font-bold mb-8 text-[#cc4c5c]">Import Companies</h1>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h3 className="text-lg font-semibold text-[#47577d] mb-4">Upload CSV or Excel File</h3>

                        {error && (
                            <div className="text-red-500 mb-4 p-4 bg-red-50 border border-red-200 rounded">
                                <p className="font-semibold">{error}</p>
                                {missingColumns.length > 0 && (
                                    <div className="mt-2">
                                        <p className="font-medium">Missing required columns:</p>
                                        <ul className="list-disc list-inside ml-4">
                                            {missingColumns.map((col, index) => (
                                                <li key={index}>{col}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                        {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}

                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                {/* Source Selection */}
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Select a source</label>
                                    <select
                                        value={source ?? ""}
                                        onChange={handleSourceChange}
                                        className="border border-gray-300 p-2 rounded w-full"
                                    >
                                        <option value="" disabled>Select an option</option>
                                        <option value="companies_from_master">Companies from Master</option>
                                        <option value="companies_from_scraper">Companies from Scraper</option>
                                        <option value="companies_from_jiggr">Companies from Jiggr</option>
                                    </select>
                                </div>

                                {/* Scraping Name — only for Companies from Scraper */}
                                {source === 'companies_from_scraper' && (
                                    <div>
                                        <label className="block text-sm text-gray-500 mb-2">Scraping name (optional)</label>
                                        <input
                                            type="text"
                                            value={scrapingName}
                                            onChange={(e) => setScrapingName(e.target.value)}
                                            placeholder="e.g. Rotterdam Tech Companies"
                                            className="border border-gray-300 p-2 rounded w-full"
                                        />
                                    </div>
                                )}

                                {/* Customer Selection */}
                                <div>
                                    <label className="block text-sm text-gray-500 mb-2">Select a customer</label>
                                    <select
                                        value={selectedCustomer}
                                        onChange={handleCustomerChange}
                                        className="border border-gray-300 p-2 rounded w-full"
                                    >
                                        <option value="" disabled>Select a customer</option>
                                        <option value="No customer">No customer</option>
                                        {customers.map((customer) => (
                                            <option key={customer.id} value={customer.name}>
                                                {customer.name}
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
                                    <p className="text-sm text-gray-500 mt-1">Max file size: 100MB for CSV, 50MB for XLSX. For files larger than 50MB, please use CSV format for faster, more reliable uploads.</p>
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
                                        ) : 'Upload companies'}
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