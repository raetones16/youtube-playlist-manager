// src/common/utils/debug-logger.ts

export enum DebugLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
}

interface LogData {
    component: string;
    action: string;
    details?: Record<string, any>;
    error?: Error;
}

export class DebugLogger {
    private static instance: DebugLogger;
    private level: DebugLevel = DebugLevel.INFO;

    private constructor() {}

    static getInstance(): DebugLogger {
        if (!DebugLogger.instance) {
            DebugLogger.instance = new DebugLogger();
        }
        return DebugLogger.instance;
    }

    setLevel(level: DebugLevel) {
        this.level = level;
        this.debug('Logger', 'level changed', { newLevel: level });
    }

    error(component: string, action: string, error: Error, details?: Record<string, any>) {
        this.log(DebugLevel.ERROR, {
            component,
            action,
            details,
            error
        });
    }

    warn(component: string, action: string, details?: Record<string, any>) {
        this.log(DebugLevel.WARN, { component, action, details });
    }

    info(component: string, action: string, details?: Record<string, any>) {
        this.log(DebugLevel.INFO, { component, action, details });
    }

    debug(component: string, action: string, details?: Record<string, any>) {
        this.log(DebugLevel.DEBUG, { component, action, details });
    }

    private log(level: DebugLevel, data: LogData) {
        if (this.shouldLog(level)) {
            const timestamp = new Date().toISOString();
            const message = this.formatMessage(data);
            
            switch (level) {
                case DebugLevel.ERROR:
                    console.error(`[${timestamp}] ${message}`, data.error);
                    break;
                case DebugLevel.WARN:
                    console.warn(`[${timestamp}] ${message}`);
                    break;
                case DebugLevel.INFO:
                    console.info(`[${timestamp}] ${message}`);
                    break;
                case DebugLevel.DEBUG:
                    console.debug(`[${timestamp}] ${message}`);
                    break;
            }
        }
    }

    private shouldLog(level: DebugLevel): boolean {
        const levels = Object.values(DebugLevel);
        return levels.indexOf(level) <= levels.indexOf(this.level);
    }

    private formatMessage({ component, action, details }: LogData): string {
        let message = `[${component}] ${action}`;
        if (details) {
            message += ` | ${JSON.stringify(details)}`;
        }
        return message;
    }
}

export const logger = DebugLogger.getInstance();