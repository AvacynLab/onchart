// Simple healthcheck endpoint used by Playwright's webServer readiness probe.
// Returns a 200 status with a small body once the Next.js server is ready.
export async function GET() {
  // Respond with a plain 200 so external systems can quickly verify that the
  // server is ready. No database or other dependencies are touched.
  return new Response('pong', { status: 200 });
}
