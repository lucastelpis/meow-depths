/**
 * enemies.js — v2 revised stats
 *
 * Every creature the player can encounter across the three dungeon zones.
 * Bosses carry `isBoss: true` and define `phaseChanges` for mid-fight events.
 *
 * Optional `minFloor` (default 1): the earliest floor of a zone on which the
 * enemy can spawn in normal/ambush encounters. e.g. `minFloor: 5` means the
 * creature only starts appearing from floor 5 onward.
 */

// Applied to both HP and ATK at encounter generation time.
// 5★ bosses are excluded — their stats are fixed in the definition.
export const STAR_MULTIPLIERS = {
  1: 1.00,
  2: 1.50,
  3: 2.00,
  4: 2.50,
  5: 3.00,
};

// ─────────────────────────────────────────────────────────────────────────────
// Zone 1 — The Soggy Ruins (Black Crystals)
// ─────────────────────────────────────────────────────────────────────────────

// Zone 1 — skittery melee
const sewer_rat = {
  id: 'sewer_rat',
  name: 'Rat Warrior',
  lore: "They are not very smart but they're fast and seem used to the dark. I believe they've been in these tunnels longer than anyone.",
  stars: 1,
  hp: 20,
  attack: 5,
  def: 0,
  dodge: 0.10,
  crit: 0.00,
  zone: 1,
  isBoss: false,
  isElite: false,
  baseXp: 20,
  baseGold: 5,
  drops: [],
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
  lore: "I don't know what they are. I'm not sure it matters. The residue they leave behind is warm and sticky.",
  stars: 1,
  hp: 25,
  attack: 4,
  def: 0,
  dodge: 0.00,
  crit: 0.00,
  zone: 1,
  isBoss: false,
  isElite: false,
  baseXp: 25,
  baseGold: 7,
  drops: [],
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
  lore: "Oversized ugly bugs covered in a heavy natural caparace. They are tough bastards. And they hit harder than I expected.",
  stars: 2,
  hp: 35,
  attack: 7,
  def: 3,
  dodge: 0.00,
  crit: 0.00,
  zone: 1,
  minFloor: 3, // DEF-stacking tank; debuts on floor 3+ after the 1★ trio teaches the basics
  isBoss: false,
  isElite: false,
  baseXp: 30,
  baseGold: 10,
  drops: [],
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
      minStars: 3,
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
  lore: "They don't look very healthy. The warts all over their bodies are pulsating. Whatever they carry in their skin, I don't want to know.",
  stars: 1,
  hp: 30,
  attack: 5,
  def: 0,
  dodge: 0.05,
  crit: 0.00,
  zone: 1,
  isBoss: false,
  isElite: false,
  baseXp: 25,
  baseGold: 8,
  drops: [],
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
  lore: "He's way larger and stronger than other rats. When he's wounded he doesn't seem to retreat. He gets more aggressive. The crown doesn't fit him. He wears it anyway. He's been wearing it a long time.",
  stars: 5,
  hp: 1000,
  attack: 30,
  def: 20,
  dodge: 0.10,
  crit: 0.05,
  zone: 1,
  isBoss: true,
  isElite: false,
  xp: 500,
  goldMin: 80,
  goldMax: 120,
  drops: [
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
      multiplier: 2,
      minStars: 1,
      cooldown: 3,
    },
    {
      name: 'Vampiric Bite',
      multiplier: 1.8,
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
  lore: 'Born from seed stock the scholars tried to save. It grew faster than they could record, and learned to move while they slept.',
  stars: 2,
  hp: 130,
  attack: 12,
  def: 0,
  dodge: 0.15,
  crit: 0.00,
  zone: 2,
  isBoss: false,
  isElite: false,
  baseXp: 45,
  baseGold: 18,
  drops: [
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
  lore: 'It fed on the accelerated growth until the growth began feeding on everything else. Now it simply endures, armored and patient.',
  stars: 2,
  hp: 160,
  attack: 10,
  def: 6,
  dodge: 0.00,
  crit: 0.00,
  zone: 2,
  isBoss: false,
  isElite: false,
  baseXp: 55,
  baseGold: 22,
  drops: [],
  moves: [
    { name: 'Crush', damage: 10 },
  ],
  phaseChanges: [],
};

// Zone 2 — ATK debuffer
const mushroom_puffer = {
  id: 'mushroom_puffer',
  name: 'Mushroom Puffer',
  lore: 'Its spores carry the same wrongness that crept through the greenhouse soil. Breathe deep enough and you join the garden.',
  stars: 1,
  hp: 135,
  attack: 9,
  def: 0,
  dodge: 0.00,
  crit: 0.00,
  zone: 2,
  isBoss: false,
  isElite: false,
  baseXp: 42,
  baseGold: 17,
  drops: [],
  moves: [
    { name: 'Spore Cloud', damage: 9, effect: { type: "atk_reduce", chance: 0.50, value: 0.20, duration: 2 } },
  ],
  phaseChanges: [],
};

// Zone 2 — ambush predator
const vine_lurker = {
  id: 'vine_lurker',
  name: 'Vine Lurker',
  lore: 'The roots learned to wait. They remember which corridors the living still use, and they hold very, very still until they pass.',
  stars: 2,
  hp: 150,
  attack: 13,
  def: 2,
  dodge: 0.00,
  crit: 0.10,
  zone: 2,
  isBoss: false,
  isElite: false,
  baseXp: 50,
  baseGold: 20,
  drops: [],
  moves: [
    { name: 'Constrict', damage: 13, effect: { type: "dodge_reduce", chance: 1.0, value: 0.15, duration: 2 } },
  ],
  phaseChanges: [],
};

/** Zone 2 — Boss */
const rootmother = {
  id: 'rootmother',
  name: 'Rootmother',
  lore: 'The heart the garden grew for itself once the last caretaker fell silent. The roots frame her like something they were always meant to protect.',
  stars: 5,
  hp: 600,
  attack: 25,
  def: 8,
  dodge: 0.00,
  crit: 0.05,
  zone: 2,
  isBoss: true,
  isElite: false,
  xp: 500,
  goldMin: 200,
  goldMax: 350,
  drops: [
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
  lore: 'Crusted with the hulls of boats that never came back. It scuttles through the places the tide left the dead.',
  stars: 3,
  hp: 240,
  attack: 16,
  def: 5,
  dodge: 0.00,
  crit: 0.00,
  zone: 3,
  isBoss: false,
  isElite: false,
  baseXp: 135,
  baseGold: 54,
  drops: [
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
  lore: 'It coiled in the water the biologist could find no words for. The sailors who saw it called it a hex, and they were not wrong.',
  stars: 3,
  hp: 200,
  attack: 20,
  def: 2,
  dodge: 0.10,
  crit: 0.15,
  zone: 3,
  isBoss: false,
  isElite: false,
  baseXp: 150,
  baseGold: 60,
  drops: [],
  moves: [
    { name: 'Hex', damage: 20, effect: { type: "crit_reduce", chance: 1.0, value: 0.15, duration: 2 } },
  ],
  phaseChanges: [],
};

// Zone 3 — ethereal stunner
const drowned_sailor = {
  id: 'drowned_sailor',
  name: 'Drowned Sailor',
  lore: 'One of the many who booked passage and never made shore. The water gave back the body but kept everything that made it a person.',
  stars: 3,
  hp: 220,
  attack: 17,
  def: 3,
  dodge: 0.05,
  crit: 0.00,
  zone: 3,
  isBoss: false,
  isElite: false,
  baseXp: 120,
  baseGold: 48,
  drops: [
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
  lore: 'Bloated with the poison of the changed sea, it bursts the moment it is certain you are close enough to share it.',
  stars: 3,
  hp: 180,
  attack: 25,
  def: 0,
  dodge: 0.00,
  crit: 0.00,
  zone: 3,
  minFloor: 3, // mechanical outlier (self-destruct punishes target priority); debuts on floor 3+
  isBoss: false,
  isElite: false,
  baseXp: 115,
  baseGold: 46,
  drops: [],
  moves: [
    { name: 'Explode', damage: 25, effect: { type: "self_destruct", chance: 1.0 } },
  ],
  phaseChanges: [],
};

/** Zone 3 — Boss */
const captain_moray = {
  id: 'captain_moray',
  name: 'Captain Moray',
  lore: 'Master of the last port, anchored to the wreck of his final voyage. He will not let go of the harbor, and he will not let you leave it.',
  stars: 5,
  hp: 900,
  attack: 30,
  def: 10,
  dodge: 0.00,
  crit: 0.08,
  zone: 3,
  isBoss: true,
  isElite: false,
  xp: 1000,
  goldMin: 500,
  goldMax: 800,
  drops: [
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
