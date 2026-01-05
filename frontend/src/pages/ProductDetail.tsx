import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { api, getListingHistory } from '../lib/api';
import { formatCurrency, formatDate, formatTimeIST, cn } from '../lib/utils';
import { ArrowLeft, BoxIcon, TrendingUp, Package, Tag, Calendar, Check, Save } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useMemo, useState, useEffect } from 'react';
import { type Column, DataTable } from '../components/ui/DataTable';

interface PriceHistoryItem {
    id?: string | number;
    recorded_at: string;
    price: string | number;
}

interface InventoryHistoryItem {
    id?: string | number;
    recorded_at: string;
    stock: number;
    change_type: string;
}

interface Listing {
    _id: string;
    productName: string;
    productSku: string;
    size?: string;
    imgUrl?: string;
    currentPrice?: string | number;
    currentStock?: number;
    updatedAt?: string;
    cfb1?: boolean;
    cfi1?: number; // Legacy Payout Price
    cfi2?: number; // Legacy Commission
    cfi_1?: number; // Payout Price (from DB)
    cfi_2?: number; // Commission (from DB)
    platform?: { name: string };
    autoUndercutEnabled?: boolean;
    stopLossPrice?: number;
}

interface HistoryData {
    price: PriceHistoryItem[];
    inventory: InventoryHistoryItem[];
}

