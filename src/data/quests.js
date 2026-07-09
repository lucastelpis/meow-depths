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

  // 1. Report to Camp (Always generated as Quest 1)
  const loginQuest = {
    id: 'daily_visit_camp',
    title: 'Report to Camp',
    desc: 'Check in at the Camp hub to coordinate with Mochi.',
    type: 'visit_camp',
    progress: 1, // Auto-completes upon focus/generation
    target: 1,
    completed: true,
    claimed: false,
    rewards: {
      gold: 100 + lvl * 50,
      consumables: { potion: 3 }
    },
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
      title: `Tactical Recrawl: Floor ${floorToClear}`,
      desc: `Clear all rooms on Floor ${floorToClear} of the ${getZoneName(currentZone)}.`,
      target: 1,
      targetFloor: floorToClear,
      targetZone: currentZone,
      rewards: {
        gold: 200 + lvl * 30,
        consumables: { potion: 1 }
      }
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
    desc: `Defeat ${huntQty} ${pickedEnemy.name}s in combat.`,
    target: huntQty,
    enemyId: pickedEnemy.id,
    rewards: {
      gold: 150 + lvl * 25,
      consumables: { potion: 2 }
    }
  });

  // Quest type: Star hunting
  const targetStars = rand() > 0.5 ? 2 : 1;
  const starHuntQty = 4 + Math.floor(lvl / 2);
  pool.push({
    type: 'hunt_stars',
    title: `Elite Hunt: ${targetStars}★ Threats`,
    desc: `Defeat ${starHuntQty} enemies of ${targetStars}★ rating or higher in combat.`,
    target: starHuntQty,
    stars: targetStars,
    rewards: {
      gold: 180 + lvl * 30,
      consumables: { super_potion: 1 }
    }
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
  // 1. Clear Soggy Ruins Floor 1
  {
    id: 'camp_clear_zone1_f1',
    title: 'Ruins Initiate',
    desc: 'Clear Floor 1 of Soggy Ruins (Zone 1).',
    type: 'progression_clear_floor',
    zoneId: 'zone1',
    floorNumber: 1,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 150, consumables: { Potion: 2 } },
    tag: 'Story'
  },
  // 2. Clear Twisted Garden Floor 1
  {
    id: 'camp_clear_zone2_f1',
    title: 'Garden Pathfinder',
    desc: 'Clear Floor 1 of Twisted Garden (Zone 2).',
    type: 'progression_clear_floor',
    zoneId: 'zone2',
    floorNumber: 1,
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 300, consumables: { potion: 3 } },
    tag: 'Story',
    prerequisite: {
      type: 'quest_completed',
      questId: 'camp_defeat_king_rat'
    }
  },
  // 3. Equip 4 items of any tier (starter or crafted)
  {
    id: 'camp_equip_four_items',
    title: 'Armored Adventurer',
    desc: 'Equip any 4 pieces of gear simultaneously in Mochi\'s profile.',
    type: 'equip_gear_set',
    count: 4,
    progress: 0,
    target: 4,
    completed: false,
    claimed: false,
    rewards: { gold: 200 },
    tag: 'Campaign'
  },
  // 4. Max any Tier 1 skill to star 5
  {
    id: 'camp_max_t1_skill',
    title: 'Skill Master',
    desc: 'Upgrade any Tier 1 active or passive skill to ★5.',
    type: 'max_t1_skill',
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 500, consumables: { super_potion: 1 } },
    tag: 'Campaign'
  },
  // 5. Max two T1 skills
  {
    id: 'camp_max_two_t1_skills',
    title: 'Versatile Warrior',
    desc: 'Upgrade two Tier 1 skills to ★5.',
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
  // 6. Max a Tier 2 skill
  {
    id: 'camp_max_t2_skill',
    title: 'Aura Ascendancy',
    desc: 'Upgrade any Tier 2 skill to ★5.',
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
  },
  // 7. Defeat King Rat Boss
  {
    id: 'camp_defeat_king_rat',
    title: 'Bane of Sewer Rats',
    desc: 'Defeat the Sewer King (King Rat) on Floor 10 of Soggy Ruins.',
    type: 'defeat_boss',
    bossId: 'king_rat',
    progress: 0,
    target: 1,
    completed: false,
    claimed: false,
    rewards: { gold: 800, consumables: { mega_potion: 2 } },
    tag: 'Story',
    prerequisite: {
      type: 'clear_floor',
      zoneId: 'zone1',
      floorNumber: 9
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
      const existingCampaign = questsState.campaign.filter(q => CAMPAIGN_QUEST_TEMPLATES.some(t => t.id === q.id));
      if (existingCampaign.length !== questsState.campaign.length) {
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

  const dailies = (questsState.dailies || []).map(q => {
    if (q.completed) return q;
    let newProgress = q.progress;
    const completed = newProgress >= q.target;
    if (newProgress !== q.progress || completed !== q.completed) {
      changed = true;
      return { ...q, progress: newProgress, completed };
    }
    return q;
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
      const slots = ['weapon', 'head', 'chest', 'legs', 'gloves', 'boots', 'trinket', 'storage'];
      const equippedCount = slots.filter(slot => hero.gear?.[slot] !== null).length;
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
      const cleared = progress.floorsCleared?.zone1 || 0;
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
