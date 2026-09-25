import { type HealthData } from '@/app/domain';
import { Card } from '@/app/components/cards/card';
import Separator from '@/app/components/utility/separator';
import { HistogramGraph } from '@/src/components/graphs';
import { Hero, HeroContent } from '../../components/cards/hero';

type Props = {
    data: HealthData;
};


function HeadLabel({ title, value }: { title: string, value: string }) {
    return (
        <div className="flex flex-row justify-between h-full">
            <span className="text-[10px] text-foreground uppercase tracking-wider font-semibold block mb-1 truncate">
                {title}
            </span>
            <span className="text-[10px] text-foreground-soft uppercase tracking-wider font-semibold block mb-1 ml-2">
                {value}
            </span>
        </div>
    );
}

export default function HealthStats({ data }: Props) {
    const processInfo = [
        ["PID", data.runtime.pid],
        ["Platform", data.runtime.platform],
        ["NODE.JS", data.runtime.nodeVersion],
        ["V8 ENGINE", data.runtime.v8Version],
        ["LIBUV", data.runtime.libuvVersion],
        ["OPENSSL", data.runtime.openSSLVersion],
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* <Hero header={{ title: "CPU Per Core Utilization" }}>
                <HistogramGraph
                    data={data.cpu.perCoreUsage}
                    binCount={data.cpu.perCoreUsage.length}
                    label="CPU Usage (%)"
                />
            </Hero> */}

            <Hero header={{ title: "Garbage Collection" }}>
                <HeroContent
                    variant='accent'
                    values={{
                        "Minor GC (SCAVENGE)": `Run Count: ${data.garbageCollection.minorGC.runCount}\tTotal Time: ${data.garbageCollection.minorGC.averageTime.toFixed(2)} ms`,
                        "Major GC (MARK_SWEEP)": `Run Count: ${data.garbageCollection.majorGC.runCount}\tTotal Time: ${data.garbageCollection.majorGC.averageTime.toFixed(2)} ms`,
                        "Incremental GC (INCREMENTAL_MARKING)": `Run Count: ${data.garbageCollection.incrementalGC.runCount}\tTotal Time: ${data.garbageCollection.incrementalGC.averageTime.toFixed(2)} ms`,
                    }}
                />

                <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <Card padding>
                            <div className="flex flex-col justify-between h-full">
                                <p className="text-[10px] text-accent-soft uppercase tracking-wider font-semibold block">
                                    HEAP SPACES
                                </p>
                                {
                                    data.garbageCollection.heapSpaces.map((space, index) => (
                                        <HeadLabel title={space.label} value={`${space.used.toFixed(2)} MB`} key={index} />
                                    ))
                                }
                            </div>
                        </Card>
                        <Card padding>
                            <div className="flex flex-col justify-between h-full">
                                <p className="text-[10px] text-accent-soft uppercase tracking-wider font-semibold block">GC TOTALS</p>
                                <HeroContent
                                    variant='accent'
                                    values={{
                                        "Total Pause": `${data.garbageCollection.gcTotals.totalPauseTime.toFixed(2)} ms`,
                                        "Freed Memory": `${data.garbageCollection.gcTotals.freedMemory.toFixed(2)} MB`,
                                        "Promotions": `${data.garbageCollection.gcTotals.promotions}`,
                                        "Tenured Size": `${data.garbageCollection.gcTotals.tenuredSize.toFixed(2)} MB`,
                                    }}
                                />
                            </div>
                        </Card>
                    </div>
                </div>
            </Hero>

            <Hero header={{ title: "Process & Runtime Info" }}>
                <div className="grid grid-cols-3 md:grid-cols-2 gap-4">
                    {
                        processInfo.map(([label, value], index) => (
                            <div key={index}>
                                <p className="text-[10px] text-accent-soft uppercase tracking-wider font-semibold block">
                                    {label}
                                </p>
                                <p className="text-sm text-foreground">{value}</p>
                            </div>
                        ))
                    }
                </div>
                <Separator />
                <p className="text-[10px] text-accent-soft uppercase tracking-wider font-semibold block">
                    ACTIVE LIBUV HANDLES
                </p>
                <div className="flex flex-row justify-between text-sm text-accent-soft">
                    <p>TCP sockets:</p>
                    <span>{data.handles.activeLibuvHandles}</span>
                </div>
                <div className="flex flex-row justify-between text-sm text-accent-soft">
                    <p>Timers:</p>
                    <span>{data.handles.timers}</span>
                </div>
                <div className="flex flex-row justify-between text-sm text-accent-soft">
                    <p>File descriptors:</p>
                    <span>{data.handles.fileDescriptors}</span>
                </div>

                <Separator />
                <p className="text-[10px] text-accent-soft uppercase tracking-wider font-semibold block">
                    THREAD POOL (UV_THREADPOOL_SIZE)
                </p>
                <div className="flex flex-row justify-between text-sm text-accent-soft">
                    <p>Size:</p>
                    <span>{data.runtime.threadPoolSize}</span>
                </div>
                <div className="flex flex-row justify-between text-sm text-accent-soft">
                    <p>Active Threads:</p>
                    <span>{data.runtime.activeThreads}</span>
                </div>

                <Separator />
                <p className="text-[10px] text-accent-soft uppercase tracking-wider font-semibold block">
                    STARTUP TIME
                </p>
                <div className="flex flex-row justify-between text-sm text-accent-soft">
                    <p>Bootstrap:</p>
                    <span>{data.runtime.startup.bootstrapTime.toFixed(2)} ms</span>
                </div>
                <div className="flex flex-row justify-between text-sm text-accent-soft">
                    <p>Requires:</p>
                    <span>{data.runtime.startup.requiredModules} modules</span>
                </div>
            </Hero>
        </div >
    );
}