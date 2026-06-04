/**
 * enemies.js — v2 revised stats
 *
 * Every creature the player can encounter across the three dungeon zones.
 * Bosses carry `isBoss: true` and define `phaseChanges` for mid-fight events.
 */

// Applied to both HP and ATK at encounter generation time.
// 5★ bosses are excluded — their stats are fixed in the definition.
export const STAR_MULTIPLIERS = {
  1: 1.00,
  2: 1.25,
  3: 1.50,
  4: 2.00,
};

// ─────────────────────────────────────────────────────────────────────────────
// Zone 1 — The Soggy Sewers (Black Crystals)
// ─────────────────────────────────────────────────────────────────────────────

// Zone 1 — skittery melee
const sewer_rat = {
  id: 'sewer_rat',
  name: 'Sewer Rat',
  stars: 1,
  hp: 65,
  attack: 5,
  def: 0,
  dodge: 0.10,
  crit: 0.00,
  zone: 1,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'black_shard', chance: 0.85, count: 2 },
  ],
  moves: [
    { name: 'Gnaw', damage: 5, minStars: 1 },
    {
      name: 'Lunge',
      multiplier: 1.4,
      effect: { type: "bleed", chance: 0.50, damage: 3, duration: 3 },
      minStars: 3,
      cooldown: 3,
    },
  ],
  phaseChanges: [],
};

// Zone 1 — weak debuffer
const slimeling = {
  id: 'slimeling',
  name: 'Slimeling',
  stars: 1,
  hp: 75,
  attack: 4,
  def: 0,
  dodge: 0.00,
  crit: 0.00,
  zone: 1,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'black_shard', chance: 0.80, count: 2 },
    { itemId: 'black_crystal_small', chance: 0.35 },
  ],
  moves: [
    {
      name: 'Ooze Splash',
      multiplier: 1.0,
      minStars: 1,
    },
    {
      name: 'Engulf',
      multiplier: 1.2,
      effect: { type: 'atk_reduce', chance: 1.0, value: 0.20, duration: 2 },
      minStars: 3,
      cooldown: 3,
    },
  ],
  phaseChanges: [],
};

// Zone 1 — armored tank
const cockroach_knight = {
  id: 'cockroach_knight',
  name: 'Cockroach Knight',
  stars: 2,
  hp: 90,
  attack: 7,
  def: 3,
  dodge: 0.00,
  crit: 0.00,
  zone: 1,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'black_shard', chance: 0.75, count: 2 },
    { itemId: 'black_crystal_small', chance: 0.55 },
  ],
  moves: [
    {
      name: 'Shell Bash',
      multiplier: 1.0,
      minStars: 1,
      priority: 1,
    },
    {
      name: 'Fortify',
      effect: 'fortify_self',
      minStars: 2,
      cooldown: 4,
      priority: 3,
    },
    {
      name: 'Carapace Slam',
      multiplier: 1.6,
      minStars: 3,
      cooldown: 3,
      priority: 2,
    },
  ],
  phaseChanges: [],
};

// Zone 1 — debuff applier
const plague_frog = {
  id: 'plague_frog',
  name: 'Plague Frog',
  stars: 1,
  hp: 70,
  attack: 5,
  def: 0,
  dodge: 0.05,
  crit: 0.00,
  zone: 1,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'black_shard', chance: 0.75, count: 2 },
    { itemId: 'black_crystal_small', chance: 0.45 },
  ],
  moves: [
    {
      name: 'Hop',
      multiplier: 1.0,
      minStars: 1,
      priority: 1,
    },
    {
      name: 'Tongue Grab',
      multiplier: 1.3,
      effect: { type: 'stun', chance: 0.30, duration: 1 },
      minStars: 3,
      cooldown: 3,
      priority: 2,
    },
  ],
  phaseChanges: [],
};

