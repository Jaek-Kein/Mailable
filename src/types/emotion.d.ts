// src/types/emotion.d.ts
import '@emotion/react';
import type { AppTheme } from '../styles/theme';

declare module '@emotion/react' {
  // 여기의 Theme이 styled/theme에서 쓰이는 기준 타입이 됩니다.
  export interface Theme extends AppTheme {}
}
