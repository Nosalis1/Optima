import { PATH_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext } from '@nestjs/common';
import type { HttpAdapter } from '../adapters/http.adapter';

export class NestAdapter implements HttpAdapter<ExecutionContext, ExecutionContext> {
    private getEndpoint(context: ExecutionContext): string {
        const controller = context.getClass();
        const handler = context.getHandler();
        const controllerPath = Reflect.getMetadata(PATH_METADATA, controller);
        const handlerPath = Reflect.getMetadata(PATH_METADATA, handler);
        const controllerRoute = this.normalizePath(controllerPath);
        const route = this.normalizePath(handlerPath);
        return this.joinPaths(controllerRoute, route);
    }
    private normalizePath(path: string | string[] | undefined): string {
        if (!path) { return ''; }
        if (Array.isArray(path)) { return path[0] ?? ''; }
        return path;
    }
    private joinPaths(...paths: string[]): string {
        const result = paths.filter(Boolean).join('/');
        return result.startsWith('/') ? result : `/${result}`;
    }
    getRequest(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const {
            body, // Parsed JSON or form data
            params, // Route path variables
            query, // URL query string parameters
            headers, // HTTP request headers
            cookies, // Parsed client browser cookies
            method, // Executed HTTP verb (GET, POST, etc.)
            path, // Requested URL path string
            ip, // Remote client IP address
            secure, // Boolean for TLS connection status
            url, // Full requested URL string
        } = request;
        return {
            method,
            endpoint: this.getEndpoint(context),
            clientIp: ip,
        };
    }
    getResponse(context: ExecutionContext) {
        const response = context.switchToHttp().getResponse();
        const {
            locals, // Request-scoped middleware variables
            headersSent, // Boolean tracking sent HTTP headers
            statusCode, // Current HTTP status code
        } = response;
        return { statusCode };
    }
}
