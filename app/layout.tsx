import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientThemeProvider from '@/components/ClientThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import NavigationLoader from '@/components/layout/NavigationLoader';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Leadblocks Customer Portal",
    description: "Customer portal for Leadblocks",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <ErrorBoundary>
                    <ClientThemeProvider>
                        <NavigationLoader />
                        {children}
                    </ClientThemeProvider>
                </ErrorBoundary>
                <Toaster />
            </body>
        </html>
    );
}