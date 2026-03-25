export const theme = {
  color: {
    bg: '#faf9f7',
    card: '#ffffff',
    text: '#1a1a2e',
    sub: '#3d3d5c',
    muted: '#8888a8',
    primary: '#1a1a2e',
    accent: '#e8533a',
    accentLight: '#fdf1ee',
    gold: '#c9a84c',
    border: '#e2dfd8',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  radius: {
    md: '12px',
    lg: '16px',
  },
  shadow: {
    card: '0 4px 16px rgba(26, 26, 46, 0.07)',
  },
  space: (n: number) => `${4 * n}px`,
} as const;

export type AppTheme = typeof theme;
