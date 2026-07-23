import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const token = request.cookies.get('token');
    const { pathname } = request.nextUrl;

    // Check authentication for dashboard
    if (pathname.startsWith('/dashboard')) {
        if (!token) {
            return NextResponse.redirect(new URL('/auth/login', request.url));
        }
    }

    // Prevent authenticated users from accessing auth pages
    if (pathname.startsWith('/auth')) {
        if (token) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/auth/:path*']
};
