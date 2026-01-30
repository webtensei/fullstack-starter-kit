import { randomUUID } from 'crypto';
import pino from 'pino';
import type { Request, Response, NextFunction } from 'express';
import { context, trace } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers.set-cookie',
  ],
});

const otelLogger = logs.getLogger('api.http');

function nowMs() {
  // good enough for request latency
  return Date.now();
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function shouldSample(rate: number) {
  const r = clamp01(rate);
  if (r >= 1) return true;
  if (r <= 0) return false;
  return Math.random() < r;
}

function sanitizeBody(body: unknown) {
  if (!body || typeof body !== 'object') return body;
  const sensitiveFields = ['password', 'token', 'refreshToken', 'secret'];
  const copy: Record<string, unknown> = { ...(body as any) };
  for (const field of sensitiveFields) {
    if (field in copy) copy[field] = '[REDACTED]';
  }
  return copy;
}

export function createRequestLogger() {
  return function requestLogger(req: Request, res: Response, next: NextFunction) {
    const startTime = nowMs();

    const requestId =
      (req.headers['x-request-id'] as string | undefined) ??
      (req as any).id ??
      randomUUID();
    (req as any).id = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Capture trace/span while request context is active
    const span = trace.getSpan(context.active());
    const spanContext = span?.spanContext();

    res.on('finish', () => {
      const durationMs = nowMs() - startTime;
      const statusCode = res.statusCode;

      // --- knobs (DX-friendly) ---
      // Stdout logging
      const stdoutMinStatus = envNumber('LOG_HTTP_MIN_STATUS', 200);
      const stdoutSampleRate = clamp01(envNumber('LOG_HTTP_SAMPLE_RATE', 1));

      // SigNoz export (OTLP logs)
      const otelEnabled = (process.env.OTEL_ENABLED ?? 'true').toLowerCase() !== 'false';
      const otelLogsEnabled =
        (process.env.OTEL_LOGS_ENABLED ?? 'true').toLowerCase() !== 'false';
      const otelMinStatus = envNumber('OTEL_LOGS_MIN_STATUS', 200);
      const otelSampleRate = clamp01(envNumber('OTEL_LOGS_SAMPLE_RATE', 1));

      const level =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      const payload = {
        requestId,
        traceId: spanContext?.traceId,
        spanId: spanContext?.spanId,
        req: {
          method: req.method,
          url: req.originalUrl ?? req.url,
          userAgent: req.headers['user-agent'],
          remoteAddress: req.socket?.remoteAddress,
        },
        res: { statusCode },
        durationMs,
      };

      if (statusCode >= stdoutMinStatus && shouldSample(stdoutSampleRate)) {
        logger[level](payload, `${req.method} ${req.originalUrl ?? req.url}`);
      }

      if (
        otelEnabled &&
        otelLogsEnabled &&
        statusCode >= otelMinStatus &&
        shouldSample(otelSampleRate)
      ) {
        // Send request log into SigNoz via OTLP logs.
        // Even if context is lost here, we attach traceId/spanId explicitly.
        otelLogger.emit({
          body: `${req.method} ${req.originalUrl ?? req.url}`,
          severityNumber:
            statusCode >= 500
              ? SeverityNumber.ERROR
              : statusCode >= 400
                ? SeverityNumber.WARN
                : SeverityNumber.INFO,
          severityText:
            statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO',
          attributes: {
            requestId,
            traceId: spanContext?.traceId,
            spanId: spanContext?.spanId,
            'http.request.method': req.method,
            'url.full': req.originalUrl ?? req.url,
            'http.response.status_code': statusCode,
            'http.server.duration_ms': durationMs,
          },
        });
      }
    });

    // Minimal request-start log (optional). Keep quiet by default.
    if (process.env.LOG_REQUEST_START === 'true') {
      logger.info(
        {
          requestId,
          traceId: spanContext?.traceId,
          spanId: spanContext?.spanId,
          req: {
            method: req.method,
            url: req.originalUrl ?? req.url,
            query: req.query,
            params: req.params,
            body: sanitizeBody((req as any).body),
          },
        },
        `→ ${req.method} ${req.originalUrl ?? req.url}`,
      );
    }

    next();
  };
}

