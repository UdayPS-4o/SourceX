import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/layout/Layout';
import { getListings } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { BoxIcon, Search, Filter, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

type SortKey = 'productName' | 'currentPrice' | 'currentStock' | 'updatedAt';
type SortDir = 'asc' | 'desc';

export function Products() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'lowest' | 'notLowest'>('all');
    const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['listings', page],
        queryFn: () => getListings(page, 100) // Fetch more for client-side filtering
    });

    // Client-side filtering and sorting
    const filteredData = useMemo(() => {
        if (!data?.data) return [];

        let items = [...data.data];

        // Search filter
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(item =>
                item.productName?.toLowerCase().includes(q) ||
                item.productSku?.toLowerCase().includes(q)
            );
        }

        // Status filter
        if (statusFilter === 'lowest') {
            items = items.filter(item => item.cfb1);
        } else if (statusFilter === 'notLowest') {
            items = items.filter(item => !item.cfb1);
        }

        // Sorting
        items.sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];

            // Handle numeric values
            if (sortKey === 'currentPrice' || sortKey === 'currentStock') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            }

            // Handle dates
            if (sortKey === 'updatedAt') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return items;
    }, [data?.data, search, statusFilter, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) return null;
        return sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    };

    return (
        <Layout title="Products">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[calc(100vh-140px)]">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or SKU..."
                            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All</option>
                            <option value="lowest">Lowest Price</option>
                            <option value="notLowest">Not Lowest</option>
                        </select>
                    </div>

                    <div className="text-sm text-gray-500">
                        Showing {filteredData.length} of {data?.meta?.total || 0} products
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 border-b border-gray-200">
                                    <button onClick={() => handleSort('productName')} className="flex items-center gap-1 hover:text-gray-900">
                                        Product <SortIcon column="productName" />
                                    </button>
                                </th>
                                <th className="px-4 py-3 border-b border-gray-200">Platform</th>
                                <th className="px-4 py-3 border-b border-gray-200 text-right">
                                    <button onClick={() => handleSort('currentPrice')} className="flex items-center gap-1 hover:text-gray-900 ml-auto">
                                        Price <SortIcon column="currentPrice" />
                                    </button>
                                </th>
                                <th className="px-4 py-3 border-b border-gray-200 text-right">
                                    <button onClick={() => handleSort('currentStock')} className="flex items-center gap-1 hover:text-gray-900 ml-auto">
                                        Stock <SortIcon column="currentStock" />
                                    </button>
                                </th>
                                <th className="px-4 py-3 border-b border-gray-200">Status</th>
                                <th className="px-4 py-3 border-b border-gray-200">
                                    <button onClick={() => handleSort('updatedAt')} className="flex items-center gap-1 hover:text-gray-900">
                                        Last Update <SortIcon column="updatedAt" />
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={6} className="px-4 py-3">
                                            <div className="h-6 bg-gray-100 rounded animate-pulse w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                        No products found
                                    </td>
                                </tr>
                            ) : filteredData.map((item: any) => (
                                <tr
                                    key={item.id}
                                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/products/${item.id}`)}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {item.imgUrl ? (
                                                <img src={item.imgUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                                    <BoxIcon className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-900 line-clamp-1 max-w-[250px]" title={item.productName}>{item.productName}</p>
                                                <p className="text-xs text-gray-500 font-mono">{item.productSku}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                            {item.platform?.name || item.platformId}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                                        {item.currentPrice && Number(item.currentPrice) > 0
                                            ? formatCurrency(Number(item.currentPrice))
                                            : <span className="text-gray-400">-</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-600">
                                        {item.currentStock ?? '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.cfb1 ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                Lowest Price
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                                Not Lowest
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                        {formatDate(item.updatedAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Page {page} of {Math.ceil((data?.meta?.total || 1) / 100)}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            disabled={!data?.data || data.data.length < 100}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
