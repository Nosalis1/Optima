import { Card } from '@/app/components/cards/card';
import { LineGraph } from '@/src/components/graphs';
import { type HealthData } from '@/app/domain';

type Props = { data: HealthData; };

export default function HealthGraphs({ data }: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card header={{
                title: "Event Loop Lag",
                description: "Event loop lag over time",
                tooltip: "The event loop lag indicates how long it takes for the Node.js event loop to process events. A higher lag may indicate that the server is under heavy load or that there are blocking operations."
            }}>
                <LineGraph
                    data={[
                        {
                            label: "Event Loop Lag",
                            points: data.history.eventLoopLag.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-3)",
                            type: 'solid',
                            fillArea: false
                        }
                    ]}
                    withDots={false}
                />
            </Card>

            <Card header={{
                title: "Heap Memory Usage",
                description: "Heap memory usage over time",
                tooltip: "Heap memory is the memory used by the JavaScript engine to store objects, strings, and other data. This graph shows the amount of heap memory used over time."
            }}>
                <LineGraph
                    data={[
                        {
                            label: "Used",
                            points: data.history.memoryBreakdown.usedHeap.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-3)",
                            type: 'solid',
                            fillArea: false
                        },
                        {
                            label: "Total",
                            points: data.history.memoryBreakdown.totalHeap.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-2)",
                            type: 'dashed',
                            fillArea: false
                        },
                        {
                            label: "RSS",
                            points: data.history.memoryBreakdown.rssMemory.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-4)",
                            type: 'solid',
                            fillArea: false
                        }
                    ]}
                    withDots={false}
                />
            </Card>
        </div>
    );
}