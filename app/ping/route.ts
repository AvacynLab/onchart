// Ensure the healthcheck runs in the Node.js runtime for broad compatibility.
export const runtime = 'nodejs';

// Healthcheck endpoint used by Playwright's readiness probe. It exposes basic
// metadata such as the package version and commit SHA when available so CI logs
// can easily verify which build is under test.
export async function GET() {
  return Response.json({
    ok: true,
    version: process.env.npm_package_version,
    commit: process.env.GITHUB_SHA?.slice(0, 7) ?? null,
  });
}

// Some platforms issue HEAD requests instead of GET for liveness checks. Return
// a minimal 200 response without a body for those clients.
export async function HEAD() {
  return new Response(null, { status: 200 });
}
