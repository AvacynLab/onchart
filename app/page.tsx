import { Suspense } from 'react';
import { Bento } from '@/components/bento/Bento';

// Render the interactive dashboard within a Suspense boundary so the server
// can stream the shell without waiting for client modules to load. The Bento
// component itself is marked as a client component and exposes the
// `data-testid="bento-grid"` hook used by end-to-end tests.
export default function HomePage() {
  return (
    <main>
      <Suspense fallback={null}>
        <Bento />
      </Suspense>
    </main>
  );
}
