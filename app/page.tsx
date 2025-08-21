"use client";

import { Bento } from '@/components/bento/Bento';

// Mark the home page as a client component so the server doesn't attempt to
// import the interactive dashboard. This keeps the server bundle slim and
// avoids RSC ↔ client boundary issues.
export default function HomePage() {
  return (
    <main>
      <Bento />
    </main>
  );
}

