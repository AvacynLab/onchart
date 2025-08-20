import { Suspense } from 'react';
import { Bento } from '@/components/bento/Bento';

// Render the dashboard within a suspense boundary so the initial server output
// stays minimal and client components hydrate only when needed.
export default function HomePage() {
  return (
    <main>
      <Suspense fallback={null}>
        <Bento />
      </Suspense>
    </main>
  );
}

