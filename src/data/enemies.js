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
  name: 'Infected Rat',
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
  baseGold: 1,
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
  baseGold: 2,
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
  name: 'Mutated Cockroach',
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
  baseGold: 4,
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
  baseGold: 3,
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
  name: 'Tyrant Rat',
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
  goldMin: 100,
  goldMax: 200,
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
const mutated_plant = {
  id: 'mutated_plant',
  name: 'Mutated Plant',
  lore: 'A mutated botanical nightmare. Its long stems snap out with explosive speed, spitting thorns at anything that approaches.',
  stars: 2,
  hp: 130,
  attack: 12,
  def: 1,
  dodge: 0.12,
  crit: 0.05,
  zone: 2,
  isBoss: false,
  isElite: false,
  baseXp: 45,
  baseGold: 18,
  drops: [],
  moves: [
    { name: 'Thorn Spit', damage: 12 },
  ],
  phaseChanges: [],
};

// Zone 2 — high DEF tank
const ironclad_beetle = {
  id: 'ironclad_beetle',
  name: 'Ironclad Beetle',
  lore: 'Protected by a thick, dark carapace that is almost impervious to normal blades. It moves slowly but crushes its prey with massive horns.',
  stars: 2,
  hp: 170,
  attack: 10,
  def: 7,
  dodge: 0.00,
  crit: 0.00,
  zone: 2,
  isBoss: false,
  isElite: false,
  baseXp: 55,
  baseGold: 22,
  drops: [],
  moves: [
    { name: 'Horn Crush', damage: 10 },
  ],
  phaseChanges: [],
};

// Zone 2 — ATK debuffer
const spore_shroom = {
  id: 'spore_shroom',
  name: 'Spore Shroom',
  lore: 'Its cap glows with a sickly, humid light. It releases clouds of toxic spores when it senses movement, choking anyone who breathes them in.',
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

// Zone 2 — burrowing attacker
const savage_worm = {
  id: 'savage_worm',
  name: 'Savage Worm',
  lore: 'Burrows through the garden\'s damp soil, waiting for the vibrations of unsuspecting travelers to strike from below.',
  stars: 1,
  hp: 140,
  attack: 11,
  def: 1,
  dodge: 0.05,
  crit: 0.02,
  zone: 2,
  isBoss: false,
  isElite: false,
  baseXp: 40,
  baseGold: 16,
  drops: [],
  moves: [
    { name: 'Savage Bite', damage: 11 },
  ],
  phaseChanges: [],
};

// Zone 2 — ambush predator
const caustic_slug = {
  id: 'caustic_slug',
  name: 'Caustic Slug',
  lore: 'Leaves a trail of highly acidic slime behind. It can spit acid to weaken the defenses and reflexes of its prey.',
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
    { name: 'Acidic Slime', damage: 13, effect: { type: "dodge_reduce", chance: 1.0, value: 0.15, duration: 2 } },
  ],
  phaseChanges: [],
};

/** Zone 2 — Boss */
const granite_crawler = {
  id: 'granite_crawler',
  name: 'Granite Crawler',
  lore: "A massive, rock-infused spider that rules the garden's dark corners. She has spun a web that spans the entire lower levels of the ruins, trapping travelers and feeding her endless brood.",
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
    { itemId: 'granite_crawler_heart', chance: 1.0 },
    { itemId: 'green_crystal_fire', chance: 1.0, count: 2 },
    { itemId: 'green_crystal_water', chance: 1.0, count: 2 },
    { itemId: 'green_crystal_earth', chance: 1.0, count: 2 },
    { itemId: 'green_crystal_wind', chance: 1.0, count: 2 },
  ],
  moves: [
    { name: 'Venomous Strike', damage: 25 },
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
const mineral_pincher = {
  id: 'mineral_pincher',
  name: 'Mineral Pincher',
  lore: 'Its shell has fused with deep-sea minerals, forming a crystal-hard armor. Its claws can crush bone and steel alike.',
  stars: 3,
  hp: 240,
  attack: 16,
  def: 10,
  dodge: 0.00,
  crit: 0.00,
  zone: 3,
  isBoss: false,
  isElite: false,
  baseXp: 135,
  baseGold: 54,
  drops: [],
  moves: [
    { name: 'Crystal Pinch', damage: 16 },
  ],
  phaseChanges: [],
};

// Zone 3 — utility/stunner
const neon_jelly = {
  id: 'neon_jelly',
  name: 'Neon Jelly',
  lore: 'Glows with a cold, electric light. Its tentacles trail in the dark water, delivering a stunning shock to anything they touch.',
  stars: 3,
  hp: 180,
  attack: 16,
  def: 2,
  dodge: 0.10,
  crit: 0.10,
  zone: 3,
  isBoss: false,
  isElite: false,
  baseXp: 125,
  baseGold: 50,
  drops: [],
  moves: [
    { name: 'Shock Tentacles', damage: 16, effect: { type: "stun", chance: 0.30 } },
  ],
  phaseChanges: [],
};

/** Zone 3 — Toxic Puff explodes only when low HP (under 30%) */
const toxic_puff = {
  id: 'toxic_puff',
  name: 'Toxic Puff',
  lore: 'Bloated with the poison of the changed sea, it bursts when its life is threatened, taking you down with it.',
  stars: 3,
  hp: 180,
  attack: 25,
  def: 0,
  dodge: 0.00,
  crit: 0.00,
  zone: 3,
  minFloor: 3,
  isBoss: false,
  isElite: false,
  baseXp: 115,
  baseGold: 46,
  drops: [],
  moves: [
    { name: 'Tackle', damage: 15 },
    { name: 'Explode', damage: 30, effect: { type: "self_destruct", chance: 1.0 } },
  ],
  phaseChanges: [],
};

/** Zone 3 — Boss */
const sea_abomination = {
  id: 'sea_abomination',
  name: 'Sea Abomination',
  lore: 'A colossal nightmare of teeth, scales, and tentacles that dragged Captain Moray and his ships down to the abyss. Now it rules the Sunken Docks.',
  stars: 5,
  hp: 900,
  attack: 35,
  def: 12,
  dodge: 0.00,
  crit: 0.08,
  zone: 3,
  isBoss: true,
  isElite: false,
  xp: 1000,
  goldMin: 400,
  goldMax: 700,
  drops: [
    { itemId: 'abomination_core', chance: 1.0 },
    { itemId: 'yellow_crystal_fire', chance: 1.0, count: 2 },
    { itemId: 'yellow_crystal_water', chance: 1.0, count: 2 },
    { itemId: 'yellow_crystal_earth', chance: 1.0, count: 2 },
    { itemId: 'yellow_crystal_wind', chance: 1.0, count: 2 },
  ],
  moves: [
    { name: 'Abyssal Slam', damage: 35 },
  ],
  phaseChanges: [
    {
      hpPercent: 0.5,
      action: 'rage',
      description: 'Gains increased damage',
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
  mutated_plant,
  ironclad_beetle,
  spore_shroom,
  savage_worm,
  caustic_slug,
  granite_crawler,
  mineral_pincher,
  neon_jelly,
  toxic_puff,
  sea_abomination,
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
