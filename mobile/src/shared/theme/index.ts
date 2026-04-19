export const theme = {
  colors: {
    background: '#FFF4E0',
    surface: '#FFFFFF',
    text: '#2B2B2B',
    textMuted: '#6B6B6B',
    accent: '#FF7A59',
    accentMuted: '#FFB199',
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#E53935',
    border: '#E8DCC5',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radii: {
    sm: 6,
    md: 12,
    lg: 20,
    full: 999,
  },
  typography: {
    heading: {
      fontSize: 32,
      fontWeight: '700' as const,
    },
    title: {
      fontSize: 22,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 13,
      fontWeight: '400' as const,
    },
  },
} as const;

export type Theme = typeof theme;
