// lib/storage.ts
// Safe localStorage wrapper that works with SSR

export const safeLocalStorage = {
    getItem: (key: string): string | null => {
        if (typeof window === 'undefined') {
            return null;
        }
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn('localStorage access failed:', error);
            return null;
        }
    },

    setItem: (key: string, value: string): void => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn('localStorage access failed:', error);
        }
    },

    removeItem: (key: string): void => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('localStorage access failed:', error);
        }
    },

    clear: (): void => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            localStorage.clear();
        } catch (error) {
            console.warn('localStorage access failed:', error);
        }
    },

    getParsedItem: <T>(key: string): T | null => {
        const item = safeLocalStorage.getItem(key);
        if (!item) return null;
        try {
            return JSON.parse(item) as T;
        } catch (error) {
            console.warn('Failed to parse localStorage item:', error);
            return null;
        }
    },

    setParsedItem: <T>(key: string, value: T): void => {
        try {
            const serialized = JSON.stringify(value);
            safeLocalStorage.setItem(key, serialized);
        } catch (error) {
            console.warn('Failed to serialize item for localStorage:', error);
        }
    }
};