'use client';

import React from 'react';
import Image from 'next/image';
import { HomeIcon, ArrowRightIcon, LogoutIcon, MultiPersonsIcon, DBIcon, ListIcon, SettingIcon, BlockListIcon, ChatIcon, ChartIcon } from './Icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCookie } from '@/lib/auth';

interface HeaderProps {
  onMenuClick: () => void;
}

// Breadcrumb config — maps route to label + icon
const breadcrumbMap: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  '/dashboard': { label: 'Home', icon: HomeIcon },
  '/dashboard/follow_up': { label: 'Leads', icon: MultiPersonsIcon },
  '/dashboard/statistics': { label: 'Statistics', icon: ChartIcon },
  '/dashboard/all_prospects': { label: 'All Campaign Data', icon: DBIcon },
  '/dashboard/lists': { label: 'Lists', icon: ListIcon },
  '/dashboard/customer-setups': { label: 'Setup', icon: SettingIcon },
  '/dashboard/master_database': { label: 'Master Database', icon: DBIcon },
  '/dashboard/linked_in_chats': { label: 'Private Chats', icon: ChatIcon },
  '/dashboard/robot_tasks': { label: 'Robot Tasks', icon: SettingIcon },
  '/dashboard/chatter_tasks': { label: 'Chatter Tasks', icon: ChatIcon },
  '/dashboard/all_companies': { label: 'All Companies', icon: DBIcon },
  '/dashboard/robot_tasks_overview': { label: 'Robot Tasks Overview', icon: SettingIcon },
  '/dashboard/profiles': { label: 'Profiles', icon: MultiPersonsIcon },
  '/dashboard/campaigns': { label: 'Campaigns', icon: ChartIcon },
  '/dashboard/import_prospects': { label: 'Import Prospects', icon: DBIcon },
  '/dashboard/import_companies': { label: 'Import Companies', icon: DBIcon },
  '/dashboard/import_campaigns': { label: 'Import Campaigns', icon: DBIcon },
  '/dashboard/import_blacklist': { label: 'Import Blacklist', icon: BlockListIcon },
  '/dashboard/import_chats': { label: 'Import Chats', icon: ChatIcon },
  '/dashboard/import_tasks': { label: 'Import Tasks', icon: ListIcon },
  '/dashboard/create_chatter_tasks': { label: 'Create Chatter Tasks', icon: ChatIcon },
  '/dashboard/disconnect_prospects': { label: 'Disconnect Prospects', icon: DBIcon },
  '/dashboard/import_scrapes': { label: 'Import Scrapes', icon: DBIcon },
};

const Header = ({ onMenuClick }: HeaderProps) => {
    const pathname = usePathname();
    const router = useRouter();

    // Get current page breadcrumb
    const currentPage = breadcrumbMap[pathname];

    // Get username from localStorage
    const getUsername = (): string => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                return user.username || '';
            }
        } catch {}
        return '';
    };

    const [username, setUsername] = React.useState('');

    React.useEffect(() => {
        setUsername(getUsername());
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            localStorage.clear();
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            router.push('/auth/login');
        } catch {
            router.push('/auth/login');
        }
    };

    return (
        <header className="bg-white fixed top-0 left-0 right-0 z-50 pt-2">
            <div className="flex items-center justify-between h-16 px-4 md:px-6">
                {/* Left: Hamburger (mobile) + Logo + Breadcrumbs */}
                <div className="flex items-center gap-3 md:gap-4">
                    {/* Hamburger Button - Mobile only */}
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden flex items-center justify-center w-8 h-8 text-neutral-600 hover:text-neutral-900"
                        aria-label="Toggle menu"
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M3 6H17M3 10H17M3 14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>

                    {/* Logo */}
                    <Link href="/dashboard">
                        <Image src="/logo.svg" alt="NOVA Logo" width={100} height={32} className="md:w-[124px] md:h-[40px]" priority />
                    </Link>

                    {/* Breadcrumbs - Desktop only */}
                    <nav className="hidden md:flex items-center gap-2 text-sm">
                        <Link href="/dashboard" className="text-sm flex items-center justify-center gap-1 text-text-breadcrumb hover:text-text-heading cursor-pointer transition-colors">
                            <HomeIcon size={14} />
                            <span>Home</span>
                        </Link>
                        {currentPage && pathname !== '/dashboard' && (
                            <>
                                <ArrowRightIcon size={14} className="text-text-breadcrumb" />
                                <span className="text-sm flex items-center gap-1 text-text-breadcrumb">
                                    <currentPage.icon size={14} />
                                    <span>{currentPage.label}</span>
                                </span>
                            </>
                        )}
                    </nav>
                </div>

                {/* Right: Username + Logout */}
                <div className="flex items-center gap-3">
                    {/* Username */}
                    {username && (
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-icon-linkedin rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {username.charAt(0).toUpperCase()}
                            </div>
                            <span className="hidden md:block text-sm font-medium text-text-heading">
                                {username}
                            </span>
                        </div>
                    )}

                    <div className="h-5 w-px bg-stroke hidden md:block" />

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 md:gap-2 text-text-breadcrumb hover:text-text-heading transition-colors group cursor-pointer"
                    >
                        <LogoutIcon size={18} className="group-hover:translate-x-0.5 transition-transform md:w-5 md:h-5" />
                        <span className="text-xs md:text-sm font-medium">Log Out</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;