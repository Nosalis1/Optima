import type { ExecutionContext } from '@nestjs/common';
import type { HttpAdapter } from '../adapters/http.adapter';

export class NestAdapter
    implements HttpAdapter<ExecutionContext, ExecutionContext> {
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
            endpoint: path,
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
