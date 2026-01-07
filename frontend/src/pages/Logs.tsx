import { useEffect, useRef, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import clsx from 'clsx';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type LogType = 'sync' | 'monitor';

interface ParsedLog {
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'cycle' | 'undercut' | 'price';
    message: string;
    raw: string;
}

function parseLogLine(line: string): ParsedLog {
    // Extract timestamp [2026-01-07T08:29:44.123Z]
    const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\]/);
    const timestamp = timestampMatch ? timestampMatch[1] : '';

    // Determine type based on emoji
    let type: ParsedLog['type'] = 'info';
    if (line.includes('✅')) type = 'success';
    else if (line.includes('⚠️')) type = 'warning';
    else if (line.includes('❌')) type = 'error';
    else if (line.includes('➤')) type = 'cycle';
    else if (line.includes('🔄')) type = 'undercut';
    else if (line.includes('💰')) type = 'price';

    // Clean up message
    const message = line
        .replace(/\[\d{4}-\d{2}-\d{2}T[\d:.]+Z?\]\s*/, '') // Remove timestamp
        .trim();

    return { timestamp, type, message, raw: line };
}

function formatTimestamp(iso: string): string {
    if (!iso) return '';
    try {
        const date = new Date(iso);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    } catch {
        return iso;
    }
}

const typeStyles: Record<ParsedLog['type'], { color: string; bgColor: string; label: string }> = {
    info: { color: 'text-blue-400', bgColor: 'bg-blue-500/10', label: 'INFO' },
    success: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', label: 'OK' },
    warning: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', label: 'WARN' },
    error: { color: 'text-red-400', bgColor: 'bg-red-500/10', label: 'ERR' },
    cycle: { color: 'text-purple-400', bgColor: 'bg-purple-500/10', label: 'CYCLE' },
    undercut: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', label: 'AUTO' },
    price: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', label: 'PRICE' }
};

