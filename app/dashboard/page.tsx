'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HeroBanner from '@/components/home/HeroBanner';
import StatCard from '@/components/home/StatCard';
import QuickActionCard from '@/components/home/QuickActionCard';
import ActivityItem from '@/components/home/ActivityItem';
import { getCookie } from '@/lib/auth';
import { safeLocalStorage } from '@/lib/storage';
import { dashboardService } from '@/services/dashboard.service';
import type { DashboardUser, DashboardStats } from '@/types/dashboard/dashboard.types';
import { formatDate } from '@/lib/utils/formatDate';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<DashboardUser | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    useEffect(() => {
        if (!isMounted) return;

        const token = getCookie('token');
        const storedUser = safeLocalStorage.getParsedItem<DashboardUser>('user');

        if (!token || !storedUser) {
            router.push('/auth/login');
            return;
        }

        setUser(storedUser);

        // Fetch real stats from API
        const fetchStats = async () => {
            try {
                const data = await dashboardService.getStats();
                setStats(data);
            } catch {
                // Silently fail — show zeros
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [isMounted, router]);

    if (!isMounted || !user) return null;

    // Build stat cards from real API data
    const statsData = [
        {
            id: 'customers',
            label: 'Total Customers',
            value: isLoading ? 0 : (stats?.totalCustomers ?? 0),
            percentage: 0,
            icon: 'users' as const,
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-500',
        },
        {
            id: 'profiles',
            label: 'Active Profiles',
            value: isLoading ? 0 : (stats?.totalProfiles ?? 0),
            percentage: 0,
            icon: 'link' as const,
            bgColor: 'bg-green-50',
            iconColor: 'text-green-500',
        },
        {
            id: 'campaigns',
            label: 'Live Campaigns',
            value: isLoading ? 0 : (stats?.uniqueLiveCampaignsCount ?? 0),
            percentage: 0,
            icon: 'message' as const,
            bgColor: 'bg-purple-50',
            iconColor: 'text-purple-500',
        },
        {
            id: 'leads',
            label: 'Leads to Follow Up',
            value: isLoading ? 0 : (stats?.followUpCount ?? 0),
            percentage: 0,
            icon: 'thumbsup' as const,
            bgColor: 'bg-orange-50',
            iconColor: 'text-orange-500',
        },
    ];

    // Quick actions
    const quickActionsData = [
        {
            id: 'leads',
            title: 'Check Leads',
            description: `${isLoading ? '...' : stats?.followUpCount ?? 0} leads waiting for follow up`,
            buttonText: 'View Leads',
            icon: 'users-group' as const,
            bgColor: 'bg-primary/5',
            variant: 'primary' as const,
            href: '/dashboard/follow_up',
        },
        {
            id: 'statistics',
            title: 'View Statistics',
            description: 'Track your campaign performance and results',
            buttonText: 'View Statistics',
            icon: 'chart' as const,
            bgColor: 'bg-white',
            variant: 'default' as const,
            href: '/dashboard/statistics',
        },
        {
            id: 'lists',
            title: 'Lists',
            description: 'Manage your prospect and company lists',
            buttonText: 'View Lists',
            icon: 'user-list' as const,
            bgColor: 'bg-white',
            variant: 'default' as const,
            href: '/dashboard/lists',
        },
        {
            id: 'chats',
            title: 'Private Chats',
            description: 'View your non-campaign LinkedIn conversations',
            buttonText: 'View Chats',
            icon: 'chat' as const,
            bgColor: 'bg-white',
            variant: 'default' as const,
            href: '/dashboard/linked_in_chats',
        },
    ];

    const recentActivities = [
        {
            id: '1',
            type: 'new_lead' as const,
            userName: user.username,
            userInitials: user.username.charAt(0).toUpperCase(),
            timestamp: formatDate(new Date().toISOString()),
            details: {
                title: 'Dashboard loaded',
                status: 'active',
            },
            socials: {
                linkedin: '',
            },
        },
    ];

    return (
        <div className="min-h-[calc(100vh-4rem)] px-6 md:px-0">
            <HeroBanner userName={user.username} />
            <main className="px-0 md:px-4 lg:px-6 py-6 md:py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                    {statsData.map((stat, index) => (
                        <StatCard key={stat.id} stat={stat} index={index} />
                    ))}
                </div>
                <section className="mb-6 md:mb-8">
                    <h2 className="text-lg md:text-xl font-bold text-text-heading mb-2 md:mb-1">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        {quickActionsData.map((action, index) => (
                            <QuickActionCard key={action.id} action={action} index={index} />
                        ))}
                    </div>
                </section>
                <section className="rounded-lg border border-stroke px-4 py-2.5 animate-fade-in w-full lg:w-1/2" style={{ animationDelay: '800ms' }}>
                    <h2 className="text-lg md:text-xl font-bold text-text-heading mb-2.5">Recent Activity</h2>
                    <div className="space-y-0">
                        {recentActivities.map((activity, index) => (
                            <ActivityItem key={activity.id} activity={activity} index={index} />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}