/**
 * Enhanced logging utility for debugging production issues
 */

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, data?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logData = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${logData}`;
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorDetails: LogContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    console.error(this.formatMessage('ERROR', message, errorDetails));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('WARN', message, context));
  }

  info(message: string, context?: LogContext) {
    console.log(this.formatMessage('INFO', message, context));
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('DEBUG', message, context));
    }
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}
