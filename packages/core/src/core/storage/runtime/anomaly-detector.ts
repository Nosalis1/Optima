export class AnomalyDetector {
    private n = 0;
    private mean = 0;
    private m2 = 0;

    constructor(
        private readonly minSamples = 60,
        private readonly lowerLimitMs = 180,
        private readonly zThreshold = 3,
        private readonly windowCap = 5000
    ) { }

    record(duration: number): boolean {
        if (!Number.isFinite(duration)) return false;
        let anomalyDetected = false;
        if (this.n >= this.minSamples && duration >= this.lowerLimitMs) {
            const std = Math.sqrt(this.m2 / (this.n - 1));
            anomalyDetected = std > 0 ? (duration - this.mean) / std > this.zThreshold : duration > this.mean;
        }
        if (this.n < this.windowCap) {
            this.n++;
            const delta = duration - this.mean;
            this.mean += delta / this.n;
            this.m2 += delta * (duration - this.mean);
        } else {
            const alpha = 1 / this.windowCap;
            const delta = duration - this.mean;
            const variance = (this.m2 / (this.n - 1) + alpha * delta * delta) * (1 - alpha);
            this.mean += alpha * delta;
            this.m2 = variance * (this.n - 1);
        }
        return anomalyDetected;
    }
}