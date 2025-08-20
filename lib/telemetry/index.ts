/**
 * Initializes OpenTelemetry instrumentation when the environment permits.
 *
 * The guard avoids any network or setup cost during local development and
 * continuous integration runs where telemetry is either explicitly disabled
 * or no exporter endpoint is configured.
 */
export async function initTelemetry(): Promise<void> {
  // Skip instrumentation when explicitly disabled in the environment.
  if (process.env.OTEL_SDK_DISABLED === '1') {
    return;
  }

  // If no OTLP endpoint is provided, there is nowhere to send telemetry.
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return;
  }

  // Import @vercel/otel lazily so that the dependency is only loaded when
  // telemetry is actually enabled.
  const { registerOTel } = await import('@vercel/otel');
  registerOTel();
}