export function ProductDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Fetch product details

    const { data: listing, isLoading: loadingListing } = useQuery<Listing>({
        queryKey: ['listing', id],
        queryFn: async () => {
            const res = await api.get(`/listings/${id}`);
            return res.data;
        },
        enabled: !!id
    });

    const [payoutPrice, setPayoutPrice] = useState<string>('');
    const queryClient = useQueryClient();

    // Helper to get payout price and commission
    const getPayout = (l?: Listing) => l?.cfi_1 ?? l?.cfi1;
    const getCommission = (l?: Listing) => l?.cfi_2 ?? l?.cfi2;

    useEffect(() => {
        const storedPayout = getPayout(listing);
        if (storedPayout !== undefined && storedPayout !== null) {
            setPayoutPrice(storedPayout.toString());
        }
    }, [listing?.cfi1, listing?.cfi_1]);

    const [updateStatus, setUpdateStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const updatePayoutMutation = useMutation({
        mutationFn: async (newPrice: string) => {
            const res = await api.patch(`/listings/${id}/payout`, {
                payoutPrice: Number(newPrice)
            });
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['listing', id] });
            queryClient.invalidateQueries({ queryKey: ['listing-history', id] });
            setUpdateStatus({
                type: 'success',
                message: `Updated ${data.platformListingsUpdated || 0} platform listings to ₹${data.payoutPrice}`
            });
            // Clear success message after 5 seconds
            setTimeout(() => setUpdateStatus(null), 5000);
        },
        onError: (error: Error) => {
            setUpdateStatus({
                type: 'error',
                message: error.message || 'Failed to update price'
            });
            // Clear error message after 8 seconds
            setTimeout(() => setUpdateStatus(null), 8000);
        }
    });

    const handleSavePayout = () => {
        if (!payoutPrice || payoutPrice === '0' || payoutPrice === '') return;
        updatePayoutMutation.mutate(payoutPrice);
    };

    // Auto-undercut state
    const [autoUndercutEnabled, setAutoUndercutEnabled] = useState(false);
    const [stopLossPrice, setStopLossPrice] = useState<string>('');

    // Initialize auto-undercut state from listing
    useEffect(() => {
        if (listing) {
            setAutoUndercutEnabled(listing.autoUndercutEnabled ?? false);
            setStopLossPrice(listing.stopLossPrice?.toString() ?? '');
        }
    }, [listing?.autoUndercutEnabled, listing?.stopLossPrice]);

    // Auto-undercut mutation
    const autoUndercutMutation = useMutation({
        mutationFn: async (data: { enabled: boolean; stopLossPrice: number | null }) => {
            const res = await api.patch(`/listings/${id}/auto-undercut`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listing', id] });
            setUpdateStatus({
                type: 'success',
                message: autoUndercutEnabled ? 'Auto-undercut enabled' : 'Auto-undercut disabled'
            });
            setTimeout(() => setUpdateStatus(null), 3000);
        },
        onError: (error: Error) => {
            setUpdateStatus({
                type: 'error',
                message: error.message || 'Failed to update auto-undercut'
            });
            setTimeout(() => setUpdateStatus(null), 5000);
        }
    });

    const handleAutoUndercutToggle = () => {
        const newEnabled = !autoUndercutEnabled;
        setAutoUndercutEnabled(newEnabled);
        autoUndercutMutation.mutate({
            enabled: newEnabled,
            stopLossPrice: stopLossPrice ? Number(stopLossPrice) : null
        });
    };

    const handleStopLossSave = () => {
        autoUndercutMutation.mutate({
            enabled: autoUndercutEnabled,
            stopLossPrice: stopLossPrice ? Number(stopLossPrice) : null
        });
    };

    const currentSavedPayout = getPayout(listing);
    const hasChanged = currentSavedPayout ? currentSavedPayout.toString() !== payoutPrice : !!payoutPrice;
    const isValid = payoutPrice && payoutPrice !== '0' && payoutPrice !== '';

    // Calculate projected main price
    const projectedPrice = useMemo(() => {
        if (!listing || !payoutPrice) return null;
        const price = Number(payoutPrice);
        const commissionVal = getCommission(listing) || 1400; // Default 14%
        const commissionRate = commissionVal / 10000;
        return Math.round(price * (1 + commissionRate));
    }, [listing, payoutPrice]);

    // Calculate suggested payout price (to be ₹1 less than current lowest)
    const suggestedPayout = useMemo(() => {
        if (!listing?.currentPrice) return null;
        const currentLowest = Number(listing.currentPrice);
        const commissionVal = getCommission(listing) || 1400; // Default 14%
        const commissionRate = commissionVal / 10000;

        // Check if current payout + commission already equals lowest price
        const currentPayout = getPayout(listing);
        if (currentPayout) {
            const currentPayoutPrice = Math.round(currentPayout * (1 + commissionRate));
            if (currentPayoutPrice <= currentLowest) {
                // Already at or below lowest, no suggestion needed
                return null;
            }
        }

        const targetPrice = currentLowest - 1; // ₹1 less than current
        // Reverse calculate: payout = target / (1 + commission)
        return Math.floor(targetPrice / (1 + commissionRate));
    }, [listing?.currentPrice, listing?.cfi_2, listing?.cfi2, listing?.cfi_1, listing?.cfi1]);

    // Fetch history

    const { data: history } = useQuery<HistoryData>({
        queryKey: ['listing-history', id],
        queryFn: () => getListingHistory(Number(id!)),
        enabled: !!id
    });

    // Process price data with time-based X axis
    const priceData = useMemo(() => {
        if (!history?.price?.length) return [];

        return history.price.map((p) => {
            const dateStr = p.recorded_at;
            const date = dateStr.endsWith('Z') ? new Date(dateStr) : new Date(dateStr.replace(' ', 'T') + 'Z');
            return {
                time: formatTimeIST(p.recorded_at),
                price: Number(p.price),
                fullDate: formatDate(p.recorded_at),
                timestamp: date.getTime()
            };
        });
    }, [history?.price]);

    // Process inventory data
    const inventoryData = useMemo(() => {
        if (!history?.inventory?.length) return [];

        return history.inventory.map((i) => {
            const dateStr = i.recorded_at;
            const date = dateStr.endsWith('Z') ? new Date(dateStr) : new Date(dateStr.replace(' ', 'T') + 'Z');
            return {
                time: formatTimeIST(i.recorded_at),
                stock: i.stock,
                type: i.change_type,
                fullDate: formatDate(i.recorded_at),
                timestamp: date.getTime()
            };
        });
    }, [history?.inventory]);

    // Calculate Y-axis domain with padding
    const priceDomain = useMemo(() => {
        if (priceData.length === 0) return [0, 100];
        const prices = priceData.map(p => p.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const padding = (max - min) * 0.1 || max * 0.1;
        return [Math.max(0, min - padding), max + padding];
    }, [priceData]);

    const stockDomain = useMemo(() => {
        if (inventoryData.length === 0) return [0, 10];
        const stocks = inventoryData.map(s => s.stock);
        const min = Math.min(...stocks);
        const max = Math.max(...stocks);
        const padding = Math.max(1, (max - min) * 0.2);
        return [Math.max(0, min - padding), max + padding];
    }, [inventoryData]);

    if (loadingListing) {
        return (
            <Layout title="Loading...">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Product Details">
            {/* Back Button */}
            <button
                onClick={() => navigate('/products')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Products</span>
            </button>

            {/* Product Header */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 p-6">
                <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                    {/* Product Image */}
                    <div className="relative shrink-0 w-full md:w-auto flex justify-center md:block">
                        {listing?.imgUrl ? (
                            <div className="w-32 h-32 md:w-36 md:h-36 rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white p-2">
                                <img src={listing.imgUrl} alt="" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-32 h-32 md:w-36 md:h-36 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                                <BoxIcon className="w-12 h-12" />
                            </div>
                        )}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 md:left-1/2 md:-translate-x-1/2">
                            {listing?.cfb1 ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 shadow-sm whitespace-nowrap uppercase tracking-wide">
                                    <Check className="w-3 h-3 mr-1" />
                                    Lowest
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 shadow-sm whitespace-nowrap uppercase tracking-wide">
                                    Not Lowest
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 w-full space-y-4">
                        {/* Title & Meta */}
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight mb-2">
                                {listing?.productName}
                            </h1>
                            <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500">
                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600 border border-gray-200 text-xs">
                                    {listing?.productSku} | #{id}
                                </span>
                                {listing?.size && (
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold border border-indigo-100">
                                        Size: {listing.size}
                                    </span>
                                )}
                                {/* Stock Badge - Moved to header */}
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-xs font-semibold border flex items-center gap-1",
                                    listing?.currentStock !== undefined && listing.currentStock < 5
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                )}>
                                    <Package className="w-3 h-3" />
                                    Stock: {listing?.currentStock ?? '-'}
                                    {listing?.currentStock !== undefined && listing.currentStock < 5 && (
                                        <span className="text-[8px] font-bold uppercase ml-0.5">LOW</span>
                                    )}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    {listing?.updatedAt ? formatDate(listing.updatedAt) : '-'}
                                </span>
                                {listing?.platform?.name && (
                                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                                        {listing.platform.name}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Main Stats Row - Price & Auto-Undercut Side by Side */}
                        <div className="flex flex-col lg:flex-row gap-4">

                            {/* Price Box - Enhanced with Payout Input */}
                            <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col justify-between relative group hover:border-blue-200 transition-colors">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Lowest Price
                                        </div>
                                        {listing?.platform?.name?.toLowerCase() === 'sourcex' && (
                                            <div className="text-[10px] font-medium text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200" title="Commission">
                                                Comm: {getCommission(listing) ? `${getCommission(listing)! / 100}%` : '-'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Dynamic Price Display */}
                                    <div className={cn(
                                        "text-2xl md:text-3xl font-bold transition-colors flex items-center gap-2",
                                        (hasChanged && isValid)
                                            ? (projectedPrice && Number(projectedPrice) > Number(listing?.currentPrice) ? "text-red-600" : "text-blue-600")
                                            : "text-gray-900"
                                    )}>
                                        {(hasChanged && isValid && projectedPrice)
                                            ? formatCurrency(projectedPrice)
                                            : listing?.currentPrice ? formatCurrency(Number(listing.currentPrice)) : '-'}

                                        {hasChanged && isValid && (
                                            <TrendingUp className={cn(
                                                "w-5 h-5 animate-pulse",
                                                (projectedPrice && Number(projectedPrice) > Number(listing?.currentPrice)) ? "text-red-600" : "text-blue-500"
                                            )} />
                                        )}
                                    </div>
                                </div>

                                {/* Payout Input (SourceX only) */}
                                {listing?.platform?.name?.toLowerCase() === 'sourcex' && (
                                    <div className="mt-3 pt-3 border-t border-gray-200/60">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Payout:</span>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">₹</span>
                                                    <input
                                                        type="number"
                                                        value={payoutPrice}
                                                        onChange={(e) => setPayoutPrice(e.target.value)}
                                                        className="w-24 pl-5 pr-2 py-1.5 text-sm font-semibold bg-white border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-300 shadow-sm"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                {/* Suggested Payout Button */}
                                                {suggestedPayout && suggestedPayout > 0 && (
                                                    <button
                                                        onClick={() => setPayoutPrice(suggestedPayout.toString())}
                                                        className="px-2 py-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 transition-colors whitespace-nowrap"
                                                        title={`Set payout to ₹${suggestedPayout} to be ₹1 below current lowest`}
                                                    >
                                                        Suggested: ₹{suggestedPayout.toLocaleString()}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Contextual Save Button */}
                                            {hasChanged && isValid && (
                                                <button
                                                    onClick={handleSavePayout}
                                                    disabled={updatePayoutMutation.isPending}
                                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                                >
                                                    {updatePayoutMutation.isPending && (
                                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    )}
                                                    Save
                                                </button>
                                            )}
                                        </div>

                                        {/* Status Message */}
                                        {updateStatus && (
                                            <div className={cn(
                                                "mt-2 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-all",
                                                updateStatus.type === 'success'
                                                    ? "bg-green-50 text-green-700 border border-green-200"
                                                    : "bg-red-50 text-red-700 border border-red-200"
                                            )}>
                                                {updateStatus.type === 'success' ? (
                                                    <Check className="w-3.5 h-3.5" />
                                                ) : (
                                                    <span className="text-red-500">✕</span>
                                                )}
                                                {updateStatus.message}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Auto-Undercut Section (SourceX only) - Now side-by-side */}
                            {listing?.platform?.name?.toLowerCase() === 'sourcex' && (
                                <div className="lg:w-[340px] bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 rounded-xl p-4 border border-purple-200/60 shadow-sm relative overflow-hidden">
                                    {/* Decorative element */}
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />

                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-bold text-purple-800">⚡ Auto-Undercut</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide",
                                                    autoUndercutEnabled
                                                        ? "bg-purple-600 text-white"
                                                        : "bg-gray-200 text-gray-500"
                                                )}>
                                                    {autoUndercutEnabled ? 'Active' : 'OFF'}
                                                </span>
                                                <button
                                                    onClick={handleAutoUndercutToggle}
                                                    disabled={autoUndercutMutation.isPending}
                                                    className={cn(
                                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
                                                        autoUndercutEnabled ? "bg-purple-600" : "bg-gray-300",
                                                        autoUndercutMutation.isPending && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow",
                                                            autoUndercutEnabled ? "translate-x-6" : "translate-x-1"
                                                        )}
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-purple-600/80 mb-3 leading-relaxed">
                                            Auto-undercuts by ₹1 every 5 min until stop-loss is reached.
                                        </p>

                                        <div className="flex items-center gap-3 bg-white/60 rounded-lg px-3 py-2 border border-purple-100">
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className="text-xs font-bold text-purple-700 whitespace-nowrap">Stop-Loss:</span>
                                                <div className="relative flex-1 max-w-[100px]">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-400 text-sm font-medium">₹</span>
                                                    <input
                                                        type="number"
                                                        value={stopLossPrice}
                                                        onChange={(e) => setStopLossPrice(e.target.value)}
                                                        className="w-full pl-6 pr-2 py-1.5 text-sm font-bold bg-white border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder-purple-300 shadow-sm"
                                                        placeholder="Min"
                                                    />
                                                </div>
                                            </div>
                                            {stopLossPrice !== (listing?.stopLossPrice?.toString() ?? '') && (
                                                <button
                                                    onClick={handleStopLossSave}
                                                    disabled={autoUndercutMutation.isPending}
                                                    className="px-3 py-1.5 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 shadow-sm"
                                                >
                                                    Save
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Price History Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-500" />
                                Price History
                            </h3>
                            <span className="text-xs text-gray-500">{priceData.length} data points</span>
                        </div>
                        {priceData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={priceData}>
                                    <defs>
                                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 11 }}
                                        stroke="#9CA3AF"
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11 }}
                                        stroke="#9CA3AF"
                                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                                        domain={priceDomain}
                                    />
                                    <Tooltip
                                        formatter={(value: number | undefined) => [value !== undefined ? formatCurrency(value) : '', 'Price']}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="price"
                                        stroke="#3B82F6"
                                        strokeWidth={2}
                                        fill="url(#priceGradient)"
                                        dot={{ fill: '#3B82F6', r: 3 }}
                                        activeDot={{ r: 5 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-gray-400">
                                No price history available
                            </div>
                        )}
                    </div>

                    {/* Inventory History Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Package className="w-5 h-5 text-purple-500" />
                                Inventory History
                            </h3>
                            <span className="text-xs text-gray-500">{inventoryData.length} data points</span>
                        </div>
                        {inventoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={inventoryData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 11 }}
                                        stroke="#9CA3AF"
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11 }}
                                        stroke="#9CA3AF"
                                        domain={stockDomain}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        formatter={(value: number | undefined) => [value, 'Stock']}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                    />
                                    <Line
                                        type="stepAfter"
                                        dataKey="stock"
                                        stroke="#8B5CF6"
                                        strokeWidth={2}
                                        dot={{ fill: '#8B5CF6', r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-gray-400">
                                No inventory history available
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Log */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <DataTable
                        title="Recent Listing Activity"
                        data={[...(history?.price || []), ...(history?.inventory || [])]
                            .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
                        }
                        columns={[
                            {
                                key: 'type',
                                header: 'Event',
                                render: (event) => {
                                    const isPrice = 'price' in event;
                                    return (
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm",
                                            isPrice ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-purple-50 text-purple-700 border-purple-100"
                                        )}>
                                            {isPrice ? <Tag className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                            {isPrice ? 'Price Change' : 'Stock Update'}
                                        </span>
                                    )
                                }
                            },
                            {
                                key: 'recorded_at',
                                header: 'Time',
                                render: (event) => <span className="text-gray-500 whitespace-nowrap">{formatDate(event.recorded_at)}</span>
                            },
                            {
                                key: 'value',
                                header: 'Value',
                                align: 'right',
                                render: (event) => {
                                    const isPrice = 'price' in event;
                                    return (
                                        <span className="font-mono text-sm font-bold text-gray-900">
                                            {isPrice ? formatCurrency(Number((event as PriceHistoryItem).price)) : (event as InventoryHistoryItem).stock}
                                        </span>
                                    )
                                }
                            }
                        ]}
                        isLoading={!history}
                        emptyMessage="No activity recorded yet"
                    />
                </div>
            </div>
        </Layout>
    );
}
