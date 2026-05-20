import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';

let sdk: NodeSDK | undefined;

function isTelemetryEnabled(): boolean {
  return process.env.OTEL_ENABLED === 'true';
}

export async function startTelemetry(serviceName: string): Promise<void> {
  if (!isTelemetryEnabled()) {
    console.log('OpenTelemetry disabled');
    return;
  }

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    throw new Error('OTEL_EXPORTER_OTLP_ENDPOINT is required when OTEL_ENABLED=true');
  }

  sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  await sdk.start();
}

export async function stopTelemetry(): Promise<void> {
  if (!sdk) return;
  await sdk?.shutdown();
}
