import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

// Use env var or default to local for safety
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
        },
    },
});

export const getPlatforms = async () => {
    const response = await api.get('/dashboard/platforms');
    return response.data;
};

export const getStats = async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
};

export const getLogs = async (limit = 20) => {
    const response = await api.get(`/dashboard/logs?limit=${limit}`);
    return response.data;
};

export const getListings = async (page = 1, limit = 50, search = '', status = 'all') => {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });
    if (search) params.append('search', search);
    if (status !== 'all') params.append('status', status);

    const response = await api.get(`/listings?${params.toString()}`);
    return response.data;
};

export const getListingHistory = async (id: number | string) => {
    const response = await api.get(`/listings/${id}/history`);
    return response.data;
};
