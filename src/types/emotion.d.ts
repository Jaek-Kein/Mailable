// src/types/emotion.d.ts
import '@emotion/react';
import type { AppTheme } from '../styles/theme';

declare module '@emotion/react' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Theme extends AppTheme {}
}
