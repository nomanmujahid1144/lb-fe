'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaRobot } from 'react-icons/fa';
import { ClipLoader } from 'react-spinners';
import Navigation from '@/components/layout/Navigation';
import RobotTasksOverview from '@/components/RobotTasksOverview';
import { safeLocalStorage } from '@/lib/storage';
import { getCookie } from '@/lib/auth';

interface User {
    id: number;
    username: string;
    email: string;
    customers: any[];
    uuid: string;
    type: string;
}

const ALLOWED_TYPES = ['Admin', 'Backoffice'];

export default function RobotTasksOverviewPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        const token = getCookie('token');
        const storedUser = safeLocalStorage.getParsedItem<User>('user');

        if (!token || !storedUser) {
            router.push('/auth/login');
            return;
        }

        if (!ALLOWED_TYPES.includes(storedUser.type)) {
            router.push('/dashboard');
            return;
        }

        setUser(storedUser);
    }, [isMounted, router]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            localStorage.clear();
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            setUser(null);
            router.push('/auth/login');
        } catch {
            router.push('/auth/login');
        }
    };

    if (!isMounted || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <ClipLoader size={32} color="#364570" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation user={user} onLogout={handleLogout} currentPage="Robot Tasks" pageIcon={FaRobot} />

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[#364570] flex items-center gap-2">
                        <FaRobot className="w-6 h-6" />
                        Robot Tasks Overview
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">View robot task counts and earnings per profile.</p>
                </div>

                <RobotTasksOverview user={user} />
            </div>
        </div>
    );
}
