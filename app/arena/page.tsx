// app/arena/page.tsx (updated section)
'use client';

import { Suspense } from 'react';
import ArenaPageContent from './ArenaPageContent';

export default function ArenaPage() {
  return (
    <Suspense fallback={<div className="text-white p-8">Loading Arena...</div>}>
      <ArenaPageContent />
    </Suspense>
  );
}

