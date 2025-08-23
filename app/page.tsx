import { Suspense } from 'react';
import { Bento } from '@/components/bento/Bento';

// Root route renders the bento dashboard directly so `/` resolves correctly
// in production builds and tests.
export default function HomePage() {
  return (
    <main>
      <Suspense fallback={null}>
        <Bento />
      </Suspense>
    </main>
  );
}
