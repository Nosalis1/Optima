"use client";

import AnalyticsGraphs from './graphs';
import AnalyticsHeroes from './heroes';
import AnalyticsTables from './tables';
import type { AnalyticsFilterSettings } from '@/app/context/metrics.context';
import { useMetrics } from "@/app/context/metrics.context";

export default function AnalyticsPage() {
    const { data } = useMetrics();

    const { analytics } = data;

    const analyticsFilterSettings: AnalyticsFilterSettings = {
        method: 'ALL',
        status: 'ALL'
    };

    const onAnalyticsFilterChange = (settings: Partial<AnalyticsFilterSettings>) => {
        // TODO:
        console.log('Filter settings changed:', settings);
    }

    return (
        <div className="p-6">
            <AnalyticsHeroes data={analytics} />

            <AnalyticsGraphs data={analytics} />

            <AnalyticsTables data={analytics} filters={analyticsFilterSettings} onFilterChange={onAnalyticsFilterChange} />
        </div>
    );
}