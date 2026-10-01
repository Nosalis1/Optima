import { Card } from "@/app/components/cards/card";
import type { SystemAssessment } from "../../domain";
import { ASSESSMENT_COLOR, ASSESSMENT_LABEL } from "./labels";

export function Assessment({ assessment }: { assessment: SystemAssessment }) {
    const color = ASSESSMENT_COLOR[assessment.status];

    return (
        <Card padding>
            <div className="flex flex-col gap-2 pl-3 border-l-4" style={{ borderColor: color }}>
                <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-accent-soft uppercase tracking-wider">Assessment</p>
                    <span className="text-sm font-semibold" style={{ color }}>{ASSESSMENT_LABEL[assessment.status]}</span>
                </div>

                <p className="text-sm text-foreground">{assessment.recommendation}</p>

                {assessment.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {assessment.evidence.map((evidence) => (
                            <span key={evidence} className="text-xs px-2 py-1 rounded-md bg-[var(--variant-3)] text-foreground">
                                {evidence}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}