export function LogsPage() {
    const [logType, setLogType] = useState<LogType>('monitor');
    const [logs, setLogs] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [uptime, setUptime] = useState<string>('');
    const [nextUndercut, setNextUndercut] = useState<string>('');

    // Track the start time based on the first log entry
    const startTimeRef = useRef<number | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLogs([]); // Clear on switch
        setIsConnected(false);
        startTimeRef.current = null;
        setUptime('');

        const eventSource = new EventSource(`${BASE_URL}/logs/${logType}`);

        eventSource.onopen = () => {
            setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
            setLogs(prev => {
                const newLogs = [...prev, event.data];

                // Try to set start time from first log if not set
                if (!startTimeRef.current && prev.length === 0) {
                    const parsed = parseLogLine(event.data);
                    if (parsed.timestamp) {
                        startTimeRef.current = new Date(parsed.timestamp).getTime();
                    }
                }

                // Keep only last 500 lines to prevent memory issues
                if (newLogs.length > 500) return newLogs.slice(-500);
                return newLogs;
            });
        };

        eventSource.onerror = () => {
            setIsConnected(false);
        };

        return () => {
            eventSource.close();
        };
    }, [logType]);

    // Uptime and Countdown ticker
    useEffect(() => {
        const interval = setInterval(() => {
            if (startTimeRef.current) {
                const now = Date.now();
                const diff = now - startTimeRef.current;

                // Uptime Calculation
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                const hoursStr = hours > 0 ? `${hours}h ` : '';
                setUptime(`${hoursStr}${minutes}m ${seconds}s`);

                // Next Undercut Calculation
                // Rule: First at 1 min (60000ms), then every 5 mins (300000ms)
                const FIRST_RUN_MS = 60000;
                const INTERVAL_MS = 300000;
                let msLeft = 0;

                if (diff < FIRST_RUN_MS) {
                    msLeft = FIRST_RUN_MS - diff;
                } else {
                    const timePastFirst = diff - FIRST_RUN_MS;
                    const nextIntervalDetails = Math.ceil(timePastFirst / INTERVAL_MS) * INTERVAL_MS;
                    msLeft = nextIntervalDetails - timePastFirst;
                }

                // Format countdown
                if (msLeft <= 0) {
                    setNextUndercut('Running now...');
                } else {
                    const m = Math.floor(msLeft / 60000);
                    const s = Math.floor((msLeft % 60000) / 1000);
                    setNextUndercut(`${m}m ${s}s`);
                }
            } else {
                setUptime('');
                setNextUndercut('');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (autoScroll) {
            endRef.current?.scrollIntoView({ behavior: 'auto' });
        }
    }, [logs, autoScroll]);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        // If user scrolls up, disable auto-scroll
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        setAutoScroll(isAtBottom);
    };

    const clearLogs = () => {
        setLogs([]);
        startTimeRef.current = null;
        setNextUndercut('');
    };

    return (
        <Layout title="System Logs">
            <div className="flex flex-col h-[calc(100vh-12rem)]">
                {/* Header Controls */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    {/* Tab Buttons */}
                    <div className="flex bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => setLogType('monitor')}
                            className={clsx(
                                "px-4 py-2 rounded-md font-medium text-sm transition-all duration-200",
                                logType === 'monitor'
                                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                            )}
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Monitor
                            </span>
                        </button>
                        <button
                            onClick={() => setLogType('sync')}
                            className={clsx(
                                "px-4 py-2 rounded-md font-medium text-sm transition-all duration-200",
                                logType === 'sync'
                                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                            )}
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Sync History
                            </span>
                        </button>
                    </div>

                    {/* Status & Controls */}
                    <div className="flex items-center gap-4 ml-auto">
                        {/* Uptime Display */}
                        {uptime && (
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700/50">
                                <span className="text-xs text-blue-400 font-mono">⏱️ Uptime:</span>
                                <span className="text-xs text-gray-200 font-mono font-medium min-w-[5rem]">
                                    {uptime}
                                </span>
                            </div>
                        )}



                        {/* Connection Status */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700/50">
                            <span className={clsx(
                                "w-2 h-2 rounded-full animate-pulse",
                                isConnected ? "bg-emerald-400" : "bg-red-400"
                            )} />
                            <span className="text-xs text-gray-400 font-medium">
                                {isConnected ? 'Live' : 'Offline'}
                            </span>
                        </div>

                        {/* Auto-scroll toggle */}
                        <button
                            onClick={() => setAutoScroll(!autoScroll)}
                            className={clsx(
                                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                                autoScroll
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                    : "bg-gray-800 text-gray-400 border-gray-700 hover:text-white"
                            )}
                        >
                            {autoScroll ? '📍 Auto' : '📍 Manual'}
                        </button>

                        {/* Clear Button */}
                        <button
                            onClick={clearLogs}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 border border-gray-700 transition-all"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Terminal Window */}
                <div className="flex-1 bg-gray-950 rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
                    {/* Terminal Header */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <span className="text-xs text-gray-500 ml-2 font-mono">
                            {logType === 'monitor' ? 'monitor.log' : 'sync.log'} — SourceX Bot
                        </span>
                    </div>

                    {/* Log Content */}
                    <div
                        ref={containerRef}
                        onScroll={handleScroll}
                        className="h-full overflow-auto p-4 font-mono text-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                        style={{ maxHeight: 'calc(100% - 40px)' }}
                    >
                        {logs.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="text-lg font-medium">Waiting for logs...</p>
                                <p className="text-sm mt-1 opacity-60">
                                    {logType === 'monitor'
                                        ? 'Start the monitor with: npm run monitor'
                                        : 'Logs will appear when sync jobs run'}
                                </p>
                            </div>
                        )}

                        {logs.map((log, i) => {
                            const parsed = parseLogLine(log);
                            const style = typeStyles[parsed.type];

                            return (
                                <div
                                    key={i}
                                    className={clsx(
                                        "flex items-start gap-3 py-1.5 px-2 -mx-2 rounded transition-colors",
                                        "hover:bg-white/5"
                                    )}
                                >
                                    {/* Timestamp */}
                                    <span className="text-gray-600 shrink-0 text-xs mt-0.5">
                                        {formatTimestamp(parsed.timestamp)}
                                    </span>

                                    {/* Type Badge */}
                                    <span className={clsx(
                                        "shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                                        style.color,
                                        style.bgColor
                                    )}>
                                        {style.label}
                                    </span>

                                    {/* Message */}
                                    <span className={clsx(
                                        "flex-1 break-all",
                                        parsed.type === 'error' ? 'text-red-300' :
                                            parsed.type === 'success' ? 'text-emerald-300' :
                                                parsed.type === 'warning' ? 'text-amber-300' :
                                                    parsed.type === 'price' ? 'text-yellow-300' :
                                                        'text-gray-300'
                                    )}>
                                        {parsed.message}
                                    </span>
                                </div>
                            );
                        })}
                        <div ref={endRef} />
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    {Object.entries(typeStyles).map(([key, style]) => (
                        <div key={key} className="flex items-center gap-1.5">
                            <span className={clsx("w-2 h-2 rounded-sm", style.bgColor, style.color.replace('text-', 'bg-').replace('-400', '-500'))} />
                            <span className="text-gray-500">{style.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}
