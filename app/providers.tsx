'use client';

import { SessionProvider } from 'next-auth/react';
import { HeroProvider } from './contexts/HeroContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <HeroProvider>{children}</HeroProvider>
    </SessionProvider>
  );
}