/** Zone 1 — Boss */
const king_rat = {
  id: 'king_rat',
  name: 'King Rat',
  stars: 5,
  hp: 400,
  attack: 18,
  def: 5,
  dodge: 0.00,
  crit: 0.05,
  zone: 1,
  isBoss: true,
  isElite: false,
  drops: [
    { itemId: 'black_crystal_core', chance: 1.0, count: 2 },
    { itemId: 'black_crystal_big', chance: 1.0, count: 3 },
    { itemId: 'black_crystal_small', chance: 1.0, count: 4 },
    { itemId: 'gnarlcrown_shard', chance: 1.0 },
    { itemId: 'black_shard_fire', chance: 1.0, count: 2 },
    { itemId: 'black_shard_water', chance: 1.0, count: 2 },
    { itemId: 'black_shard_earth', chance: 1.0, count: 2 },
    { itemId: 'black_shard_wind', chance: 1.0, count: 2 },
  ],
  moves: [
    {
      name: 'Gnaw',
      multiplier: 1.0,
      minStars: 1,
    },
    {
      name: 'Savage Bite',
      multiplier: 1.7,
      minStars: 1,
      cooldown: 3,
    },
    {
      name: 'Vampiric Bite',
      multiplier: 1.3,
      effect: 'vampiric_bite',
      minStars: 1,
      cooldown: 5,
    },
    {
      name: 'Summon Rats',
      effect: 'summon_rats',
      minStars: 1,
    },
  ],
  phaseChanges: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Zone 2 — The Twisted Garden (Green Crystals)
// ─────────────────────────────────────────────────────────────────────────────

// Zone 2 — fast attacker
const thorn_sprite = {
  id: 'thorn_sprite',
  name: 'Thorn Sprite',
  stars: 2,
  hp: 130,
  attack: 12,
  def: 0,
  dodge: 0.15,
  crit: 0.00,
  zone: 2,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'green_shard', chance: 0.85, count: 2 },
  ],
  moves: [
    { name: 'Thorn Jab', damage: 12 },
  ],
  phaseChanges: [],
};

// Zone 2 — high DEF tank
const giant_beetle = {
  id: 'giant_beetle',
  name: 'Giant Beetle',
  stars: 2,
  hp: 160,
  attack: 10,
  def: 6,
  dodge: 0.00,
  crit: 0.00,
  zone: 2,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'green_shard', chance: 0.75, count: 2 },
    { itemId: 'green_crystal_small', chance: 0.55 },
  ],
  moves: [
    { name: 'Crush', damage: 10 },
  ],
  phaseChanges: [],
};

// Zone 2 — ATK debuffer
const mushroom_puffer = {
  id: 'mushroom_puffer',
  name: 'Mushroom Puffer',
  stars: 1,
  hp: 135,
  attack: 9,
  def: 0,
  dodge: 0.00,
  crit: 0.00,
  zone: 2,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'green_shard', chance: 0.80, count: 2 },
    { itemId: 'green_crystal_small', chance: 0.35 },
  ],
  moves: [
    { name: 'Spore Cloud', damage: 9, effect: { type: "atk_reduce", chance: 0.50, value: 0.20, duration: 2 } },
  ],
  phaseChanges: [],
};

// Zone 2 — ambush predator
const vine_lurker = {
  id: 'vine_lurker',
  name: 'Vine Lurker',
  stars: 2,
  hp: 150,
  attack: 13,
  def: 2,
  dodge: 0.00,
  crit: 0.10,
  zone: 2,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'green_shard', chance: 0.75, count: 2 },
    { itemId: 'green_crystal_small', chance: 0.45 },
  ],
  moves: [
    { name: 'Constrict', damage: 13, effect: { type: "dodge_reduce", chance: 1.0, value: 0.15, duration: 2 } },
  ],
  phaseChanges: [],
};

/** Zone 2 — Boss */
const rootmother = {
  id: 'rootmother',
  name: 'Rootmother',
  stars: 5,
  hp: 600,
  attack: 25,
  def: 8,
  dodge: 0.00,
  crit: 0.05,
  zone: 2,
  isBoss: true,
  isElite: false,
  drops: [
    { itemId: 'green_crystal_core', chance: 1.0, count: 2 },
    { itemId: 'green_crystal_big', chance: 1.0, count: 3 },
    { itemId: 'green_crystal_small', chance: 1.0, count: 4 },
    { itemId: 'rootmother_heart', chance: 1.0 },
    { itemId: 'green_crystal_fire', chance: 1.0, count: 2 },
    { itemId: 'green_crystal_water', chance: 1.0, count: 2 },
    { itemId: 'green_crystal_earth', chance: 1.0, count: 2 },
    { itemId: 'green_crystal_wind', chance: 1.0, count: 2 },
  ],
  moves: [
    { name: 'Root Slam', damage: 25 },
  ],
  phaseChanges: [
    {
      hpPercent: 0.6,
      action: 'entangle',
      description: 'Player skips next turn',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Zone 3 — The Sunken Docks (Yellow Crystals)
// ─────────────────────────────────────────────────────────────────────────────

// Zone 3 — armored melee
const barnacle_crab = {
  id: 'barnacle_crab',
  name: 'Barnacle Crab',
  stars: 3,
  hp: 240,
  attack: 16,
  def: 5,
  dodge: 0.00,
  crit: 0.00,
  zone: 3,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'yellow_shard', chance: 0.85, count: 2 },
  ],
  moves: [
    { name: 'Claw Snap', damage: 16 },
  ],
  phaseChanges: [],
};

// Zone 3 — unpredictable mage
const sea_witch_eel = {
  id: 'sea_witch_eel',
  name: 'Sea Witch Eel',
  stars: 3,
  hp: 200,
  attack: 20,
  def: 2,
  dodge: 0.10,
  crit: 0.15,
  zone: 3,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'yellow_shard', chance: 0.75, count: 2 },
    { itemId: 'yellow_crystal_small', chance: 0.55 },
  ],
  moves: [
    { name: 'Hex', damage: 20, effect: { type: "crit_reduce", chance: 1.0, value: 0.15, duration: 2 } },
  ],
  phaseChanges: [],
};

