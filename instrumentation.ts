// Minimal instrumentation file to satisfy Next.js runtime expectations.
// Next.js attempts to import a default export with a `clientModules` array and
// optional hooks for OpenTelemetry or other instrumentation. In our case we do
// not need any instrumentation, but the loader still expects these properties
// to exist.  Exporting an empty array prevents `undefined.clientModules` access
// during startup.
export const clientModules: string[] = [];

// No-op register function.  Next.js will call this during boot if defined, so
// we provide an empty async function to avoid side effects while keeping the
// expected interface.
export async function register(): Promise<void> {
  // Intentionally empty.
}

// Next.js loads the instrumentation module via a default import.  Without a
// default export the module object would be `undefined`, leading to the
// `clientModules` runtime error.  Exporting the required properties as the
// default object ensures the server can safely access them.
export default {
  register,
  clientModules,
};
