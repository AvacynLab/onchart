import { test } from 'node:test';

// Ensures that telemetry initialisation is skipped when explicitly disabled
// via environment variables. If the guard fails and attempts to configure
// telemetry, the test would throw due to the missing OTLP endpoint.

test('initTelemetry respects OTEL_SDK_DISABLED', async () => {
  process.env.OTEL_SDK_DISABLED = '1';

  const { initTelemetry } = await import('@/lib/telemetry');
  await initTelemetry();

  delete process.env.OTEL_SDK_DISABLED;
});
