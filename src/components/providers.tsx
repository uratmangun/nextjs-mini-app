'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';
import { FarcasterProvider } from '@/components/providers/farcaster-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <FarcasterProvider>
        {children}
      </FarcasterProvider>
    </ThemeProvider>
  );
}