'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HomeIcon, Menu, X } from 'lucide-react';
import { IconType } from 'react-icons';

interface User {
  id: number;
  username: string;
  email: string;
}

interface NavigationProps {
  user: User | null;
  onLogout: () => void;
  currentPage?: string;
  pageIcon?: IconType;
}

export default function Navigation({ user, onLogout, currentPage, pageIcon }: NavigationProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (window as any).__setNavigating?.(true);
    router.push('/dashboard');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">

          {/* Left: Logo + page name */}
          <div className="flex items-center min-w-0">
            <img
              src="/logo.png"
              alt="Lead Blocks Logo"
              className="h-9 sm:h-12 mr-2 cursor-pointer shrink-0"
              onClick={handleHomeClick}
            />
            {currentPage && pageIcon && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-6 w-px bg-gray-200 mx-3" />
                <span className="text-[#47577d]">
                  {React.createElement(pageIcon, { className: 'w-5 h-5', style: { verticalAlign: 'middle' } })}
                </span>
                <span className="text-xl font-medium text-[#47577d] truncate max-w-xs">{currentPage}</span>
              </div>
            )}
          </div>

          {/* Desktop right side */}
          <div className="hidden sm:flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleHomeClick}
                type="button"
                className="p-2 rounded-full text-[#47577d] hover:text-[#37466b] hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Go to home"
                title="Home"
              >
                <HomeIcon className="h-5 w-5" />
              </button>
              <span className="text-[#47577d] font-medium text-sm">{user.username}</span>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#cc4c5c] hover:text-[#b54452] hover:bg-red-50 font-medium transition-colors cursor-pointer text-sm"
            >
              Logout
            </button>
          </div>

          {/* Mobile: page title + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            {currentPage && (
              <span className="text-sm font-medium text-[#47577d] truncate max-w-[160px]">{currentPage}</span>
            )}
            <button
              onClick={() => setMobileMenuOpen(p => !p)}
              className="p-2 rounded-md text-gray-500 hover:text-[#364570] hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white shadow-md">
          <div className="px-4 py-3 space-y-1">
            <div className="flex items-center gap-2 px-2 py-2 text-sm text-gray-500">
              <span className="font-medium text-[#47577d]">{user.username}</span>
            </div>
            <button
              onClick={handleHomeClick}
              className="flex items-center gap-3 w-full px-2 py-2.5 rounded-lg text-sm text-[#47577d] hover:bg-gray-50 transition-colors"
            >
              <HomeIcon className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => { onLogout(); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-2 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
