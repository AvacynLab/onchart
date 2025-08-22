// NextAuth relies on Node.js APIs; ensure this route executes in the Node
// runtime so authentication logic behaves consistently across environments.
export const runtime = 'nodejs';

export { GET, POST } from '@/app/(auth)/auth';
