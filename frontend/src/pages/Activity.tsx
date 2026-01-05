import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/layout/Layout';
import { getLogs } from '../lib/api';
// formatDate converts UTC to IST
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Box, BoxIcon, Tag, TrendingDown, DollarSign, ChevronDown } from 'lucide-react';
import { type Column, DataTable } from '../components/ui/DataTable';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

type SortKey = 'recorded_at' | 'product_name' | 'value';
type SortDir = 'asc' | 'desc';

export function ActivityPage() {
    const [limit, setLimit] = useState(100);
    const [search, setSearch] = useState('');
    const [eventFilter, setEventFilter] = useState<'all' | 'price' | 'inventory' | 'isLowest' | 'payout'>('all');
    const [sortKey, setSortKey] = useState<SortKey>('recorded_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const navigate = useNavigate();

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
        if (eventFilter === 'all') {
            // Hide isLowest changes by default as per user request
            items = items.filter(log => log.type !== 'isLowest');
        } else if (eventFilter === 'price') {
            items = items.filter(log => log.type === 'price');
        } else if (eventFilter === 'inventory') {
            items = items.filter(log => log.type === 'inventory');
        } else if (eventFilter === 'isLowest') {
            items = items.filter(log => log.type === 'isLowest');
        } else if (eventFilter === 'payout') {
            items = items.filter(log => log.type === 'payout');
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



    const columns: Column<any>[] = [
        {
            key: 'recorded_at',
            header: 'Time',
            sortable: true,
            render: (log) => <span className="text-gray-500 font-medium whitespace-nowrap">{formatDate(log.recorded_at)}</span>
        },
        {
            key: 'platform_name',
            header: 'Platform',
            render: (log) => (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 uppercase tracking-wide border border-slate-200">
                    {log.platform_name}
                </span>
            )
        },
        {
            key: 'product_name',
            header: 'Product',
            sortable: true,
            width: '35%',
            render: (log) => (
                <div className="flex items-center gap-3">
                    {log.img_url ? (
                        <div className="relative group/img">
                            <img src={log.img_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-200 transition-transform group-hover/img:scale-110 shadow-sm" />
                        </div>
                    ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100">
                            <BoxIcon className="w-4 h-4" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-[300px] group-hover:text-blue-600 transition-colors" title={log.product_name}>
                            {log.product_name}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                            <span>{log.product_sku}</span>
                            {log.size && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-semibold border border-indigo-100">
                                    {log.size}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            )
        },
        {
            key: 'type',
            header: 'Event',
            render: (log) => {
                const isPrice = log.type === 'price';
                const isInventory = log.type === 'inventory';
                const isPayoutChange = log.type === 'payout';
                const isLowestChange = log.type === 'isLowest';

                let badgeStyle = "bg-gray-50 text-gray-700 border-gray-100";
                let label = "Custom Event";
                let Icon = Box;

                if (isPrice) {
                    badgeStyle = "bg-amber-50 text-amber-700 border-amber-100";
                    label = "Price Change";
                    Icon = Tag;
                } else if (isInventory) {
                    badgeStyle = "bg-purple-50 text-purple-700 border-purple-100";
                    label = "Stock Update";
                    Icon = Box;
                } else if (isLowestChange) {
                    badgeStyle = log.value === 'true' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100";
                    label = "isLowest Change";
                    Icon = TrendingDown;
                } else if (isPayoutChange) {
                    badgeStyle = "bg-blue-50 text-blue-700 border-blue-100";
                    label = "Payout Change";
                    Icon = DollarSign;
                }

                return (
                    <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm",
                        badgeStyle
                    )}>
                        <Icon className="w-3 h-3" />
                        {label}
                    </span>
                );
            }
        },
        {
            key: 'value',
            header: 'Details',
            align: 'right',
            sortable: true,
            render: (log) => {
                const isPrice = log.type === 'price';
                const isPayoutChange = log.type === 'payout';
                const isLowestChange = log.type === 'isLowest';

                let valueFormatted = log.value;
                let oldValueFormatted = log.old_value;

                if (isPrice || isPayoutChange) {
                    valueFormatted = formatCurrency(Number(log.value));
                    oldValueFormatted = log.old_value ? formatCurrency(Number(log.old_value)) : null;
                } else if (isLowestChange) {
                    valueFormatted = log.value === 'true' ? '✓ Lowest' : '✗ Not Lowest';
                    oldValueFormatted = log.old_value === 'true' ? '✓ Lowest' : '✗ Not Lowest';
                }

                return (
                    <div className="flex items-center justify-end gap-2 font-mono text-sm">
                        {oldValueFormatted && (
                            <>
                                <span className="text-gray-400 line-through text-xs decoration-gray-300">{oldValueFormatted}</span>
                                <span className="text-gray-300">→</span>
                            </>
                        )}
                        <span className={cn(
                            "font-bold",
                            isLowestChange && log.value === 'true' ? "text-green-600" :
                                isLowestChange && log.value === 'false' ? "text-red-600" :
                                    "text-gray-900"
                        )}>
                            {valueFormatted}
                        </span>
                    </div>
                )
            }
        }
    ];

    // Sort logic (unchanged)


    return (
        <Layout title="Activity Log">
            <DataTable
                className="h-[calc(100vh-140px)]"
                data={filteredLogs}
                columns={columns}
                isLoading={isLoading}
                onSort={(key) => handleSort(key as SortKey)}
                sortKey={sortKey}
                sortDir={sortDir}
                search={search}
                onSearchChange={setSearch}
                onRowClick={(log) => log.listing_id && navigate(`/products/${log.listing_id}`)}
                searchPlaceholder="Search product by name, SKU or platform..."
                filters={
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select
                                value={eventFilter}
                                onChange={(e) => setEventFilter(e.target.value as any)}
                                className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-sm hover:border-gray-300 transition-colors"
                            >
                                <option value="all">All Events</option>
                                <option value="price">Price Changes</option>
                                <option value="inventory">Stock Updates</option>
                                <option value="isLowest">isLowest Changes</option>
                                <option value="payout">Payout Changes</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-sm hover:border-gray-300 transition-colors"
                            >
                                <option value={50}>Last 50</option>
                                <option value={100}>Last 100</option>
                                <option value={500}>Last 500</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                }
                subtitle={`${filteredLogs.length} events logged`}
            />
        </Layout>
    );
}
