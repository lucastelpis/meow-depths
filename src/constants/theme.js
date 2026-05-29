/**
 * theme.js — Meow Depths Visual Theme
 *
 * Central design-token file consumed by every screen and component.
 * Organised into COLORS, FONTS, SPACING, and BORDER_RADIUS sections.
 */

// ─── Colour Palette ────────────────────────────────────────────────────────────
const COLORS = {
  /* Scene backgrounds */
  background: '#0D0D0D',           // Generic dark fallback
  campBackground: '#0E0E14',       // Sleek premium dark background
  dungeonBackground: '#0F0F1A',    // Cold dungeon blue-black
  mapBackground: '#0A120A',        // Dark mossy green

  /* Brand / UI accents */
  primary: '#D4A754',              // Warm amber — main interactive colour
  secondary: '#8B6914',            // Darker gold — secondary actions
  accent: '#FF6B35',               // Orange pop — highlights & notifications

  /* Semantic colours */
  danger: '#FF4444',
  success: '#4CAF50',

  /* Player resource bars */
  hp: '#FF4444',
  hpBar: '#CC3333',
  xp: '#6B9BD2',
  gold: '#FFD700',

  /* Typography */
  text: '#E8DCC8',                 // Default body text (parchment white)
  textDim: '#8B7D6B',             // Muted / secondary labels
  textBright: '#FFF5E6',          // Emphasised / title text

  /* Cards & containers */
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.05)',

  /* Buttons */
  buttonPrimary: '#D4A754',
  buttonDisabled: '#4A4A4A',

  /* Combat overlays */
  cooldownOverlay: 'rgba(0,0,0,0.7)',

  /* Status-effect colours */
  bleed: '#FF3333',
  stun: '#FFD700',
  guard: '#4488FF',
  stealth: '#9933FF',
  deathMark: '#FF0066',
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
};
