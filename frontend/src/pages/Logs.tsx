import { useEffect, useRef, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import clsx from 'clsx';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function LogsPage() {
    const [logType, setLogType] = useState<'sync' | 'monitor'>('monitor');
    const [logs, setLogs] = useState<string[]>([]);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLogs([]); // Clear on switch

        const eventSource = new EventSource(`${BASE_URL}/logs/${logType}`);

        eventSource.onmessage = (event) => {
            // Check if log is valid JSON or plain text? 
            // The backend sends plain text lines currently.
            setLogs(prev => {
                // Keep only last 1000 lines to prevent memory issues
                const newLogs = [...prev, event.data];
                if (newLogs.length > 1000) return newLogs.slice(-1000);
                return newLogs;
            });
        };

        eventSource.onerror = (_err) => {
            // console.error('SSE Error:', err);
            // Often just closing and letting user refresh or auto-reconnect (EventSource auto reconnects)
            // But we might want to just close if it's a fatal error

            // For "Connection refused" it will retry automatically.
        };

        return () => {
            eventSource.close();
        };
    }, [logType]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <Layout title="System Logs">
            <div className="flex flex-col h-[calc(100vh-12rem)]">
                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => setLogType('monitor')}
                        className={clsx(
                            "px-4 py-2 rounded-lg font-medium transition-colors",
                            logType === 'monitor'
                                ? "bg-blue-600 text-white"
                                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                        )}
                    >
                        Monitor Logs
                    </button>
                    <button
                        onClick={() => setLogType('sync')}
                        className={clsx(
                            "px-4 py-2 rounded-lg font-medium transition-colors",
                            logType === 'sync'
                                ? "bg-blue-600 text-white"
                                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                        )}
                    >
                        Sync Logs
                    </button>
                    <div className="ml-auto text-sm text-gray-500 self-center">
                        Auto-scrolling • Live
                    </div>
                </div>

                <div className="flex-1 bg-gray-950 rounded-lg p-4 overflow-auto font-mono text-sm shadow-inner border border-gray-800">
                    {logs.length === 0 && (
                        <div className="text-gray-500 italic">Waiting for logs...</div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className="text-gray-300 hover:bg-gray-900 px-2 py-0.5 whitespace-pre-wrap break-all">
                            {/* Attempt to highlight timestamps or keywords */}
                            {log}
                        </div>
                    ))}
                    <div ref={endRef} />
                </div>
            </div>
        </Layout>
    );
}
