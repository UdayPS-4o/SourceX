import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/layout/Layout';
// formatDate converts UTC to IST
import { getStats, getLogs } from '../lib/api';
import { Box, Server, AlertTriangle, Tag, BoxIcon, TrendingDown, DollarSign } from 'lucide-react';
import clsx from 'clsx';
import { formatDate, formatCurrency, cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { type Column, DataTable } from '../components/ui/DataTable';

function StatsCard({ title, value, icon: Icon, color }: any) {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={clsx("p-3 rounded-lg", color)}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );
}

export function Dashboard() {
    const navigate = useNavigate();
    const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats });
    const { data: logs } = useQuery({ queryKey: ['logs'], queryFn: () => getLogs(15) });

    const columns: Column<any>[] = [
        {
            key: 'recorded_at',
            header: 'Time',
            render: (log) => <span className="text-gray-500 whitespace-nowrap font-medium">{formatDate(log.recorded_at)}</span>
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
                        <p className="font-medium text-gray-900 truncate max-w-[200px] group-hover:text-blue-600 transition-colors" title={log.product_name}>
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

    return (
        <Layout title="Overview">
            <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatsCard
                        title="Total Products"
                        value={stats?.total_products || 0}
                        icon={Box}
                        color="bg-blue-500"
                    />
                    <StatsCard
                        title="Active Platforms"
                        value={stats?.active_platforms || 0}
                        icon={Server}
                        color="bg-purple-500"
                    />
                    <StatsCard
                        title="Lowest Price Items"
                        value={stats?.low_price_alerts || 0}
                        icon={AlertTriangle}
                        color="bg-green-500"
                    />
                </div>

                {/* Recent Activity Logs - Full Width */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <DataTable
                        title="Recent Activity"
                        actions={
                            <button
                                onClick={() => navigate('/activity')}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                View All
                            </button>
                        }
                        data={logs || []}
                        columns={columns}
                        onRowClick={(log) => log.listing_id && navigate(`/products/${log.listing_id}`)}
                        isLoading={!logs}
                        emptyMessage="No recent activity"
                    />
                </div>
            </div>
        </Layout>
    );
}
