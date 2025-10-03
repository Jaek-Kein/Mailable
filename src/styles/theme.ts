export const theme = {
  color: {
    bg: '#f7f8fa',
    card: '#ffffff',
    text: '#0f172a',
    sub: '#475569',
    primary: '#2563eb',
    border: '#e2e8f0',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  radius: {
    md: '14px',
    lg: '20px',
  },
  shadow: {
    card: '0 6px 20px rgba(2, 6, 23, 0.06)',
  },
  space: (n: number) => `${4 * n}px`,
} as const;

export type AppTheme = typeof theme;
