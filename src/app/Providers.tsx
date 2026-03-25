// src/app/Providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@emotion/react';
import { theme } from '@/src/styles/theme';
import EmotionRegistry from './EmotionRegistry';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <EmotionRegistry>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </EmotionRegistry>
    </SessionProvider>
  );
}
