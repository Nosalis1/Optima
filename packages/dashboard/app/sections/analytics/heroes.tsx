import { type AnalyticsData } from '@/app/domain';
import { Hero, HeroHeader } from '../../components/cards/hero';

type Props = {
    data: AnalyticsData;
};

export default function AnalyticsHeroes({ data }: Props) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Hero>
                <HeroHeader
                    title="Total Endpoints"
                    value={data.summary.totalEndpoints}
                    tooltip="The total number of unique API endpoints that have been accessed by clients."
                />
            </Hero>

            <Hero>
                <HeroHeader
                    title="Healthy Endpoints"
                    value={data.summary.healthyEndpoints}
                    color="var(--chart-3)"
                    tooltip="The number of API endpoints that are currently healthy and responding successfully to client requests."
                />
            </Hero>

            <Hero>
                <HeroHeader
                    title={`Slow Endpoints (>${data.summary.slowEndpointsThreshold}ms)`}
                    value={data.summary.slowEndpoints}
                    color="var(--chart-4)"
                    tooltip={`The number of API endpoints that have an average response time exceeding ${data.summary.slowEndpointsThreshold} milliseconds.`}
                />
            </Hero>

            <Hero>
                <HeroHeader
                    title="High Error Rate"
                    value={data.summary.errorEndpoints}
                    color="var(--chart-5)"
                    tooltip="The number of API endpoints that are currently experiencing a high error rate, indicating potential issues with the server or application."
                />
            </Hero>
        </div>
    );
}