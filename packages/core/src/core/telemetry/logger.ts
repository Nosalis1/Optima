import {
    Request,
    Response
} from 'express';
import {
    getConfig
} from '../../config';

class Logger {
    private static readonly RESET = '\x1b[0m';
    private static readonly BOLD = '\x1b[1m';
    private static readonly DIM = '\x1b[2m';

    private static readonly COLORS = {
        GET: '\x1b[32m',    // Green
        POST: '\x1b[36m',   // Cyan
        PUT: '\x1b[33m',    // Yellow
        DELETE: '\x1b[31m', // Red
        PATCH: '\x1b[35m',  // Magenta
        SUCCESS: '\x1b[32m',// Green (2xx)
        WARN: '\x1b[33m',   // Yellow (4xx)
        ERROR: '\x1b[31m'   // Red (5xx)
    };

    static log(req: Request, res: Response, duration: number): void {
        if (!getConfig().consoleLog) return;

        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        const timeFormatted = `${duration.toFixed(2)}ms`.padStart(8, ' ');

        const methodColor = Logger.COLORS[req.method as keyof typeof Logger.COLORS] || Logger.RESET;
        const method = `${Logger.BOLD}${methodColor}${req.method.padEnd(7, ' ')}${Logger.RESET}`;

        const status = res.statusCode;
        let statusColor = Logger.COLORS.SUCCESS;
        if (status >= 400 && status < 500) statusColor = Logger.COLORS.WARN;
        if (status >= 500) statusColor = Logger.COLORS.ERROR;
        const statusCode = `${Logger.BOLD}${statusColor}${status}${Logger.RESET}`;

        let speedColor = Logger.RESET;
        if (duration > 500) speedColor = Logger.COLORS.ERROR;
        else if (duration > 200) speedColor = Logger.COLORS.WARN;
        const timing = `${speedColor}${timeFormatted}${Logger.RESET}`;

        console.log(
            `${Logger.DIM}[${timestamp}]${Logger.RESET} ` +
            `${method} ` +
            `${req.url.padEnd(35, ' ')} ` +
            `•  ${statusCode}  • ` +
            `${timing}`
        );
    }

    static debug(message: string): void {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        console.log(`${Logger.DIM}[${timestamp}]${Logger.RESET} ${Logger.DIM}${message}${Logger.RESET}`);
    }

    static duration(message: string, duration: number): void {
        return; // Disable duration logging for now
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        const timeFormatted = `${duration.toFixed(2)}ms`.padStart(8, ' ');
        let speedColor = Logger.RESET;
        if (duration > 500) speedColor = Logger.COLORS.ERROR;
        else if (duration > 200) speedColor = Logger.COLORS.WARN;
        const timing = `${speedColor}${timeFormatted}${Logger.RESET}`;

        console.log(
            `${Logger.DIM}[${timestamp}]${Logger.RESET} ` +
            `${message} ` +
            `• ${timing}`
        );
    }
}

export default Logger;