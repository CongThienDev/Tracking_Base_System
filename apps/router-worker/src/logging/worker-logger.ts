type LogLevel = 'info' | 'warn' | 'error';

export type LogMeta = Record<string, unknown>;

export interface WorkerLogger {
  info(meta: LogMeta, message: string): void;
  warn(meta: LogMeta, message: string): void;
  error(meta: LogMeta, message: string): void;
}

function writeLog(level: LogLevel, scope: string, meta: LogMeta, message: string): void {
  const entry = {
    level,
    scope,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
    return;
  }

  if (level === 'warn') {
    console.warn(JSON.stringify(entry));
    return;
  }

  console.log(JSON.stringify(entry));
}

export function createConsoleWorkerLogger(scope: string): WorkerLogger {
  return {
    info(meta, message) {
      writeLog('info', scope, meta, message);
    },
    warn(meta, message) {
      writeLog('warn', scope, meta, message);
    },
    error(meta, message) {
      writeLog('error', scope, meta, message);
    }
  };
}
