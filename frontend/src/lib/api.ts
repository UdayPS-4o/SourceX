import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

export const api = axios.create({
    baseURL: 'http://localhost:3000/api', // Make sure this matches your backend
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

export const getListings = async (page = 1, limit = 50) => {
    const response = await api.get(`/listings?page=${page}&limit=${limit}`);
    return response.data;
};

export const getListingHistory = async (id: number) => {
    const response = await api.get(`/listings/${id}/history`);
    return response.data;
};
