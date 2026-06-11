/**
 * =============================================================================
 * gameState.js — Global Game State (React Context + useReducer + AsyncStorage)
 * =============================================================================
 *
 * This is the SINGLE SOURCE OF TRUTH for ALL game data.  Every screen in the
 * app reads from here, and every action (attack, craft, buy, level up) is
 * dispatched through the reducer defined below.
 *
 * HOW IT WORKS:
 *
 *   1. We create a React Context called `GameContext`.
 *   2. The `GameProvider` component wraps the entire app.  Inside it:
 *      - `useReducer` manages state transitions via a big switch/case.
 *      - On mount, we load any previously-saved state from AsyncStorage.
 *      - Every time state changes, we save it back to AsyncStorage.
 *   3. Any component can call `useGame()` to get `{ state, dispatch }`.
 *      - `state` is the current game data (hero, progress, currentRun).
 *      - `dispatch({ type: 'ACTION_NAME', payload: {...} })` triggers updates.
 *
 * WHY useReducer INSTEAD OF useState?
 *   When you have many interdependent state fields (HP, gold, inventory…),
 *   a reducer keeps all mutation logic in ONE place.  It's also easy to
 *   debug — you can log every action and see exactly what changed.
 *
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateDungeonGrid } from '../logic/dungeonGenerator';
import { ZONES, getGridSizeForFloor } from '../data/zones';
import { calculateEffectiveStats, applyHealingEfficiency } from '../logic/progressionEngine';
import { GEAR, CONSUMABLES } from '../data/gear';
import { SKILLS, getSkillUpgradeCost } from '../data/skills';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The key used to store / retrieve the save file in AsyncStorage. */
const STORAGE_KEY = '@meow_depths_save';

// ---------------------------------------------------------------------------
// Initial state — a brand-new game starts here
// ---------------------------------------------------------------------------
/**
 * This object represents a fresh save file.
 * It's used when:
 *   1. The player launches the app for the first time.
 *   2. The player resets their game.
 */
const initialState = {
  // -- Hero -----------------------------------------------------------------
  hero: {
    name: 'Mochi',            // our brave feline protagonist 🐱
    level: 1,
    xp: 0,
    hp: 50,                   // current HP (can decrease in combat)
    maxHp: 50,                // maximum HP (increases on level up)
    attack: 10,               // base attack power
    defence: 0,               // base damage reduction (only comes from gear/skills now)
    critChance: 0.05,         // 5 % base crit chance
    dodge: 0.05,              // 5 % base dodge chance
    gold: 0,                  // hero starts with no gold; first daily reward grants some
    statPoints: 0,            // 3 stat points per level-up, allocated manually
    strength: 10,             // core attribute
    agility: 10,              // core attribute
    vitality: 10,             // core attribute
    element: null,            // 'fire' | 'water' | 'earth' | 'wind' | null (set on first launch)
    unlockedSkills: {},       // { skillId: { stars: number } }
    equippedSkills: [null, null], // two active skill slots for combat

    // -- Equipment & Inventory -----------------------------------------------
    gear: {
      weapon:   'wooden_branch',     // equipped weapon gear ID (or null)
      head:     null,                // equipped head gear ID
      chest:    null,                // equipped chest gear ID
      legs:     null,                // equipped legs gear ID
      gloves:   null,                // equipped gloves gear ID
      boots:    null,                // equipped boots gear ID
      trinket:  null,                // equipped trinket gear ID
      storage:  'leather_bag',       // equipped storage gear ID
    },
    inventory: {
      materials: {},          // { itemId: quantity } — crafting components
      consumables: [],        // array of { id, quantity } — starts empty, first daily reward grants potions
      craftedGear: ['wooden_branch', 'leather_bag'],        // array of gear IDs the hero has crafted
    },
  },

  // -- Progress (persistent across runs) ------------------------------------
  progress: {
    zone1Cleared: false,
    zone2Cleared: false,
    zone3Cleared: false,
    lastDailyClaim: null,     // timestamp of last daily reward claim
    currentZone: null,        // which zone the player was last exploring
    currentFloor: 0,
    floorsCleared: {          // highest floor cleared in each zone
      zone1: 0,
      zone2: 0,
      zone3: 0,
    },
    runsCompleted: {          // count of successful runs completed per zone
      zone1: 0,
      zone2: 0,
      zone3: 0,
    },
  },

  // -- Current Run (temporary, reset after each dungeon run) ----------------
  currentRun: {
    active: false,            // true while a dungeon run is in progress
    zoneId: null,             // e.g. 'zone1'
    floorNumber: 1,           // which floor of the zone (1–10)
    gridWidth: 3,
    gridHeight: 3,
    tiles: [],                // flat array, access by index = y * gridWidth + x
    playerPos: { x: 0, y: 2 },
    roomsCleared: 0,
    totalRooms: 9,
    consumables: [],          // consumables brought into this run (array of item ID strings)
    lootCollected: { materials: {}, gold: 0, xp: 0, consumables: {} }, // loot accumulated during the run
    heroBackup: null,         // backup of hero stats before the run starts
    runBuffs: {               // run-only buffs from rest rooms
      attackBonus: 0,
      critBonus: 0,
      dodgeBonus: 0,
      defenceBonus: 0,
      maxHpBonus: 0
    }
  },
};

