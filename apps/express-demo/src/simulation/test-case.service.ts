import { monitorEventLoopDelay } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

interface Sample {
    timestamp: string;
    cpuPercent: number;
    memoryMb: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
    };
    eventLoopLagMs: number;
}

interface RunSummary {
    fileName: string;
    testName: string;
    createdAt: string;
    samplesCount: number;
    avgCpuPercent: number;
    maxCpuPercent: number;
    avgHeapUsedMb: number;
    maxHeapUsedMb: number;
    avgEventLoopLagMs: number;
    maxEventLoopLagMs: number;
}

export default class TestCaseService {
    private readonly tickInterval: number = 5000;
    private iteration: number = 0;
    private meld: ReturnType<typeof monitorEventLoopDelay>;
    private previousCpuUsage: NodeJS.CpuUsage | null = null;
    private intervalId?: NodeJS.Timeout;

    private samples: Sample[] = [];

    constructor(
        private readonly simulationTotalTime: number,
        private readonly testName: string = 'benchmark',
        private readonly outputDir: string = path.join(process.cwd(), 'test-results')
    ) {
        this.meld = monitorEventLoopDelay({ resolution: 10 });
        this.meld.enable();
    }

    private getEventLoopLag(): number {
        return this.meld.mean / 1e6; // Convert nanoseconds to milliseconds
    }

    private calculateCpuUsage(): number {
        const currentCpu = process.cpuUsage();
        if (!this.previousCpuUsage) {
            this.previousCpuUsage = currentCpu;
            return 0;
        }

        const userDiff = currentCpu.user - this.previousCpuUsage.user;
        const systemDiff = currentCpu.system - this.previousCpuUsage.system;
        this.previousCpuUsage = currentCpu;

        const totalMicros = userDiff + systemDiff;
        // Izračunavanje proseka u % tokom tickIntervala (u mikrosekundama)
        const totalPossibleMicros = this.tickInterval * 1000;
        return Number(((totalMicros / totalPossibleMicros) * 100).toFixed(2));
    }

    public start(): () => void {
        const limit = Math.floor(this.simulationTotalTime / this.tickInterval);
        this.previousCpuUsage = process.cpuUsage();

        this.intervalId = setInterval(() => {
            if (this.iteration >= limit) {
                return;
            }

            const mem = process.memoryUsage();

            this.samples.push({
                timestamp: new Date().toISOString(),
                cpuPercent: this.calculateCpuUsage(),
                memoryMb: {
                    rss: Number((mem.rss / 1024 / 1024).toFixed(2)),
                    heapTotal: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
                    heapUsed: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
                    external: Number((mem.external / 1024 / 1024).toFixed(2)),
                },
                eventLoopLagMs: Number(this.getEventLoopLag().toFixed(3))
            });

            this.iteration++;
        }, this.tickInterval);

        return () => {
            if (this.intervalId) clearInterval(this.intervalId);
            this.saveToFile();
        };
    }

    private saveToFile(): void {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${this.testName}-${timestamp}.json`;
        const filePath = path.join(this.outputDir, fileName);

        const runMetaData = {
            testName: this.testName,
            createdAt: new Date().toISOString(),
            totalSamples: this.samples.length,
            tickIntervalMs: this.tickInterval,
            metrics: this.samples
        };

        fs.writeFileSync(filePath, JSON.stringify(runMetaData, null, 2), 'utf-8');
        console.log(`[TestCaseService] Rezultati uspešno sačuvani u: ${filePath}`);
    }

    compareTestRuns(dirPath: string = path.join(process.cwd(), 'test-results')): RunSummary[] {
        if (!fs.existsSync(dirPath)) {
            console.warn(`Direktorijum ${dirPath} ne postoji.`);
            return [];
        }

        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));

        const summaries: RunSummary[] = files.map(file => {
            const filePath = path.join(dirPath, file);
            const raw = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(raw);

            const samples: Sample[] = parsed.metrics || [];
            if (samples.length === 0) {
                return {
                    fileName: file,
                    testName: parsed.testName || 'N/A',
                    createdAt: parsed.createdAt || 'N/A',
                    samplesCount: 0,
                    avgCpuPercent: 0,
                    maxCpuPercent: 0,
                    avgHeapUsedMb: 0,
                    maxHeapUsedMb: 0,
                    avgEventLoopLagMs: 0,
                    maxEventLoopLagMs: 0,
                };
            }

            const cpuValues = samples.map(s => s.cpuPercent);
            const heapValues = samples.map(s => s.memoryMb.heapUsed);
            const lagValues = samples.map(s => s.eventLoopLagMs);

            const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

            return {
                fileName: file,
                testName: parsed.testName || 'N/A',
                createdAt: parsed.createdAt || 'N/A',
                samplesCount: samples.length,
                avgCpuPercent: Number(avg(cpuValues).toFixed(2)),
                maxCpuPercent: Math.max(...cpuValues),
                avgHeapUsedMb: Number(avg(heapValues).toFixed(2)),
                maxHeapUsedMb: Math.max(...heapValues),
                avgEventLoopLagMs: Number(avg(lagValues).toFixed(3)),
                maxEventLoopLagMs: Math.max(...lagValues),
            };
        });

        console.log('\n================ PORAĐENJE TESTNIH POKRETANJA ================');
        console.table(summaries, [
            'testName',
            'createdAt',
            'avgCpuPercent',
            'maxCpuPercent',
            'avgHeapUsedMb',
            'maxHeapUsedMb',
            'avgEventLoopLagMs',
            'maxEventLoopLagMs'
        ]);

        return summaries;
    }
}