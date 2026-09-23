const AUTH_COOKIE_NAME = 'token';

/**
 * Clears the auth cookie. Attributes must mirror the ones used when the cookie is set in
 * LoginForm — a cookie only gets overwritten when name, path and SameSite/Secure match.
 */
export function clearAuthCookie(): void {
    if (typeof document === 'undefined') return;
    const isSecure = window.location.protocol === 'https:';
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

export function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        const result = parts.pop()?.split(';').shift();
        return result ?? null;
    }
    return null;
}
// lib/auth.ts

export async function register(userData: {
    username: string;
    email: string;
    password: string;
}) {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/local/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }

        return response.json();
    } catch (error) {
        throw error;
    }
}

export async function login(credentials: {
    identifier: string;
    password: string;
}) {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/local`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        return response.json();
    } catch (error) {
        throw error;
    }
}

export async function logout() {
    // Clear any auth tokens or user data from localStorage/cookies
    localStorage.removeItem('token');
}