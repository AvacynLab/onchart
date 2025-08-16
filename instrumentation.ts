// Minimal instrumentation file to satisfy Next.js runtime expectations.
// Next.js will load this module if present and look for a `clientModules` array
// and optional hooks such as `register`.  We don't need any instrumentation, but
// providing these named exports prevents `undefined.clientModules` errors during
// startup.
// Export a `clientModules` array even if empty so Next.js won't attempt to
// access the property on an undefined export.
export const clientModules: string[] = [];

// No-op register function.  Next.js may call this during boot if defined, so we
// provide an empty async function to keep the expected interface while avoiding
// side effects.
export async function register(): Promise<void> {
  // Intentionally empty.
}

// Next.js expects a default export with `clientModules` and `register` fields.
// Without this object, the framework reads these properties from `undefined`
// and the app crashes during start-up.
export default { register, clientModules };
