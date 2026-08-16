'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeScreenIcon, MultiPersonsIcon, DBIcon, ListIcon, SettingIcon, BlockListIcon, ChatIcon, ChartIcon } from './Icons';

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  roles?: string[]; // If undefined = visible to all roles
}

type UserType = 'Admin' | 'Customer' | 'Manager' | 'Backoffice' | 'Chatter' | string;

// Public menu items — role-filtered
const menuItems: MenuItem[] = [
  { id: 'home', label: 'Home', href: '/dashboard', icon: HomeScreenIcon },
  { id: 'leads', label: 'Leads', href: '/dashboard/follow_up', icon: MultiPersonsIcon },
  { id: 'statistics', label: 'Statistics', href: '/dashboard/statistics', icon: ChartIcon },
  { id: 'database', label: 'All Campaign Data', href: '/dashboard/all_prospects', icon: DBIcon },
  { id: 'lists', label: 'Lists', href: '/dashboard/lists', icon: ListIcon },
  { id: 'setup', label: 'Setup', href: '/dashboard/customer-setups', icon: SettingIcon },
  { id: 'blacklist', label: 'Blacklist', href: '/dashboard/master_database?tab=blacklist', icon: BlockListIcon },
  // Private Chats — hidden for Manager
  { id: 'chats', label: 'Private Chats', href: '/dashboard/linked_in_chats', icon: ChatIcon, roles: ['Admin', 'Customer', 'Backoffice', 'Chatter'] },
];

// Internal menu items — only for Admin and Backoffice
const internalMenuItems: MenuItem[] = [
  { id: 'management', label: 'Management Dashboard', href: '/dashboard/statistics', icon: HomeScreenIcon },
  { id: 'master-database', label: 'Master Database', href: '/dashboard/master_database', icon: DBIcon },
  { id: 'ai-analysis', label: 'AI Analysis', href: '/dashboard/ai_analysis', icon: ChartIcon },
  { id: 'robot-tasks', label: 'Robot Tasks', href: '/dashboard/robot_tasks', icon: SettingIcon },
  { id: 'chatter-tasks', label: 'Chatter Tasks', href: '/dashboard/chatter_tasks', icon: ChatIcon },
  { id: 'data-import', label: 'Data Import', href: '/dashboard/data_import', icon: ListIcon },
];

const INTERNAL_ROLES: UserType[] = ['Admin', 'Backoffice'];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (val: boolean) => void;
}

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }: SidebarProps) => {
  const pathname = usePathname();
  const [userType, setUserType] = useState<UserType>('');

  // Read user type from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserType(user.type || '');
      }
    } catch { }
  }, []);

  // Persist collapse state to localStorage — fix for point 13
  const handleToggleCollapse = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    try { localStorage.setItem('nova-sidebar-collapsed', JSON.stringify(newVal)); } catch { }
  };

  // Filter menu item by role
  const isVisible = (item: MenuItem): boolean => {
    if (!item.roles) return true; // No restriction = visible to all
    return item.roles.includes(userType);
  };

  // Active state — use startsWith for sub-routes, with special case for /dashboard
  const isActive = (href: string): boolean => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href.split('?')[0]); // strip query params for comparison
  };

  const filteredPublicItems = menuItems.filter(isVisible);
  const showInternal = INTERNAL_ROLES.includes(userType);

  const renderLink = (item: MenuItem, isInternalItem = false) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={() => setIsMobileOpen(false)}
        className={`flex items-center gap-3 py-2.5 mb-1 rounded-lg text-sm font-medium transition-all duration-200 relative group ${active
            ? 'bg-primary/5 text-primary'
            : isInternalItem
              ? 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
              : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
          } ${isCollapsed ? 'justify-center px-0 lg:px-0' : 'px-3'}`}
        title={isCollapsed ? item.label : ''}
      >
        <Icon
          size={20}
          className={`${active ? 'text-primary' : isInternalItem ? 'text-neutral-400' : 'text-neutral-500'} shrink-0`}
        />
        {!isCollapsed && (
          <span className="whitespace-nowrap">{item.label}</span>
        )}

        {/* Tooltip for collapsed state - Desktop only */}
        {isCollapsed && (
          <div className="hidden lg:block absolute left-full ml-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {item.label}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white flex flex-col z-50 transition-all duration-300 
          ${isCollapsed ? 'w-16' : 'w-60'}
          lg:translate-x-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Toggle Button - Desktop only */}
        <div className="relative hidden lg:block">
          <button
            onClick={handleToggleCollapse}
            className="absolute -right-3 top-4 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center hover:bg-neutral-50 transition-colors shadow-sm z-50"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`transition-transform duration-300 cursor-pointer ${isCollapsed ? 'rotate-180' : ''}`}
            >
              <path
                d="M7.5 3L4.5 6L7.5 9"
                stroke="#676F7E"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto overflow-x-hidden mt-0 lg:mt-8">

          {/* Public Menu Items — role filtered */}
          {filteredPublicItems.map(item => renderLink(item))}

          {/* Internal Section — Admin and Backoffice only */}
          {showInternal && (
            <>
              <div className="mx-0 border-t border-stroke my-3" />
              {!isCollapsed && (
                <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2 px-3">
                  Internal
                </p>
              )}
              {internalMenuItems.map(item => renderLink(item, true))}
            </>
          )}

        </nav>
      </aside>
    </>
  );
};

export default Sidebar;