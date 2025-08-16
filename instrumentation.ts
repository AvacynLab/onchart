// Minimal instrumentation file to satisfy Next.js runtime expectations.
// Next.js will load this module if present and look for a `clientModules` array
// and optional hooks such as `register`.  We don't need any instrumentation, but
// providing these named exports prevents `undefined.clientModules` errors during
// startup.
export const clientModules: string[] = [];

// No-op register function.  Next.js may call this during boot if defined, so we
// provide an empty async function to keep the expected interface while avoiding
// side effects.
export async function register(): Promise<void> {
  // Intentionally empty.
}
