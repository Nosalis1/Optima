import React from "react";
import { Lifeline } from "./lifeline";
import { Selection } from "./selection";
import { useMetrics } from "@/app/context/metrics.context";

export default function SessionsPage() {
    const {
        sessions,
        selectedSession,
        selectedSessionSummary,
        selectSession
    } = useMetrics();

    return (
        <div className="p-6 flex w-full gap-2">
            <Lifeline onSessionClick={(sessionNumber: number) => selectSession(sessionNumber)} selectedSessionNumber={selectedSession} sessions={sessions} />
            <Selection selected={selectedSessionSummary} />
        </div>
    );
}