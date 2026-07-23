'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import { getBackendUrl } from '@/lib/api-config';
import { toast } from 'react-hot-toast';

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

interface Profile {
    profile_name: string;
    start_date: string;
    end_date: string;
    customer_name: string;
}

export default function ProfilesPage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getCookie = (name: string): string | undefined => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return undefined;
        };

        const fetchCustomerData = async (userUuid: string, token: string) => {
            const backendUrl = getBackendUrl();
            try {
                const response = await fetch(
                    `${backendUrl}/api/users-permissions/users/uuid/${userUuid}?populate=customers.profiles`,
                    {
                        method: 'GET',
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                if (!response.ok)
                    throw new Error(`Failed to fetch customers: ${response.status} - ${await response.text()}`);

                const userData = await response.json();
                const fetchedCustomers = userData.customers || [];

                // Extract profiles from customers
                const activeProfiles = fetchedCustomers.flatMap((customer: any) =>
                    customer.profiles.map((profile: any) => ({
                        profile_name: profile.profile_name,
                        start_date: profile.start_date,
                        end_date: profile.end_date,
                        customer_name: customer.customer_name,
                    }))
                );

                // Sort profiles by customer name
                const sortedProfiles = activeProfiles.sort((a, b) =>
                    a.customer_name.localeCompare(b.customer_name)
                );

                setProfiles(sortedProfiles);
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

    useEffect(() => {
        if (user && !['Admin'].includes(user.type)) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleLogout = async () => {
        try {
            // Call logout API to clear server-side session
            await fetch('/api/auth/logout', { method: 'POST' });
    
            // Clear localStorage items related to authentication and customers
            localStorage.clear();
    
            // Clear the cookie related to the authentication token
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
            // Reset state variables related to the user, profiles, and loading state
            setUser(null); // Reset user state
            setProfiles([]); // Reset profiles state
            setLoading(true); // Optionally reset loading state to true (in case you want to show a loading spinner)
    
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
            console.error('Logout error:', error);
            router.push('/auth/login');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {user ? <Navigation user={user} onLogout={handleLogout} /> : <p>Loading...</p>}
            <div className="max-w-6xl mx-auto py-10 px-6">
                <h1 className="text-4xl font-bold text-gray-800 mb-6">Active Profiles</h1>
                {loading ? (
                    <p className="text-gray-600 text-lg">Loading profiles...</p>
                ) : profiles.length === 0 ? (
                    <p className="text-gray-600 text-lg">No profiles found.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {profiles.map((profile, index) => (
                            <div key={index} className="bg-white shadow-lg rounded-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-900">{profile.profile_name}</h2>
                                <div className="mt-4 space-y-2">
                                    <p className="text-gray-700">{profile.customer_name}</p>
                                    <p className="text-gray-700"><strong>Start Date:</strong> {profile.start_date}</p>
                                    <p className="text-gray-700"><strong>End Date:</strong> {profile.end_date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}