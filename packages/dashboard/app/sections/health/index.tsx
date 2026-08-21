"use client";
import HealthHeroes from './heroes';
import HealthGraphs from './graphs';
import HealthStats from './stats';
import { useMetrics } from "../../context/metrics.context";

export default function HealthPage() {
    const { data } = useMetrics();

    const { health } = data;

    return (
        <div className="p-6">
            <HealthHeroes data={health} />

            <HealthGraphs data={health} />

            <HealthStats data={health} />
        </div>
    );
}