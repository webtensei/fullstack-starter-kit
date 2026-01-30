import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

let sdk: NodeSDK | null = null;

export async function startOtel() {
  if (sdk) return;

  // Useful during local bring-up; turn on with OTEL_DIAG=debug
  if (process.env.OTEL_DIAG?.toLowerCase() === 'debug') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const serviceName = process.env.OTEL_SERVICE_NAME ?? 'api';
  const otlpTracesEndpoint =
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
    'http://localhost:4318/v1/traces';
  const otlpLogsEndpoint =
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ??
    'http://localhost:4318/v1/logs';
  const deploymentEnv =
    process.env.DEPLOYMENT_ENV ?? process.env.NODE_ENV ?? 'development';
  const otelLogsEnabled =
    (process.env.OTEL_LOGS_ENABLED ?? 'true').toLowerCase() !== 'false';

  // Trace sampling:
  // - default: 1.0 in non-production, 0.1 in production
  // - override via OTEL_TRACE_SAMPLE_RATE (0..1)
  const defaultSampleRate = deploymentEnv === 'production' ? 0.1 : 1.0;
  const sampleRateRaw = process.env.OTEL_TRACE_SAMPLE_RATE;
  const sampleRate = sampleRateRaw == null ? defaultSampleRate : Number(sampleRateRaw);
  const normalizedSampleRate =
    Number.isFinite(sampleRate) ? Math.max(0, Math.min(1, sampleRate)) : defaultSampleRate;

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
        deploymentEnv,
    }),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(normalizedSampleRate),
    }),
    traceExporter: new OTLPTraceExporter({
      url: otlpTracesEndpoint,
    }),
    logRecordProcessors: otelLogsEnabled
      ? [
          new BatchLogRecordProcessor(
            new OTLPLogExporter({
              url: otlpLogsEndpoint,
            }),
          ),
        ]
      : [],
    instrumentations: [
      getNodeAutoInstrumentations({
        // We already log HTTP requests ourselves; keep OTel noise low.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
      new PinoInstrumentation(),
      new PrismaInstrumentation(),
    ],
  });

  await sdk.start();
}

export async function stopOtel() {
  if (!sdk) return;
  await sdk.shutdown();
  sdk = null;
}

