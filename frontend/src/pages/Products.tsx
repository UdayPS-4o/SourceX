import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/layout/Layout';
import { getListings } from '../lib/api';
// formatDate converts UTC to IST
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { BoxIcon, ChevronDown } from 'lucide-react';
import { type Column, DataTable } from '../components/ui/DataTable';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type SortKey = 'productName' | 'currentPrice' | 'currentStock' | 'updatedAt';
type SortDir = 'asc' | 'desc';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

export function Products() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'lowest' | 'notLowest'>('all');
    const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const navigate = useNavigate();

    // Debounce search to avoid too many API calls
    const debouncedSearch = useDebounce(search, 300);

    // Reset page when search/filter changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter]);

    const { data, isLoading } = useQuery({
        queryKey: ['listings', page, debouncedSearch, statusFilter],
        queryFn: () => getListings(page, 50, debouncedSearch, statusFilter)
    });

    // Client-side sorting only (server handles search/filter)
    const sortedData = useMemo(() => {
        if (!data?.data) return [];

        let items = [...data.data];

        items.sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];

            if (sortKey === 'currentPrice' || sortKey === 'currentStock') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            }

            if (sortKey === 'updatedAt') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return items;
    }, [data?.data, sortKey, sortDir]);



    const totalPages = Math.ceil((data?.meta?.total || 1) / 50);

    const columns: Column<any>[] = [
        {
            key: 'productName',
            header: 'Product',
            sortable: true,
            width: '40%',
            render: (item) => (
                <div className="flex items-center gap-3">
                    {item.imgUrl ? (
                        <div className="relative group/img">
                            <img
                                src={item.imgUrl}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200 transition-transform group-hover/img:scale-110 shadow-sm"
                            />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100">
                            <BoxIcon className="w-5 h-5" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-[250px] group-hover:text-blue-600 transition-colors" title={item.productName}>
                            {item.productName}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                {item.productSku} | #{item.id}
                            </span>
                            {item.size && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-semibold border border-indigo-100">
                                    {item.size}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            )
        },
        {
            key: 'platform',
            header: 'Platform',
            render: (item) => (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 uppercase tracking-wide border border-gray-200">
                    {item.platform?.name || item.platformId}
                </span>
            )
        },
        {
            key: 'currentPrice',
            header: 'Price',
            align: 'right',
            sortable: true,
            render: (item) => (
                <span className="font-semibold text-gray-900">
                    {item.currentPrice && Number(item.currentPrice) > 0
                        ? formatCurrency(Number(item.currentPrice))
                        : <span className="text-gray-300">-</span>
                    }
                </span>
            )
        },
        {
            key: 'currentStock',
            header: 'Stock',
            align: 'right',
            sortable: true,
            render: (item) => (
                <span className={cn(
                    "font-mono text-xs px-2 py-0.5 rounded border",
                    Number(item.currentStock) > 0
                        ? "bg-slate-50 text-slate-700 border-slate-200"
                        : "bg-red-50 text-red-700 border-red-200"
                )}>
                    {item.currentStock ?? '-'}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Price Check',
            align: 'center',
            render: (item) => item.cfb1 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Lowest Price
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 shadow-sm">
                    Not Lowest
                </span>
            )
        },
        {
            key: 'updatedAt',
            header: 'Last Update',
            sortable: true,
            align: 'right',
            render: (item) => (
                <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(item.updatedAt)}
                </span>
            )
        }
    ];

    const sortHandler = (key: string, dir: 'asc' | 'desc') => {
        setSortKey(key as SortKey);
        setSortDir(dir);
    };

    return (
        <Layout title="Products">
            <DataTable
                className="h-[calc(100vh-140px)]"
                data={sortedData}
                columns={columns}
                isLoading={isLoading}
                onSort={sortHandler}
                sortKey={sortKey}
                sortDir={sortDir}
                onRowClick={(item) => navigate(`/products/${item.id}`)}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search products by name or SKU..."
                pagination={{
                    currentPage: page,
                    totalPages: totalPages,
                    onPageChange: setPage,
                    totalItems: data?.meta?.total
                }}
                filters={
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-sm hover:border-gray-300 transition-colors"
                            >
                                <option value="all">All Status</option>
                                <option value="lowest">Lowest Price</option>
                                <option value="notLowest">Not Lowest</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                }
            />
        </Layout>
    );
}
