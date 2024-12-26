// src/common/errors/types.ts

export enum ErrorType {
    NETWORK = 'NETWORK',
    AUTH = 'AUTH',
    QUOTA = 'QUOTA',
    RATE_LIMIT = 'RATE_LIMIT',
    NOT_FOUND = 'NOT_FOUND',
    FORBIDDEN = 'FORBIDDEN',
    UNKNOWN = 'UNKNOWN'
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