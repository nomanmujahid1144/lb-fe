'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
    return (
        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6">
            <div className="bg-white shadow-lg rounded-lg p-8 max-w-md text-center">
                <div className="flex justify-center mb-6">
                    <Image src="/logo.png" alt="Leadblocks Logo" width={270} height={72} />
                </div>
                <h1 className="text-xl font-bold text-gray-800 mb-4">NOVA. Your personal lead hub</h1>
                <div className="flex flex-col gap-4">
                    <Link href="/auth/login" className="w-full text-center bg-[#47577d] text-white py-2 rounded-lg hover:bg-[#3b4a63] transition">
                        Login
                    </Link>
                </div>
            </div>
        </main>
    );
}