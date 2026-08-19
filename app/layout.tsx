'use client';

import { Work_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { Toaster } from 'sonner';
import { Toaster as HotToaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getCookie } from '@/lib/auth';
import { usePathname } from 'next/navigation';

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    const token = getCookie('token');
    const user = localStorage.getItem('user');
    setIsLoggedIn(!!token && !!user);

    // Restore sidebar collapse state
    try {
      const saved = localStorage.getItem('leadblocks-sidebar-collapsed');
      if (saved) setIsCollapsed(JSON.parse(saved));
    } catch {}
  }, [pathname]);

  return (
    <html lang="en">
      <body className={`${workSans.variable} font-sans antialiased`}>
        <ErrorBoundary>
          {isMounted && isLoggedIn && (
            <>
              <Header onMenuClick={() => setIsMobileOpen(!isMobileOpen)} />
              <Sidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
              />
            </>
          )}
          <main
            className={`transition-all duration-300 
              ${isMounted && isLoggedIn ? `mt-16 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-60'}` : ''}
            `}
          >
            {children}
          </main>
        </ErrorBoundary>

        {/* Sonner Toaster - for new components */}
        <Toaster position="top-right" richColors />

        {/* React Hot Toast - for existing pages */}
        <HotToaster />
      </body>
    </html>
  );
}