import type { Request, Response, NextFunction } from 'express';

type AnyObject = Record<string, unknown>;

class LoggerMiddleware {
  private static generateRequestId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private static redactSensitive(input: AnyObject | undefined | null): AnyObject | undefined {
    if (!input || typeof input !== 'object') return undefined;
    const clone: AnyObject = {};
    const sensitiveKeys = new Set(['password', 'refresh_token', 'token', 'authorization', 'access_token']);
    for (const [key, value] of Object.entries(input)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        clone[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        clone[key] = LoggerMiddleware.redactSensitive(value as AnyObject);
      } else {
        clone[key] = value as unknown;
      }
    }
    return clone;
  }

  static requestLogger(req: Request & { id?: string }, res: Response, next: NextFunction) {
    const shouldLog = (process.env.DEBUG || '').toLowerCase() === 'true';
    if (!shouldLog) return next();

    req.id = req.id || LoggerMiddleware.generateRequestId();
    const start = process.hrtime.bigint();
    const sanitizedBody = LoggerMiddleware.redactSensitive(req.body as AnyObject);

    console.log('[REQ]', JSON.stringify({
      id: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
      query: req.query,
      body: sanitizedBody,
    }));

    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      console.log('[RES]', JSON.stringify({
        id: req.id,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      }));
    });

    next();
  }

  static errorLogger(err: any, req: Request & { id?: string }, res: Response, next: NextFunction) {
    const shouldLog = (process.env.DEBUG || '').toLowerCase() === 'true';
    if (shouldLog) {
      const payload = {
        id: req.id,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
      };
      console.error('[ERR]', JSON.stringify(payload));
    }
    next(err);
  }
}

module.exports = { requestLogger: LoggerMiddleware.requestLogger, errorLogger: LoggerMiddleware.errorLogger };


