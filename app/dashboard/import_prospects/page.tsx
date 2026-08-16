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

interface PersonaKeyword {
    id: number;
    documentId: string;
    persona: string;
    keyword: string;
    option: string;
}

interface PersonaKeywordPreset {
    id: number;
    documentId: string;
    name: string;
    keyword_ids: string[];
    customerName: string;
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
    const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>("");
    const [scrapingName, setScrapingName] = useState<string>("");
    const [campaignsCreated, setCampaignsCreated] = useState<boolean>(false);
    const [companiesImported, setCompaniesImported] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Persona keyword states
    const [personaKeywords, setPersonaKeywords] = useState<PersonaKeyword[]>([]);
    const [selectedKeywordIds, setSelectedKeywordIds] = useState<string[]>([]);
    const [keywordPresets, setKeywordPresets] = useState<PersonaKeywordPreset[]>([]);
    const [selectedPreset, setSelectedPreset] = useState<string>("");
    const [newPresetName, setNewPresetName] = useState<string>("");
    const [showAddKeyword, setShowAddKeyword] = useState<boolean>(false);
    const [newKeywordPersona, setNewKeywordPersona] = useState<string>("");
    const [newKeywordValue, setNewKeywordValue] = useState<string>("");
    const [newKeywordOption, setNewKeywordOption] = useState<string>("PARTIAL");
    const [keywordSearchTerm, setKeywordSearchTerm] = useState<string>("");
    const [presetCustomer, setPresetCustomer] = useState<string>("");

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
            const backendUrl = getBackendUrl();
            try {
                const token = getCookie('token');
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

    // Get customers
    useEffect(() => {
        const fetchCustomers = async () => {
            const backendUrl = getBackendUrl();
            try {
                const token = getCookie('token');
                let allCustomers: any[] = [];
                let page = 1;
                const pageSize = 100;
                let total = 0;

                while (true) {
                    const queryUrl = new URL(`${backendUrl}/api/customers`);
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
                    total = result.meta?.pagination?.total || 0;

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

    // Fetch persona keywords when industries_recruiter is selected
    useEffect(() => {
        const fetchPersonaKeywords = async () => {
            const backendUrl = getBackendUrl();
            try {
                const token = getCookie('token');
                let allKeywords: PersonaKeyword[] = [];
                let page = 1;
                const pageSize = 100;
                let total = 0;

                while (true) {
                    const queryUrl = new URL(`${backendUrl}/api/persona-keywords`);
                    queryUrl.searchParams.append("pagination[page]", page.toString());
                    queryUrl.searchParams.append("pagination[pageSize]", pageSize.toString());
                    queryUrl.searchParams.append("sort", "persona:asc,keyword:asc");

                    const res = await fetch(queryUrl.toString(), {
                        method: 'GET',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error(`Failed to fetch persona keywords: ${res.status}`);

                    const result = await res.json();
                    const fetched = (result.data || []).map((k: any) => ({
                        id: k.id,
                        documentId: k.documentId,
                        persona: k.persona,
                        keyword: k.keyword,
                        option: k.option || 'PARTIAL',
                    }));
                    allKeywords = allKeywords.concat(fetched);
                    total = result.meta?.pagination?.total || 0;

                    if (allKeywords.length >= total) break;
                    page += 1;
                }

                setPersonaKeywords(allKeywords);
            } catch (err) {
                console.error("Failed to fetch persona keywords:", err);
            }
        };

        const fetchPresets = async () => {
            const backendUrl = getBackendUrl();
            try {
                const token = getCookie('token');
                const queryUrl = new URL(`${backendUrl}/api/persona-keyword-presets`);
                queryUrl.searchParams.append("pagination[pageSize]", "100");
                queryUrl.searchParams.append("populate", "customer");

                const res = await fetch(queryUrl.toString(), {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error(`Failed to fetch presets: ${res.status}`);

                const result = await res.json();
                const presets = (result.data || []).map((p: any) => ({
                    id: p.id,
                    documentId: p.documentId,
                    name: p.name,
                    keyword_ids: p.keyword_ids || [],
                    customerName: p.customer?.customer_name || '',
                }));
                setKeywordPresets(presets);
            } catch (err) {
                console.error("Failed to fetch presets:", err);
            }
        };

        if (source === 'industries_recruiter' && user?.type === 'Admin') {
            fetchPersonaKeywords();
            fetchPresets();
        }
    }, [source, user]);

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

    // Handle customer selection
    const handleCustomerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCustomer(event.target.value);
    };

    const isRecruiterSource = source === 'companies_recruiter' || source === 'industries_recruiter';
    const isCustomerSource = isRecruiterSource || source === 'activities' || source === 'phantombuster';

    // Persona keyword helpers
    const personaGroups = personaKeywords.reduce((acc, kw) => {
        if (!acc[kw.persona]) acc[kw.persona] = [];
        acc[kw.persona].push(kw);
        return acc;
    }, {} as Record<string, PersonaKeyword[]>);

    const filteredPersonaGroups = Object.entries(personaGroups)
        .map(([persona, keywords]) => ({
            persona,
            keywords: keywords.filter(kw =>
                kw.keyword.toLowerCase().includes(keywordSearchTerm.toLowerCase()) ||
                kw.persona.toLowerCase().includes(keywordSearchTerm.toLowerCase())
            ),
        }))
        .filter(group => group.keywords.length > 0)
        .sort((a, b) => a.persona.localeCompare(b.persona));

    const handlePresetChange = (presetDocId: string) => {
        setSelectedPreset(presetDocId);
        if (presetDocId) {
            const preset = keywordPresets.find(p => p.documentId === presetDocId);
            if (preset) {
                setSelectedKeywordIds(preset.keyword_ids);
            }
        }
    };

    const handleSavePreset = async () => {
        if (!newPresetName.trim() || selectedKeywordIds.length === 0) {
            toast.error('Please enter a preset name and select at least one keyword.', { position: 'top-center' });
            return;
        }
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/persona-keyword-presets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ data: { name: newPresetName.trim(), keyword_ids: selectedKeywordIds, ...(presetCustomer ? { customer: customers.find(c => c.name === presetCustomer)?.id } : {}) } }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err?.error?.message || 'Failed to save preset');
            }
            const result = await res.json();
            const saved = result.data;
            setKeywordPresets(prev => [...prev, { id: saved.id, documentId: saved.documentId, name: saved.name, keyword_ids: saved.keyword_ids, customerName: presetCustomer || '' }]);
            setNewPresetName("");
            toast.success('Preset saved!', { position: 'top-center' });
        } catch (err: any) {
            toast.error(err.message || 'Failed to save preset', { position: 'top-center' });
        }
    };

    const handleDeletePreset = async () => {
        if (!selectedPreset) return;
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/persona-keyword-presets/${selectedPreset}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to delete preset');
            setKeywordPresets(prev => prev.filter(p => p.documentId !== selectedPreset));
            setSelectedPreset("");
            toast.success('Preset deleted!', { position: 'top-center' });
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete preset', { position: 'top-center' });
        }
    };

    const handleAddKeyword = async () => {
        if (!newKeywordPersona.trim() || !newKeywordValue.trim()) {
            toast.error('Please fill in both persona and keyword.', { position: 'top-center' });
            return;
        }
        const backendUrl = getBackendUrl();
        const token = getCookie('token');
        try {
            const res = await fetch(`${backendUrl}/api/persona-keywords`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ data: { persona: newKeywordPersona.trim(), keyword: newKeywordValue.trim(), option: newKeywordOption } }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err?.error?.message || 'Failed to add keyword');
            }
            const result = await res.json();
            const created = result.data;
            const newKw: PersonaKeyword = {
                id: created.id,
                documentId: created.documentId,
                persona: created.persona,
                keyword: created.keyword,
                option: created.option || 'PARTIAL',
            };
            setPersonaKeywords(prev => [...prev, newKw]);
            setSelectedKeywordIds(prev => [...prev, newKw.documentId]);
            setNewKeywordPersona("");
            setNewKeywordValue("");
            setNewKeywordOption("PARTIAL");
            setShowAddKeyword(false);
            toast.success('Keyword added and selected!', { position: 'top-center' });
        } catch (err: any) {
            toast.error(err.message || 'Failed to add keyword', { position: 'top-center' });
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const backendUrl = getBackendUrl();
    
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
    
        // Check if file and source are selected
        const isRecruiter = source === 'companies_recruiter' || source === 'industries_recruiter';
        const isCustomer = isRecruiter || source === 'activities' || source === 'phantombuster';
        if (!file || !source || (isCustomer ? !selectedCustomer : !selectedProfile)) {
            setError(isCustomer ? 'Please select a source, customer and upload a file.' : 'Please select a source, profile and upload a file.');
            return;
        }
    
        // Clear any previous errors or success messages
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
    
        const formData = new FormData();
        formData.append('file', file);
        formData.append('source', source);
        if (isCustomer) {
            formData.append('customer', selectedCustomer);
            if ((isRecruiter || source === 'phantombuster') && scrapingName.trim()) {
                formData.append('scraping_name', scrapingName.trim());
            }
            if (source === 'industries_recruiter' && selectedKeywordIds.length > 0) {
                formData.append('persona_keyword_ids', JSON.stringify(selectedKeywordIds));
            }
        } else {
            formData.append('profile', selectedProfile);
        }
    
        try {
            // Send the POST request to the backend
            const response = await fetch(`${backendUrl}/api/prospects/import`, {
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
                setFile(null); // Clear the file
                if (fileInputRef.current) fileInputRef.current.value = "";
                setSelectedProfile(""); // Clear the selected profile
                setSelectedCustomer(""); // Clear the selected customer
                setScrapingName(""); // Clear the scraping name
                setSelectedKeywordIds([]); // Clear selected keywords
                setSelectedPreset(""); // Clear selected preset
                setPresetCustomer(""); // Clear preset customer
                setSource(""); // Clear the source
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
        setFile(null); // Reset the file upload state
        setSource(""); // Reset the source field
        setSelectedProfile(""); // Reset the selected profile
        setSelectedCustomer(""); // Reset the selected customer
        setScrapingName(""); // Reset the scraping name
        setSelectedKeywordIds([]); // Clear selected keywords
        setSelectedPreset(""); // Clear selected preset
        setPresetCustomer(""); // Clear preset customer
        setCampaignsCreated(false); // Reset checkbox states
        setCompaniesImported(false); // Reset checkbox states
        setIsLoading(false); // Stop the loading spinner if it was active
        setError(null); // Clear any error messages
        setSuccessMessage(null); // Clear any success messages
        if (fileInputRef.current) fileInputRef.current.value = "";
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
            setSource(""); // Reset the source field
            setSelectedProfile(""); // Reset the selected profile
            setSelectedCustomer(""); // Reset the selected customer
            setScrapingName(""); // Reset the scraping name
            setSelectedKeywordIds([]); // Clear selected keywords
            setSelectedPreset(""); // Clear selected preset
            setPresetCustomer(""); // Clear preset customer
            setCampaignsCreated(false); // Reset checkbox states
            setCompaniesImported(false); // Reset checkbox states
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
        <div className="min-h-[calc(100vh-4rem)] bg-gray-100">
             {/* {user && <Navigation user={user} onLogout={handleLogout} />} */}

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <h1 className="text-4xl font-bold mb-8 text-[#cc4c5c]">Import People</h1>

                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h3 className="text-lg font-semibold text-[#47577d] mb-4">Upload CSV or Excel File</h3>

                        {error && <p className="text-red-500 mb-4">{error}</p>}
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
                                        <option value="master">People from Master</option>
                                        <option value="companies_recruiter">People from Companies (Recruiter)</option>
                                        <option value="industries_recruiter">People from Industries (Recruiter)</option>
                                        <option value='phantombuster'>People from Phantombuster</option>
                                        <option value="activities">People Activities</option>
                                        <option value='connections'>First connections</option>
                                    </select>
                                </div>
                                {/* Profile / Customer Selection */}
                                {isCustomerSource ? (
                                    <div>
                                        <label className="block text-sm text-gray-500 mb-2">Select a customer</label>
                                        <select
                                            value={selectedCustomer}
                                            onChange={handleCustomerChange}
                                            className="border border-gray-300 p-2 rounded w-full"
                                        >
                                            <option value="" disabled>Select a customer</option>
                                            {customers.map((customer) => (
                                                <option key={customer.id} value={customer.name}>
                                                    {customer.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
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
                                )}
                                {/* Scraping Name - Only for recruiter sources and Phantombuster */}
                                {(isRecruiterSource || source === 'phantombuster') && (
                                    <div>
                                        <label className="block text-sm text-gray-500 mb-2">Scraping name (optional)</label>
                                        <input
                                            type="text"
                                            value={scrapingName}
                                            onChange={(e) => setScrapingName(e.target.value)}
                                            placeholder="Enter scraping name"
                                            className="border border-gray-300 p-2 rounded w-full"
                                        />
                                    </div>
                                )}
                                {/* Persona Keywords - Only for industries recruiter */}
                                {source === 'industries_recruiter' && (
                                    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-sm font-medium text-gray-700">Persona Keywords (optional filter)</label>
                                            <span className="text-xs text-gray-400">{selectedKeywordIds.length} selected</span>
                                        </div>

                                        {/* Preset selector - filtered by selected customer */}
                                        <div className="flex gap-2 items-center">
                                            <select
                                                value={selectedPreset}
                                                onChange={(e) => handlePresetChange(e.target.value)}
                                                className="border border-gray-300 p-2 rounded w-full"
                                            >
                                                <option value="">Load a preset...</option>
                                                {keywordPresets
                                                    .filter(p => !selectedCustomer || !p.customerName || p.customerName === selectedCustomer)
                                                    .map((preset) => (
                                                    <option key={preset.documentId} value={preset.documentId}>
                                                        {preset.name}{preset.customerName ? ` [${preset.customerName}]` : ''} ({preset.keyword_ids.length} keywords)
                                                    </option>
                                                ))}
                                            </select>
                                            {selectedPreset && (
                                                <button
                                                    type="button"
                                                    onClick={handleDeletePreset}
                                                    className="text-red-500 hover:text-red-700 text-sm px-3 py-2 border border-red-300 rounded"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>

                                        {/* Save preset */}
                                        {selectedKeywordIds.length > 0 && (
                                            <div className="flex gap-2 items-center">
                                                <select
                                                    value={presetCustomer}
                                                    onChange={(e) => setPresetCustomer(e.target.value)}
                                                    className="border border-gray-300 p-2 rounded w-1/3"
                                                >
                                                    <option value="">No customer</option>
                                                    {customers.map((customer) => (
                                                        <option key={customer.id} value={customer.name}>
                                                            {customer.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    value={newPresetName}
                                                    onChange={(e) => setNewPresetName(e.target.value)}
                                                    placeholder="Save current selection as..."
                                                    className="border border-gray-300 p-2 rounded flex-1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleSavePreset}
                                                    className="bg-blue-500 text-white text-sm px-4 py-2 rounded hover:bg-blue-600"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        )}

                                        {/* Search */}
                                        <input
                                            type="text"
                                            value={keywordSearchTerm}
                                            onChange={(e) => setKeywordSearchTerm(e.target.value)}
                                            placeholder="Search keywords..."
                                            className="border border-gray-300 p-2 rounded w-full"
                                        />

                                        {/* Keyword groups */}
                                        <div className="max-h-64 overflow-y-auto space-y-2">
                                            {filteredPersonaGroups.map(({ persona, keywords }) => (
                                                <div key={persona} className="border border-gray-100 rounded p-2">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-semibold text-[#47577d] uppercase">{persona}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const groupIds = keywords.map(k => k.documentId);
                                                                const allSelected = groupIds.every(id => selectedKeywordIds.includes(id));
                                                                if (allSelected) {
                                                                    setSelectedKeywordIds(prev => prev.filter(id => !groupIds.includes(id)));
                                                                } else {
                                                                    setSelectedKeywordIds(prev => Array.from(new Set([...prev, ...groupIds])));
                                                                }
                                                            }}
                                                            className="text-xs text-blue-500 hover:text-blue-700"
                                                        >
                                                            {keywords.every(k => selectedKeywordIds.includes(k.documentId)) ? 'Deselect all' : 'Select all'}
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {keywords.map(kw => (
                                                            <label
                                                                key={kw.documentId}
                                                                className={`inline-flex items-center text-xs px-2 py-1 rounded cursor-pointer border transition ${
                                                                    selectedKeywordIds.includes(kw.documentId)
                                                                        ? 'bg-blue-100 border-blue-400 text-blue-800'
                                                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    className="sr-only"
                                                                    checked={selectedKeywordIds.includes(kw.documentId)}
                                                                    onChange={() => {
                                                                        setSelectedKeywordIds(prev =>
                                                                            prev.includes(kw.documentId)
                                                                                ? prev.filter(id => id !== kw.documentId)
                                                                                : [...prev, kw.documentId]
                                                                        );
                                                                    }}
                                                                />
                                                                {kw.keyword}
                                                                <span className="ml-1 text-[10px] text-gray-400">({kw.option})</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredPersonaGroups.length === 0 && personaKeywords.length > 0 && (
                                                <p className="text-xs text-gray-400 text-center py-2">No keywords match your search.</p>
                                            )}
                                            {personaKeywords.length === 0 && (
                                                <p className="text-xs text-gray-400 text-center py-2">No persona keywords found. Add one below.</p>
                                            )}
                                        </div>

                                        {/* Clear selection */}
                                        {selectedKeywordIds.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedKeywordIds([]); setSelectedPreset(""); }}
                                                className="text-xs text-gray-500 hover:text-gray-700 underline"
                                            >
                                                Clear selection
                                            </button>
                                        )}

                                        {/* Add new keyword */}
                                        <div className="border-t border-gray-200 pt-2">
                                            {!showAddKeyword ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddKeyword(true)}
                                                    className="text-xs text-blue-500 hover:text-blue-700"
                                                >
                                                    + Add new keyword
                                                </button>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newKeywordPersona}
                                                            onChange={(e) => setNewKeywordPersona(e.target.value)}
                                                            placeholder="Persona (e.g. IT)"
                                                            className="border border-gray-300 p-2 rounded flex-1"
                                                            list="existing-personas"
                                                        />
                                                        <datalist id="existing-personas">
                                                            {Object.keys(personaGroups).map(p => (
                                                                <option key={p} value={p} />
                                                            ))}
                                                        </datalist>
                                                        <input
                                                            type="text"
                                                            value={newKeywordValue}
                                                            onChange={(e) => setNewKeywordValue(e.target.value)}
                                                            placeholder="Keyword (e.g. Developer)"
                                                            className="border border-gray-300 p-2 rounded flex-1"
                                                        />
                                                        <select
                                                            value={newKeywordOption}
                                                            onChange={(e) => setNewKeywordOption(e.target.value)}
                                                            className="border border-gray-300 p-2 rounded"
                                                        >
                                                            <option value="PARTIAL">PARTIAL</option>
                                                            <option value="EXACT">EXACT</option>
                                                            <option value="STARTSWITH">STARTSWITH</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleAddKeyword}
                                                            className="bg-green-500 text-white text-sm px-4 py-2 rounded hover:bg-green-600"
                                                        >
                                                            Add
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAddKeyword(false)}
                                                            className="text-gray-500 text-sm px-4 py-2 rounded hover:bg-gray-100 border"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
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

                                {/* Safety Checkboxes - Only show when People From Master is selected */}
                                {source === "master" && (
                                    <>
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <h4 className="text-sm font-semibold text-yellow-800 mb-3">Please confirm the following before importing:</h4>
                                            <div className="space-y-3">
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={campaignsCreated}
                                                        onChange={(e) => setCampaignsCreated(e.target.checked)}
                                                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700">Did you create/import the Campaigns?</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={companiesImported}
                                                        onChange={(e) => setCompaniesImported(e.target.checked)}
                                                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700">Did you import the Companies?</span>
                                                </label>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Submit Button */}
                                <div className="flex items-center space-x-4">
                                    <button
                                        type="submit"
                                        disabled={isLoading || (source === "master" && (!campaignsCreated || !companiesImported))}
                                        className={`text-sm py-2 px-4 rounded-lg transition ${
                                            isLoading || (source === "master" && (!campaignsCreated || !companiesImported))
                                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                                : 'bg-green-500 text-white hover:bg-green-600'
                                        }`}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <ClipLoader size={16} color="#ffffff" />
                                                Uploading...
                                            </div>
                                        ) : 'Upload people'}
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