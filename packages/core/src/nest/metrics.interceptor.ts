import { CallHandler, ExecutionContext, Injectable, Inject, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { NestAdapter } from './metrics.adapter';
import Logger from '../core/telemetry/logger';
import type { OptimaRuntimeDependencies } from '../runtime';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    constructor(
        private readonly adapter: NestAdapter,
        @Inject('OPTIMA_RUNTIME_DEPENDENCIES')
        private readonly dependencies: OptimaRuntimeDependencies,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') { return next.handle(); }
        const startHrTime = process.hrtime.bigint();
        return next.handle().pipe(tap({
            next: () => this.record(context, startHrTime),
            error: () => this.record(context, startHrTime),
        }));
    }

    private record(context: ExecutionContext, startHrTime: bigint): void {
        const requestData = this.adapter.getRequest(context);
        const responseData = this.adapter.getResponse(context);

        const telemetryRequest = this.dependencies.telemetry.record({
            endpoint: requestData.endpoint,
            method: requestData.method,
            statusCode: responseData.statusCode,
            clientIp: requestData.clientIp
        }, startHrTime);

        if (telemetryRequest !== null) {
            Logger.log(
                context.switchToHttp().getRequest(),
                context.switchToHttp().getResponse(),
                telemetryRequest.responseTime
            );
        }
    }
}
