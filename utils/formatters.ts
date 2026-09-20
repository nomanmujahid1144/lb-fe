// utils/formatters.ts

/**
 * Formats a date string to "18 Sep 2026" format
 * Handles both ISO strings (2026-09-18T07:23:41.000Z) and date-only strings (2026-09-18)
 */
export const formatDate = (date: string | null | undefined): string => {
    if (!date || date === 'N/A') return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
};

/**
 * Formats a date string to "18-Sep-2026" format (DD-Mon-YYYY)
 * Used in date pickers and form displays
 */
export const formatDisplayDate = (date: string | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return `${d.getDate()}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;
};

/**
 * Formats a date string to "18 Sep 2026, 07:23" format (with time)
 */
export const formatDateTime = (date: string | null | undefined): string => {
    if (!date || date === 'N/A') return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    const time = d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}, ${time}`;
};

/**
 * Formats a date string to "18-09-26" format (DD-MM-YY)
 */
export const formatDateShort = (date: string | null | undefined): string => {
    if (!date || date === 'N/A') return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(2);
    return `${day}-${month}-${year}`;
};

/**
 * Returns a relative time string like "2 days ago", "just now"
 */
export const formatRelativeTime = (date: string | null | undefined): string => {
    if (!date || date === 'N/A') return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
};

/**
 * Truncates a string to a max length with ellipsis
 */
export const truncateString = (str: string | null | undefined, maxLength: number): string => {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
};

/**
 * Converts a string to sentence case
 */
export const toSentenceCase = (str: string | null | undefined): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};