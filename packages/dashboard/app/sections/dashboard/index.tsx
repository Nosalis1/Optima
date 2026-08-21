"use client";
import DashboardHeroes from './heroes';
import DashboardGraphs from './graphs';
import DashboardTables from './tables';
import { useMetrics } from "../../context/metrics.context";

export default function DashboardPage() {
    const { data } = useMetrics();

    const { dashboard } = data;

    return (
        <div className="p-6">
            <DashboardHeroes data={dashboard} />

            <DashboardGraphs data={dashboard} />

            <DashboardTables data={dashboard} />
        </div>
    );
}