// ============================================================================
// REDUCER — handles every possible action / mutation
// ============================================================================
/**
 * The game reducer.  Given the current state and an action, it returns the
 * next state.  React guarantees that state updates go through this function,
 * so there are NO surprise mutations elsewhere.
 *
 * ACTION CATALOG (alphabetical):
 *   ADD_GOLD         – give the hero gold
 *   ADD_MATERIALS    – add crafting materials to inventory
 *   ADD_XP           – add experience points (may trigger level-up elsewhere)
 *   ADVANCE_FLOOR    – move to the next dungeon floor
 *   BUY_CONSUMABLE   – spend gold on a consumable item
 *   CLEAR_ZONE       – mark a zone as completed
 *   CRAFT_GEAR       – spend materials + gold to create gear
 *   END_RUN          – finish the current dungeon run
 *   EQUIP_GEAR       – put gear in a slot (weapon/head/chest/legs/gloves/boots/trinket/storage)
 *   EQUIP_SKILL      – assign a skill to one of the two active slots
 *   HEAL             – restore HP
 *   LEVEL_UP         – apply level-up stat bonuses
 *   RESET_GAME       – wipe the save and start fresh
 *   SET_STATE        – wholesale state replacement (used when loading)
 *   START_RUN        – begin a new dungeon run
 *   TAKE_DAMAGE      – reduce HP
 *   UNLOCK_SKILL     – learn a new skill, spending crystals
 *   UPDATE_HERO      – generic partial update to hero fields
 *   USE_CONSUMABLE   – use a consumable from inventory
 */
