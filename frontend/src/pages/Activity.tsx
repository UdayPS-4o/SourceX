import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/layout/Layout';
import { getLogs } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { Box, BoxIcon, Tag, Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useState, useMemo } from 'react';

type SortKey = 'recorded_at' | 'product_name' | 'value';
type SortDir = 'asc' | 'desc';

export function ActivityPage() {
    const [limit, setLimit] = useState(100);
    const [search, setSearch] = useState('');
    const [eventFilter, setEventFilter] = useState<'all' | 'price' | 'inventory'>('all');
    const [sortKey, setSortKey] = useState<SortKey>('recorded_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const { data: logs, isLoading } = useQuery({
        queryKey: ['logs', limit],
        queryFn: () => getLogs(limit)
    });

    // Client-side filtering and sorting
    const filteredLogs = useMemo(() => {
        if (!logs) return [];

        let items = [...logs];

        // Search filter
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(log =>
                log.product_name?.toLowerCase().includes(q) ||
                log.product_sku?.toLowerCase().includes(q) ||
                log.platform_name?.toLowerCase().includes(q)
            );
        }

        // Event type filter
        if (eventFilter === 'price') {
            items = items.filter(log => log.type === 'price');
        } else if (eventFilter === 'inventory') {
            items = items.filter(log => log.type === 'inventory');
        }

        // Sorting
        items.sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];

            if (sortKey === 'value') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            }

            if (sortKey === 'recorded_at') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return items;
    }, [logs, search, eventFilter, sortKey, sortDir]);

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
        <Layout title="Activity Log">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center gap-4 flex-wrap bg-gray-50">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search products..."
                            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Event:</span>
                            <select
                                value={eventFilter}
                                onChange={(e) => setEventFilter(e.target.value as any)}
                                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Events</option>
                                <option value="price">Price Changes</option>
                                <option value="inventory">Stock Updates</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Show:</span>
                            <select
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className="text-sm border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={50}>Last 50</option>
                                <option value={100}>Last 100</option>
                                <option value={500}>Last 500</option>
                            </select>
                        </div>
                    </div>

                    <div className="text-sm text-gray-500">
                        {filteredLogs.length} events
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-auto max-h-[calc(100vh-220px)]">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 border-b border-gray-200">
                                    <button onClick={() => handleSort('recorded_at')} className="flex items-center gap-1 hover:text-gray-900">
                                        Time <SortIcon column="recorded_at" />
                                    </button>
                                </th>
                                <th className="px-6 py-4 border-b border-gray-200">Platform</th>
                                <th className="px-6 py-4 border-b border-gray-200">
                                    <button onClick={() => handleSort('product_name')} className="flex items-center gap-1 hover:text-gray-900">
                                        Product <SortIcon column="product_name" />
                                    </button>
                                </th>
                                <th className="px-6 py-4 border-b border-gray-200">Event</th>
                                <th className="px-6 py-4 border-b border-gray-200 text-right">
                                    <button onClick={() => handleSort('value')} className="flex items-center gap-1 hover:text-gray-900 ml-auto">
                                        Details <SortIcon column="value" />
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-6 bg-gray-100 rounded animate-pulse w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No activity logs found
                                    </td>
                                </tr>
                            ) : filteredLogs.map((log: any, i: number) => {
                                const isPrice = log.type === 'price';
                                const valueFormatted = isPrice ? formatCurrency(Number(log.value)) : log.value;
                                const oldValueFormatted = log.old_value ? (isPrice ? formatCurrency(Number(log.old_value)) : log.old_value) : null;

                                return (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {formatDate(log.recorded_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                {log.platform_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {log.img_url ? (
                                                    <img src={log.img_url} alt="" className="w-8 h-8 rounded object-cover border border-gray-200" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                                                        <BoxIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900 line-clamp-1 max-w-[300px]" title={log.product_name}>{log.product_name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{log.product_sku}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                isPrice ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-purple-50 text-purple-700 border-purple-100"
                                            )}>
                                                {isPrice ? <Tag className="w-3 h-3" /> : <Box className="w-3 h-3" />}
                                                {isPrice ? "Price Change" : "Stock Update"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 font-mono text-sm">
                                                {oldValueFormatted && (
                                                    <>
                                                        <span className="text-gray-400 line-through">{oldValueFormatted}</span>
                                                        <span className="text-gray-400">→</span>
                                                    </>
                                                )}
                                                <span className="font-bold text-gray-900">
                                                    {valueFormatted}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}
