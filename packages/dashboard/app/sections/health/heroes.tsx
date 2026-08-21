import { Card } from '@/app/components/cards/card';
import { type HealthData } from '@/app/domain';
import ProgressGraph from '@/src/components/graphs/progress';
import { Hero, HeroHeader, HeroContent } from '../../components/cards/hero';

type Props = {
    data: HealthData;
};

export default function HealthHeroes({ data }: Props) {
    const smallHeroes = [
        { label: "RSS Memory", value: `${data.memory.rssMemory.toFixed(2)} MB`, sublabel: `/ ${data.memory.rssMemoryTotal.toFixed(2)} MB total`, color: "var(--chart-1)" },
        { label: "External Memory", value: `${data.memory.externalMemory.toFixed(2)} MB`, sublabel: "native C++ objects", color: "var(--chart-2)" },
        { label: "GC Pause Average", value: `${data.garbageCollection.gcPauseAverage.toFixed(2)} ms`, sublabel: "milliseconds", color: "var(--chart-3)" },
        { label: "Active Handles", value: `${data.handles.activeHandles}`, sublabel: `timers: ${data.handles.activeHandlesTimers} * sockets: ${data.handles.activeHandlesSockets}`, color: "var(--chart-4)" },
    ];

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Hero>
                    <HeroHeader
                        title="CPU Usage"
                        value={data.cpu.usageRate}
                        unit="%"
                        color="[var(--chart-6)]"
                    />

                    <ProgressGraph
                        data={[
                            { label: 'User', value: data.cpu.userUsage, color: 'var(--chart-5)' },
                            { label: 'System', value: data.cpu.systemUsage, color: 'var(--chart-1)' },
                            // { label: 'Idle', value: data.cpu.idleUsage, color: 'var(--chart-1)' }
                        ]}
                        maxValue={100}
                    />

                    <HeroContent
                        values={{
                            "Number of Cores": data.cpu.numberOfCores.toString(),
                            "User Usage": `${data.cpu.userUsage.toFixed(2)}%`,
                            "System Usage": `${data.cpu.systemUsage.toFixed(2)}%`,
                            "Idle Usage": `${data.cpu.idleUsage.toFixed(2)}%`
                        }}
                    />
                </Hero>

                <Hero>
                    <HeroHeader
                        title="Heap Usage"
                        value={data.memory.heapUsage}
                        unit="MB"
                        color="[var(--chart-2)]"
                    />

                    <ProgressGraph
                        data={[
                            { label: 'Heap Usage', value: data.memory.heapUsage, color: 'var(--chart-2)' },
                        ]}
                        maxValue={data.memory.heapSize}
                    />

                    <HeroContent
                        values={{
                            "Heap Size": `${data.memory.heapSize.toFixed(2)} MB`,
                            "External Memory": `${data.memory.externalMemory.toFixed(2)} MB`,
                        }}
                    />

                    <ProgressGraph
                        data={[
                            { label: 'RSS Memory', value: data.memory.rssMemory, color: 'var(--chart-5)' },
                        ]}
                        maxValue={data.memory.rssMemoryTotal}
                    />

                    <HeroContent
                        values={{
                            "RSS Memory": `${data.memory.rssMemory.toFixed(2)} MB`,
                            "RSS Memory Total": `${data.memory.rssMemoryTotal.toFixed(2)} MB`,
                        }}
                    />
                </Hero>

                <Hero>
                    <HeroHeader
                        title="Event Loop Lag"
                        value={data.eventLoop.lag}
                        unit="ms"
                        color="[var(--chart-4)]"
                    />

                    <ProgressGraph
                        data={[
                            { label: 'Event Loop Lag', value: data.eventLoop.lag, color: 'var(--chart-4)' },
                        ]}
                        maxValue={data.eventLoop.threshold}
                    />

                    <HeroContent
                        values={{
                            "Threshold": `${data.eventLoop.threshold} ms`,
                        }}
                    />
                </Hero>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {
                    smallHeroes.map((hero, index) => (
                        <Card key={index} padding>
                            <h2 className="text-lg font-semibold text-foreground mb-2">{hero.label}</h2>

                            <p className={`text-2xl font-bold text-[${hero.color}] mb-1`}>{hero.value}</p>

                            <div className="flex justify-between text-sm text-accent-soft">
                                <span>{hero.sublabel}</span>
                            </div>
                        </Card>
                    ))
                }
            </div>
        </>
    );
}
