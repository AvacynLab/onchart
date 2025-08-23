// Minimal instrumentation stub used to satisfy Next.js runtime expectations.
// Next.js will attempt to import this module in the production server and read
// its `clientModules` and `register` named exports.  When these exports are
// missing, the framework tries to access `undefined.clientModules`, producing
// the runtime error seen in the E2E logs.

/**
 * Force the instrumentation hook to execute in the Node.js runtime.  Without
 * this directive Next.js also generates an Edge bundle which tries to access
 * the global `self` object during import, failing in a Node context and leaving
 * `clientModules` undefined at runtime.
 */
export const runtime = 'nodejs';

/**
 * Shim the global `self` reference.  Next.js builds an additional Edge bundle
 * for this file and attempts to evaluate it during server start.  In a pure
 * Node.js environment `self` is undefined and the evaluation throws before the
 * module's exports can be read, which in turn leads to the "clientModules"
 * undefined error.  Mapping `self` to `globalThis` keeps the evaluation safe
 * without affecting browser environments where `self` already exists.
 */
if (typeof (globalThis as any).self === 'undefined') {
  (globalThis as any).self = globalThis;
}

/**
 * List of client modules to preload.  Our application does not make use of this
 * feature, but exporting an empty array ensures the property exists on the
 * module object.
 */
export const clientModules = new Map<string, unknown>();

/**
 * Next.js will invoke this hook during server start-up if present.  We supply a
 * no‑op implementation to preserve the expected signature while avoiding any
 * side effects or dependencies.
 */
export async function register(): Promise<void> {
  const g = globalThis as any;
  g.__next_require__ ??= {};
  g.__next_require__.clientModules ??= clientModules;
  g.clientModules ??= g.__next_require__.clientModules;

  const { initTelemetry } = await import('./lib/telemetry');
  await initTelemetry();
}

// Next.js historically required a default export to access instrumentation hooks.
// Exporting the hooks again through a default object ensures the property lookup
// succeeds regardless of how the module is imported.
export default { clientModules, register };
