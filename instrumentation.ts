// Basic Next.js instrumentation to register telemetry and expose client modules.
// Provides a backward-compatible default export for older Next loaders.

// Named export expected by Next.js runtime. Leave empty until client modules
// are required.
export const clientModules: string[] = [];

// Register OpenTelemetry integration. When OTEL is disabled (e.g., in CI) this
// function silently returns. Any errors during dynamic import are caught and
// logged as warnings to avoid failing the boot process.
export async function register(): Promise<void> {
  if (process.env.OTEL_SDK_DISABLED === '1') return;
  try {
    // Option 1: use Vercel's helper if available.
    // const { registerOTel } = await import('@vercel/otel');
    // registerOTel({ serviceName: 'onchart' });

    // Option 2: project-specific telemetry initialisation. The imported module
    // performs its work at top level and resolves to a no-op when telemetry is
    // disabled or misconfigured.
    await import('./lib/telemetry/init');
  } catch (e) {
    console.warn('[telemetry] disabled or failed to init:', e);
  }
}

// Fallback for older Next.js loaders expecting a default export containing the
// named hooks. The intermediate constant avoids an anonymous default export
// which some lint configurations forbid.
const instrumentation = { register, clientModules };
export default instrumentation;
