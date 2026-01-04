import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { getListingHistory } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { ArrowLeft, BoxIcon, TrendingUp, Package, Tag, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { api } from '../lib/api';

export function ProductDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Fetch product details
    const { data: listing, isLoading: loadingListing } = useQuery({
        queryKey: ['listing', id],
        queryFn: async () => {
            const res = await api.get(`/listings/${id}`);
            return res.data;
        },
        enabled: !!id
    });

    // Fetch history
    const { data: history, isLoading: loadingHistory } = useQuery({
        queryKey: ['listing-history', id],
        queryFn: () => getListingHistory(id!),
        enabled: !!id
    });

    const priceData = history?.price?.map((p: any) => ({
        date: new Date(p.recorded_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }),
        price: Number(p.price),
        fullDate: formatDate(p.recorded_at)
    })) || [];

    const inventoryData = history?.inventory?.map((i: any) => ({
        date: new Date(i.recorded_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }),
        stock: i.stock,
        type: i.change_type,
        fullDate: formatDate(i.recorded_at)
    })) || [];

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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
                <div className="flex items-start gap-6">
                    {listing?.imgUrl ? (
                        <img src={listing.imgUrl} alt="" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
                    ) : (
                        <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                            <BoxIcon className="w-10 h-10" />
                        </div>
                    )}
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-900 mb-1">{listing?.productName}</h1>
                        <p className="text-sm text-gray-500 font-mono mb-3">{listing?.productSku}</p>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-gray-400" />
                                <span className="text-lg font-bold text-gray-900">
                                    {listing?.currentPrice ? formatCurrency(Number(listing.currentPrice)) : '-'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">Stock: {listing?.currentStock ?? '-'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{listing?.updatedAt ? formatDate(listing.updatedAt) : '-'}</span>
                            </div>
                            {listing?.cfb1 ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                    Lowest Price
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                    Not Lowest
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Price History Chart */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Price History
                    </h3>
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
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    stroke="#9CA3AF"
                                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    formatter={(value: number) => [formatCurrency(value), 'Price']}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="price"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    fill="url(#priceGradient)"
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-purple-500" />
                        Inventory History
                    </h3>
                    {inventoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={inventoryData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                                <Tooltip
                                    formatter={(value: number, name: string) => [value, 'Stock']}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                />
                                <Line
                                    type="stepAfter"
                                    dataKey="stock"
                                    stroke="#8B5CF6"
                                    strokeWidth={2}
                                    dot={{ fill: '#8B5CF6', r: 4 }}
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                    {[...(history?.price || []), ...(history?.inventory || [])]
                        .sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
                        .slice(0, 20)
                        .map((event: any, i: number) => {
                            const isPrice = 'price' in event;
                            return (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isPrice ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                            }`}>
                                            {isPrice ? 'Price' : 'Stock'}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {formatDate(event.recorded_at)}
                                        </span>
                                    </div>
                                    <span className="font-mono text-sm font-medium text-gray-900">
                                        {isPrice ? formatCurrency(Number(event.price)) : event.stock}
                                    </span>
                                </div>
                            );
                        })}
                    {(!history?.price?.length && !history?.inventory?.length) && (
                        <div className="text-center text-gray-400 py-8">No activity recorded yet</div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
