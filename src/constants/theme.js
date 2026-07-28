/**
 * theme.js — Meow Expeditions Visual Theme
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
  zoneSoggyRuins: '#0A120C',
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

  // --- Shared hub design language (warm teal + gold panels) ---
  hubBg: '#133131',             // teal screen background used across redesigned screens
  panelGreenTop: '#102719',     // panel gradient top
  panelGreenBottom: '#0A160F',  // panel gradient bottom
  panelGreen: '#142C1C',        // flat panel background
  panelBorderGold: 'rgba(212, 167, 84, 0.15)', // soft gold panel border
  panelBorderGoldStrong: 'rgba(212, 167, 84, 0.35)', // gold chip/pill border
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

// ─── Typography Roles ───────────────────────────────────────────────────────────
// Each font family owns a semantic job — don't mix them:
//   • Jersey10   → titles & readable prose
//   • Silkscreen → UI labels, chips, buttons
//   • PressStart → retro numeric / display values
//
// Spread a role into a text style and let it supply family + size + casing:
//   headerText: { ...theme.FONTS.screenTitle, color: theme.COLORS.parchment }
// Only override when a spot is a deliberate exception; keep those rare.
const FONTS = {
  // ── Jersey10 — titles & prose ──────────────────────────────────
  screenTitle: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 28, // top-of-screen header
  },
  title: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 22, // panel / card / modal title
  },
  proseLg: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 24, // lead / hero reading text — lore & onboarding panels only, use sparingly
    lineHeight: 36,
  },
  prose: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 18, // default body copy & descriptions (readable on mobile)
    lineHeight: 27,
  },
  proseSm: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 14, // dense / secondary body copy
    lineHeight: 21,
  },

  // ── Silkscreen — UI labels, chips, buttons ─────────────────────
  button: {
    fontFamily: 'Silkscreen-Regular',
    fontWeight: 'normal',
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase', // primary action buttons
  },
  labelLg: {
    fontFamily: 'Silkscreen-Regular',
    fontWeight: 'normal',
    fontSize: 14, // prominent stat / progress label
  },
  chip: {
    fontFamily: 'Silkscreen-Regular',
    fontWeight: 'normal',
    fontSize: 12, // standard label / chip value
  },
  caption: {
    fontFamily: 'Silkscreen-Regular',
    fontWeight: 'normal',
    fontSize: 11, // smallest reading text — helper / small tag (= iOS Caption 2, the min readable floor)
  },
  glyph: {
    fontFamily: 'Silkscreen-Regular',
    fontWeight: 'normal',
    fontSize: 9, // tiny glyph / badge ONLY — below iOS 11pt / Material 11sp text floors, do not use for reading text
  },

  // ── PressStart2P — retro display values ────────────────────────
  displayLg: {
    fontFamily: 'PressStart2P-Regular',
    fontWeight: 'normal',
    fontSize: 18, // big retro display
  },
  displaySm: {
    fontFamily: 'PressStart2P-Regular',
    fontWeight: 'normal',
    fontSize: 12, // inline numeric value
  },

  // ── Legacy presets (still referenced in CombatScreen, DungeonMap,
  //    WorldMap, ResourceBar, tutorials). Do NOT change these values —
  //    they'll be migrated to the roles above screen-by-screen, then
  //    removed. `heading`≈subtitle, `display`≈displayLg, `small`≈micro. ──
  display: {
    fontFamily: 'PressStart2P-Regular',
    fontWeight: 'normal',
    fontSize: 18,
  },
  heading: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 16,
  },
  body: {
    fontFamily: 'Jersey10-Regular',
    fontWeight: 'normal',
    fontSize: 13,
    lineHeight: 19.5,
  },
  label: {
    fontFamily: 'Silkscreen-Regular',
    fontWeight: 'normal',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  small: {
    fontFamily: 'Silkscreen-Regular',
    fontWeight: 'normal',
    fontSize: 10,
    lineHeight: 14,
  },
  tiny: {
    // Was referenced 4× in WorldMapScreen but never defined (silent no-op).
    // Defined now so the role resolves; those sites still override size explicitly.
    fontFamily: 'Silkscreen-Regular',
    fontWeight: 'normal',
    fontSize: 9,
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

