'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getBackendUrl } from '@/lib/api-config';
import toast from 'react-hot-toast';

export default function LoginForm() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setLoading(true);
        const backendUrl = getBackendUrl();

        const formData = new FormData(event.currentTarget);
        const credentials = {
            identifier: formData.get('identifier') as string,
            password: formData.get('password') as string,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(`${backendUrl}/api/auth/local`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            //console.log('Fetch status:', response.status);

            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Unexpected server response');
            }

            if (!response.ok) {
                //console.log('Response data:', data); // Keep for debugging, not shown to user
                
                // Sanitize error messages - only show safe, user-friendly messages
                let userFriendlyError = 'Login failed. Please try again.';
                
                if (data?.error) {
                    const errorMessage = typeof data.error === 'string' ? data.error : data.error.message;
                    
                    // Only show specific known safe error messages
                    if (errorMessage === 'Invalid identifier or password') {
                        userFriendlyError = 'Invalid email/username or password.';
                    } else if (errorMessage?.toLowerCase().includes('blocked') || errorMessage?.toLowerCase().includes('suspended')) {
                        userFriendlyError = 'Account access is restricted. Please contact support.';
                    } else if (errorMessage?.toLowerCase().includes('too many')) {
                        userFriendlyError = 'Too many login attempts. Please try again later.';
                    }
                    // For any other errors, use the generic message (don't expose internal errors)
                } else if (data?.message === 'Invalid identifier or password') {
                    userFriendlyError = 'Invalid email/username or password.';
                }
                
                throw new Error(userFriendlyError);
            }

            //console.log('Data:', data);

            const isSecure = window.location.protocol === 'https:';
            document.cookie = `token=${data.jwt}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
            localStorage.setItem('user', JSON.stringify(data.user));

            toast.success(`Welcome back, ${data.user.username}!`, {
                duration: 3000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: '500',
                },
            });
            //console.log('Success message set');

            setTimeout(() => {
                //console.log('Redirecting');
                router.push('/dashboard');
            }, 1500);

        } catch (err: any) {
            console.error('Error:', err);
            if (err.name === 'AbortError') {
                setError('Request timed out. Please try again.');
            } else {
                setError(err.message || 'Login failed');
            }
        } finally {
            setLoading(false);
            //console.log('Loading set to false');
        }
    }

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
            <div className="flex justify-center mb-6">
                <Image
                    src="/logo.png"
                    alt="Lead Blocks Logo"
                    width={270}  // Adjust the width as needed
                    height={72}  // Adjust the height as needed
                />
            </div>
            <h2 className="text-2xl font-bold text-[#47577d] mb-6 text-center">Login</h2>
            {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
            )}
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="identifier" className="block text-gray-700 mb-2">
                        Email or Username
                    </label>
                    <input
                        id="identifier"
                        name="identifier"
                        type="text"
                        required
                        className="w-full p-2 border rounded"
                    />
                </div>
                <div className="mb-6">
                    <label htmlFor="password" className="block text-gray-700 mb-2">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="w-full p-2 border rounded"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#47577d] text-white py-2 px-4 rounded hover:bg-[#3b4a63] disabled:bg-[#3b4a63]"
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
}