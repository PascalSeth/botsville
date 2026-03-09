'use client';

import { SessionProvider } from 'next-auth/react';
import { HeroProvider } from './contexts/HeroContext';
import { Toaster } from 'sonner';
import NotificationInitializer from './components/NotificationInitializer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <HeroProvider>
        <NotificationInitializer />
        {children}
      </HeroProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#0e0e16', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' },
        }}
        richColors
      />
    </SessionProvider>
  );
}