// Zone 3 — ethereal stunner
const drowned_sailor = {
  id: 'drowned_sailor',
  name: 'Drowned Sailor',
  stars: 3,
  hp: 220,
  attack: 17,
  def: 3,
  dodge: 0.05,
  crit: 0.00,
  zone: 3,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'yellow_shard', chance: 0.75, count: 2 },
    { itemId: 'yellow_crystal_small', chance: 0.45 },
  ],
  moves: [
    { name: 'Haunt', damage: 17, effect: { type: "stun", chance: 0.30 } },
  ],
  phaseChanges: [],
};

/** Zone 3 — The Pufferfish Bomb gets ONE attack total. When it takes its turn,
    it deals 25 damage to the player AND immediately dies (removed from combat).
    Killing it before it acts prevents the self-destruct damage entirely.
    This creates a tactical decision: kill it first or let it self-destruct. */
const pufferfish_bomb = {
  id: 'pufferfish_bomb',
  name: 'Pufferfish Bomb',
  stars: 3,
  hp: 180,
  attack: 25,
  def: 0,
  dodge: 0.00,
  crit: 0.00,
  zone: 3,
  isBoss: false,
  isElite: false,
  drops: [
    { itemId: 'yellow_shard', chance: 0.80, count: 2 },
    { itemId: 'yellow_crystal_small', chance: 0.35 },
  ],
  moves: [
    { name: 'Explode', damage: 25, effect: { type: "self_destruct", chance: 1.0 } },
  ],
  phaseChanges: [],
};

/** Zone 3 — Boss */
const captain_moray = {
  id: 'captain_moray',
  name: 'Captain Moray',
  stars: 5,
  hp: 900,
  attack: 30,
  def: 10,
  dodge: 0.00,
  crit: 0.08,
  zone: 3,
  isBoss: true,
  isElite: false,
  drops: [
    { itemId: 'yellow_crystal_core', chance: 1.0, count: 2 },
    { itemId: 'yellow_crystal_big', chance: 1.0, count: 3 },
    { itemId: 'yellow_crystal_small', chance: 1.0, count: 4 },
    { itemId: 'morays_fang', chance: 1.0 },
    { itemId: 'yellow_crystal_fire', chance: 1.0, count: 2 },
    { itemId: 'yellow_crystal_water', chance: 1.0, count: 2 },
    { itemId: 'yellow_crystal_earth', chance: 1.0, count: 2 },
    { itemId: 'yellow_crystal_wind', chance: 1.0, count: 2 },
  ],
  moves: [
    { name: 'Cutlass Sweep', damage: 30 },
  ],
  phaseChanges: [
    {
      action: 'anchor',
      anchorHp: 200,
      description: 'While anchor alive, reforms at 50 HP when killed',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Aggregated map — keyed by enemy id for O(1) lookup
// ─────────────────────────────────────────────────────────────────────────────

export const ENEMIES = {
  sewer_rat,
  slimeling,
  cockroach_knight,
  plague_frog,
  king_rat,
  thorn_sprite,
  giant_beetle,
  mushroom_puffer,
  vine_lurker,
  rootmother,
  barnacle_crab,
  sea_witch_eel,
  drowned_sailor,
  pufferfish_bomb,
  captain_moray,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper — returns an array of enemy definitions that belong to a given zone
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {number} zoneId — 1, 2, or 3
 * @returns {Array} enemies belonging to that zone
 */
export function getEnemiesByZone(zoneId) {
  return Object.values(ENEMIES).filter((enemy) => enemy.zone === zoneId);
}

export default ENEMIES;
