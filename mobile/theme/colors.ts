// =============================================================================
// NutriPulse — Color Palette
// =============================================================================
// Matches the existing web app CSS variables for brand consistency.
// =============================================================================

export const Colors = {
  // ── Backgrounds ────────────────────────────────────────────────────────
  bg: '#030510',
  surface: 'rgba(255, 255, 255, 0.03)',
  surfaceHover: 'rgba(255, 255, 255, 0.06)',
  surfaceActive: 'rgba(255, 255, 255, 0.08)',
  cardBg: 'rgba(15, 15, 30, 0.8)',
  glassBg: 'rgba(10, 10, 20, 0.65)',

  // ── Borders ────────────────────────────────────────────────────────────
  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',

  // ── Text ───────────────────────────────────────────────────────────────
  text: '#e8e6f0',
  textSecondary: 'rgba(232, 230, 240, 0.7)',
  textMuted: 'rgba(232, 230, 240, 0.45)',

  // ── Brand ──────────────────────────────────────────────────────────────
  accent: '#d90429',
  accentLight: '#ff1a1a',
  accentGlow: 'rgba(217, 4, 41, 0.3)',

  // ── Macros ─────────────────────────────────────────────────────────────
  protein: '#d90429',
  carbs: '#ffcc44',
  fats: '#7b61ff',
  water: '#00b4d8',

  // ── Status ─────────────────────────────────────────────────────────────
  success: '#00f5a0',
  danger: '#ff3d6a',
  warning: '#ffcc44',

  // ── Gradients (start, end) ─────────────────────────────────────────────
  gradientAccent: ['#d90429', '#ff1a1a'] as const,
  gradientDark: ['#030510', '#0a0a1a'] as const,
  gradientCard: ['rgba(15,15,30,0.9)', 'rgba(10,10,20,0.7)'] as const,
} as const;
