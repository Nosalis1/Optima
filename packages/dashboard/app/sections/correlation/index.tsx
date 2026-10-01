"use client";
import { useMetrics } from "../../context/metrics.context";
import { Assessment } from "./assessment";
import { Results } from "./results";
import React from "react";
import { Detailed } from "./detailed";

export default function CorrelationPage() {
    const [selected, setSelected] = React.useState<string | null>(null);

    const { data } = useMetrics();

    const { correlation } = data;

    const selectedResult = correlation.results.find((r) => r.id === selected) ?? correlation.results[0] ?? null;

    return (
        <div className="p-6 space-y-4">
            <Assessment assessment={correlation.assessment} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
                <div className="lg:col-span-3">
                    <Results results={correlation.results} selectedId={selectedResult?.id ?? null} onSelect={setSelected} />
                </div>
                <div className="lg:col-span-2">
                    <Detailed result={selectedResult} />
                </div>
            </div>
        </div>
    );
}
