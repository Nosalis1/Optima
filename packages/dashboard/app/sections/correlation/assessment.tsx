import { Card } from "@/app/components/cards/card";
import type { SystemAssessment } from "../../domain";

export function Assessment({ assessment }: { assessment: SystemAssessment }) {
    return (
        <Card header={{ title: 'Assessment' }} padding>
            {
                assessment.status === 'INSUFFICIENT_DATA' ? (
                    <p className="text-sm text-muted-foreground">
                        Insufficient data to determine the correlation.
                    </p>
                ) : (
                    <div>
                        <p className="font-semibold">Status:</p>
                        <p>{assessment.status}</p>

                        <p className="font-semibold">Evidence:</p>
                        <ul>
                            {assessment.evidence.map((evidence, index) => (
                                <li key={index}>{evidence}</li>
                            ))}
                        </ul>

                        <p className="font-semibold">Recommendation:</p>
                        <p>{assessment.recommendation}</p>
                    </div>
                )
            }
        </Card>
    );
}