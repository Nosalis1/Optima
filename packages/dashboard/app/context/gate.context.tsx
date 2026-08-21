"use client";
import React from 'react';
import Loading from '../components/utility/loading';

const GateContext = React.createContext<{
    activeTab: string;
    displayLoadingGate: (text?: string) => void;
    clearLoadingGate: () => void;
} | null>(null);

export function GateProvider({
    children
}: { children: React.ReactNode }) {
    const [activeTab, setActiveTab] = React.useState<string>('/');
    const [isLoading, setIsLoading] = React.useState(false);
    const [loadingText, setLoadingText] = React.useState("Loading...");

    React.useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace("#", "") || "/";
            setActiveTab(hash);
        };

        handleHashChange();
        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    function displayLoadingGate(text?: string) {
        setLoadingText(text || "Loading...");
        setIsLoading(true);
    }

    function clearLoadingGate() {
        setIsLoading(false);
        setLoadingText("Loading...");
    }

    return (
        <GateContext.Provider value={{
            activeTab,
            displayLoadingGate,
            clearLoadingGate
        }}>
            <html lang="sr">
                <body className="flex min-h-screen text-brand-50 antialiased">
                    {
                        (isLoading)
                            ? <Loading text={loadingText} />
                            : children
                    }
                </body>
            </html>
        </GateContext.Provider>
    );
}

export function useGate() {
    const context = React.useContext(GateContext);
    if (!context) {
        throw new Error('useGate must be used within a GateProvider');
    }
    return context;
}