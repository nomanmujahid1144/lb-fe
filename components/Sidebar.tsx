'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeScreenIcon, MultiPersonsIcon, DBIcon, ListIcon, SettingIcon, BlockListIcon, ChatIcon, ChartIcon } from './Icons';

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

// Public menu items (visible to all users)
const menuItems: MenuItem[] = [
  { id: 'home', label: 'Home', href: '/dashboard', icon: HomeScreenIcon },
  { id: 'leads', label: 'Leads', href: '/dashboard/follow_up', icon: MultiPersonsIcon },
  { id: 'statistics', label: 'Statistics', href: '/dashboard/statistics', icon: ChartIcon },
  { id: 'database', label: 'All Campaign Data', href: '/dashboard/all_prospects', icon: DBIcon },
  { id: 'lists', label: 'Lists', href: '/dashboard/lists', icon: ListIcon },
  { id: 'setup', label: 'Setup', href: '/dashboard/customer-setups', icon: SettingIcon },
  { id: 'blacklist', label: 'Blacklist', href: '/dashboard/master_database', icon: BlockListIcon },
  { id: 'chats', label: 'Private Chats', href: '/dashboard/linked_in_chats', icon: ChatIcon },
];

// Internal menu items (LeadBlocks only)
const internalMenuItems: MenuItem[] = [
  { id: 'management', label: 'Management Dashboard', href: '/dashboard/statistics', icon: HomeScreenIcon },
  { id: 'companies', label: 'All Companies', href: '/dashboard/all_companies', icon: DBIcon },
  { id: 'master-database', label: 'Master Database', href: '/dashboard/master_database', icon: DBIcon },
  { id: 'ai-analysis', label: 'AI Analysis', href: '/dashboard/master_database', icon: ChartIcon },
  { id: 'robot-tasks', label: 'Robot Tasks', href: '/dashboard/robot_tasks', icon: SettingIcon },
  { id: 'chatter-tasks', label: 'Chatter Tasks', href: '/dashboard/chatter_tasks', icon: ChatIcon },
  { id: 'data-import', label: 'Data Import', href: '/dashboard', icon: ListIcon },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (val: boolean) => void;
}

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }: SidebarProps) => {
  const pathname = usePathname();

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
            onClick={() => setIsCollapsed(!isCollapsed)}
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

          {/* Public Menu Items */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 py-2.5 mb-1 rounded-lg text-sm font-medium transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-primary/5 text-primary'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                } ${isCollapsed ? 'justify-center px-0 lg:px-0' : 'px-3'}`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon
                  size={20}
                  className={`${isActive ? 'text-primary' : 'text-neutral-500'} shrink-0`}
                />
                {!isCollapsed && (
                  <span className="whitespace-nowrap">
                    {item.label}
                  </span>
                )}

                {/* Tooltip for collapsed state - Desktop only */}
                {isCollapsed && (
                  <div className="hidden lg:block absolute left-full ml-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}

          {/* Divider + Internal Section */}
          <div className="mx-0 border-t border-stroke my-3" />

          {!isCollapsed && (
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2 px-3">
              Internal
            </p>
          )}

          {/* Internal Menu Items */}
          {internalMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href && item.id !== 'management'; // avoid double highlight

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 py-2.5 mb-1 rounded-lg text-sm font-medium transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-primary/5 text-primary'
                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                } ${isCollapsed ? 'justify-center px-0 lg:px-0' : 'px-3'}`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon
                  size={20}
                  className={`${isActive ? 'text-primary' : 'text-neutral-400'} shrink-0`}
                />
                {!isCollapsed && (
                  <span className="whitespace-nowrap">
                    {item.label}
                  </span>
                )}

                {/* Tooltip for collapsed state - Desktop only */}
                {isCollapsed && (
                  <div className="hidden lg:block absolute left-full ml-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}

        </nav>
      </aside>
    </>
  );
};

export default Sidebar;