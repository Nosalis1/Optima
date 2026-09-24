import type { Request, Response, NextFunction, RequestHandler } from 'express';
import Logger from '../core/telemetry/logger';
import { ExpressAdapter } from './metrics.adapter';
import type { HttpAdapter } from '../adapters/http.adapter';
import type { OptimaRuntimeDependencies } from '../runtime';

const adapter: HttpAdapter<Request, Response> = new ExpressAdapter();

export const createExpressMetricsMiddleware = (dependencies: OptimaRuntimeDependencies): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        const startHrTime = process.hrtime.bigint();

        res.on('finish', () => {
            const requestData = adapter.getRequest(req);
            const responseData = adapter.getResponse(res);

            const telemetryRequest = dependencies.telemetry.record({
                endpoint: requestData.endpoint,
                method: requestData.method,
                statusCode: responseData.statusCode,
                clientIp: requestData.clientIp
            }, startHrTime);

            if (telemetryRequest !== null) {
                Logger.log(
                    req,
                    res,
                    telemetryRequest.responseTime
                );
            }
        });

        next();
    }
};