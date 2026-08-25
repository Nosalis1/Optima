import type { Request, Response } from 'express';
import type { HttpAdapter } from '../adapters/http.adapter';

export class ExpressAdapter implements HttpAdapter<Request, Response> {
    private getEndpoint(request: Request): string {
        const route = request.route?.path;
        if (!route) return request.path;
        const baseUrl = request.baseUrl ?? '';
        return `${baseUrl}${route}`;
    }
    getRequest(request: Request) {
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
            endpoint: this.getEndpoint(request),
            clientIp: ip,
        };
    }
    getResponse(response: Response) {
        const {
            locals, // Request-scoped middleware variables
            headersSent, // Boolean tracking sent HTTP headers
            statusCode, // Current HTTP status code
        } = response;
        return { statusCode };
    }
}
