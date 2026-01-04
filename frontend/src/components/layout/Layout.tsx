import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
    children: ReactNode;
    title?: string;
}

export function Layout({ children, title }: LayoutProps) {
    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                {title && (
                    <header className="bg-white border-b border-gray-200 px-8 py-4">
                        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                    </header>
                )}
                <main className="flex-1 overflow-auto p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
