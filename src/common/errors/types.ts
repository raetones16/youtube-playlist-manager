// src/common/errors/types.ts

export enum ErrorType {
    NETWORK = 'NETWORK',
    AUTH = 'AUTH',
    QUOTA = 'QUOTA',
    RATE_LIMIT = 'RATE_LIMIT',
    NOT_FOUND = 'NOT_FOUND',
    FORBIDDEN = 'FORBIDDEN',
    UNKNOWN = 'UNKNOWN',
    STORAGE_QUOTA = 'STORAGE_QUOTA',
    STORAGE_ERROR = 'STORAGE_ERROR',
    SYNC_ERROR = 'SYNC_ERROR',
    CONNECTION_ERROR = 'CONNECTION_ERROR' 
}

export interface ErrorContext {
    timestamp: number;
    component: string;
    operation: string;
    details?: Record<string, any>;
}

export class ExtendedError extends Error {
    constructor(
        public type: ErrorType,
        message: string,
        public context: ErrorContext,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'ExtendedError';
    }
}

export class APIError extends Error {
    constructor(
        public type: ErrorType,
        message: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'APIError';
    }
}