"use client";
import { MoonIcon, SettingsIcon, SunIcon } from "@/app/components/shared/icons";
import OptimaGaugeIcon from "@/app/components/shared/optima";
import { useMetrics, type MetricsData } from "../../context/metrics.context";
import { useConnection } from "../../context/connection.context";
import {
    evaluateColorStatus,
} from '../utility/color';
import { useTheme } from "@/app/context/theme.context";

function HeaderSeparator({ className = "" }: { className?: string }) {
    return (
        <div className={`w-[1px] h-4 bg-border mx-1 sm:mx-2 shrink-0 ${className}`} />
    );
}

function HeaderLogo() {
    return (
        <div className="flex items-center gap-1.5 shrink-0">
            <OptimaGaugeIcon className="w-5 h-5" color='var(--variant-4)' />
            <h1 className="text-base sm:text-lg font-bold text-accent">Optima</h1>
        </div>
    );
}

function HeaderSystemStatus({ data }: { data: MetricsData['systemStatus'] }) {
    const status = `${data.connectionStatus} / ${data.healthStatus}`;
    const statusColor = evaluateColorStatus(
        data.healthStatus === 'HEALTHY' ? 0 : data.healthStatus === 'DEGRADED' ? 0.5 : 1
    );
    return (
        <p className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{ color: statusColor }}>
            {status}
        </p>
    );
}

function WebSocketStatus({ connected }: { connected: boolean }) {
    return (
        <div className="flex items-center gap-1.5 shrink-0">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-[#10B981] animate-pulse" : "bg-[#EF4444]"}`}></span>
            <p className="text-xs sm:text-sm whitespace-nowrap">
                WS <span className="hidden xs:inline">{connected ? 'Connected' : 'Disconnected'}</span>
            </p>
        </div>
    );
}

function SystemInfo({ data }: { data: MetricsData['systemInfo'] }) {
    const { nodeVersion, uptime, env } = data;

    const formatUptime = (ms: number) => {
        const days = Math.floor(ms / (24 * 3600 * 1000));
        const hours = Math.floor((ms % (24 * 3600 * 1000)) / (3600 * 1000));
        const minutes = Math.floor((ms % (3600 * 1000)) / (60 * 1000));
        const seconds = Math.floor((ms % (60 * 1000)) / 1000);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    };

    return (
        <div className="hidden lg:flex items-center gap-2 text-xs sm:text-sm shrink-0">
            <p className="text-[#9CA3AF]">node <span className="text-foreground">{nodeVersion}</span></p>
            <HeaderSeparator />
            <p className="text-[#9CA3AF]">uptime <span className="text-foreground">{formatUptime(uptime)}</span></p>
            <HeaderSeparator />
            <p className="text-[#9CA3AF]">env <span className="text-foreground">{env}</span></p>
        </div>
    );
}

const ConfigurationButton = () => {
    const navigate = () => {
        window.location.hash = '/configuration';
    };

    return (
        <button
            type="button"
            aria-label="Settings"
            className="p-1 hover:bg-accent/10 rounded-lg transition-colors shrink-0"
            onClick={navigate}
        >
            <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#9CA3AF] cursor-pointer" />
        </button>
    );
}

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            aria-label="Toggle Theme"
            className="p-1 hover:bg-accent/10 rounded-lg transition-colors shrink-0"
            onClick={toggleTheme}
        >
            {theme === 'dark' ? (
                <SunIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#9CA3AF] cursor-pointer" />
            ) : (
                <MoonIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#9CA3AF] cursor-pointer" />
            )}
        </button>
    )
}

const Header = () => {
    const { isConnected } = useConnection();
    const { data } = useMetrics();

    const {
        systemStatus,
        systemInfo,
    } = data;

    return (
        <header className="w-full bg-background border-b border-accent sm:px-4">
            <div className="flex items-center justify-between gap-2 mx-auto">
                <div className="flex items-center gap-2 shrink-0">
                    <HeaderLogo />
                    <HeaderSeparator />
                    <HeaderSystemStatus data={systemStatus} />
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <WebSocketStatus connected={isConnected} />

                    <HeaderSeparator className="hidden lg:block" />
                    <SystemInfo data={systemInfo} />

                    <HeaderSeparator />
                    <ConfigurationButton />
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}

export default Header;