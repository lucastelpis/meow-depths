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
    defence: 2,               // base damage reduction
    critChance: 0.05,         // 5 % base crit chance
    dodge: 0.05,              // 5 % base dodge chance
    gold: 100,                // start with some gold for first potions
    skillPoints: 0,           // earned 1 per level-up, spent on skills
    unlockedSkills: [],       // array of skill IDs the hero has learned
    equippedSkills: [null, null], // two active skill slots for combat

    // -- Equipment & Inventory -----------------------------------------------
    gear: {
      weapon:  null,          // equipped weapon gear ID (or null)
      armor:   null,          // equipped armor gear ID
      trinket: null,          // equipped trinket gear ID
    },
    inventory: {
      materials: {},          // { itemId: quantity } — crafting components
      consumables: [          // array of { id, quantity }
        { id: 'health_potion', quantity: 3 }, // start with 3 potions
      ],
      craftedGear: [],        // array of gear IDs the hero has crafted
    },
  },

  // -- Progress (persistent across runs) ------------------------------------
  progress: {
    zone1Cleared: false,
    zone2Cleared: false,
    zone3Cleared: false,
    currentZone: null,        // which zone the player was last exploring
    currentFloor: 0,
    floorsCleared: {          // highest floor cleared in each zone
      zone1: 0,
      zone2: 0,
      zone3: 0,
    },
  },

  // -- Current Run (temporary, reset after each dungeon run) ----------------
  currentRun: {
    active: false,            // true while a dungeon run is in progress
    zoneId: null,             // e.g. 'zone1'
    floor: 0,                 // current floor number within the run
    consumables: [],          // consumables brought into this run
    lootCollected: [],        // loot accumulated during the run
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
 *   EQUIP_GEAR       – put gear in a slot (weapon / armor / trinket)
 *   EQUIP_SKILL      – assign a skill to one of the two active slots
 *   HEAL             – restore HP
 *   LEVEL_UP         – apply level-up stat bonuses
 *   RESET_GAME       – wipe the save and start fresh
 *   SET_STATE        – wholesale state replacement (used when loading)
 *   START_RUN        – begin a new dungeon run
 *   TAKE_DAMAGE      – reduce HP
 *   UNLOCK_SKILL     – learn a new skill, spending skill points
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
    // Payload: { slot: 'weapon'|'armor'|'trinket', gearId: string }
    // -----------------------------------------------------------------------
    case 'EQUIP_GEAR':
      return {
        ...state,
        hero: {
          ...state.hero,
          gear: {
            ...state.hero.gear,
            [action.payload.slot]: action.payload.gearId,
          },
        },
      };

    // -----------------------------------------------------------------------
    // CRAFT_GEAR — spend materials + gold, add gear to inventory
    // Payload: { gearId: string, materials: { itemId: qty }, goldCost: number }
    // -----------------------------------------------------------------------
    case 'CRAFT_GEAR': {
      const { gearId, materials: matCost, goldCost } = action.payload;

      // Deduct materials
      const updatedMaterials = { ...state.hero.inventory.materials };
      for (const [itemId, qty] of Object.entries(matCost || {})) {
        updatedMaterials[itemId] = (updatedMaterials[itemId] || 0) - qty;
        // Clean up zeroes
        if (updatedMaterials[itemId] <= 0) delete updatedMaterials[itemId];
      }

      return {
        ...state,
        hero: {
          ...state.hero,
          gold: state.hero.gold - (goldCost || 0),
          inventory: {
            ...state.hero.inventory,
            materials: updatedMaterials,
            craftedGear: [...state.hero.inventory.craftedGear, gearId],
          },
        },
      };
    }

    // -----------------------------------------------------------------------
    // UNLOCK_SKILL — learn a new skill
    // Payload: { skillId: string, cost: number }
    // -----------------------------------------------------------------------
    case 'UNLOCK_SKILL':
      return {
        ...state,
        hero: {
          ...state.hero,
          skillPoints: state.hero.skillPoints - (action.payload.cost || 1),
          unlockedSkills: [...state.hero.unlockedSkills, action.payload.skillId],
        },
      };

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
    // START_RUN — begin a new dungeon run
    // Payload: { zoneId: string, consumables: [] }
    // -----------------------------------------------------------------------
    case 'START_RUN':
      return {
        ...state,
        currentRun: {
          active: true,
          zoneId: action.payload.zoneId,
          floor: 1,
          consumables: action.payload.consumables || [],
          lootCollected: [],
        },
        progress: {
          ...state.progress,
          currentZone: action.payload.zoneId,
          currentFloor: 1,
        },
      };

    // -----------------------------------------------------------------------
    // ADVANCE_FLOOR — move to the next floor in the run
    // Payload: { loot: Object } (optional loot from the fight just completed)
    // -----------------------------------------------------------------------
    case 'ADVANCE_FLOOR': {
      const nextFloor = state.currentRun.floor + 1;
      const zoneId = state.currentRun.zoneId;
      const newLoot = action.payload?.loot
        ? [...state.currentRun.lootCollected, action.payload.loot]
        : state.currentRun.lootCollected;

      // Update highest floor cleared
      const newFloorsCleared = { ...state.progress.floorsCleared };
      if (state.currentRun.floor > (newFloorsCleared[zoneId] || 0)) {
        newFloorsCleared[zoneId] = state.currentRun.floor;
      }

      return {
        ...state,
        currentRun: {
          ...state.currentRun,
          floor: nextFloor,
          lootCollected: newLoot,
        },
        progress: {
          ...state.progress,
          currentFloor: nextFloor,
          floorsCleared: newFloorsCleared,
        },
      };
    }

    // -----------------------------------------------------------------------
    // END_RUN — finish the dungeon run (win or loss)
    // Payload: { loot?: Object } (final loot if victorious)
    // -----------------------------------------------------------------------
    case 'END_RUN': {
      return {
        ...state,
        currentRun: {
          active: false,
          zoneId: null,
          floor: 0,
          consumables: [],
          lootCollected: [],
        },
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

      // Check if the consumable already exists in inventory
      const existing = state.hero.inventory.consumables.find(c => c.id === consumableId);
      let newConsumables;
      if (existing) {
        // Increment quantity
        newConsumables = state.hero.inventory.consumables.map(c =>
          c.id === consumableId ? { ...c, quantity: c.quantity + 1 } : c
        );
      } else {
        // Add new consumable entry
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
    case 'HEAL':
      return {
        ...state,
        hero: {
          ...state.hero,
          hp: Math.min(state.hero.maxHp, state.hero.hp + (action.payload.amount || 0)),
        },
      };

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
    // Payload: { newLevel, newMaxHp, newAttack, newDefence, newSkillPoints }
    // -----------------------------------------------------------------------
    case 'LEVEL_UP':
      return {
        ...state,
        hero: {
          ...state.hero,
          level:       action.payload.newLevel,
          maxHp:       action.payload.newMaxHp,
          attack:      action.payload.newAttack,
          defence:     action.payload.newDefence,
          skillPoints: action.payload.newSkillPoints,
          // Fully heal on level up — it feels good! 🎉
          hp:          action.payload.newMaxHp,
        },
      };

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
