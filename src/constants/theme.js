/**
 * theme.js — Meow Depths Visual Theme
 *
 * Central design-token file consumed by every screen and component.
 * Organised into COLORS, FONTS, SPACING, and BORDER_RADIUS sections.
 */

// ─── Colour Palette ────────────────────────────────────────────────────────────
const COLORS = {
  // Warm palette (safe — camp, shop, menus, victory)
  hearthBlack: '#1A1200',
  emberBrown: '#3A2C14',
  torchOrange: '#B5701A',
  candleGold: '#E8A73A',
  warmGlow: '#F5CF7A',
  parchment: '#F3E2BD',

  // Cold palette (danger — dungeons, combat)
  voidNavy: '#0D1016',
  sewerBlack: '#0A120C',
  slateSteel: '#24323F',
  coldBlue: '#5A9FE0',
  mysteryViolet: '#A98EE0',
  ghostWhite: '#CFE0EE',

  // Functional colors (consistent meaning everywhere)
  healthGreen: '#3FB56E',
  damageRed: '#D8483F',
  critOrange: '#F08A4A',
  treasureGold: '#F5CF4A',
  skillPurple: '#A98EE0',
  buffMint: '#5CC489',

  // Zone background tints
  zoneSoggySewers: '#0A120C',
  zoneTwistedGarden: '#0C1A08',
  zoneSunkenDocks: '#08101F',

  // --- Legacy bindings to prevent instant crashes during refactor ---
  background: '#1A1200',        // fallback to hearthBlack
  primary: '#B5701A',           // fallback to torchOrange
  secondary: '#3A2C14',         // fallback to emberBrown
  text: '#F3E2BD',              // fallback to parchment
  textDim: '#E8A73A',           // fallback to candleGold

  // --- Extended aliases used across screens ---
  textBright: '#CFE0EE',        // ghostWhite alias
  danger: '#D8483F',            // damageRed alias
  stun: '#F5CF4A',              // treasureGold alias (stun / gold highlight)
  dungeonBackground: '#0D1016', // voidNavy alias
  cardBg: '#241A0C',            // dark warm panel background
  cardBorder: '#4A3917',        // dark warm panel border

  // --- Missing variables referenced in components ---
  success: '#5CC489',           // buffMint alias
  gold: '#F5CF7A',              // warmGlow alias
  accent: '#F5CF7A',            // warmGlow alias
  hp: '#D8483F',                // damageRed alias
  buttonDisabled: '#1A1A1A',    // dark grey disabled background
  bleed: '#D8483F',             // damageRed alias
  guard: '#5A9FE0',             // coldBlue alias
  stealth: '#A98EE0',           // mysteryViolet alias
};

// ─── Glow & Drop Shadows ───────────────────────────────────────────────────────
const SHADOWS = {
  glowFocus: { // border / focus
    shadowColor: COLORS.treasureGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
};

// ─── Font Presets ───────────────────────────────────────────────────────────────
const FONTS = {
  display: {
    fontFamily: 'PressStart2P-Regular', // Retro 8-bit NES display font
    fontWeight: 'normal',
    fontSize: 18, // Decreased from 24 as Press Start is wider and taller
  },
  heading: {
    fontFamily: 'PixelifySans-Medium', // Proportional clean pixel font for headers
    fontWeight: 'normal',
    fontSize: 16,
  },
  body: {
    fontFamily: 'PixelifySans-Regular', // High legibility proportional pixel font
    fontWeight: 'normal',
    fontSize: 13,
    lineHeight: 19.5, // 1.5x of 13px
  },
  label: {
    fontFamily: 'Silkscreen-Regular', // Crisp micro pixel font
    fontWeight: 'normal',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  small: {
    fontFamily: 'Silkscreen-Regular', // Crisp micro pixel font
    fontWeight: 'normal',
    fontSize: 10,
    lineHeight: 14,
  },
};

// ─── Spacing Scale (multiples of 4) ────────────────────────────────────────────
const SPACING = {
  xs: 4,
  sm: 8,           // alias for tight
  tight: 8,        // gap / tight (6-8px)
  md: 12,
  section: 16,     // gap / section (14-16px)
  screen: 14,      // padding / screen
  lg: 20,
  xl: 24,
};

// ─── Border Radius Tokens ──────────────────────────────────────────────────────
const BORDER_RADIUS = {
  button: 12,     // radius / button
  md: 12,         // alias for button
  card: 14,       // radius / card
  pill: 20,       // radius / pill
  xl: 20,         // large overlay cards
};

// ─── Default Export ─────────────────────────────────────────────────────────────
export default {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
};

