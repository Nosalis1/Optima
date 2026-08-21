import type {
    SystemStaticInfo
} from '../../domain';

class SystemStore {
    private readonly startedAt: number;

    constructor(
        private readonly env: string = process.env.NODE_ENV ?? "unknown"
    ) {
        this.startedAt = Date.now();
    }

    get(): SystemStaticInfo {
        return {
            uptime: Date.now() - this.startedAt,
            nodeVersion: process.version,
            env: this.env,
        };
    }
}

export { SystemStore };