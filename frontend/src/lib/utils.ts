import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// IST is UTC + 5 hours 30 minutes
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return '-';

    // Parse the date - timestamps are in UTC
    let date: Date;

    if (typeof dateString === 'string') {
        // Handle ISO strings with Z (UTC) and MySQL datetime format
        if (dateString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateString)) {
            date = new Date(dateString);
        } else {
            // MySQL datetime without timezone - treat as UTC
            const normalized = dateString.replace(' ', 'T') + 'Z';
            date = new Date(normalized);
        }
    } else {
        date = dateString;
    }

    // Check if valid date
    if (isNaN(date.getTime())) return '-';

    // Manually convert UTC to IST by adding 5:30 hours
    const istDate = new Date(date.getTime() + IST_OFFSET_MS);

    // Format the IST date (use UTC methods since we've already offset)
    const day = istDate.getUTCDate();
    const month = istDate.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });
    const year = istDate.getUTCFullYear();

    let hours = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    return `${day} ${month} ${year}, ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

export const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (dateString: string | Date | null | undefined) => {
    if (!dateString) return '-';

    let date: Date;
    if (typeof dateString === 'string') {
        if (dateString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateString)) {
            date = new Date(dateString);
        } else {
            date = new Date(dateString.replace(' ', 'T') + 'Z');
        }
    } else {
        date = dateString;
    }

    if (isNaN(date.getTime())) return '-';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDate(dateString);
};

// Get IST time string for charts (just time, e.g. "03:45 pm")
export const formatTimeIST = (dateString: string): string => {
    if (!dateString) return '-';

    let date: Date;
    if (dateString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateString)) {
        date = new Date(dateString);
    } else {
        date = new Date(dateString.replace(' ', 'T') + 'Z');
    }

    if (isNaN(date.getTime())) return '-';

    // Add IST offset
    const istDate = new Date(date.getTime() + IST_OFFSET_MS);

    let hours = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

// Parse UTC date and return Date object
export const parseUTCDate = (dateString: string): Date => {
    if (dateString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateString)) {
        return new Date(dateString);
    }
    return new Date(dateString.replace(' ', 'T') + 'Z');
};
