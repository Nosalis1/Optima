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
        <div className="grid grid-cols-1 md:grid-cols-[1fr_5fr] gap-4 w-full h-full p-4">
            <Lifeline onSessionClick={(sessionNumber: number) => selectSession(sessionNumber)} selectedSessionNumber={selectedSession} sessions={sessions} />
            <Selection selected={selectedSessionSummary} />
        </div>
    );
}