// Health check endpoint for Playwright's readiness probe.
// Exposes application version and commit metadata when available so CI logs
// can confirm which build responded.

export const runtime = 'nodejs';

/**
 * Respond to GET requests with a JSON payload indicating basic server health.
 * Including version and commit helps track deployments during debugging.
 */
export async function GET() {
  return Response.json(
    {
      ok: true,
      version: process.env.npm_package_version,
      commit: process.env.GITHUB_SHA?.slice(0, 7) ?? null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * Respond to HEAD requests with an empty 200. Some container platforms perform
 * HEAD probes instead of GET, so supporting both maximises compatibility.
 */
export async function HEAD() {
  return new Response(null, { status: 200 });
}
