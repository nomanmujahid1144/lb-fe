'use client';

import { Work_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useState } from "react";
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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

  return (
    <html lang="en">
      <body className={`${workSans.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <Header onMenuClick={() => setIsMobileOpen(!isMobileOpen)} />
          <Sidebar
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
          />
          <main
            className={`mt-16 transition-all duration-300 
              ${isCollapsed ? 'lg:ml-16' : 'lg:ml-60'}
            `}
          >
            {children}
          </main>
        </ErrorBoundary>

        {/* Sonner Toaster */}
        <Toaster position="top-right" richColors/>
      </body>
    </html>
  );
}