"use client";
import {
    ArchiveIcon,
    ChalkBoardIcon,
    FileChartBarIcon,
    LifeSaverIcon,
    PreferencesIcon
} from "@/app/components/shared/icons";
import { useGate } from "@/app/context/gate.context";

const Sidebar = () => {
    const {
        activeTab,

    } = useGate();

    const menuItems = [
        { name: "Dashboard", path: "/", icon: ChalkBoardIcon },
        { name: "Route Analytics", path: "/analytics", icon: FileChartBarIcon },
        { name: "System Health", path: "/health", icon: LifeSaverIcon },
        { name: "Sessions", path: "/sessions", icon: ArchiveIcon },
    ];

    const navigate = (path: string) => {
        window.location.hash = path;
    };

    return (
        <div className="w-11 h-full bg-background border-r border-accent relative">
            <div className="flex flex-col gap-4 items-center mt-4">
                {menuItems.map((item) => {
                    const isActive = activeTab === item.path;
                    return (
                        <div
                            key={item.path}
                            className={`w-7 h-7 flex items-center justify-center rounded-sm cursor-pointer transition-colors ${isActive ? 'bg-accent border-l-2 border-foreground' : ''
                                }`}
                            onClick={() => navigate(item.path)}
                        >
                            <item.icon
                                className="w-full h-full p-1"
                                color={isActive ? 'var(--color-background)' : 'var(--color-accent-soft)'}
                            />
                        </div>
                    );
                })}
            </div>

            {/* <PreferencesIcon className="absolute bottom-3 left-2.5 w-6 h-6 text-[var(--variant-6)] cursor-pointer" /> */}
        </div>
    );
}

export default Sidebar;