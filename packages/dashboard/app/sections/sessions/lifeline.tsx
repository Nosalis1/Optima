import { Card } from "@/app/components/cards/card";
import { SelectableCard } from "@/app/components/cards/selectable-card";
import type { SessionMetadata } from "../../domain";

type Props = {
    sessions: SessionMetadata[];
    selectedSessionNumber?: number | null;
    onSessionClick?: (sessionNumber: number) => void;
};

export function Lifeline({ sessions, selectedSessionNumber, onSessionClick }: Props) {

    if (!sessions || typeof sessions !== 'object' || !Array.isArray(sessions) || sessions.length === 0) {
        return null;
    }
    
    return (
        <Card
            padding
            header={{
                title: "Session Lifeline",
                description: `Total: ${sessions.length}`,
                tooltip: "This section displays the history of sessions.",
            }}
        >
            <div className="relative pl-2">
                <div className="absolute left-[15px] top-7 bottom-7 w-px bg-[var(--variant-5)]" />

                <div className="flex flex-col">
                    {sessions.map((session, index) => {
                        const isSelected = selectedSessionNumber === session.sessionNumber;
                        const isLast = index === sessions.length - 1;

                        return (
                            <div key={session.sessionNumber} className="relative flex items-center min-h-12">
                                <button type="button" onClick={() => onSessionClick?.(session.sessionNumber)} aria-label={`Select session ${session.sessionNumber}`}
                                    className={`
                                        group relative z-10 flex items-center justify-center w-4 h-4 rounded-full border-1
                                        transition-all duration-200
                                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                                        ${isSelected
                                            ? "border-blue-500 bg-blue-500 shadow-md shadow-blue-500/30 scale-110"
                                            : session.recoveredFromCrash
                                                ? "border-yellow-500 bg-yellow-400 hover:scale-110"
                                                : "border-green-500 bg-green-500 hover:scale-110"
                                        }
                                    `}
                                >
                                    <span
                                        className={`
                                            w-3 h-3 rounded-full bg-[var(--variant-1)]
                                            transition-transform duration-200
                                            ${isSelected ? "scale-100" : "scale-75 group-hover:scale-100"}
                                        `}
                                    />
                                </button>

                                <button type="button" onClick={() => onSessionClick?.(session.sessionNumber)}
                                    className={`
                                        ml-4 px-3 py-1.5 rounded-md
                                        text-sm text-left
                                        transition-all duration-200
                                        ${isSelected
                                            ? "bg-[var(--variant-3)] text-[var(--variant-4)] font-semibold"
                                            : "text-gray-600 hover:bg-[var(--variant-3)] hover:text-gray-900"
                                        }
                                    `}
                                >
                                    Session {session.sessionNumber}
                                    {session.recoveredFromCrash && (<p className="ml-2 text-xs text-yellow-600">recovered</p>)}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}