// scripts/simulate.js
import fs from 'fs';

async function runSimulation() {
  console.log('────────────────────────────────────────────────────────────────────────');
  console.log('🔮 STARTING MEOW DEPTHS DUNGEON SIMULATION (FLOORS 1 TO 10) 🔮');
  console.log('────────────────────────────────────────────────────────────────────────\n');

  // Dynamically import data and logic modules
  const { default: SKILLS, getSkillUpgradeCost, canUnlockElementSkill, canStarUpSkill, SKILL_UPGRADE_COSTS } = await import('../src/data/skills.js');
  const { GEAR } = await import('../src/data/gear.js');
  const { ENEMIES } = await import('../src/data/enemies.js');
  const { ZONES, getFloorCompletionReward } = await import('../src/data/zones.js');
  const { generateDungeonGrid } = await import('../src/logic/dungeonGenerator.js');
  const { executeLandslide, executeBoulderSlash, executeTidalStrike, executeHealingCurrent, executeFireSlash, executeFireBurst, executeFlameGuard, executeDualSlash, executeCriticalWind, applyBurn, executeAttack, processStatusEffects, calculateDamage } = await import('../src/logic/combatEngine.js');
  const { getXpForLevel, calculateEffectiveStats, checkLevelUp, applyHealingEfficiency, getStanceBonus } = await import('../src/logic/progressionEngine.js');

  const CHOSEN_ELEMENT = 'wind';

  const ELEMENT_SKILLS = {
    earth: {
      t1: ['boulder_slash', 'living_stone'],
      t2: ['landslide', 'calcify'],
    },
    water: {
      t1: ['tidal_strike', 'hydration'],
      t2: ['tidal_wave', 'healing_current'],
    },
    fire: {
      t1: ['fire_slash', 'smoldering'],
      t2: ['fire_burst', 'flame_guard'],
    },
    wind: {
      t1: ['dual_slash', 'swiftness'],
      t2: ['whirlwind', 'critical_wind'],
    },
  };

  // --- Initial Player State ---
  let hero = {
    name: 'Mochi',
    element: CHOSEN_ELEMENT,
    level: 1,
    xp: 0,
    gold: 0,
    strength: 10,
    agility: 10,
    vitality: 10,
    statPoints: 0,
    gear: {
      weapon: 'wooden_branch', // starter item
      chest: 'cardboard_armor', // starter item
      storage: 'leather_bag', // starter item (+3 bag slots)
      head: null,
      legs: null,
      gloves: null,
      boots: null,
      trinket: null,
    },
    unlockedSkills: {}, // skillId -> { stars: 1-5 }
    equippedSkills: [null, null],
    inventory: {
      healthPotions: 0,
      materials: {
        black_shard: 0,
        black_crystal_small: 0,
        black_crystal_big: 0,
        black_crystal_core: 0,
      },
    },
    lastDailyClaim: null,
  };

  // Track run statistics
  const stats = {
    totalCombats: 0,
    totalLandslideCasts: 0,
    totalBoulderSlashCasts: 0,
    totalTidalStrikeCasts: 0,
    totalHealingCurrentCasts: 0,
    totalFireSlashCasts: 0,
    totalFireBurstCasts: 0,
    totalFlameGuardCasts: 0,
    totalBasicAttacks: 0,
    totalDamageDealt: 0,
    totalRecoilDamageTaken: 0,
    totalPotionsUsed: 0,
    dailyClaimsCount: 0,
    highestLvReached: 1,
    totalDeaths: 0,
    totalWindBladesCasts: 0,
    totalCriticalWindCasts: 0,
  };

  // Helper to deep clone objects
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Helper to roll crystal drops based on star rating and profile
  function getEnemyDrops(enemyId, starRating) {
    const drops = {};
    const enemyKey = enemyId.replace(/^elite_/, '');
    
    // Star Level 1: 100% Shards.
    // Star Level 2: 80% Shards, 20% Small.
    // Star Level 3: 70% Small, 30% Big.
    // Star Level 4: 100% Big.
    // Star Level 5: 95% Big, 5% Core.
    const roll = Math.random();
    let crystalType = 'black_shard';
    if (starRating === 2) {
      crystalType = roll < 0.20 ? 'black_crystal_small' : 'black_shard';
    } else if (starRating === 3) {
      crystalType = roll < 0.30 ? 'black_crystal_big' : 'black_crystal_small';
    } else if (starRating === 4) {
      crystalType = 'black_crystal_big';
    } else if (starRating === 5) {
      crystalType = roll < 0.05 ? 'black_crystal_core' : 'black_crystal_big';
    }

    // Drops count by profile
    let qty = starRating;
    const profile = ['sewer_rat', 'mutated_plant', 'mineral_pincher'].includes(enemyKey) ? 'rat' :
                    ['cockroach_knight', 'ironclad_beetle'].includes(enemyKey) ? 'cockroach' : 'frog';
    
    if (profile === 'frog') {
      qty = starRating + (Math.random() < 0.50 ? 1 : 0);
    } else if (profile === 'cockroach') {
      qty = starRating + 1;
    }

    drops[crystalType] = qty;
    return drops;
  }

  // Helper to calculate total crystals/shards needed for all future upgrades
  function getUpgradePathRemainingCosts(h) {
    let shards = 0;
    let small = 0;
    let big = 0;
    let core = 0;

    const t1Skills = ELEMENT_SKILLS[h.element].t1;
    const t2Skills = ELEMENT_SKILLS[h.element].t2;

    // Tier 1 skills
    for (const sId of t1Skills) {
      const entry = h.unlockedSkills[sId];
      const currentStars = entry ? entry.stars : 0;
      for (let star = currentStars + 1; star <= 5; star++) {
        const cost = SKILL_UPGRADE_COSTS[1][star];
        if (cost && cost.materials) {
          shards += cost.materials.black_shard || 0;
          small += cost.materials.black_crystal_small || 0;
        }
      }
    }

    // Tier 2 skills
    for (const sId of t2Skills) {
      const entry = h.unlockedSkills[sId];
      const currentStars = entry ? entry.stars : 0;
      for (let star = currentStars + 1; star <= 5; star++) {
        const cost = SKILL_UPGRADE_COSTS[2][star];
        if (cost && cost.materials) {
          small += cost.materials.black_crystal_small || 0;
          big += cost.materials.black_crystal_big || 0;
          core += cost.materials.black_crystal_core || 0;
        }
      }
    }

    return { shards, small, big, core };
  }

  // Smart crystal fusion logic: only fuse lower tier crystals if we don't need them anymore
  function performSmartCrystalFusion(inventory, h) {
    const mats = inventory.materials;
    const needed = getUpgradePathRemainingCosts(h);

    // 1. Shards -> Small
    if (mats.black_shard > needed.shards) {
      const available = mats.black_shard - needed.shards;
      const fused = Math.floor(available / 10);
      if (fused > 0) {
        mats.black_shard -= fused * 10;
        mats.black_crystal_small = (mats.black_crystal_small || 0) + fused;
        console.log(`🔨 Smart Fuse: Combined ${fused * 10} Shards into ${fused} Small Crystals.`);
      }
    }

    // 2. Small -> Big
    if (mats.black_crystal_small > needed.small) {
      const available = mats.black_crystal_small - needed.small;
      const fused = Math.floor(available / 10);
      if (fused > 0) {
        mats.black_crystal_small -= fused * 10;
        mats.black_crystal_big = (mats.black_crystal_big || 0) + fused;
        console.log(`🔨 Smart Fuse: Combined ${fused * 10} Small Crystals into ${fused} Big Crystals.`);
      }
    }
  }

  // Helper to allocate level-up points
  function allocateStatPoints(h) {
    if (h.statPoints > 0) {
      if (h.element === 'fire') {
        // Balance STR and VIT: 50% STR, 50% VIT
        const toStr = Math.floor(h.statPoints / 2);
        const toVit = h.statPoints - toStr;
        h.strength += toStr;
        h.vitality += toVit;
        console.log(`🆙 Allocating ${h.statPoints} Attribute Points: +${toStr} STR, +${toVit} VIT.`);
      } else if (h.element === 'wind') {
        // Wind: 50% STR (damage), 50% VIT (survival) — AGI gains naturally from stance/passives
        const toStr = Math.floor(h.statPoints / 2);
        const toVit = h.statPoints - toStr;
        h.strength += toStr;
        h.vitality += toVit;
        console.log(`🆙 Allocating ${h.statPoints} Attribute Points: +${toStr} STR, +${toVit} VIT.`);
      } else {
        console.log(`🆙 Allocating ${h.statPoints} Attribute Points to Vitality (VIT).`);
        h.vitality += h.statPoints;
      }
      h.statPoints = 0;
    }

  }

  // Shop phase: buy potions and upgrade gear
  function manageShop(h, floorNum) {
    // 1. Potion buying: buy potions to maintain a stash of 10 potions
    const targetPotions = 10;
    const currentStash = h.inventory.healthPotions || 0;
    if (currentStash < targetPotions) {
      const needed = targetPotions - currentStash;
      const isLevel10 = h.level >= 10;
      const costPerPotion = isLevel10 ? 100 : 50;
      for (let i = 0; i < needed; i++) {
        if (h.gold >= costPerPotion) {
          h.gold -= costPerPotion;
          h.inventory.healthPotions = (h.inventory.healthPotions || 0) + 1;
          console.log(`🛒 Purchased Potion (${isLevel10 ? 'Super' : 'Regular'}) for ${costPerPotion} G.`);
        } else {
          break;
        }
      }
    }

    // 2. Buy Backpack upgrades
    if (h.gear.storage === 'leather_bag' && h.gold >= 300) {
      h.gold -= 300;
      h.gear.storage = 'simple_backpack';
      console.log('🛒 Purchased Backpack: simple_backpack for 300 G.');
    }
    if (floorNum >= 6 && h.gear.storage === 'simple_backpack' && h.gold >= 1000) {
      h.gold -= 1000;
      h.gear.storage = 'fine_backpack';
      console.log('🛒 Purchased Backpack: fine_backpack for 1000 G.');
    }

    // 3. Buy Weapon/Armor upgrades slot by slot
    const gearItemMapping = {
      weapon: { basic: 'wooden_sword', superior: 'stone_sword' },
      head: { basic: 'leather_helmet', superior: 'superior_leather_helmet' },
      chest: { basic: 'leather_chestpiece', superior: 'superior_leather_chestpiece' },
      legs: { basic: 'leather_leggings', superior: 'superior_leather_leggings' },
      gloves: { basic: 'leather_gloves', superior: 'superior_leather_gloves' },
      boots: { basic: 'leather_boots', superior: 'superior_leather_boots' },
      trinket: { basic: 'leather_belt', superior: 'superior_leather_belt' }
    };

    const slots = ['weapon', 'head', 'chest', 'legs', 'gloves', 'boots', 'trinket'];
    for (const slot of slots) {
      const current = h.gear[slot];
      const mapping = gearItemMapping[slot];
      if (!mapping) continue;

      if (floorNum >= 6) {
        // Target: Superior
        const supId = mapping.superior;
        if (current !== supId) {
          if (h.gold >= 200) {
            h.gold -= 200;
            h.gear[slot] = supId;
            console.log(`🛒 Purchased Gear: ${supId} for 200 G.`);
          }
        }
      } else {
        // Target: Basic
        const basicId = mapping.basic;
        if (current !== basicId && current !== mapping.superior) {
          if (h.gold >= 100) {
            h.gold -= 100;
            h.gear[slot] = basicId;
            console.log(`🛒 Purchased Gear: ${basicId} for 100 G.`);
          }
        }
      }
    }
  }

  // Upgrade Skills loop
  function manageSkillUpgrades(h) {
    // Perform smart fusions first
    performSmartCrystalFusion(h.inventory, h);

    const t1Skills = ELEMENT_SKILLS[h.element].t1;
    const t2Skills = ELEMENT_SKILLS[h.element].t2;

    // 1. Unlock T1 skills
    for (const skillId of t1Skills) {
      if (!h.unlockedSkills[skillId]) {
        const check = canUnlockElementSkill(skillId, h);
        if (check.can) {
          h.unlockedSkills[skillId] = { stars: 1 };
          for (const [matId, qty] of Object.entries(check.cost.materials)) {
            h.inventory.materials[matId] -= qty;
          }
          console.log(`🔮 UNLOCKED Skill: ${SKILLS[skillId].name} ★1.`);
          if (SKILLS[skillId].type === 'active') {
            if (h.equippedSkills[0] === null) h.equippedSkills[0] = skillId;
            else if (h.equippedSkills[1] === null) h.equippedSkills[1] = skillId;
          }
        }
      }
    }

    // 2. Upgrade T1 skills evenly
    for (let targetStar = 2; targetStar <= 5; targetStar++) {
      for (const skillId of t1Skills) {
        const entry = h.unlockedSkills[skillId];
        if (entry && entry.stars === targetStar - 1) {
          const check = canStarUpSkill(skillId, h);
          if (check.can) {
            h.unlockedSkills[skillId].stars = targetStar;
            for (const [matId, qty] of Object.entries(check.cost.materials)) {
              h.inventory.materials[matId] -= qty;
            }
            console.log(`🌟 UPGRADED Skill: ${SKILLS[skillId].name} to ★${targetStar}.`);
          }
        }
      }
    }

    // 3. Unlock T2 skills (once level 11+)
    for (const skillId of t2Skills) {
      if (!h.unlockedSkills[skillId]) {
        const check = canUnlockElementSkill(skillId, h);
        if (check.can) {
          h.unlockedSkills[skillId] = { stars: 1 };
          for (const [matId, qty] of Object.entries(check.cost.materials)) {
            h.inventory.materials[matId] -= qty;
          }
          console.log(`🔮 UNLOCKED Skill: ${SKILLS[skillId].name} ★1.`);
          if (SKILLS[skillId].type === 'active') {
            if (h.equippedSkills[0] === null) h.equippedSkills[0] = skillId;
            else if (h.equippedSkills[1] === null) h.equippedSkills[1] = skillId;
          }
        }
      }
    }

    // 4. Upgrade T2 skills evenly
    for (let targetStar = 2; targetStar <= 5; targetStar++) {
      for (const skillId of t2Skills) {
        const entry = h.unlockedSkills[skillId];
        if (entry && entry.stars === targetStar - 1) {
          const check = canStarUpSkill(skillId, h);
          console.log(`[DEBUG] canStarUpSkill check for ${skillId} (target: ★${targetStar}):`, check, `Current materials:`, JSON.stringify(h.inventory.materials));
          if (check.can) {
            h.unlockedSkills[skillId].stars = targetStar;
            for (const [matId, qty] of Object.entries(check.cost.materials)) {
              h.inventory.materials[matId] -= qty;
            }
            console.log(`🌟 UPGRADED Skill: ${SKILLS[skillId].name} to ★${targetStar}.`);
          }
        }
      }
    }
  }

  // Daily rations claim
  function claimDailyReward(h) {
    const isFirstClaim = stats.dailyClaimsCount === 0;
    const goldReward = isFirstClaim ? 50 : 100 + h.level * 50;
    const potionQty = isFirstClaim ? 3 : 1 + Math.floor(h.level / 5);
    
    h.gold += goldReward;
    h.inventory.healthPotions = (h.inventory.healthPotions || 0) + potionQty;
    stats.dailyClaimsCount += 1;

    console.log(`📅 Claimed Daily Rations: +${goldReward} G, +${potionQty} Health Potions. (Potions Owned: ${h.inventory.healthPotions})`);
  }

  // Helper to execute a single floor run (either progression or farming)
  async function executeFloorRun(floorNum, isFarmRun = false, isRetry = false) {
    if (isFarmRun) {
      console.log(`\n🌾 [FARM RUN] Crawling Floor ${floorNum} to gather materials...`);
    }

    // 1. Camp preparation phase
    allocateStatPoints(hero);
    // Only progression runs claim daily rewards to simulate daily cooldowns/progression (not on retries)
    if (!isFarmRun && !isRetry) {
      claimDailyReward(hero);
    }
    manageShop(hero, floorNum);
    manageSkillUpgrades(hero);

    // Calculate effective stats for this floor
    const effectiveStats = calculateEffectiveStats(hero);
    if (!isFarmRun) {
      console.log(`📈 Mochi's Stats: HP: ${effectiveStats.maxHp}, ATK: ${effectiveStats.attack}, DEF: ${effectiveStats.defence}, Dodge: ${Math.round(effectiveStats.critChance * 100)}%, Crit: ${Math.round(effectiveStats.dodge * 100)}%`);
      console.log(`🎒 Gear slots: Weapon: ${hero.gear.weapon}, Chest: ${hero.gear.chest}, Head: ${hero.gear.head}, Trinket: ${hero.gear.trinket}`);
      console.log(`🥋 Equipped Actives: [${hero.equippedSkills.map(s => s ? SKILLS[s].name : 'None').join(', ')}]`);
    }

    // Pack consumables up to capacity
    const packedPotionsCount = Math.min(hero.inventory.healthPotions || 0, effectiveStats.bagSlots || 3);
    let runPotions = packedPotionsCount;
    hero.inventory.healthPotions -= packedPotionsCount;
    if (!isFarmRun) {
      console.log(`💼 Packed ${runPotions} Potions for this floor run. (Remaining in storage: ${hero.inventory.healthPotions})`);
    }

    // 2. Generate Floor Grid
    let grid;
    try {
      grid = generateDungeonGrid(4, 4, 'zone1', floorNum);
    } catch (e) {
      grid = [];
    }

    // Flatten grid into room list
    const rooms = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const room = grid[y][x];
        if (room.type !== 'start') {
          rooms.push(room);
        }
      }
    }

    // Sort rooms: Boss is always last, Rest rooms can be saved or used tactically
    const bossRoom = rooms.find(r => r.type === 'boss');
    const nonBossRooms = rooms.filter(r => r.type !== 'boss');

    let currentHp = effectiveStats.maxHp;
    let runGoldEarned = 0;
    let runXpEarned = 0;
    let runSuccessfullyCleared = true;
    const runMaterialsEarned = {};

    // Simulate crawling through non-boss rooms
    for (const room of nonBossRooms) {
      if (currentHp <= 0) break;

      // Mid-Floor Map Healing
      if (currentHp / effectiveStats.maxHp < 0.70 && runPotions > 0) {
        const healAmount = hero.level >= 10 ? 100 : 50;
        const neededHealCount = Math.ceil((effectiveStats.maxHp * 0.70 - currentHp) / healAmount);
        const potionsToUse = Math.min(runPotions, neededHealCount);
        if (potionsToUse > 0) {
          runPotions -= potionsToUse;
          stats.totalPotionsUsed += potionsToUse;
          const healVal = potionsToUse * healAmount;
          currentHp = Math.min(effectiveStats.maxHp, currentHp + healVal);
          if (!isFarmRun) {
            console.log(`🗺️ Map Healing: Used ${potionsToUse} Potion(s). HP restored by ${healVal} to ${currentHp}/${effectiveStats.maxHp}.`);
          }
        }
      }

      if (room.type === 'combat') {
        stats.totalCombats += 1;
        // Spawn enemies
        const numEnemies = floorNum === 10 ? 4 : room.enemyCount || 1;
        const starRating = room.battleRating || 1;

        // Choose random enemies from Zone 1 common pool
        const zone1CommonPool = ['sewer_rat', 'slimeling', 'cockroach_knight', 'plague_frog'];
        const enemyGroup = [];
        for (let eIdx = 0; eIdx < numEnemies; eIdx++) {
          const randId = zone1CommonPool[Math.floor(Math.random() * zone1CommonPool.length)];
          const enemyTemplate = clone(ENEMIES[randId]);
          
          // Apply star scaling multipliers
          const scale = starRating === 2 ? 1.4 : starRating === 3 ? 1.8 : starRating === 4 ? 2.2 : starRating === 5 ? 2.5 : 1.0;
          enemyGroup.push({
            uid: `enemy_${eIdx}_${Date.now()}`,
            id: randId,
            name: `${enemyTemplate.name} ${starRating}★`,
            hp: Math.floor(enemyTemplate.hp * scale),
            maxHp: Math.floor(enemyTemplate.hp * scale),
            attack: Math.floor(enemyTemplate.attack * scale),
            defence: Math.floor((enemyTemplate.defence || enemyTemplate.def || 0) * scale),
            dodge: enemyTemplate.dodge || 0,
            moves: enemyTemplate.moves,
            cooldowns: {},
            effects: [],
          });
        }

        // Combat Turn Loop
        let round = 1;
        const combatHero = {
          ...effectiveStats,
          hp: currentHp,
          effects: [],
          cooldowns: {},
          playerHoT: null,
          flameGuardActive: false,
          flameGuardTurnsRemaining: 0,
          flameGuardReduction: 0,
          flameGuardBurnDamage: 0,
          flameGuardBurnDuration: 0,
          critWindActive: false,
          critWindTurnsRemaining: 0,
          critWindCritBonus: 0,
          critWindDamageBonus: 0,
        };
        for (const skillId of Object.keys(hero.unlockedSkills)) {
          if (SKILLS[skillId].type === 'active') {
            combatHero.cooldowns[skillId] = 0;
          }
        }

        while (combatHero.hp > 0 && enemyGroup.filter(e => e.hp > 0).length > 0) {
          // --- Mochi's Turn ---

          // 1. Calcify passive tick (Earth)
          if (hero.element === 'earth' && effectiveStats.passives.calcifyRegen > 0 && combatHero.hp < combatHero.maxHp) {
            const regenAmount = Math.min(
              combatHero.maxHp - combatHero.hp,
              Math.floor(combatHero.maxHp * effectiveStats.passives.calcifyRegen)
            );
            combatHero.hp += regenAmount;
            if (!isFarmRun) {
              console.log(`🌵 Calcify tick: Mochi recovers ${regenAmount} HP!`);
            }
          }

          // Process Healing Current HoT tick (Water)
          if (hero.element === 'water' && combatHero.playerHoT && combatHero.playerHoT.turnsRemaining > 0) {
            const hot = combatHero.playerHoT;
            const baseHeal = Math.floor(combatHero.maxHp * hot.healPerTurn);
            const finalHeal = applyHealingEfficiency(baseHeal, combatHero);
            const actualHeal = Math.min(combatHero.maxHp, combatHero.hp + finalHeal) - combatHero.hp;
            combatHero.hp += actualHeal;

            const newTurns = hot.turnsRemaining - 1;
            if (newTurns > 0) {
              combatHero.playerHoT = {
                ...hot,
                turnsRemaining: newTurns,
              };
            } else {
              combatHero.playerHoT = null;
            }
            if (!isFarmRun) {
              console.log(`💧 Healing Current tick: Mochi recovers ${actualHeal} HP! (HoT remaining: ${newTurns} turns)`);
            }
          }

          // 2. Use potion if low HP (< 50% for safety)
          if (combatHero.hp / combatHero.maxHp < 0.50 && runPotions > 0) {
            runPotions -= 1;
            stats.totalPotionsUsed += 1;
            const healAmount = hero.level >= 10 ? 100 : 50;
            const healVal = Math.min(combatHero.maxHp - combatHero.hp, healAmount);
            combatHero.hp += healVal;
            if (!isFarmRun) {
              console.log(`🧪 Used Potion (${hero.level >= 10 ? 'Super' : 'Regular'}). Recovered ${healVal} HP.`);
            }
          }

          // 3. Choose action (Earth: Landslide > Boulder Slash > Attack; Water: Healing Current > Tidal Strike > Attack)
          const aliveEnemies = enemyGroup.filter(e => e.hp > 0);
          const targetEnemy = aliveEnemies[0];
          const targetIdx = enemyGroup.findIndex(e => e.uid === targetEnemy.uid);

          if (hero.element === 'earth') {
            const landslideUnlocked = hero.unlockedSkills.landslide;
            const landslideCd = combatHero.cooldowns.landslide || 0;
            const boulderSlashUnlocked = hero.unlockedSkills.boulder_slash;
            const boulderCd = combatHero.cooldowns.boulder_slash || 0;

            if (landslideUnlocked && landslideCd === 0) {
              // Cast Landslide
              stats.totalLandslideCasts += 1;
              const lsResult = executeLandslide(SKILLS.landslide, landslideUnlocked.stars, combatHero, aliveEnemies);
              
              // Apply damage to enemies
              for (const res of lsResult.results) {
                const enemy = enemyGroup.find(e => e.uid === res.targetUid);
                if (enemy) {
                  enemy.hp = Math.max(0, enemy.hp - res.damage);
                  stats.totalDamageDealt += res.damage;
                  if (res.stunApplied) {
                    enemy.effects.push({ type: 'stun', duration: 1 });
                  }
                }
              }

              // Apply recoil to Mochi
              combatHero.hp = Math.max(0, combatHero.hp - lsResult.backfireDamage);
              stats.totalRecoilDamageTaken += lsResult.backfireDamage;
              
              // Set Cooldown
              const lsCd = SKILLS.landslide.stars[landslideUnlocked.stars].cooldown;
              combatHero.cooldowns.landslide = lsCd;

            } else if (boulderSlashUnlocked && boulderCd === 0) {
              // Cast Boulder Slash
              stats.totalBoulderSlashCasts += 1;
              const bsResult = executeBoulderSlash(SKILLS.boulder_slash, boulderSlashUnlocked.stars, combatHero, targetEnemy);
              
              targetEnemy.hp = Math.max(0, targetEnemy.hp - bsResult.damage);
              stats.totalDamageDealt += bsResult.damage;
              if (bsResult.stunApplied) {
                targetEnemy.effects.push({ type: 'stun', duration: 1 });
              }

              combatHero.cooldowns.boulder_slash = SKILLS.boulder_slash.cooldown;

            } else {
              // Basic Attack
              stats.totalBasicAttacks += 1;
              const attResult = executeAttack(combatHero, targetEnemy, combatHero);
              targetEnemy.hp = Math.max(0, targetEnemy.hp - attResult.damage);
              stats.totalDamageDealt += attResult.damage;
            }
          } else if (hero.element === 'water') {
            const tidalStrikeUnlocked = hero.unlockedSkills.tidal_strike;
            const tidalStrikeCd = combatHero.cooldowns.tidal_strike || 0;
            const healingCurrentUnlocked = hero.unlockedSkills.healing_current;
            const healingCurrentCd = combatHero.cooldowns.healing_current || 0;

            // Prioritize healing if HP is below 70% and HoT is not currently active and skill is ready
            if (healingCurrentUnlocked && healingCurrentCd === 0 && (!combatHero.playerHoT || combatHero.playerHoT.turnsRemaining <= 0) && (combatHero.hp / combatHero.maxHp < 0.70)) {
              // Cast Healing Current
              stats.totalHealingCurrentCasts += 1;
              const hcResult = executeHealingCurrent(SKILLS.healing_current, healingCurrentUnlocked.stars, combatHero.name);
              
              combatHero.playerHoT = hcResult.playerHoT;
              combatHero.effects.push({ type: 'hot', duration: hcResult.playerHoT.duration });
              combatHero.cooldowns.healing_current = SKILLS.healing_current.cooldown;
              
              if (!isFarmRun) {
                console.log(hcResult.log);
              }
            } else if (tidalStrikeUnlocked && tidalStrikeCd === 0) {
              // Cast Tidal Strike
              stats.totalTidalStrikeCasts += 1;
              const tsResult = executeTidalStrike(SKILLS.tidal_strike, tidalStrikeUnlocked.stars, combatHero, enemyGroup, targetIdx);
              
              for (const res of tsResult.results) {
                const enemy = enemyGroup.find(e => (e.uid || e.id) === res.targetUid);
                if (enemy) {
                  enemy.hp = Math.max(0, enemy.hp - res.damage);
                  stats.totalDamageDealt += res.damage;
                }
              }
              
              combatHero.cooldowns.tidal_strike = SKILLS.tidal_strike.cooldown;
              if (!isFarmRun) {
                console.log(tsResult.log);
              }
            } else {
              // Basic Attack
              stats.totalBasicAttacks += 1;
              const attResult = executeAttack(combatHero, targetEnemy, combatHero);
              targetEnemy.hp = Math.max(0, targetEnemy.hp - attResult.damage);
              stats.totalDamageDealt += attResult.damage;
            }
          } else if (hero.element === 'fire') {
            const fireSlashUnlocked = hero.unlockedSkills.fire_slash;
            const fireSlashCd = combatHero.cooldowns.fire_slash || 0;
            const fireBurstUnlocked = hero.unlockedSkills.fire_burst;
            const fireBurstCd = combatHero.cooldowns.fire_burst || 0;
            const flameGuardUnlocked = hero.unlockedSkills.flame_guard;
            const flameGuardCd = combatHero.cooldowns.flame_guard || 0;

            const stanceBonus = getStanceBonus(hero.element, hero.level);
            const stanceBurn = stanceBonus.burnTickBonus || 0;
            const smolderingEntry = hero.unlockedSkills.smoldering;
            const smolderingBurn = smolderingEntry
              ? (SKILLS.smoldering.stars[smolderingEntry.stars].burnTickBonus || 0)
              : 0;
            const burnBonus = stanceBurn + smolderingBurn;

            if (flameGuardUnlocked && flameGuardCd === 0 && !combatHero.flameGuardActive) {
              // Cast Flame Guard
              stats.totalFlameGuardCasts = (stats.totalFlameGuardCasts || 0) + 1;
              const fgResult = executeFlameGuard(SKILLS.flame_guard, flameGuardUnlocked.stars, combatHero, burnBonus);
              
              combatHero.flameGuardActive = fgResult.flameGuardActive;
              combatHero.flameGuardTurnsRemaining = fgResult.flameGuardTurnsRemaining;
              combatHero.flameGuardReduction = fgResult.flameGuardReduction;
              combatHero.flameGuardBurnDamage = fgResult.flameGuardBurnDamage;
              combatHero.flameGuardBurnDuration = fgResult.flameGuardBurnDuration;
              combatHero.cooldowns.flame_guard = SKILLS.flame_guard.cooldown;
              
              if (!isFarmRun) {
                console.log(fgResult.log);
              }
            } else if (fireBurstUnlocked && fireBurstCd === 0) {
              // Cast Fire Burst
              stats.totalFireBurstCasts = (stats.totalFireBurstCasts || 0) + 1;
              const fbResult = executeFireBurst(SKILLS.fire_burst, fireBurstUnlocked.stars, combatHero, enemyGroup, targetIdx, burnBonus);
              
              for (const res of fbResult.results) {
                const enemy = enemyGroup.find(e => (e.uid || e.id) === res.targetUid);
                if (enemy) {
                  enemy.hp = Math.max(0, enemy.hp - res.damage);
                  stats.totalDamageDealt += res.damage;
                }
              }
              
              combatHero.cooldowns.fire_burst = SKILLS.fire_burst.cooldown;
              if (!isFarmRun) {
                console.log(fbResult.log);
              }
            } else if (fireSlashUnlocked && fireSlashCd === 0) {
              // Cast Fire Slash
              stats.totalFireSlashCasts = (stats.totalFireSlashCasts || 0) + 1;
              const fsResult = executeFireSlash(SKILLS.fire_slash, fireSlashUnlocked.stars, combatHero, targetEnemy, burnBonus);
              
              targetEnemy.hp = Math.max(0, targetEnemy.hp - fsResult.damage);
              stats.totalDamageDealt += fsResult.damage;
              
              combatHero.cooldowns.fire_slash = SKILLS.fire_slash.cooldown;
              if (!isFarmRun) {
                console.log(fsResult.log);
              }
            } else {
              // Basic Attack
              stats.totalBasicAttacks += 1;
              const attResult = executeAttack(combatHero, targetEnemy, combatHero);
              targetEnemy.hp = Math.max(0, targetEnemy.hp - attResult.damage);
              stats.totalDamageDealt += attResult.damage;
            }
          } else if (hero.element === 'wind') {
            const windBladesUnlocked = hero.unlockedSkills.dual_slash;
            const windBladesCd = combatHero.cooldowns.dual_slash || 0;
            const critWindUnlocked = hero.unlockedSkills.critical_wind;
            const critWindCd = combatHero.cooldowns.critical_wind || 0;

            // Priority: Critical Wind (buff) > Wind Blades > Basic Attack
            if (critWindUnlocked && critWindCd === 0 && !combatHero.critWindActive) {
              // Cast Critical Wind
              stats.totalCriticalWindCasts = (stats.totalCriticalWindCasts || 0) + 1;
              const cwResult = executeCriticalWind(SKILLS.critical_wind, critWindUnlocked.stars, combatHero);

              combatHero.critWindActive = cwResult.critWindActive;
              combatHero.critWindTurnsRemaining = cwResult.critWindTurnsRemaining;
              combatHero.critWindCritBonus = cwResult.critWindCritBonus;
              combatHero.critWindDamageBonus = cwResult.critWindDamageBonus;
              combatHero.cooldowns.critical_wind = SKILLS.critical_wind.cooldown;

              if (!isFarmRun) {
                console.log(cwResult.log);
              }
            } else if (windBladesUnlocked && windBladesCd === 0) {
              // Cast Wind Blades
              stats.totalWindBladesCasts = (stats.totalWindBladesCasts || 0) + 1;
              const aliveForWind = enemyGroup.filter(e => e.hp > 0);
              const wbResult = executeDualSlash(
                SKILLS.dual_slash,
                windBladesUnlocked.stars,
                combatHero,
                aliveForWind,
                0 // always target index 0 (first alive enemy)
              );

              for (const hit of wbResult.hits) {
                for (const t of hit.targets) {
                  const enemy = enemyGroup.find(e => e.uid === t.uid);
                  if (enemy) {
                    enemy.hp = Math.max(0, enemy.hp - t.damage);
                    stats.totalDamageDealt += t.damage;
                  }
                }
              }

              combatHero.cooldowns.dual_slash = SKILLS.dual_slash.cooldown;

              if (!isFarmRun) {
                console.log(wbResult.log);
              }
            } else {
              // Basic Attack
              stats.totalBasicAttacks += 1;
              const attResult = executeAttack(combatHero, targetEnemy, combatHero);
              targetEnemy.hp = Math.max(0, targetEnemy.hp - attResult.damage);
              stats.totalDamageDealt += attResult.damage;
            }
          }

          // Decrement Flame Guard turns
          if (combatHero.flameGuardActive) {
            const remaining = (combatHero.flameGuardTurnsRemaining || 1) - 1;
            if (remaining <= 0) {
              combatHero.flameGuardActive = false;
              combatHero.flameGuardTurnsRemaining = 0;
              combatHero.flameGuardReduction = 0;
              if (!isFarmRun) {
                console.log('🛡️ Flame Guard fades.');
              }
            } else {
              combatHero.flameGuardTurnsRemaining = remaining;
            }
          }

          // Decrement Critical Wind turns
          if (combatHero.critWindActive) {
            const remaining = (combatHero.critWindTurnsRemaining || 1) - 1;
            if (remaining <= 0) {
              combatHero.critWindActive = false;
              combatHero.critWindTurnsRemaining = 0;
              combatHero.critWindCritBonus = 0;
              combatHero.critWindDamageBonus = 0;
              if (!isFarmRun) {
                console.log('⚡ Critical Wind fades.');
              }
            } else {
              combatHero.critWindTurnsRemaining = remaining;
            }
          }

          // 4. Tick Mochi's status effects
          const heroTick = processStatusEffects(combatHero);
          combatHero.hp = Math.max(0, combatHero.hp - heroTick.damage);

          if (combatHero.hp <= 0) break;

          // --- Enemies' Turn ---
          for (const enemy of enemyGroup) {
            if (enemy.hp <= 0) continue;

            const isStunned = enemy.effects.some(ef => ef.type === 'stun');
            if (isStunned) {
              // Tick down stun
              enemy.effects = enemy.effects.filter(ef => ef.type !== 'stun');
              continue;
            }

            // Attack Mochi
            const enemyAtt = executeAttack(enemy, combatHero, enemy);
            combatHero.hp = Math.max(0, combatHero.hp - enemyAtt.damage);

            // Flame Guard counter-burn
            if (combatHero.flameGuardActive && enemyAtt.damage > 0 && enemy.hp > 0) {
              applyBurn(enemy.effects || (enemy.effects = []), combatHero.flameGuardBurnDamage, combatHero.flameGuardBurnDuration);
              if (!isFarmRun) {
                console.log(`🛡️ Flame Guard counter-burns ${enemy.name}!`);
              }
            }

            // Tick enemy status effects
            const enemyTick = processStatusEffects(enemy);
            enemy.hp = Math.max(0, enemy.hp - enemyTick.damage);
          }

          round += 1;
        }

        currentHp = combatHero.hp;

        if (currentHp <= 0) {
          if (!isFarmRun) {
            console.log(`❌ Mochi DIED in combat against: ${enemyGroup.map(e => e.name).join(', ')}.`);
          }
          runSuccessfullyCleared = false;
          break;
        } else {
          // Combat Victory: Roll drops and collect rewards
          for (const enemy of enemyGroup) {
            // Roll crystal drops
            const drops = getEnemyDrops(enemy.id, starRating);
            for (const [matId, qty] of Object.entries(drops)) {
              runMaterialsEarned[matId] = (runMaterialsEarned[matId] || 0) + qty;
            }

            // Gained Gold and XP formulas
            runGoldEarned += Math.floor(10 * starRating * (1 + Math.random() * 0.25));
            runXpEarned += Math.floor(15 * starRating);
          }
        }

      } else if (room.type === 'treasure') {
        // Treasure room drops
        runGoldEarned += Math.floor(20 + Math.random() * 30);
        runMaterialsEarned.black_shard = (runMaterialsEarned.black_shard || 0) + Math.floor(2 + Math.random() * 3);

      } else if (room.type === 'rest') {
        // Rest Room decision: heal if low HP, otherwise buff
        if (currentHp / effectiveStats.maxHp < 0.60) {
          currentHp = effectiveStats.maxHp;
        }
      } else if (room.type === 'gamble') {
        // Gamble Room roll (1/3 Trap, 1/3 Treasure, 1/3 Ambush)
        const roll = Math.random();
        if (roll < 0.33) {
          // Trap: Lose 20-30% HP
          const trapDmg = Math.floor(effectiveStats.maxHp * (0.20 + Math.random() * 0.10));
          currentHp = Math.max(1, currentHp - trapDmg);
        } else if (roll < 0.66) {
          // Treasure
          runGoldEarned += 50;
          runMaterialsEarned.black_crystal_small = (runMaterialsEarned.black_crystal_small || 0) + 1;
        }
      }
    }

    // Simulate Boss Room on Floor 10
    if (runSuccessfullyCleared && floorNum === 10 && bossRoom && currentHp > 0) {
      // Mid-Floor Map Healing before Boss
      if (currentHp / effectiveStats.maxHp < 0.70 && runPotions > 0) {
        const healAmount = hero.level >= 10 ? 100 : 50;
        const neededHealCount = Math.ceil((effectiveStats.maxHp * 0.70 - currentHp) / healAmount);
        const potionsToUse = Math.min(runPotions, neededHealCount);
        if (potionsToUse > 0) {
          runPotions -= potionsToUse;
          stats.totalPotionsUsed += potionsToUse;
          const healVal = potionsToUse * healAmount;
          currentHp = Math.min(effectiveStats.maxHp, currentHp + healVal);
          if (!isFarmRun) {
            console.log(`🗺️ Map Healing (Pre-Boss): Used ${potionsToUse} Potion(s). HP restored by ${healVal} to ${currentHp}/${effectiveStats.maxHp}.`);
          }
        }
      }

      stats.totalCombats += 1;
      if (!isFarmRun) {
        console.log('👑 ENGAGING BOSS: KING RAT 👑');
      }

      const bossTemplate = clone(ENEMIES.king_rat);
      const boss = {
        uid: 'king_rat_boss',
        id: 'king_rat',
        name: bossTemplate.name,
        hp: bossTemplate.hp,
        maxHp: bossTemplate.hp,
        attack: bossTemplate.attack,
        defence: bossTemplate.defence || bossTemplate.def || 20,
        dodge: bossTemplate.dodge || 0.10,
        moves: bossTemplate.moves,
        cooldowns: {},
        effects: [],
      };

      const enemyGroup = [boss];
      let combatHero = {
        ...effectiveStats,
        hp: currentHp,
        effects: [],
        cooldowns: {},
        playerHoT: null,
        flameGuardActive: false,
        flameGuardTurnsRemaining: 0,
        flameGuardReduction: 0,
        flameGuardBurnDamage: 0,
        flameGuardBurnDuration: 0,
      };
      for (const skillId of Object.keys(hero.unlockedSkills)) {
        if (SKILLS[skillId].type === 'active') {
          combatHero.cooldowns[skillId] = 0;
        }
      }

      // Special Boss Combat Loop
      let round = 1;
      while (combatHero.hp > 0 && boss.hp > 0) {
        // Calcify tick
        if (hero.element === 'earth' && effectiveStats.passives.calcifyRegen > 0 && combatHero.hp < combatHero.maxHp) {
          combatHero.hp = Math.min(combatHero.maxHp, combatHero.hp + Math.floor(combatHero.maxHp * effectiveStats.passives.calcifyRegen));
        }

        // Process Healing Current HoT tick
        if (hero.element === 'water' && combatHero.playerHoT && combatHero.playerHoT.turnsRemaining > 0) {
          const hot = combatHero.playerHoT;
          const baseHeal = Math.floor(combatHero.maxHp * hot.healPerTurn);
          const finalHeal = applyHealingEfficiency(baseHeal, combatHero);
          const actualHeal = Math.min(combatHero.maxHp, combatHero.hp + finalHeal) - combatHero.hp;
          combatHero.hp += actualHeal;

          const newTurns = hot.turnsRemaining - 1;
          if (newTurns > 0) {
            combatHero.playerHoT = {
              ...hot,
              turnsRemaining: newTurns,
            };
          } else {
            combatHero.playerHoT = null;
          }
          if (!isFarmRun) {
            console.log(`💧 Healing Current tick: Mochi recovers ${actualHeal} HP! (HoT remaining: ${newTurns} turns)`);
          }
        }

        // Decrement Flame Guard turns
        if (combatHero.flameGuardActive) {
          const remaining = (combatHero.flameGuardTurnsRemaining || 1) - 1;
          if (remaining <= 0) {
            combatHero.flameGuardActive = false;
            combatHero.flameGuardTurnsRemaining = 0;
            combatHero.flameGuardReduction = 0;
            if (!isFarmRun) {
              console.log('🛡️ Flame Guard fades.');
            }
          } else {
            combatHero.flameGuardTurnsRemaining = remaining;
          }
        }

        // Potion use
        if (combatHero.hp / combatHero.maxHp < 0.50 && runPotions > 0) {
          runPotions -= 1;
          stats.totalPotionsUsed += 1;
          const healAmount = hero.level >= 10 ? 100 : 50;
          const healVal = Math.min(combatHero.maxHp - combatHero.hp, healAmount);
          combatHero.hp += healVal;
          if (!isFarmRun) {
            console.log(`🧪 Used Potion (${hero.level >= 10 ? 'Super' : 'Regular'}) in Boss Fight. Recovered ${healVal} HP.`);
          }
        }

        // Action decision
        const aliveEnemies = enemyGroup.filter(e => e.hp > 0);
        const targetIdx = enemyGroup.findIndex(e => e.uid === boss.uid);

        if (hero.element === 'earth') {
          const landslideUnlocked = hero.unlockedSkills.landslide;
          const landslideCd = combatHero.cooldowns.landslide || 0;
          const boulderSlashUnlocked = hero.unlockedSkills.boulder_slash;
          const boulderCd = combatHero.cooldowns.boulder_slash || 0;

          if (landslideUnlocked && landslideCd === 0) {
            stats.totalLandslideCasts += 1;
            const lsResult = executeLandslide(SKILLS.landslide, landslideUnlocked.stars, combatHero, aliveEnemies);
            
            for (const res of lsResult.results) {
              const enemy = enemyGroup.find(e => e.uid === res.targetUid);
              if (enemy) {
                enemy.hp = Math.max(0, enemy.hp - res.damage);
                stats.totalDamageDealt += res.damage;
                if (res.stunApplied) {
                  enemy.effects.push({ type: 'stun', duration: 1 });
                }
              }
            }
            combatHero.hp = Math.max(0, combatHero.hp - lsResult.backfireDamage);
            stats.totalRecoilDamageTaken += lsResult.backfireDamage;
            combatHero.cooldowns.landslide = SKILLS.landslide.stars[landslideUnlocked.stars].cooldown;

          } else if (boulderSlashUnlocked && boulderCd === 0) {
            stats.totalBoulderSlashCasts += 1;
            const bsResult = executeBoulderSlash(SKILLS.boulder_slash, boulderSlashUnlocked.stars, combatHero, boss);
            boss.hp = Math.max(0, boss.hp - bsResult.damage);
            stats.totalDamageDealt += bsResult.damage;
            if (bsResult.stunApplied) {
              boss.effects.push({ type: 'stun', duration: 1 });
            }
            combatHero.cooldowns.boulder_slash = SKILLS.boulder_slash.cooldown;

          } else {
            stats.totalBasicAttacks += 1;
            const attResult = executeAttack(combatHero, boss, combatHero);
            boss.hp = Math.max(0, boss.hp - attResult.damage);
            stats.totalDamageDealt += attResult.damage;
          }
        } else if (hero.element === 'water') {
          const tidalStrikeUnlocked = hero.unlockedSkills.tidal_strike;
          const tidalStrikeCd = combatHero.cooldowns.tidal_strike || 0;
          const healingCurrentUnlocked = hero.unlockedSkills.healing_current;
          const healingCurrentCd = combatHero.cooldowns.healing_current || 0;

          if (healingCurrentUnlocked && healingCurrentCd === 0 && (!combatHero.playerHoT || combatHero.playerHoT.turnsRemaining <= 0) && (combatHero.hp / combatHero.maxHp < 0.70)) {
            stats.totalHealingCurrentCasts += 1;
            const hcResult = executeHealingCurrent(SKILLS.healing_current, healingCurrentUnlocked.stars, combatHero.name);
            combatHero.playerHoT = hcResult.playerHoT;
            combatHero.effects.push({ type: 'hot', duration: hcResult.playerHoT.duration });
            combatHero.cooldowns.healing_current = SKILLS.healing_current.cooldown;
            if (!isFarmRun) {
              console.log(hcResult.log);
            }
          } else if (tidalStrikeUnlocked && tidalStrikeCd === 0) {
            stats.totalTidalStrikeCasts += 1;
            const tsResult = executeTidalStrike(SKILLS.tidal_strike, tidalStrikeUnlocked.stars, combatHero, enemyGroup, targetIdx);
            for (const res of tsResult.results) {
              const enemy = enemyGroup.find(e => (e.uid || e.id) === res.targetUid);
              if (enemy) {
                enemy.hp = Math.max(0, enemy.hp - res.damage);
                stats.totalDamageDealt += res.damage;
              }
            }
            combatHero.cooldowns.tidal_strike = SKILLS.tidal_strike.cooldown;
            if (!isFarmRun) {
              console.log(tsResult.log);
            }
          } else {
            stats.totalBasicAttacks += 1;
            const attResult = executeAttack(combatHero, boss, combatHero);
            boss.hp = Math.max(0, boss.hp - attResult.damage);
            stats.totalDamageDealt += attResult.damage;
          }
        } else if (hero.element === 'fire') {
          const fireSlashUnlocked = hero.unlockedSkills.fire_slash;
          const fireSlashCd = combatHero.cooldowns.fire_slash || 0;
          const fireBurstUnlocked = hero.unlockedSkills.fire_burst;
          const fireBurstCd = combatHero.cooldowns.fire_burst || 0;
          const flameGuardUnlocked = hero.unlockedSkills.flame_guard;
          const flameGuardCd = combatHero.cooldowns.flame_guard || 0;

          const stanceBonus = getStanceBonus(hero.element, hero.level);
          const stanceBurn = stanceBonus.burnTickBonus || 0;
          const smolderingEntry = hero.unlockedSkills.smoldering;
          const smolderingBurn = smolderingEntry
            ? (SKILLS.smoldering.stars[smolderingEntry.stars].burnTickBonus || 0)
            : 0;
          const burnBonus = stanceBurn + smolderingBurn;

          if (flameGuardUnlocked && flameGuardCd === 0 && !combatHero.flameGuardActive) {
            stats.totalFlameGuardCasts = (stats.totalFlameGuardCasts || 0) + 1;
            const fgResult = executeFlameGuard(SKILLS.flame_guard, flameGuardUnlocked.stars, combatHero, burnBonus);
            combatHero.flameGuardActive = fgResult.flameGuardActive;
            combatHero.flameGuardTurnsRemaining = fgResult.flameGuardTurnsRemaining;
            combatHero.flameGuardReduction = fgResult.flameGuardReduction;
            combatHero.flameGuardBurnDamage = fgResult.flameGuardBurnDamage;
            combatHero.flameGuardBurnDuration = fgResult.flameGuardBurnDuration;
            combatHero.cooldowns.flame_guard = SKILLS.flame_guard.cooldown;
            if (!isFarmRun) {
              console.log(fgResult.log);
            }
          } else if (fireBurstUnlocked && fireBurstCd === 0) {
            stats.totalFireBurstCasts = (stats.totalFireBurstCasts || 0) + 1;
            const fbResult = executeFireBurst(SKILLS.fire_burst, fireBurstUnlocked.stars, combatHero, enemyGroup, targetIdx, burnBonus);
            for (const res of fbResult.results) {
              const enemy = enemyGroup.find(e => (e.uid || e.id) === res.targetUid);
              if (enemy) {
                enemy.hp = Math.max(0, enemy.hp - res.damage);
                stats.totalDamageDealt += res.damage;
              }
            }
            combatHero.cooldowns.fire_burst = SKILLS.fire_burst.cooldown;
            if (!isFarmRun) {
              console.log(fbResult.log);
            }
          } else if (fireSlashUnlocked && fireSlashCd === 0) {
            stats.totalFireSlashCasts = (stats.totalFireSlashCasts || 0) + 1;
            const fsResult = executeFireSlash(SKILLS.fire_slash, fireSlashUnlocked.stars, combatHero, boss, burnBonus);
            boss.hp = Math.max(0, boss.hp - fsResult.damage);
            stats.totalDamageDealt += fsResult.damage;
            combatHero.cooldowns.fire_slash = SKILLS.fire_slash.cooldown;
            if (!isFarmRun) {
              console.log(fsResult.log);
            }
          } else {
            stats.totalBasicAttacks += 1;
            const attResult = executeAttack(combatHero, boss, combatHero);
            boss.hp = Math.max(0, boss.hp - attResult.damage);
            stats.totalDamageDealt += attResult.damage;
          }
        }

        // Tick Mochi's status effects
        const heroTick = processStatusEffects(combatHero);
        combatHero.hp = Math.max(0, combatHero.hp - heroTick.damage);

        if (combatHero.hp <= 0) break;

        // Boss's Turn
        for (const enemy of enemyGroup) {
          if (enemy.hp <= 0) continue;

          const isStunned = enemy.effects.some(ef => ef.type === 'stun');
          if (isStunned) {
            enemy.effects = enemy.effects.filter(ef => ef.type !== 'stun');
            continue;
          }

          // Simple Boss AI: Attack Mochi
          const enemyAtt = executeAttack(enemy, combatHero, enemy);
          combatHero.hp = Math.max(0, combatHero.hp - enemyAtt.damage);

          // Flame Guard counter-burn
          if (combatHero.flameGuardActive && enemyAtt.damage > 0 && enemy.hp > 0) {
            applyBurn(enemy.effects || (enemy.effects = []), combatHero.flameGuardBurnDamage, combatHero.flameGuardBurnDuration);
            if (!isFarmRun) {
              console.log(`🛡️ Flame Guard counter-burns ${enemy.name}!`);
            }
          }

          // Tick status effects
          const enemyTick = processStatusEffects(enemy);
          enemy.hp = Math.max(0, enemy.hp - enemyTick.damage);
        }

        round += 1;
      }

      currentHp = combatHero.hp;

      if (currentHp <= 0) {
        if (!isFarmRun) {
          console.log('❌ Mochi DIED in the Boss Fight against the King Rat.');
        }
        runSuccessfullyCleared = false;
      } else {
        if (!isFarmRun) {
          console.log('🎉 VICTORY! King Rat has been defeated! 🎉');
        }
        runGoldEarned += 300;
        runXpEarned += 500;
        runMaterialsEarned.black_crystal_core = (runMaterialsEarned.black_crystal_core || 0) + 1;
        runMaterialsEarned.black_crystal_big = (runMaterialsEarned.black_crystal_big || 0) + 3;
      }
    }

    if (!runSuccessfullyCleared) {
      // Refund remaining packed potions (used potions are permanently lost)
      hero.inventory.healthPotions += runPotions;
      return { success: false };
    } else {
      // Clear succeeded! Add gold, XP, and materials
      hero.inventory.healthPotions += runPotions; // refund remaining packed potions

      const rewards = getFloorCompletionReward('zone1', floorNum);
      const completionGold = isFarmRun ? 0 : rewards.gold;
      const completionXp = isFarmRun ? 0 : rewards.xp;

      hero.gold += runGoldEarned + completionGold;
      hero.xp += runXpEarned + completionXp;

      for (const [matId, qty] of Object.entries(runMaterialsEarned)) {
        hero.inventory.materials[matId] = (hero.inventory.materials[matId] || 0) + qty;
      }

      if (isFarmRun) {
        console.log(`🌾 [FARM CLEAR] Gold: +${runGoldEarned} G, XP: +${runXpEarned}, Materials: ${JSON.stringify(runMaterialsEarned)}`);
      } else {
        console.log(`✅ Floor ${floorNum} Cleared! Gold Earned: ${runGoldEarned + completionGold} G. XP Earned: ${runXpEarned + completionXp}.`);
      }

      // Handle level-ups
      const levelRes = checkLevelUp(hero);
      if (levelRes.levelsGained > 0) {
        hero.level = levelRes.newLevel;
        hero.statPoints = levelRes.newStatPoints;
        console.log(`🎉 Level Up! reached level ${hero.level}!`);
      }

      return { success: true };
    }
  }

  // --- Run through Floor 1 to 10 ---
  let successfullyClearedDungeon = true;

  for (let floorNum = 1; floorNum <= 10; floorNum++) {
    const getStars = (sId) => (hero.unlockedSkills[sId] ? hero.unlockedSkills[sId].stars : 0);

    const isLowOnResources = () => {
      const potions = hero.inventory.healthPotions || 0;
      const gold = hero.gold || 0;
      const maxCapacity = floorNum >= 6 ? 7 : 5;
      const costPerPotion = hero.level >= 10 ? 100 : 50;
      const maxPotionsAffordable = Math.floor(gold / costPerPotion);
      const totalAvailablePotions = potions + maxPotionsAffordable;
      return totalAvailablePotions < maxCapacity;
    };

    let floorCleared = false;
    let attempts = 0;

    while (!floorCleared) {
      // Farm lower floors if approaching Floor 5+ and skills aren't fully upgraded, OR if resources are depleted
      const farmFloor = floorNum >= 8 ? 6 : (floorNum >= 6 ? 4 : (floorNum >= 4 ? 2 : 1));
      const t1Skills = ELEMENT_SKILLS[hero.element].t1;
      const getT1StarsText = () => t1Skills.map(sId => `${SKILLS[sId].name}: ★${getStars(sId)}`).join(', ');
      const needsFarmForSkills = () => floorNum >= 5 && t1Skills.some(sId => getStars(sId) < 5);

      while (
        needsFarmForSkills() ||
        (floorNum >= 2 && isLowOnResources())
      ) {
        if (needsFarmForSkills()) {
          console.log(`\n🌾 Skills not maxed (${getT1StarsText()}). Farming Floor 3...`);
        } else {
          console.log(`\n🌾 Low on resources (Gold: ${hero.gold} G, Potions: ${hero.inventory.healthPotions}). Farming Floor ${farmFloor} to recover...`);
        }
        await executeFloorRun(farmFloor, true);
      }

      attempts++;
      console.log(`\n========================================================================`);
      console.log(`🏰 ENTERING FLOOR ${floorNum} (Attempt #${attempts}) 🏰`);
      console.log(`========================================================================`);

      const res = await executeFloorRun(floorNum, false, attempts > 1);

      if (!res.success) {
        console.log(`💀 Mochi died on Floor ${floorNum}. Retrying Floor ${floorNum}...`);
        stats.totalDeaths += 1;
        if (attempts >= 20) {
          console.log(`❌ Failed to clear Floor ${floorNum} after 20 attempts. Ending simulation.`);
          successfullyClearedDungeon = false;
          break;
        }
      } else {
        floorCleared = true;
        // Print player state summary at end of floor clear
        console.log(`🎒 Mochi's Wallet: ${hero.gold} G.`);
        console.log(`📦 Crystal Stash: Shards: ${hero.inventory.materials.black_shard}, Small: ${hero.inventory.materials.black_crystal_small}, Big: ${hero.inventory.materials.black_crystal_big}, Cores: ${hero.inventory.materials.black_crystal_core}`);
      }
    }
    if (!successfullyClearedDungeon) {
      break;
    }
  }

  // --- Final Simulation Report ---
  console.log('\n────────────────────────────────────────────────────────────────────────');
  console.log('📊 FINAL BALANCE SIMULATION REPORT 📊');
  console.log('────────────────────────────────────────────────────────────────────────');
  console.log(`Outcome: ${successfullyClearedDungeon ? '🏆 SUCCESSFUL CLEAR!' : '💀 MOCHI DIED IN DUNGEON'}`);
  console.log(`Final Character Level: ${hero.level}`);
  console.log(`Final Gold Balance: ${hero.gold} G`);
  console.log(`Total Battles Fought: ${stats.totalCombats}`);
  console.log(`Total Deaths: ${stats.totalDeaths}`);
  if (hero.element === 'earth') {
    console.log(`Total Landslide Casts: ${stats.totalLandslideCasts}`);
    console.log(`Total Boulder Slash Casts: ${stats.totalBoulderSlashCasts}`);
    console.log(`Total Recoil Damage Taken (Landslide Backfire): ${stats.totalRecoilDamageTaken}`);
  } else if (hero.element === 'water') {
    console.log(`Total Tidal Strike Casts: ${stats.totalTidalStrikeCasts}`);
    console.log(`Total Healing Current Casts: ${stats.totalHealingCurrentCasts}`);
  } else if (hero.element === 'fire') {
    console.log(`Total Fire Slash Casts: ${stats.totalFireSlashCasts}`);
    console.log(`Total Fire Burst Casts: ${stats.totalFireBurstCasts}`);
    console.log(`Total Flame Guard Casts: ${stats.totalFlameGuardCasts}`);
  }
  console.log(`Total Basic Attacks Swung: ${stats.totalBasicAttacks}`);
  console.log(`Total Damage Dealt: ${stats.totalDamageDealt}`);
  console.log(`Total Health Potions Consumed: ${stats.totalPotionsUsed}`);
  console.log(`Skills Status:`);
  for (const [skillId, info] of Object.entries(hero.unlockedSkills)) {
    console.log(`  - ${SKILLS[skillId].name}: ★${info.stars}`);
  }
  console.log('────────────────────────────────────────────────────────────────────────\n');
}

runSimulation();
