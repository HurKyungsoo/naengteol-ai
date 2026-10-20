export const colors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F6F6F5',
  text: '#111111',
  textMuted: '#9B9B98',
  textSoft: '#6E6E6B',
  border: '#ECECEA',
  ink: '#111111',
  onInk: '#FFFFFF',
  accent: '#F26B2A',
  accentSoft: '#FFEFE6',
  success: '#2E9B5E',
  successSoft: '#E5F5EC',
  heart: '#E5484D',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const shadow = {
  soft: '0px 4px 14px rgba(0, 0, 0, 0.06)',
  sticker: '0px 8px 20px rgba(0, 0, 0, 0.10)',
};

/** 검정 트랙 스위치. 웹에서는 thumbColor 대신 activeThumbColor를 써야 해서 함께 넘긴다. */
export const switchColors = {
  trackColor: { true: colors.ink, false: colors.border },
  thumbColor: colors.surface,
  activeThumbColor: colors.surface,
} as const;

export const type = {
  title: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.6, color: colors.text },
  screenTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  section: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  caption: { fontSize: 13, color: colors.textMuted },
};
