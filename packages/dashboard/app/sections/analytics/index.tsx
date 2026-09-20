"use client";

import AnalyticsGraphs from './graphs';
import AnalyticsHeroes from './heroes';
import AnalyticsTables from './tables';
import { useMetrics } from "@/app/context/metrics.context";

export default function AnalyticsPage() {
    const {
        data,
        analyticsFilterSettings,
        updateAnalyticsFilters
    } = useMetrics();

    const { analytics } = data;

    return (
        <div className="p-6">
            <AnalyticsHeroes data={analytics} />

            <AnalyticsGraphs data={analytics} />

            <AnalyticsTables data={analytics} filters={analyticsFilterSettings} onFilterChange={updateAnalyticsFilters} />
        </div>
    );
}