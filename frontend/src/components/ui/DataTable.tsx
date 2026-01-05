
import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';


export type Column<T> = {
    key: string;
    header: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    render?: (item: T) => React.ReactNode;
    className?: string; // Additional class for the cell
};

export type PaginationProps = {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
};

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    isLoading?: boolean;
    onSort?: (key: string, direction: 'asc' | 'desc') => void;
    sortKey?: string;
    sortDir?: 'asc' | 'desc';
    pagination?: PaginationProps;
    search?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    filters?: React.ReactNode;
    onRowClick?: (item: T) => void;
    emptyMessage?: string;
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string; // Allow custom styling/height
}

export function DataTable<T extends { id?: string | number }>({
    data,
    columns,
    isLoading,
    onSort,
    sortKey,
    sortDir,
    pagination,
    search,
    onSearchChange,
    searchPlaceholder = "Search...",
    filters,
    onRowClick,
    emptyMessage = "No data found",
    title,
    subtitle,
    actions,
    className
}: DataTableProps<T>) {

    const handleSort = (key: string) => {
        if (!onSort) return;
        if (sortKey === key) {
            onSort(key, sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            onSort(key, 'desc'); // Default to desc for new sort
        }
    };

    return (
        <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden", className)}>
            {/* Header / Toolbar */}
            {(title || search !== undefined || filters || actions) && (
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                    {(title || subtitle) && (
                        <div className="flex-1">
                            {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
                            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1 justify-end">
                        {/* Search */}
                        {onSearchChange && (
                            <div className="relative w-full sm:w-64 md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                                />
                                {search && (
                                    <button
                                        onClick={() => onSearchChange('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Filters */}
                        {filters && (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                {filters}
                            </div>
                        )}

                        {/* Actions */}
                        {actions && (
                            <div className="flex items-center gap-2">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Table Content */}
            <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/80 backdrop-blur-sm shadow-sm sticky top-0 z-10 text-xs uppercase tracking-wider text-gray-500 font-medium">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={cn(
                                        "px-6 py-3 border-b border-gray-100 bg-gray-50/50 select-none",
                                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                                        col.width && `w-[${col.width}]`,
                                        col.sortable && "cursor-pointer hover:bg-gray-100/50 transition-colors group"
                                    )}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    <div className={cn(
                                        "flex items-center gap-1",
                                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                                    )}>
                                        {col.header}
                                        {col.sortable && sortKey === col.key && (
                                            <span className="text-gray-700 bg-gray-200/50 rounded p-0.5">
                                                {sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </span>
                                        )}
                                        {col.sortable && sortKey !== col.key && (
                                            <span className="opacity-0 group-hover:opacity-30 transition-opacity">
                                                <ChevronDown className="w-3 h-3" />
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {isLoading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {columns.map((_, j) => (
                                        <td key={j} className="px-6 py-4">
                                            <div className="h-5 bg-gray-100 rounded w-full max-w-[80%] mx-auto opacity-60"></div>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-16 text-center text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search className="w-8 h-8 opacity-20" />
                                        <p className="text-sm font-medium">{emptyMessage}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((item, i) => (
                                <tr
                                    key={item.id || i}
                                    onClick={() => onRowClick && onRowClick(item)}
                                    className={cn(
                                        "group transition-all duration-200",
                                        onRowClick ? "cursor-pointer hover:bg-blue-50/50 hover:shadow-sm" : "hover:bg-gray-50"
                                    )}
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={cn(
                                                "px-6 py-3 text-sm text-gray-600 border-b border-gray-50 group-last:border-none",
                                                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                                                col.className
                                            )}
                                        >
                                            {col.render ? col.render(item) : (item as any)[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && (
                <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-sm text-gray-500 font-medium">
                        Showing page <span className="text-gray-900">{pagination.currentPage}</span> of <span className="text-gray-900">{pagination.totalPages}</span>
                        {pagination.totalItems && (
                            <span className="ml-1 text-gray-400">({pagination.totalItems} items)</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={pagination.currentPage === 1}
                            onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-white hover:text-blue-600 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors shadow-sm bg-white text-gray-600"
                        >
                            <ChevronLeft className="w-4 h-4" /> Previous
                        </button>

                        <div className="hidden sm:flex items-center gap-1">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                                let p = i + 1;
                                // Simple logic to show current page surroundings
                                if (pagination.totalPages > 5) {
                                    if (pagination.currentPage > 3) {
                                        p = pagination.currentPage - 2 + i;
                                    }
                                    if (p > pagination.totalPages) {
                                        p = pagination.totalPages - (4 - i);
                                    }
                                }

                                return (
                                    <button
                                        key={p}
                                        onClick={() => pagination.onPageChange(p)}
                                        className={cn(
                                            "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all",
                                            p === pagination.currentPage
                                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                                : "text-gray-600 hover:bg-gray-100"
                                        )}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            disabled={pagination.currentPage >= pagination.totalPages}
                            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-white hover:text-blue-600 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors shadow-sm bg-white text-gray-600"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