function gameReducer(state, action) {
  switch (action.type) {

    // -----------------------------------------------------------------------
    // SET_STATE — replace the entire state (used when loading a save)
    // -----------------------------------------------------------------------
    case 'SET_STATE':
      return { ...action.payload };

    // -----------------------------------------------------------------------
    // UPDATE_HERO — merge partial hero updates
    // e.g. dispatch({ type: 'UPDATE_HERO', payload: { hp: 42 } })
    // -----------------------------------------------------------------------
    case 'UPDATE_HERO':
      return {
        ...state,
        hero: { ...state.hero, ...action.payload },
      };

    // -----------------------------------------------------------------------
    // ADD_XP — add XP to the hero
    // Payload: { amount: number }
    // -----------------------------------------------------------------------
    case 'ADD_XP':
      return {
        ...state,
        hero: {
          ...state.hero,
          xp: state.hero.xp + (action.payload.amount || 0),
        },
      };

    // -----------------------------------------------------------------------
    // ADD_GOLD — add gold to the hero
    // Payload: { amount: number }
    // -----------------------------------------------------------------------
    case 'ADD_GOLD':
      return {
        ...state,
        hero: {
          ...state.hero,
          gold: state.hero.gold + (action.payload.amount || 0),
        },
      };

    // -----------------------------------------------------------------------
    // ADD_MATERIALS — merge materials into inventory
    // Payload: { materials: { itemId: quantity } }
    // -----------------------------------------------------------------------
    case 'ADD_MATERIALS': {
      const newMaterials = { ...state.hero.inventory.materials };

      // For each material in the payload, add to existing quantity
      for (const [itemId, qty] of Object.entries(action.payload.materials || {})) {
        newMaterials[itemId] = (newMaterials[itemId] || 0) + qty;
      }

      return {
        ...state,
        hero: {
          ...state.hero,
          inventory: {
            ...state.hero.inventory,
            materials: newMaterials,
          },
        },
      };
    }

    // -----------------------------------------------------------------------
    // EQUIP_GEAR — put a gear piece in its slot
    // Payload: { slot: 'weapon'|'head'|'chest'|'legs'|'gloves'|'boots'|'trinket'|'storage', gearId: string }
    // -----------------------------------------------------------------------
    case 'EQUIP_GEAR': {
      const { slot, gearId } = action.payload;
      const oldGearId = state.hero.gear[slot];
      const oldMaxHpBonus = (oldGearId && GEAR[oldGearId]?.stats?.maxHp) || 0;
      const newMaxHpBonus = (gearId && GEAR[gearId]?.stats?.maxHp) || 0;
      const maxHpDelta = newMaxHpBonus - oldMaxHpBonus;
      const updatedHero = {
        ...state.hero,
        gear: { ...state.hero.gear, [slot]: gearId },
      };
      const newEffectiveMaxHp = calculateEffectiveStats(updatedHero).maxHp;
      const newHp = state.currentRun.active ? Math.min(newEffectiveMaxHp, state.hero.hp + maxHpDelta) : newEffectiveMaxHp;
      return {
        ...state,
        hero: { ...updatedHero, hp: newHp },
      };
    }

    // -----------------------------------------------------------------------
    // BUY_GEAR — spend gold, add gear to inventory
    // Payload: { gearId: string, price: number }
    // -----------------------------------------------------------------------
    case 'BUY_GEAR': {
      const { gearId, price } = action.payload;
      return {
        ...state,
        hero: {
          ...state.hero,
          gold: state.hero.gold - price,
          inventory: {
            ...state.hero.inventory,
            craftedGear: [...state.hero.inventory.craftedGear, gearId],
          },
        },
      };
    }

    // -----------------------------------------------------------------------
    // SELECT_ELEMENT — set the hero's element and name on first launch
    // Payload: { element: string, name: string }
    // -----------------------------------------------------------------------
    case 'SELECT_ELEMENT':
      return {
        ...state,
        hero: {
          ...state.hero,
          name: action.payload.name || state.hero.name,
          element: action.payload.element,
        },
      };

    // -----------------------------------------------------------------------
    // UNLOCK_SKILL — learn a new element skill at ★1, spending crystals
    // Payload: { skillId: string }
    // -----------------------------------------------------------------------
    case 'UNLOCK_SKILL': {
      const skill = SKILLS[action.payload.skillId];
      const cost = skill && getSkillUpgradeCost(skill, 1);
      if (!cost) return state;

      const unlocked = typeof state.hero.unlockedSkills === 'object' && !Array.isArray(state.hero.unlockedSkills)
        ? state.hero.unlockedSkills
        : {};

      const newMaterials = { ...state.hero.inventory.materials };
      for (const [itemId, qty] of Object.entries(cost.materials)) {
        newMaterials[itemId] = (newMaterials[itemId] || 0) - qty;
        if (newMaterials[itemId] <= 0) delete newMaterials[itemId];
      }

      return {
        ...state,
        hero: {
          ...state.hero,
          unlockedSkills: {
            ...unlocked,
            [action.payload.skillId]: { stars: 1 },
          },
          inventory: {
            ...state.hero.inventory,
            materials: newMaterials,
          },
        },
      };
    }

    // -----------------------------------------------------------------------
    // STAR_UP_SKILL — increase a skill's star level, spending crystals
    // Payload: { skillId: string }
    // -----------------------------------------------------------------------
    case 'STAR_UP_SKILL': {
      const existing = (state.hero.unlockedSkills || {})[action.payload.skillId];
      if (!existing) return state;

      const skill = SKILLS[action.payload.skillId];
      const targetStar = (existing.stars || 1) + 1;
      const cost = skill && getSkillUpgradeCost(skill, targetStar);
      if (!cost) return state;

      const newMaterials = { ...state.hero.inventory.materials };
      for (const [itemId, qty] of Object.entries(cost.materials)) {
        newMaterials[itemId] = (newMaterials[itemId] || 0) - qty;
        if (newMaterials[itemId] <= 0) delete newMaterials[itemId];
      }

      return {
        ...state,
        hero: {
          ...state.hero,
          unlockedSkills: {
            ...state.hero.unlockedSkills,
            [action.payload.skillId]: { ...existing, stars: targetStar },
          },
          inventory: {
            ...state.hero.inventory,
            materials: newMaterials,
          },
        },
      };
    }

    // -----------------------------------------------------------------------
    // EQUIP_SKILL — assign a skill to a combat slot
    // Payload: { slotIndex: 0|1, skillId: string|null }
    // -----------------------------------------------------------------------
    case 'EQUIP_SKILL': {
      const newSlots = [...state.hero.equippedSkills];
      newSlots[action.payload.slotIndex] = action.payload.skillId;
      return {
        ...state,
        hero: {
          ...state.hero,
          equippedSkills: newSlots,
        },
      };
    }

    // -----------------------------------------------------------------------
    // START_RUN — begin a new dungeon run (grid-based map)
    // Payload: { zoneId: string, floorNumber: number, consumables: [] }
    // -----------------------------------------------------------------------
    case 'START_RUN': {
      const { zoneId, floorNumber = 1, consumables } = action.payload;
      const zone = ZONES[zoneId];
      if (!zone) return state;

      const { gridWidth, gridHeight } = getGridSizeForFloor(floorNumber);
      const grid = generateDungeonGrid(gridWidth, gridHeight, zoneId, floorNumber);

      // Flatten grid tiles
      const flatTiles = [];
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          flatTiles.push(grid[y][x]);
        }
      }

      // Start position is always bottom-left: (0, gridHeight - 1)
      const startX = 0;
      const startY = gridHeight - 1;

      // Reveal adjacent tiles to start
      const adjacentDirs = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
      ];
      for (const d of adjacentDirs) {
        const nx = startX + d.x;
        const ny = startY + d.y;
        if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
          const adjIdx = ny * gridWidth + nx;
          flatTiles[adjIdx].revealed = true;
        }
      }

      // Deduct packed consumables from hero permanent inventory
      const updatedPermanentConsumables = state.hero.inventory.consumables.map(c => {
        const packedCount = (consumables || []).filter(id => id === c.id).length;
        return {
          ...c,
          quantity: Math.max(0, c.quantity - packedCount)
        };
      }).filter(c => c.quantity > 0);

      // Ensure HP is restored to full upon entering the run
      const fullHp = calculateEffectiveStats(state.hero).maxHp;

      return {
        ...state,
        hero: {
          ...state.hero,
          hp: fullHp,
          inventory: {
            ...state.hero.inventory,
            consumables: updatedPermanentConsumables
          }
        },
        currentRun: {
          active: true,
          zoneId,
          floorNumber,
          gridWidth,
          gridHeight,
          tiles: flatTiles,
          playerPos: { x: startX, y: startY },
          roomsCleared: 1, // Start room is cleared
          totalRooms: gridWidth * gridHeight,
          consumables: consumables || [],
          lootCollected: { materials: {}, gold: 0, xp: 0, consumables: {} },
          heroBackup: {
            level: state.hero.level,
            xp: state.hero.xp,
            maxHp: state.hero.maxHp,
            attack: state.hero.attack,
            defence: state.hero.defence,
            statPoints: state.hero.statPoints || 0,
            strength: state.hero.strength || 10,
            agility: state.hero.agility || 10,
            vitality: state.hero.vitality || 10,
          },
          runBuffs: {
            attackBonus: 0,
            critBonus: 0,
            dodgeBonus: 0,
            defenceBonus: 0,
            maxHpBonus: 0
          }
        },
        progress: {
          ...state.progress,
          currentZone: zoneId,
        }
      };
    }

    // -----------------------------------------------------------------------
    // MOVE_PLAYER — move orthogonally on the grid
    // Payload: { x: number, y: number }
    // -----------------------------------------------------------------------
    case 'MOVE_PLAYER': {
      const { x, y } = action.payload;
      const { gridWidth, gridHeight, tiles } = state.currentRun;
      
      const newTiles = tiles.map(t => ({ ...t }));
      
      const targetIndex = y * gridWidth + x;
      newTiles[targetIndex].revealed = true;

      // Reveal adjacent tiles
      const adjacentDirs = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
      ];
      for (const d of adjacentDirs) {
        const nx = x + d.x;
        const ny = y + d.y;
        if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
          const adjIdx = ny * gridWidth + nx;
          newTiles[adjIdx].revealed = true;
        }
      }

      return {
        ...state,
        currentRun: {
          ...state.currentRun,
          tiles: newTiles,
          playerPos: { x, y }
        }
      };
    }

    // -----------------------------------------------------------------------
    // CLEAR_CURRENT_TILE — mark the current tile as cleared/visited
    // -----------------------------------------------------------------------
    case 'CLEAR_CURRENT_TILE': {
      const { gridWidth, playerPos, tiles } = state.currentRun;
      const index = playerPos.y * gridWidth + playerPos.x;
      const newTiles = tiles.map((t, idx) => idx === index ? { ...t, cleared: true } : t);
      
      return {
        ...state,
        currentRun: {
          ...state.currentRun,
          tiles: newTiles,
          roomsCleared: state.currentRun.roomsCleared + 1
        }
      };
    }

    // -----------------------------------------------------------------------
    // ADD_RUN_LOOT — add gold, materials, and consumables collected in this run
    // Payload: { gold: number, materials: { itemId: qty }, consumables: { itemId: qty } }
    // -----------------------------------------------------------------------
    case 'ADD_RUN_LOOT': {
      const { gold, materials, xp, consumables } = action.payload;
      const newLootGold = state.currentRun.lootCollected.gold + (gold || 0);
      const newLootXp = (state.currentRun.lootCollected.xp || 0) + (xp || 0);
      
      const newLootMaterials = { ...state.currentRun.lootCollected.materials };
      for (const [id, qty] of Object.entries(materials || {})) {
        newLootMaterials[id] = (newLootMaterials[id] || 0) + qty;
      }

      const newLootConsumables = { ...(state.currentRun.lootCollected.consumables || {}) };
      for (const [id, qty] of Object.entries(consumables || {})) {
        newLootConsumables[id] = (newLootConsumables[id] || 0) + qty;
      }

      return {
        ...state,
        currentRun: {
          ...state.currentRun,
          lootCollected: {
            materials: newLootMaterials,
            gold: newLootGold,
            xp: newLootXp,
            consumables: newLootConsumables
          }
        }
      };
    }

    // -----------------------------------------------------------------------
    // APPLY_RUN_BUFF — apply buff from Rest room
    // Payload: { type: string, value: number }
    // -----------------------------------------------------------------------
    case 'APPLY_RUN_BUFF': {
      const { type, value } = action.payload;
      const currentRunBuffs = { ...state.currentRun.runBuffs };
      currentRunBuffs[type] = (currentRunBuffs[type] || 0) + value;

      let updatedHp = state.hero.hp;
      if (type === 'maxHpBonus') {
        const effectiveMaxHp = calculateEffectiveStats(state.hero, undefined, currentRunBuffs).maxHp;
        const finalHeal = applyHealingEfficiency(value, state.hero);
        updatedHp = Math.min(effectiveMaxHp, state.hero.hp + finalHeal);
      }

      return {
        ...state,
        hero: {
          ...state.hero,
          hp: updatedHp
        },
        currentRun: {
          ...state.currentRun,
          runBuffs: currentRunBuffs
        }
      };
    }

    // -----------------------------------------------------------------------
    // UPDATE_RUN_AFTER_COMBAT — save player HP and consumables in run
    // Payload: { hp: number, consumables: [] }
    // -----------------------------------------------------------------------
    case 'UPDATE_RUN_AFTER_COMBAT': {
      const { hp, consumables } = action.payload;
      const effectiveMaxHp = calculateEffectiveStats(state.hero, undefined, state.currentRun.runBuffs).maxHp;
      return {
        ...state,
        hero: {
          ...state.hero,
          hp: Math.min(effectiveMaxHp, hp)
        },
        currentRun: {
          ...state.currentRun,
          consumables: consumables || state.currentRun.consumables
        }
      };
    }

    // -----------------------------------------------------------------------
    // END_RUN — finish the dungeon run (win or loss/death)
    // Payload: { outcome: 'win' | 'lose' }
    // -----------------------------------------------------------------------
    case 'END_RUN': {
      const { outcome } = action.payload;

      let updatedGold = state.hero.gold;
      const updatedMaterials = { ...state.hero.inventory.materials };
      let updatedInventoryConsumables = [...state.hero.inventory.consumables];
      let heroStats = { ...state.hero };

      if (outcome === 'win') {
        updatedGold += state.currentRun.lootCollected.gold;
        for (const [id, qty] of Object.entries(state.currentRun.lootCollected.materials)) {
          updatedMaterials[id] = (updatedMaterials[id] || 0) + qty;
        }

        // Add 100% of newly collected consumables
        const lootConsumables = state.currentRun.lootCollected.consumables || {};
        for (const [id, qty] of Object.entries(lootConsumables)) {
          const existingIdx = updatedInventoryConsumables.findIndex(c => c.id === id);
          if (existingIdx >= 0) {
            updatedInventoryConsumables[existingIdx] = {
              ...updatedInventoryConsumables[existingIdx],
              quantity: updatedInventoryConsumables[existingIdx].quantity + qty,
            };
          } else {
            updatedInventoryConsumables.push({ id, quantity: qty });
          }
        }
      } else if (outcome === 'flee') {
        updatedGold += Math.floor(state.currentRun.lootCollected.gold / 2);
        for (const [id, qty] of Object.entries(state.currentRun.lootCollected.materials)) {
          const keptQty = Math.floor(qty / 2);
          if (keptQty > 0) {
            updatedMaterials[id] = (updatedMaterials[id] || 0) + keptQty;
          }
        }

        // Add 50% of newly collected consumables (rounded down)
        const lootConsumables = state.currentRun.lootCollected.consumables || {};
        for (const [id, qty] of Object.entries(lootConsumables)) {
          const keptQty = Math.floor(qty / 2);
          if (keptQty > 0) {
            const existingIdx = updatedInventoryConsumables.findIndex(c => c.id === id);
            if (existingIdx >= 0) {
              updatedInventoryConsumables[existingIdx] = {
                ...updatedInventoryConsumables[existingIdx],
                quantity: updatedInventoryConsumables[existingIdx].quantity + keptQty,
              };
            } else {
              updatedInventoryConsumables.push({ id, quantity: keptQty });
            }
          }
        }
      } else if (outcome === 'lose') {
        // Defeat: revert levels, XP, and base stats gained during this run
        if (state.currentRun.heroBackup) {
          heroStats = {
            ...heroStats,
            level: state.currentRun.heroBackup.level,
            xp: state.currentRun.heroBackup.xp,
            maxHp: state.currentRun.heroBackup.maxHp,
            attack: state.currentRun.heroBackup.attack,
            defence: state.currentRun.heroBackup.defence,
            statPoints: state.currentRun.heroBackup.statPoints || 0,
            strength: state.currentRun.heroBackup.strength || 10,
            agility: state.currentRun.heroBackup.agility || 10,
            vitality: state.currentRun.heroBackup.vitality || 10,
          };
        }
      }

      // Return any unused consumables from the run bag back to permanent inventory
      for (const id of (state.currentRun.consumables || [])) {
        const existingIdx = updatedInventoryConsumables.findIndex(c => c.id === id);
        if (existingIdx >= 0) {
          updatedInventoryConsumables[existingIdx] = {
            ...updatedInventoryConsumables[existingIdx],
            quantity: updatedInventoryConsumables[existingIdx].quantity + 1,
          };
        } else {
          updatedInventoryConsumables.push({ id, quantity: 1 });
        }
      }

      // Restores Mochi's HP to full when outside of the Dungeon (using updated maxHp if reverted)
      const finalHp = calculateEffectiveStats(heroStats).maxHp;

      // Track completed runs and advance floorsCleared on win
      const zoneId = state.currentRun.zoneId;
      const completedFloor = state.currentRun.floorNumber || 1;
      const currentProgress = state.progress || {};
      const currentRunsCompleted = currentProgress.runsCompleted || { zone1: 0, zone2: 0, zone3: 0 };
      const newRunsCompleted = { ...currentRunsCompleted };
      const currentFloorsCleared = currentProgress.floorsCleared || { zone1: 0, zone2: 0, zone3: 0 };
      const newFloorsCleared = { ...currentFloorsCleared };
      if (outcome === 'win' && zoneId) {
        newRunsCompleted[zoneId] = (newRunsCompleted[zoneId] || 0) + 1;
        // Only advance if this floor hasn't been cleared before (prevent re-farming advancement)
        if (completedFloor > (newFloorsCleared[zoneId] || 0)) {
          newFloorsCleared[zoneId] = completedFloor;
        }
      }

      return {
        ...state,
        hero: {
          ...heroStats,
          gold: updatedGold,
          hp: finalHp,
          inventory: {
            ...heroStats.inventory,
            materials: updatedMaterials,
            consumables: updatedInventoryConsumables,
          }
        },
        progress: {
          ...state.progress,
          runsCompleted: newRunsCompleted,
          floorsCleared: newFloorsCleared,
        },
        currentRun: {
          active: false,
          zoneId: null,
          floorNumber: 1,
          gridWidth: 3,
          gridHeight: 3,
          tiles: [],
          playerPos: { x: 0, y: 2 },
          roomsCleared: 0,
          totalRooms: 9,
          consumables: [],
          lootCollected: { materials: {}, gold: 0, xp: 0, consumables: {} },
          heroBackup: null,
          runBuffs: {
            attackBonus: 0,
            critBonus: 0,
            dodgeBonus: 0,
            defenceBonus: 0,
            maxHpBonus: 0
          }
        }
      };
    }

    // -----------------------------------------------------------------------
    // USE_RUN_CONSUMABLE — use a consumable brought into the run while on the map
    // Payload: { consumableId: string }
    // -----------------------------------------------------------------------
    case 'USE_RUN_CONSUMABLE': {
      const { consumableId } = action.payload;
      const index = state.currentRun.consumables.indexOf(consumableId);
      if (index === -1) return state;

      const newRunConsumables = [...state.currentRun.consumables];
      newRunConsumables.splice(index, 1);

      const effectiveMaxHp = calculateEffectiveStats(state.hero, undefined, state.currentRun.runBuffs).maxHp;
      let updatedHp = state.hero.hp;

      const consumableDef = CONSUMABLES.find(c => c.id === consumableId);
      if (consumableDef?.effect?.type === 'heal') {
        const baseHeal = consumableDef.effect.amount || 0;
        const finalHeal = applyHealingEfficiency(baseHeal, state.hero);
        updatedHp = Math.min(effectiveMaxHp, updatedHp + finalHeal);
      }

      return {
        ...state,
        hero: {
          ...state.hero,
          hp: updatedHp,
        },
        currentRun: {
          ...state.currentRun,
          consumables: newRunConsumables,
        }
      };
    }

    // -----------------------------------------------------------------------
    // USE_CONSUMABLE — remove one consumable from inventory
    // Payload: { consumableId: string }
    // -----------------------------------------------------------------------
    case 'USE_CONSUMABLE': {
      const updatedConsumables = state.hero.inventory.consumables
        .map(c => {
          if (c.id === action.payload.consumableId) {
            return { ...c, quantity: c.quantity - 1 };
          }
          return c;
        })
        .filter(c => c.quantity > 0); // remove if quantity hits 0

      return {
        ...state,
        hero: {
          ...state.hero,
          inventory: {
            ...state.hero.inventory,
            consumables: updatedConsumables,
          },
        },
      };
    }

    // -----------------------------------------------------------------------
    // BUY_CONSUMABLE — spend gold to add a consumable to inventory
    // Payload: { consumableId: string, price: number }
    // -----------------------------------------------------------------------
    case 'BUY_CONSUMABLE': {
      const { consumableId, price } = action.payload;

      const existing = state.hero.inventory.consumables.find(c => c.id === consumableId);
      let newConsumables;
      if (existing) {
        newConsumables = state.hero.inventory.consumables.map(c =>
          c.id === consumableId ? { ...c, quantity: c.quantity + 1 } : c
        );
      } else {
        newConsumables = [
          ...state.hero.inventory.consumables,
          { id: consumableId, quantity: 1 },
        ];
      }

      return {
        ...state,
        hero: {
          ...state.hero,
          gold: state.hero.gold - price,
          inventory: {
            ...state.hero.inventory,
            consumables: newConsumables,
          },
        },
      };
    }

    // -----------------------------------------------------------------------
    // BUY_CONSUMABLE_BULK — buy multiple units of a consumable at once
    // Payload: { consumableId: string, price: number, quantity: number }
    // -----------------------------------------------------------------------
    case 'BUY_CONSUMABLE_BULK': {
      const { consumableId, price, quantity } = action.payload;
      const totalCost = price * quantity;

      const existing = state.hero.inventory.consumables.find(c => c.id === consumableId);
      let newConsumables;
      if (existing) {
        newConsumables = state.hero.inventory.consumables.map(c =>
          c.id === consumableId ? { ...c, quantity: c.quantity + quantity } : c
        );
      } else {
        newConsumables = [
          ...state.hero.inventory.consumables,
          { id: consumableId, quantity },
        ];
      }

      return {
        ...state,
        hero: {
          ...state.hero,
          gold: state.hero.gold - totalCost,
          inventory: {
            ...state.hero.inventory,
            consumables: newConsumables,
          },
        },
      };
    }

    // -----------------------------------------------------------------------
    // CLAIM_DAILY_REWARD — rewards gold, potions based on level
    // Payload: { gold: number, consumables: { [id: string]: number } }
    // -----------------------------------------------------------------------
    case 'CLAIM_DAILY_REWARD': {
      const { gold, consumables } = action.payload;

      // Update consumables array
      let updatedConsumables = [...state.hero.inventory.consumables];
      for (const [id, qty] of Object.entries(consumables || {})) {
        const existingIndex = updatedConsumables.findIndex(c => c.id === id);
        if (existingIndex > -1) {
          updatedConsumables[existingIndex] = {
            ...updatedConsumables[existingIndex],
            quantity: updatedConsumables[existingIndex].quantity + qty,
          };
        } else {
          updatedConsumables.push({ id, quantity: qty });
        }
      }

      return {
        ...state,
        hero: {
          ...state.hero,
          gold: state.hero.gold + (gold || 0),
          inventory: {
            ...state.hero.inventory,
            consumables: updatedConsumables,
          },
        },
        progress: {
          ...state.progress,
          lastDailyClaim: Date.now(),
        },
      };
    }

    // -----------------------------------------------------------------------
    // OPEN_LOOTBOX — consume a mystery chest and add gold/crystals
    // Payload: { gold: number, materials: { [itemId: string]: number } }
    // -----------------------------------------------------------------------
    case 'OPEN_LOOTBOX': {
      const { gold, materials } = action.payload;

      // Decrement Mystery Chest count
      const newConsumables = state.hero.inventory.consumables.map(c => {
        if (c.id === 'mystery_chest') {
          return { ...c, quantity: Math.max(0, c.quantity - 1) };
        }
        return c;
      }).filter(c => c.quantity > 0);

      // Merge rolled materials
      const newMaterials = { ...state.hero.inventory.materials };
      Object.entries(materials || {}).forEach(([id, qty]) => {
        if (qty > 0) {
          newMaterials[id] = (newMaterials[id] || 0) + qty;
        }
      });

      return {
        ...state,
        hero: {
          ...state.hero,
          gold: state.hero.gold + (gold || 0),
          inventory: {
            ...state.hero.inventory,
            consumables: newConsumables,
            materials: newMaterials,
          },
        },
      };
    }

    // -----------------------------------------------------------------------
    // TAKE_DAMAGE — reduce hero's HP (combat)
    // Payload: { amount: number }
    // -----------------------------------------------------------------------
    case 'TAKE_DAMAGE':
      return {
        ...state,
        hero: {
          ...state.hero,
          hp: Math.max(0, state.hero.hp - (action.payload.amount || 0)),
        },
      };

    // -----------------------------------------------------------------------
    // HEAL — restore hero's HP (capped at maxHp)
    // Payload: { amount: number }
    // -----------------------------------------------------------------------
    case 'HEAL': {
      const effectiveMaxHp = calculateEffectiveStats(
        state.hero,
        undefined,
        state.currentRun.active ? state.currentRun.runBuffs : null
      ).maxHp;
      const baseHeal = action.payload.amount || 0;
      const finalHeal = applyHealingEfficiency(baseHeal, state.hero);
      return {
        ...state,
        hero: {
          ...state.hero,
          hp: Math.min(effectiveMaxHp, state.hero.hp + finalHeal),
        },
      };
    }

    // -----------------------------------------------------------------------
    // CLEAR_ZONE — mark a zone as cleared (boss defeated)
    // Payload: { zoneId: string }
    // -----------------------------------------------------------------------
    case 'CLEAR_ZONE': {
      const zoneKey = `${action.payload.zoneId}Cleared`; // e.g. "zone1Cleared"
      return {
        ...state,
        progress: {
          ...state.progress,
          [zoneKey]: true,
        },
      };
    }

    // -----------------------------------------------------------------------
    // LEVEL_UP — apply level-up stat changes
    // Payload: { newLevel, newMaxHp, newAttack, newDefence, newStatPoints }
    // -----------------------------------------------------------------------
    case 'LEVEL_UP': {
      const tempHero = { 
        ...state.hero, 
        maxHp: action.payload.newMaxHp,
        attack: action.payload.newAttack,
        defence: action.payload.newDefence,
        critChance: action.payload.newCritChance !== undefined ? action.payload.newCritChance : state.hero.critChance,
        dodge: action.payload.newDodge !== undefined ? action.payload.newDodge : state.hero.dodge
      };
      const effectiveMaxHp = calculateEffectiveStats(
        tempHero,
        undefined,
        state.currentRun.active ? state.currentRun.runBuffs : null
      ).maxHp;
      return {
        ...state,
        hero: {
          ...state.hero,
          level:       action.payload.newLevel,
          maxHp:       action.payload.newMaxHp,
          attack:      action.payload.newAttack,
          defence:     action.payload.newDefence,
          critChance:  tempHero.critChance,
          dodge:       tempHero.dodge,
          statPoints:  action.payload.newStatPoints !== undefined ? action.payload.newStatPoints : (state.hero.statPoints || 0),
          // Fully heal on level up — it feels good! 🎉
          hp:          effectiveMaxHp,
        },
      };
    }

    // -----------------------------------------------------------------------
    // ALLOCATE_STAT_POINTS — manually allocate stat points to STR, AGI, VIT
    // Payload: { strInc: number, agiInc: number, vitInc: number }
    // -----------------------------------------------------------------------
    case 'ALLOCATE_STAT_POINTS': {
      const { strInc = 0, agiInc = 0, vitInc = 0 } = action.payload;
      const totalPoints = strInc + agiInc + vitInc;
      if (totalPoints <= 0 || state.hero.statPoints < totalPoints) {
        return state;
      }
      const newStr = (state.hero.strength || 10) + strInc;
      const newAgi = (state.hero.agility || 10) + agiInc;
      const newVit = (state.hero.vitality || 10) + vitInc;

      const newMaxHp = newVit * 5;
      const newAttack = newStr * 1;
      const newDefence = 0; // base defence is 0, only comes from gear/skills
      const newCritChance = newAgi * 0.005;
      const newDodge = newAgi * 0.005;

      const newStatPoints = state.hero.statPoints - totalPoints;
      const tempHero = {
        ...state.hero,
        strength: newStr,
        agility: newAgi,
        vitality: newVit,
        maxHp: newMaxHp
      };
      const effectiveMaxHp = calculateEffectiveStats(tempHero).maxHp;
      const newHp = effectiveMaxHp;

      return {
        ...state,
        hero: {
          ...state.hero,
          strength: newStr,
          agility: newAgi,
          vitality: newVit,
          maxHp: newMaxHp,
          attack: newAttack,
          defence: newDefence,
          critChance: newCritChance,
          dodge: newDodge,
          statPoints: newStatPoints,
          hp: newHp,
        },
      };
    }

    // -----------------------------------------------------------------------
    // RESET_GAME — nuke everything and start fresh
    // -----------------------------------------------------------------------
    case 'RESET_GAME':
      return { ...initialState };

    // -----------------------------------------------------------------------
    // DEFAULT — unknown action, return state unchanged
    // -----------------------------------------------------------------------
    default:
      console.warn(`[gameReducer] Unknown action type: "${action.type}"`);
      return state;
  }
}

