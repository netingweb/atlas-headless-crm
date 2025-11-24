import pino from 'pino';

export type Logger = pino.Logger;

export function createLogger(level: string): Logger {
  return pino({
    level,
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
  });
}

