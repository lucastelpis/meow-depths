/**
 * quests.js — Daily and Campaign Quests configuration and generation logic.
 */

// Simple seeded random helper to keep daily quests consistent throughout the calendar day.
export function getSeededRandom(seedStr) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  let index = 1;
  return () => {
    const x = Math.sin(hash + index++) * 10000;
    return x - Math.floor(x);
  };
}

// Helper to get active zone details based on highest unlocked zone
export function getHighestUnlockedZone(progress) {
  if (progress.zone2Cleared) return 'zone3';
  if (progress.zone1Cleared) return 'zone2';
  return 'zone1';
}

export function getZoneName(zoneId) {
  if (zoneId === 'zone3') return 'Sunken Docks';
  if (zoneId === 'zone2') return 'Twisted Garden';
  return 'Soggy Ruins';
}

export function getZoneCrystalColor(zoneId) {
  if (zoneId === 'zone3') return 'Yellow';
  if (zoneId === 'zone2') return 'Green';
  return 'Black';
}

// Generates the daily rotating quests for a given date
export function generateDailyQuests(hero, progress, dateStr) {
  const rand = getSeededRandom(dateStr + '_' + (hero.name || 'Mochi'));
  const lvl = hero.level || 1;
  const currentZone = getHighestUnlockedZone(progress);
  const color = getZoneCrystalColor(currentZone);

  // Daily quests reward gold + exactly one random camp resource (wood/stone/cloth).
  // No consumables/potions.
  const RESOURCE_TYPES = ['wood', 'stone', 'cloth'];
  const randomResourceReward = (gold) => ({
    gold,
    materials: { [RESOURCE_TYPES[Math.floor(rand() * RESOURCE_TYPES.length)]]: 1 },
  });

  // 1. Report to Camp (Always generated as Quest 1)
  const loginQuest = {
    id: 'daily_visit_camp',
    title: 'Report to Camp',
    desc: "Every expedition begins with a briefing. Check in at the Camp hub to coordinate the day's work with Mochi.",
    type: 'visit_camp',
    progress: 1, // Auto-completes upon focus/generation
    target: 1,
    completed: true,
    claimed: false,
    rewards: randomResourceReward(25 + lvl * 25),
    tag: 'Daily'
  };

  const pool = [];

  // Quest type: Clear a cleared floor
  const clearedFloorsCount = progress.floorsCleared?.[currentZone] || 0;
  if (clearedFloorsCount > 0) {
    // Pick a random floor among cleared ones
    const floorToClear = Math.floor(rand() * clearedFloorsCount) + 1;
    pool.push({
      type: 'clear_cleared_floor',
      title: `Tactical Recrawl: Zone ${floorToClear}`,
      desc: `The corruption seeps back into ground we've already taken. Sweep it out again — clear every room on Zone ${floorToClear} of the ${getZoneName(currentZone)}.`,
      target: 1,
      targetFloor: floorToClear,
      targetZone: currentZone,
      rewards: randomResourceReward(200 + lvl * 30)
    });
  }

  // Quest type: Hunt specific creature
  const zoneEnemies = {
    zone1: [
      { id: 'sewer_rat', name: 'Sewer Rat' },
      { id: 'slimeling', name: 'Slimeling' },
      { id: 'cockroach_knight', name: 'Cockroach Knight' }
    ],
    zone2: [
      { id: 'mutated_plant', name: 'Mutated Plant' },
      { id: 'ironclad_beetle', name: 'Ironclad Beetle' }
    ],
    zone3: [
      { id: 'mineral_pincher', name: 'Mineral Pincher' }
    ]
  };

  const enemyPool = zoneEnemies[currentZone] || zoneEnemies.zone1;
  const pickedEnemy = enemyPool[Math.floor(rand() * enemyPool.length)];
  const huntQty = 3 + Math.floor(lvl / 3);
  pool.push({
    type: 'hunt_creature',
    title: `Creature Bounty: ${pickedEnemy.name}s`,
    desc: `The ${pickedEnemy.name}s are multiplying faster than the Order can track. Thin the pack — defeat ${huntQty} of them in combat.`,
    target: huntQty,
    enemyId: pickedEnemy.id,
    rewards: randomResourceReward(150 + lvl * 25)
  });

  // Quest type: Gather run — rewards a single camp resource in small quantity.
  // Only one resource type is chosen (randomly) per generated quest.
  const pickedResource = RESOURCE_TYPES[Math.floor(rand() * RESOURCE_TYPES.length)];
  const resourceName = pickedResource.charAt(0).toUpperCase() + pickedResource.slice(1);
  const gatherQty = 4 + Math.floor(lvl / 2);
  pool.push({
    type: 'hunt_stars',
    title: `Supply Run: ${resourceName}`,
    desc: `The Camp's stores are running thin. Fight your way to a resupply — defeat ${gatherQty} enemies to earn camp supplies.`,
    target: gatherQty,
    stars: 1,
    rewards: {
      gold: 120 + lvl * 20,
      materials: { [pickedResource]: 1 },
    },
  });

  // Quest type: Star hunting
  const targetStars = rand() > 0.5 ? 2 : 1;
  const starHuntQty = 4 + Math.floor(lvl / 2);
  pool.push({
    type: 'hunt_stars',
    title: `Elite Hunt: ${targetStars}★ Threats`,
    desc: `Something is drawing the strongest beasts toward the surface. Cull them — defeat ${starHuntQty} enemies of ${targetStars}★ rating or higher in combat.`,
    target: starHuntQty,
    stars: targetStars,
    rewards: randomResourceReward(180 + lvl * 30)
  });

  // Pick 2 random unique quests from the pool
  const selectedQuests = [];
  const tempPool = [...pool];

  // Shuffle tempPool using our seeded random
  for (let i = tempPool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [tempPool[i], tempPool[j]] = [tempPool[j], tempPool[i]];
  }

  // Take the first two
  const quest2 = {
    ...tempPool[0],
    id: 'daily_quest_2',
    progress: 0,
    completed: false,
    claimed: false,
    tag: 'Daily'
  };

  const quest3 = {
    ...tempPool[1],
    id: 'daily_quest_3',
    progress: 0,
    completed: false,
    claimed: false,
    tag: 'Daily'
  };

  return [loginQuest, quest2, quest3];
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaign Quests Configurations
// ─────────────────────────────────────────────────────────────────────────────
export const CAMPAIGN_QUEST_TEMPLATES = [
  // ==========================================
  // Dungeon 1: Soggy Ruins (Floors 1-10)
  // ==========================================
  {
    id: 'camp_clear_zone1_f1',
    title: 'Ruins Initiate',
    desc: "The Order's maps end where the old shelters begin. Descend into the flooded tunnels and clear Floor 1 — whatever became of the people who hid here, their story starts at the surface.",
    type: 'progression_clear_floor',
    zoneId: 'zone1',
    floorNumber: 1,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 150, consumables: { potion: 2 } },
    tag: 'Story'
  },
  {
    id: 'camp_clear_zone1_f2',
    title: 'Ruins Scout',
    desc: 'Survivors sealed themselves down here as the world burned above. Push deeper and clear Floor 2 to follow where they went.',
    type: 'progression_clear_floor',
    zoneId: 'zone1',
    floorNumber: 2,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 200, consumables: { potion: 2 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone1_f1' }
  },
  {
    id: 'camp_clear_zone1_f3',
    title: 'Ruins Explorer',
    desc: 'The black crystal grows thickest where the corruption first took root. Clear Floor 3 and see how far it has already spread.',
    type: 'progression_clear_floor',
    zoneId: 'zone1',
    floorNumber: 3,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 250, consumables: { potion: 2 }, gear: ['weird_wooden_sword'] },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone1_f2' }
  },
  {
    id: 'camp_clear_zone1_f4',
    title: 'Ruins Excavator',
    desc: 'Another shelter, another silence. Clear Floor 4 and recover whatever the tunnel-folk left behind for someone to find.',
    type: 'progression_clear_floor',
    zoneId: 'zone1',
    floorNumber: 4,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 300, consumables: { potion: 2 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone1_f3' }
  },
  {
    id: 'camp_clear_zone1_f5',
    title: 'Ruins Delver',
    desc: 'Something has been nesting in the deep water, fed by the crystal. Clear Floor 5 before it grows bold enough to climb.',
    type: 'progression_clear_floor',
    zoneId: 'zone1',
    floorNumber: 5,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 350, consumables: { potion: 2 }, gear: ['utility_leather_belt'] },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone1_f4' }
  },
  {
    id: 'camp_clear_zone1_f6',
    title: 'Ruins Pathfinder',
    desc: 'The notes speak of hundreds who counted heads each morning until the counting stopped. Clear Floor 6 and give their story a witness.',
    type: 'progression_clear_floor',
    zoneId: 'zone1',
    floorNumber: 6,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 400, consumables: { potion: 2 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone1_f5' }
  },
  {
    id: 'camp_clear_zone1_f7',
    title: 'Ruins Veteran',
    desc: 'The corruption is changing the creatures down here, not merely killing them. Clear Floor 7 and learn how deep the change runs.',
    type: 'progression_clear_floor',
    zoneId: 'zone1',
    floorNumber: 7,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 450, consumables: { potion: 2 }, gear: ['bone_sword'] },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone1_f6' }
  },
  {
    id: 'camp_clear_zone1_f8',
    title: 'Ruins Conqueror',
    desc: 'Sealed doors mean someone once had something worth protecting. Clear Floor 8 and find out what they hoped would outlast them.',
    type: 'progression_clear_floor',
    zoneId: 'zone1',
    floorNumber: 8,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 500, consumables: { potion: 2 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone1_f7' }
  },
  {
    id: 'camp_clear_zone1_f9',
    title: 'Ruins Vanguard',
    desc: 'You are near the heart of the warren now. Clear Floor 9 — whatever rules these tunnels waits just below.',
    type: 'progression_clear_floor',
    zoneId: 'zone1',
    floorNumber: 9,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 550, consumables: { potion: 2 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone1_f8' }
  },
  {
    id: 'camp_defeat_king_rat',
    title: 'Bane of Sewer Rats',
    desc: 'The last survivor wrote of a rat that only sat and watched, swollen with black crystal. It watches no longer. Descend to Floor 10 and put down the Sewer King before it reaches the surface.',
    type: 'defeat_boss',
    bossId: 'king_rat',
    zoneId: 'zone1',
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 800, consumables: { mega_potion: 2 }, gear: ['bronze_sword'] },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone1_f9' }
  },

  // ==========================================
  // Dungeon 2: Twisted Garden (Floors 1-10)
  // ==========================================
  {
    id: 'camp_clear_zone2_f1',
    title: 'Garden Pathfinder',
    desc: 'The Order followed the green bloom to a buried greenhouse. Clear Floor 1 of the Twisted Garden and learn what the corruption does to living things.',
    type: 'progression_clear_floor',
    zoneId: 'zone2',
    floorNumber: 1,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 300, consumables: { potion: 3 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_defeat_king_rat' }
  },
  {
    id: 'camp_clear_zone2_f2',
    title: 'Garden Scout',
    desc: 'The plants here grow faster than anything should. Clear Floor 2 before the overgrowth seals the path behind you.',
    type: 'progression_clear_floor',
    zoneId: 'zone2',
    floorNumber: 2,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 400, consumables: { potion: 3 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone2_f1' }
  },
  {
    id: 'camp_clear_zone2_f3',
    title: 'Garden Explorer',
    desc: 'The researchers studied this place until it began to study them back. Clear Floor 3 and recover the work they died protecting.',
    type: 'progression_clear_floor',
    zoneId: 'zone2',
    floorNumber: 3,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 500, consumables: { potion: 3 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone2_f2' }
  },
  {
    id: 'camp_clear_zone2_f4',
    title: 'Garden Weed-Cutter',
    desc: 'Green crystal pulses in the roots like a second heartbeat. Clear Floor 4 and trace it back toward its source.',
    type: 'progression_clear_floor',
    zoneId: 'zone2',
    floorNumber: 4,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 600, consumables: { potion: 3 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone2_f3' }
  },
  {
    id: 'camp_clear_zone2_f5',
    title: 'Garden Herbalist',
    desc: 'The insects here no longer behave like insects. Clear Floor 5 and see what the corruption has been teaching them.',
    type: 'progression_clear_floor',
    zoneId: 'zone2',
    floorNumber: 5,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 700, consumables: { potion: 3 }, gear: ['refined_bronze_sword'] },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone2_f4' }
  },
  {
    id: 'camp_clear_zone2_f6',
    title: 'Garden Trailblazer',
    desc: 'One caretaker kept this station alive long after the scientists were gone. Clear Floor 6 and honor what they refused to let die.',
    type: 'progression_clear_floor',
    zoneId: 'zone2',
    floorNumber: 6,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 800, consumables: { potion: 3 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone2_f5' }
  },
  {
    id: 'camp_clear_zone2_f7',
    title: 'Garden Botanist',
    desc: 'The deeper wings have grown wild and wrong. Clear Floor 7 to keep the way to the core from closing over.',
    type: 'progression_clear_floor',
    zoneId: 'zone2',
    floorNumber: 7,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 900, consumables: { potion: 3 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone2_f6' }
  },
  {
    id: 'camp_clear_zone2_f8',
    title: 'Garden Defoliator',
    desc: 'The garden defends itself now, as if it knows you are coming. Clear Floor 8 and prove the corruption can still be driven back.',
    type: 'progression_clear_floor',
    zoneId: 'zone2',
    floorNumber: 8,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 1000, consumables: { potion: 3 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone2_f7' }
  },
  {
    id: 'camp_clear_zone2_f9',
    title: 'Garden Sentinel',
    desc: 'Every root in the station leads to a single chamber at its heart. Clear Floor 9 — its guardian is already stirring.',
    type: 'progression_clear_floor',
    zoneId: 'zone2',
    floorNumber: 9,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 1100, consumables: { potion: 3 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone2_f8' }
  },
  {
    id: 'camp_defeat_granite_crawler',
    title: 'Crawler Crusher',
    desc: "At the garden's heart the corruption grew itself a warden of stone and vine. Reach Floor 10 and shatter the Granite Crawler before it can seed the world above.",
    type: 'defeat_boss',
    bossId: 'granite_crawler',
    zoneId: 'zone2',
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 1600, consumables: { mega_potion: 4 }, gear: ['iron_sword'] },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone2_f9' }
  },

  // ==========================================
  // Dungeon 3: Sunken Docks (Floors 1-10)
  // ==========================================
  {
    id: 'camp_clear_zone3_f1',
    title: 'Docks Explorer',
    desc: "The Order's oldest legend points to a drowned harbor — and a wall where a grey cat was first named. Clear Floor 1 of the Sunken Docks and start toward the truth.",
    type: 'progression_clear_floor',
    zoneId: 'zone3',
    floorNumber: 1,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 450, consumables: { potion: 4 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_defeat_granite_crawler' }
  },
  {
    id: 'camp_clear_zone3_f2',
    title: 'Docks Wharf-Scout',
    desc: 'They fled by sea, praying somewhere had been spared. Clear Floor 2 and follow their trail down into the black water.',
    type: 'progression_clear_floor',
    zoneId: 'zone3',
    floorNumber: 2,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 600, consumables: { potion: 4 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone3_f1' }
  },
  {
    id: 'camp_clear_zone3_f3',
    title: 'Docks Beachcomber',
    desc: 'Yellow crystal glows beneath the tide like a drowned sun. Clear Floor 3 and begin to understand what it wants.',
    type: 'progression_clear_floor',
    zoneId: 'zone3',
    floorNumber: 3,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 750, consumables: { potion: 4 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone3_f2' }
  },
  {
    id: 'camp_clear_zone3_f4',
    title: 'Docks Mariner',
    desc: 'The ships never made it far, and their captains knew it. Clear Floor 4 and recover the logs of those who tried to leave.',
    type: 'progression_clear_floor',
    zoneId: 'zone3',
    floorNumber: 4,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 900, consumables: { potion: 4 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone3_f3' }
  },
  {
    id: 'camp_clear_zone3_f5',
    title: 'Docks Diver',
    desc: 'A researcher stayed behind to record what the corruption did to the sea. Clear Floor 5 and find the notes she never sent.',
    type: 'progression_clear_floor',
    zoneId: 'zone3',
    floorNumber: 5,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 1050, consumables: { potion: 4 }, gear: ['curved_iron_sword'] },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone3_f4' }
  },
  {
    id: 'camp_clear_zone3_f6',
    title: 'Docks Navigator',
    desc: 'The harbor is silent now, its whole fleet unaccounted for. Clear Floor 6 and read what the last keeper of the log left behind.',
    type: 'progression_clear_floor',
    zoneId: 'zone3',
    floorNumber: 6,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 1200, consumables: { potion: 4 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone3_f5' }
  },
  {
    id: 'camp_clear_zone3_f7',
    title: 'Docks Ship-Master',
    desc: 'Some chose to stay rather than sail into the unknown. Clear Floor 7 and learn what became of the ones who never boarded.',
    type: 'progression_clear_floor',
    zoneId: 'zone3',
    floorNumber: 7,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 1350, consumables: { potion: 4 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone3_f6' }
  },
  {
    id: 'camp_clear_zone3_f8',
    title: 'Docks Leviathan-Hunter',
    desc: 'The water no longer moves the way water should. Clear Floor 8 and press on toward whatever waits in the deep.',
    type: 'progression_clear_floor',
    zoneId: 'zone3',
    floorNumber: 8,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 1500, consumables: { potion: 4 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone3_f7' }
  },
  {
    id: 'camp_clear_zone3_f9',
    title: 'Docks Admiral',
    desc: 'The deepest chamber was sealed from the inside, beside markings older than the war. Clear Floor 9 — something ancient is stirring behind it.',
    type: 'progression_clear_floor',
    zoneId: 'zone3',
    floorNumber: 9,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 1650, consumables: { potion: 4 } },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone3_f8' }
  },
  {
    id: 'camp_defeat_sea_abomination',
    title: 'Dread of the Deep',
    desc: 'The corruption reached the sea and made something that should not be. Reach Floor 10 and end the Sea Abomination — the waiting wall beyond it was left for you.',
    type: 'defeat_boss',
    bossId: 'sea_abomination',
    zoneId: 'zone3',
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 2400, consumables: { mega_potion: 6 }, gear: ['refined_iron_sword'] },
    tag: 'Story',
    prerequisite: { type: 'quest_completed', questId: 'camp_clear_zone3_f9' }
  },

  // ==========================================
  // Campaign Standard Quests
  // ==========================================
  {
    id: 'camp_equip_four_items',
    title: 'Armored Adventurer',
    desc: 'The deep tunnels are no place to walk unready. Equip any 4 pieces of gear at once in Mochi\'s profile.',
    type: 'equip_gear_set',
    count: 4,
    progress: 0,
    target: 4,
    completed: false,
    claimed: false,
    rewards: { gold: 200 },
    tag: 'Campaign'
  },
  {
    id: 'camp_max_t1_skill',
    title: 'Skill Master',
    desc: 'Instinct sharpens with use, and the corruption punishes the unpracticed. Upgrade any Tier 1 active or passive skill to 5★.',
    type: 'max_t1_skill',
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 500, consumables: { super_potion: 1 } },
    tag: 'Campaign'
  },
  {
    id: 'camp_max_two_t1_skills',
    title: 'Versatile Warrior',
    desc: 'One trick is never enough this far underground. Upgrade two Tier 1 skills to 5★.',
    type: 'max_two_t1_skills',
    progress: 0,
    target: 2,
    completed: false,
    claimed: false,
    rewards: { gold: 800, consumables: { super_potion: 2 } },
    tag: 'Campaign',
    prerequisite: {
      type: 'quest_completed',
      questId: 'camp_max_t1_skill'
    }
  },
  {
    id: 'camp_max_t2_skill',
    title: 'Aura Ascendancy',
    desc: 'The corruption rewards those who adapt to it. Upgrade any Tier 2 skill to 5★.',
    type: 'max_t2_skill',
    progress: 0,
    target: 5,
    completed: false,
    claimed: false,
    rewards: { gold: 1200, consumables: { mega_potion: 1 } },
    tag: 'Campaign',
    prerequisite: {
      type: 'quest_completed',
      questId: 'camp_max_two_t1_skills'
    }
  }
];

export function getInitialCampaignQuests() {
  return CAMPAIGN_QUEST_TEMPLATES.map(q => ({ ...q }));
}

export function syncPersistentQuests(state) {
  if (!state.progress) {
    state = {
      ...state,
      progress: {
        floorsCleared: { zone1: 0, zone2: 0, zone3: 0 },
        runsCompleted: { zone1: 0, zone2: 0, zone3: 0 },
        encounteredCreatures: {},
        notesCollected: {},
        readNotes: {},
        questsState: {
          lastGeneratedDate: '',
          dailies: [],
          campaign: getInitialCampaignQuests(),
        }
      }
    };
  }

  let questsState = state.progress.questsState;
  let changed = false;

  if (!questsState) {
    questsState = {
      lastGeneratedDate: '',
      dailies: [],
      campaign: getInitialCampaignQuests(),
    };
    changed = true;
  } else {
    if (!questsState.dailies) {
      questsState = { ...questsState, dailies: [] };
      changed = true;
    }
    if (!questsState.campaign || questsState.campaign.length === 0) {
      questsState = { ...questsState, campaign: getInitialCampaignQuests() };
      changed = true;
    } else {
      // Filter out campaign quests from state that are no longer in templates (e.g. camp_forge_crystal)
      let existingCampaign = questsState.campaign.filter(q => CAMPAIGN_QUEST_TEMPLATES.some(t => t.id === q.id));
      if (existingCampaign.length !== questsState.campaign.length) {
        changed = true;
      }

      // Add any missing campaign quests from templates
      const missingCampaignTemplates = CAMPAIGN_QUEST_TEMPLATES.filter(t => !existingCampaign.some(q => q.id === t.id));
      if (missingCampaignTemplates.length > 0) {
        existingCampaign = [...existingCampaign, ...missingCampaignTemplates.map(t => ({ ...t }))];
        changed = true;
      }

      // Hydrate existing campaign quests in the state to include newly introduced template properties
      const hydratedCampaign = existingCampaign.map(q => {
        const template = CAMPAIGN_QUEST_TEMPLATES.find(t => t.id === q.id);
        if (template) {
          let merged = { ...q };
          let mergedChanged = false;
          for (const [key, value] of Object.entries(template)) {
            if (merged[key] === undefined) {
              merged[key] = value;
              mergedChanged = true;
            }
          }
          // Authored/narrative fields always track the template so rewritten
          // lore reaches existing saves without wiping the player's progress
          // (progress / completed / claimed are never touched here).
          for (const key of ['desc', 'title']) {
            if (template[key] !== undefined && merged[key] !== template[key]) {
              merged[key] = template[key];
              mergedChanged = true;
            }
          }
          if (mergedChanged) {
            changed = true;
            return merged;
          }
        }
        return q;
      });
      if (changed) {
        questsState = { ...questsState, campaign: hydratedCampaign };
      }
    }
  }

  const hero = state.hero;
  const progress = state.progress;

  // Build a reference set of today's dailies so rewritten flavor (desc) reaches
  // an already-generated set without regenerating it (which would reset
  // progress). Daily generation is deterministic per date + hero name, so the
  // rebuilt quests match the stored ones by id + title; we only copy `desc`
  // when the title also matches, guarding against any same-day pool drift.
  const dailyRef = {};
  if (questsState.lastGeneratedDate) {
    try {
      for (const rq of generateDailyQuests(hero, progress, questsState.lastGeneratedDate)) {
        dailyRef[rq.id] = rq;
      }
    } catch (e) {
      // If regeneration fails for any reason, skip the flavor refresh.
    }
  }

  const dailies = (questsState.dailies || []).map(q => {
    let merged = q;

    // Refresh authored flavor text onto the matching stored daily.
    const ref = dailyRef[q.id];
    if (ref && ref.title === q.title && ref.desc !== q.desc) {
      merged = { ...merged, desc: ref.desc };
      changed = true;
    }

    // Recompute the completed flag from stored progress (unchanged behavior).
    if (!merged.completed) {
      const completed = merged.progress >= merged.target;
      if (completed !== merged.completed) {
        merged = { ...merged, completed };
        changed = true;
      }
    }

    return merged;
  });

  const campaign = (questsState.campaign || []).map(q => {
    if (q.completed) return q;
    let newProgress = q.progress;

    if (q.type === 'progression_clear_floor') {
      const cleared = progress.floorsCleared?.[q.zoneId] || 0;
      if (cleared >= q.floorNumber) {
        newProgress = 1;
      }
    } else if (q.type === 'equip_gear_set') {
      const slots = ['weapon', 'head', 'chest', 'legs', 'gloves', 'boots', 'trinket', 'trinket2'];
      const equippedCount = slots.filter(slot => Boolean(hero.gear?.[slot])).length;
      if (equippedCount >= q.target) {
        newProgress = q.target;
      } else {
        newProgress = equippedCount;
      }
    } else if (q.type === 'max_t1_skill') {
      const unlocked = hero.unlockedSkills || {};
      const t1Skills = ['fire_slash', 'smoldering', 'tidal_strike', 'hydration', 'boulder_slash', 'living_stone', 'dual_slash', 'swiftness'];
      const maxed = t1Skills.some(sId => unlocked[sId]?.stars >= 5);
      newProgress = maxed ? 1 : 0;
    } else if (q.type === 'max_two_t1_skills') {
      const unlocked = hero.unlockedSkills || {};
      const t1Skills = ['fire_slash', 'smoldering', 'tidal_strike', 'hydration', 'boulder_slash', 'living_stone', 'dual_slash', 'swiftness'];
      const maxedCount = t1Skills.filter(sId => unlocked[sId]?.stars >= 5).length;
      newProgress = Math.min(q.target, maxedCount);
    } else if (q.type === 'max_t2_skill') {
      const unlocked = hero.unlockedSkills || {};
      const t2Skills = ['fire_burst', 'flame_guard', 'tidal_wave', 'healing_current', 'landslide', 'calcify', 'whirlwind', 'critical_wind'];
      const maxed = t2Skills.some(sId => unlocked[sId]?.stars >= 5);
      newProgress = maxed ? 5 : 0;
    } else if (q.type === 'defeat_boss') {
      const zone = q.zoneId || 'zone1';
      const cleared = progress.floorsCleared?.[zone] || 0;
      if (cleared >= 10) {
        newProgress = 1;
      }
    }

    const completed = newProgress >= q.target;
    if (newProgress !== q.progress || completed !== q.completed) {
      changed = true;
      return { ...q, progress: newProgress, completed };
    }
    return q;
  });

  if (!changed) return state;

  return {
    ...state,
    progress: {
      ...state.progress,
      questsState: {
        ...questsState,
        dailies,
        campaign,
      }
    }
  };
}

/**
 * Checks if a campaign quest should be visible based on its prerequisites.
 * Supports:
 * - quest_completed: requires another campaign quest's `completed` flag to be true.
 * - clear_floor: requires the player to have cleared at least that floor number in that zone.
 */
export function isQuestUnlocked(quest, campaign, progress) {
  if (!quest.prerequisite) return true;
  const prereq = quest.prerequisite;
  if (prereq.type === 'clear_floor') {
    const cleared = progress?.floorsCleared?.[prereq.zoneId] || 0;
    return cleared >= prereq.floorNumber;
  }
  if (prereq.type === 'quest_completed') {
    const targetQuest = campaign?.find(q => q.id === prereq.questId);
    return !!targetQuest?.completed;
  }
  return true;
}