// ============================================================================
// CONTEXT + PROVIDER + HOOK
// ============================================================================

/**
 * The React Context that holds { state, dispatch }.
 * Components access it via the `useGame()` hook (never directly).
 */
const GameContext = createContext(null);

/**
 * GameProvider — wrap your app with this to give every screen access to game state.
 *
 * Usage in App.js:
 *   import { GameProvider } from './state/gameState';
 *
 *   export default function App() {
 *     return (
 *       <GameProvider>
 *         <YourNavigator />
 *       </GameProvider>
 *     );
 *   }
 */
export function GameProvider({ children }) {
  // -- useReducer gives us state + dispatch ---------------------------------
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // We use a ref to track whether we've finished loading saved data.
  // This prevents us from saving the default initialState over a real save.
  const hasLoadedRef = useRef(false);

  // -- Load saved state on first mount --------------------------------------
  useEffect(() => {
    loadGame().then(savedState => {
      if (savedState) {
        // Merge saved state with initialState to handle any new fields
        // that were added after the save was created (forward-compatibility).
        const merged = deepMerge(initialState, savedState);

        // Migrate old 3-slot gear shape ({ weapon, armor, trinket }) or 8-slot ({ trinket1, trinket2 }) to the new 8-slot shape.
        if (merged.hero?.gear) {
          const gear = merged.hero.gear;
          if ('armor' in gear) {
            if (gear.armor) gear.chest = gear.armor;
            delete gear.armor;
          }
          // Migrate old trinket1/trinket2 to new trinket/storage
          if ('trinket1' in gear) {
            gear.trinket = gear.trinket1;
            delete gear.trinket1;
          }
          if ('trinket2' in gear) {
            gear.storage = gear.trinket2;
            delete gear.trinket2;
          }
          // If leather_bag is equipped in the trinket slot, move it to storage
          if (gear.trinket === 'leather_bag') {
            gear.storage = 'leather_bag';
            gear.trinket = null;
          }
          // If the old trinket field exists (from 3-slot shape), map it directly
          if ('trinket' in gear && gear.trinket === 'leather_bag') {
            gear.storage = 'leather_bag';
            gear.trinket = null;
          }
        }

        // Ensure starter gear is present in inventory.craftedGear if equipped
        if (merged.hero?.inventory) {
          if (!merged.hero.inventory.craftedGear) {
            merged.hero.inventory.craftedGear = [];
          }
          if (merged.hero.gear?.weapon === 'toy_sword' && !merged.hero.inventory.craftedGear.includes('toy_sword')) {
            merged.hero.inventory.craftedGear.push('toy_sword');
          }
          if (merged.hero.gear?.chest === 'cardboard_armor' && !merged.hero.inventory.craftedGear.includes('cardboard_armor')) {
            merged.hero.inventory.craftedGear.push('cardboard_armor');
          }
          if (merged.hero.gear?.weapon === 'wooden_branch' && !merged.hero.inventory.craftedGear.includes('wooden_branch')) {
            merged.hero.inventory.craftedGear.push('wooden_branch');
          }
          if ((merged.hero.gear?.storage === 'leather_bag' || merged.hero.gear?.trinket === 'leather_bag') && !merged.hero.inventory.craftedGear.includes('leather_bag')) {
            merged.hero.inventory.craftedGear.push('leather_bag');
          }
        }

        // Migrate hero base stats to be dynamically derived from attributes.
        if (merged.hero) {
          const isAtFullBaseHp = merged.hero.hp === merged.hero.maxHp;

          const str = merged.hero.strength || 10;
          const agi = merged.hero.agility || 10;
          const vit = merged.hero.vitality || 10;
          merged.hero.maxHp = vit * 5;
          merged.hero.attack = str * 1;
          merged.hero.defence = 0;
          merged.hero.critChance = agi * 0.005;
          merged.hero.dodge = agi * 0.005;

          // If hero is outside of a dungeon run, their HP should always be full.
          // Otherwise, if they were at full base HP when saved in a run, restore to full effective HP.
          if (!merged.currentRun?.active) {
            merged.hero.hp = calculateEffectiveStats(merged.hero).maxHp;
          } else if (isAtFullBaseHp) {
            merged.hero.hp = calculateEffectiveStats(merged.hero).maxHp;
          }
        }

        // Migrate unlockedSkills from old array format to new object format.
        if (merged.hero && Array.isArray(merged.hero.unlockedSkills)) {
          merged.hero.unlockedSkills = {};
        }

        dispatch({ type: 'SET_STATE', payload: merged });
      }
      // Mark loading as complete so auto-save can begin
      hasLoadedRef.current = true;
    });
  }, []);

  // -- Auto-save whenever state changes -------------------------------------
  useEffect(() => {
    // Don't save until we've loaded (otherwise we'd overwrite the real save
    // with the default initialState on the very first render).
    if (hasLoadedRef.current) {
      saveGame(state);
    }
  }, [state]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

/**
 * useGame — the hook every component uses to access game state.
 *
 * Usage:
 *   const { state, dispatch } = useGame();
 *   console.log(state.hero.level);
 *   dispatch({ type: 'ADD_GOLD', payload: { amount: 50 } });
 *
 * @returns {{ state: Object, dispatch: Function }}
 */
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error(
      'useGame() must be used inside a <GameProvider>. ' +
      'Wrap your app with <GameProvider> in App.js.'
    );
  }
  return context;
}

