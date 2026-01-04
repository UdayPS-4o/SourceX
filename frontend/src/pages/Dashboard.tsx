import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/layout/Layout';
import { getStats, getPlatforms, getLogs } from '../lib/api';
import { Activity, Box, Database, Server, AlertTriangle, ArrowUpRight, ArrowDownRight, Tag, BoxIcon } from 'lucide-react';
import clsx from 'clsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate, formatCurrency } from '../lib/utils';

function StatsCard({ title, value, icon: Icon, color, trend }: any) {
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
            {trend && (
                <div className="mt-4 flex items-center gap-1 text-sm">
                    {trend > 0 ? <ArrowUpRight className="w-4 h-4 text-green-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                    <span className={trend > 0 ? "text-green-600" : "text-red-600"}>{Math.abs(trend)}%</span>
                    <span className="text-gray-500">vs last week</span>
                </div>
            )}
        </div>
    );
}

export function Dashboard() {
    const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats });
    const { data: platforms } = useQuery({ queryKey: ['platforms'], queryFn: getPlatforms });
    const { data: logs } = useQuery({ queryKey: ['logs'], queryFn: () => getLogs(10) });

    // Mock data for chart for now until we have real history integration in dashboard
    const chartData = [
        { name: 'Mon', value: 400 },
        { name: 'Tue', value: 300 },
        { name: 'Wed', value: 550 },
        { name: 'Thu', value: 500 },
        { name: 'Fri', value: 700 },
        { name: 'Sat', value: 600 },
        { name: 'Sun', value: 800 },
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
                        trend={12}
                    />
                    <StatsCard
                        title="Active Platforms"
                        value={stats?.active_platforms || 0}
                        icon={Server}
                        color="bg-purple-500"
                    />
                    <StatsCard
                        title="Low Price Alerts"
                        value={stats?.low_price_alerts || 0}
                        icon={AlertTriangle}
                        color="bg-orange-500" // Changed to orange for better visibility
                        trend={-5}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Chart Section */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Price Activity</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Platforms Status */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Status</h3>
                        <div className="space-y-4">
                            {platforms?.map((p: any) => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("w-2 h-2 rounded-full", p.sync_status === 'running' ? "bg-green-500 animate-pulse" : p.sync_status === 'failed' ? "bg-red-500" : "bg-gray-400")} />
                                        <span className="font-medium text-gray-900">{p.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {p.last_sync_end ? new Date(p.last_sync_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                    </span>
                                </div>
                            )) || <p className="text-gray-500">No platforms found</p>}
                        </div>
                    </div>
                </div>

                {/* Recent Activity Logs */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Activity Logs</h3>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-700 font-medium">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Time</th>
                                    <th className="px-4 py-3">Platform</th>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3">Event</th>
                                    <th className="px-4 py-3 rounded-r-lg text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs?.map((log: any, i: number) => {
                                    const isPrice = log.type === 'price';
                                    const valueFormatted = isPrice ? formatCurrency(log.value) : log.value;
                                    const oldValueFormatted = log.old_value ? (isPrice ? formatCurrency(log.old_value) : log.old_value) : null;

                                    return (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                {formatDate(log.recorded_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                    {log.platform_name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {log.img_url ? (
                                                        <img src={log.img_url} alt="" className="w-8 h-8 rounded object-cover border border-gray-200" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                                                            <BoxIcon className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-gray-900 line-clamp-1 max-w-[200px]" title={log.product_name}>{log.product_name}</p>
                                                        <p className="text-xs text-gray-500 font-mono">{log.product_sku}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={clsx(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                    isPrice ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-purple-50 text-purple-700 border-purple-100"
                                                )}>
                                                    {isPrice ? <Tag className="w-3 h-3" /> : <Box className="w-3 h-3" />}
                                                    {isPrice ? "Price Change" : "Stock Update"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2 font-mono text-sm">
                                                    {oldValueFormatted && (
                                                        <>
                                                            <span className="text-gray-400 line-through">{oldValueFormatted}</span>
                                                            <span className="text-gray-400">→</span>
                                                        </>
                                                    )}
                                                    <span className={clsx("font-bold", isPrice ? "text-gray-900" : "text-gray-900")}>
                                                        {valueFormatted}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {!logs?.length && <div className="p-8 text-center text-gray-500">No recent activity</div>}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
