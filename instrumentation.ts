// Minimal instrumentation stub used to satisfy Next.js runtime expectations.
// Next.js will attempt to import this module in the production server and read
// its `clientModules` and `register` named exports.  When these exports are
// missing, the framework tries to access `undefined.clientModules`, producing
// the runtime error seen in the E2E logs.

/**
 * List of client modules to preload.  Our application does not make use of this
 * feature, but exporting an empty array ensures the property exists on the
 * module object.
 */
export const clientModules: string[] = [];

/**
 * Next.js will invoke this hook during server start-up if present.  We supply a
 * no‑op implementation to preserve the expected signature while avoiding any
 * side effects or dependencies.
 */
export async function register(): Promise<void> {
  // intentionally empty
}

// Next.js historically required a default export to access instrumentation hooks.
// Exporting the hooks again through a default object ensures the property lookup
// succeeds regardless of how the module is imported.
export default { clientModules, register };
