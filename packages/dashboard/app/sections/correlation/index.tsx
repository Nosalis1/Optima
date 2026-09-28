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

    return (
        <div className="p-6 space-y-2">
            <Assessment assessment={correlation.assessment} />

            <Results results={correlation.results} onSelect={setSelected} />

            <Detailed result={correlation.results.find((r) => r.id === selected) || null} />
        </div >
    );
}