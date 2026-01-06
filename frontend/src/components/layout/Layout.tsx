import { type ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
    title?: string;
}

export function Layout({ children, title }: LayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Desktop Sidebar */}
            <Sidebar className="hidden md:flex" />

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <Sidebar
                        className="absolute inset-y-0 left-0 shadow-lg"
                        onClose={() => setIsMobileMenuOpen(false)}
                    />
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden w-full">
                <header className="bg-white border-b border-gray-200 px-4 py-3 md:px-8 md:py-4 flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    {title && (
                        <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">
                            {title}
                        </h1>
                    )}
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