// ============================================================================
// PERSISTENCE HELPERS — save / load / reset via AsyncStorage
// ============================================================================

/**
 * Save the current game state to AsyncStorage.
 *
 * @param {Object} state – The full game state object to persist.
 */
export async function saveGame(state) {
  try {
    const json = JSON.stringify(state);
    await AsyncStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    console.error('[saveGame] Failed to save:', error);
  }
}

/**
 * Load the previously saved game state from AsyncStorage.
 *
 * @returns {Object|null} The saved state, or null if no save exists.
 */
export async function loadGame() {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) {
      return JSON.parse(json);
    }
    return null;
  } catch (error) {
    console.error('[loadGame] Failed to load:', error);
    return null;
  }
}

/**
 * Delete the saved game from AsyncStorage.
 * Call this when the player chooses "Reset Game" from settings.
 */
export async function deleteSave() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[deleteSave] Failed to delete save:', error);
  }
}

// ============================================================================
// UTILITY — deep merge for forward-compatibility
// ============================================================================

/**
 * Recursively merge `source` into `target`.
 *
 * Any keys present in `target` but missing from `source` are preserved,
 * which means new fields added to `initialState` after the player already
 * has a save file will be filled with their defaults.
 *
 * @param {Object} target – The base object (e.g. initialState).
 * @param {Object} source – The saved object (may be missing new keys).
 * @returns {Object} Merged result.
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      // Both are plain objects → recurse
      result[key] = deepMerge(target[key], source[key]);
    } else {
      // Primitive, array, or new key → use the saved value
      result[key] = source[key];
    }
  }

  return result;
}
