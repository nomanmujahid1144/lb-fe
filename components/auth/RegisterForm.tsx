'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/auth';
import Link from 'next/link';
import Image from 'next/image';

export default function RegisterForm() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        const userData = {
            username: formData.get('username') as string,
            email: formData.get('email') as string,
            password: formData.get('password') as string,
        };

        try {
            const response = await register(userData);
            // Store the token
            localStorage.setItem('token', response.jwt);
            // Redirect to dashboard
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
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
            <h2 className="text-2xl font-bold text-[#47577d] mb-6 text-center">Register</h2>
            {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
            )}
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="username" className="block text-gray-700 mb-2">
                        Username
                    </label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        className="w-full p-2 border rounded"
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="email" className="block text-gray-700 mb-2">
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
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
                    {loading ? 'Registering...' : 'Register'}
                </button>
            </form>
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="text-[#db2f43] hover:text-[#b02a36]">
                        Log in here
                    </Link>
                </p>
            </div>
        </div>
    );
}