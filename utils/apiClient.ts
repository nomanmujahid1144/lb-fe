// utils/apiClient.ts

import { API_CONFIG } from '@/config/api.config';

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
}

interface RequestOptions extends RequestInit {
    withAuth?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { withAuth = true, headers = {}, ...rest } = options;

    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(headers as Record<string, string>),
    };

    if (withAuth) {
        const token = getCookie('token');
        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        ...rest,
        headers: requestHeaders,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error?.message || `Request failed: ${response.status}`);
    }

    return response.json();
}

export const apiClient = {
    get: <T>(endpoint: string, options?: RequestOptions) =>
        request<T>(endpoint, { method: 'GET', ...options }),

    post: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
        request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
            ...options,
        }),

    put: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
        request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
            ...options,
        }),

    patch: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
        request<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
            ...options,
        }),
};