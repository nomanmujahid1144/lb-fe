import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';


const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

export async function POST(request: NextRequest) {
   

    console.log('=== API DEBUG INFO ===');
    console.log('STRAPI_URL:', STRAPI_URL);
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('=====================');

    try {
        const body = await request.json();
        const { action, ...data } = body;

        let endpoint = '';
        switch (action) {
            case 'login':
                endpoint = '/api/auth/local';
                break;
            case 'register':
                endpoint = '/api/auth/local/register';
                break;
            default:
                return new Response(JSON.stringify({ error: 'Invalid action' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
        }

        const response = await fetch(`${STRAPI_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error?.message || 'Authentication failed');
        }

        // Set the JWT token in an HTTP-only cookie
        const cookieStore = await cookies();
        cookieStore.set('token', result.jwt, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60, // 30 days
        });
        return new Response(JSON.stringify({ user: result.user }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

export async function GET(_request: NextRequest) {
    // Get the token from the cookie
    // Get the token from the cookie - Fixed with await
    const cookieStore = await cookies();
    const token = cookieStore.get('token');


    if (!token) {
        return new Response(JSON.stringify({ error: 'Not authenticated' }), {
            status: 401,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
    try {
        // Verify the token with Strapi
        const response = await fetch(`${STRAPI_URL}/api/users/me`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });

        if (!response.ok) {
            throw new Error('Token verification failed');
        }

        const user = await response.json();
        return new Response(JSON.stringify({ user }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

export async function DELETE() {
    // Clear the auth cookie - Fixed with await
    const cookieStore = await cookies();
    cookieStore.delete('token');

    return new Response(null, {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}