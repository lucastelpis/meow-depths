/**
 * theme.js — Meow Depths Visual Theme
 *
 * Central design-token file consumed by every screen and component.
 * Organised into COLORS, FONTS, SPACING, and BORDER_RADIUS sections.
 */

// ─── Colour Palette ────────────────────────────────────────────────────────────
const COLORS = {
  /* Scene backgrounds */
  background: '#07070A',           // Deep obsidian
  campBackground: '#0B0B12',       // Twilight navy
  dungeonBackground: '#0A0A10',    // Obsidian dungeon
  mapBackground: '#050B05',        // Mossy dark green

  /* Brand / UI accents */
  primary: '#D4A754',              // Warm amber — main interactive colour
  secondary: '#8B6914',            // Darker gold — secondary actions
  accent: '#FF6B35',               // Orange pop — highlights & notifications

  /* Semantic colours */
  danger: '#FF4444',
  success: '#10B981',              // Modern emerald green
  info: '#06B6D4',                 // Modern cyan/teal

  /* Player resource bars */
  hp: '#EF4444',
  hpBar: '#B91C1C',
  xp: '#3B82F6',
  gold: '#FBBF24',

  /* Typography */
  text: '#E2E8F0',                 // Cool parchment white
  textDim: '#707F94',              // Muted grey-blue labels
  textBright: '#F8FAFC',           // Emphasised title white

  /* Cards & containers */
  cardBg: 'rgba(255, 255, 255, 0.025)',
  cardBorder: 'rgba(255, 255, 255, 0.05)',
  glassBg: 'rgba(255, 255, 255, 0.015)',
  glassBorder: 'rgba(255, 255, 255, 0.04)',

  /* Buttons */
  buttonPrimary: '#D4A754',
  buttonDisabled: '#334155',

  /* Combat overlays */
  cooldownOverlay: 'rgba(0,0,0,0.75)',

  /* Status-effect colours */
  bleed: '#EF4444',
  stun: '#FBBF24',
  guard: '#3B82F6',
  stealth: '#8B5CF6',
  deathMark: '#EC4899',
};

// ─── Glow & Drop Shadows ───────────────────────────────────────────────────────
const SHADOWS = {
  glowPrimary: {
    shadowColor: '#D4A754',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  glowDanger: {
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  glowSuccess: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  glowInfo: {
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

// ─── Font Presets ───────────────────────────────────────────────────────────────
const FONTS = {
  title: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 24,
  },
  heading: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 20,
  },
  body: {
    fontFamily: 'System',
    fontWeight: 'normal',
    fontSize: 16,
  },
  small: {
    fontFamily: 'System',
    fontWeight: 'normal',
    fontSize: 13,
  },
  tiny: {
    fontFamily: 'System',
    fontWeight: 'normal',
    fontSize: 11,
  },
};

// ─── Spacing Scale (multiples of 4) ────────────────────────────────────────────
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// ─── Border Radius Tokens ──────────────────────────────────────────────────────
const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};

// ─── Default Export ─────────────────────────────────────────────────────────────
export default {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
};
