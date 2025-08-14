// Simple healthcheck endpoint used by Playwright's webServer readiness probe.
// Returns a 200 status with a small body once the Next.js server is ready.
export async function GET() {
  return new Response('pong');
}
