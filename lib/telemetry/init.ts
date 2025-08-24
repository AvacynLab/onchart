/**
 * Runtime entry point for telemetry initialisation.
 *
 * This module executes on the server during application bootstrap. It imports
 * the shared `initTelemetry` helper and invokes it. Any failure during
 * initialisation is swallowed so telemetry never blocks the app from starting.
 */
import { initTelemetry } from '.';

try {
  await initTelemetry();
} catch (err) {
  console.warn('[telemetry] failed to initialise', err);
}
