import { Suspense } from 'react';
import { Bento } from '@/components/bento/Bento';

// Home page displaying the bento dashboard through a Suspense boundary
// so the server can stream the shell before client components hydrate.
export default function HomePage() {
  return (
    <main>
      <Suspense fallback={null}>
        <Bento />
      </Suspense>
    </main>
  );
}
