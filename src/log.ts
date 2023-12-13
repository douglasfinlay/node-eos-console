export type LogHandler = (level: LogLevel, message: string) => void;

export type LogLevel =
    | 'error'
    | 'warn'
    | 'info'
    | 'verbose'
    | 'debug'
    | 'silly';
