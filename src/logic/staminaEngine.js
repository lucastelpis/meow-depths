import { GEAR } from '../data/gear';

export const DEFAULT_MAX_STAMINA = 3;
export const DEFAULT_REGEN_INTERVAL = 8 * 60 * 60 * 1000; // 8 hours in ms

/**
 * Calculate the active stamina regeneration interval in milliseconds.
 * Checks for `staminaRegenMultiplier` on all equipped gear slots.
 * 
 * @param {Object} state - The global game state
 * @returns {number} The interval in milliseconds
 */
export function getStaminaRegenInterval(state) {
  let interval = DEFAULT_REGEN_INTERVAL;

  if (state?.hero?.gear) {
    const slots = ['weapon', 'head', 'chest', 'legs', 'gloves', 'boots', 'trinket', 'storage'];
    for (const slot of slots) {
      const gearId = state.hero.gear[slot];
      if (gearId && GEAR[gearId]?.stats?.staminaRegenMultiplier) {
        interval = Math.round(interval * GEAR[gearId].stats.staminaRegenMultiplier);
      }
    }
  }

  return interval;
}

/**
 * Recalculate stamina charges based on the time elapsed since the last regeneration.
 * 
 * @param {Object} state - The global game state
 * @returns {Object} The updated state (or the original if no change occurred)
 */
export function recalculateStamina(state) {
  if (!state || !state.hero) return state;

  const currentStamina = state.hero.stamina ?? DEFAULT_MAX_STAMINA;
  const maxStamina = state.hero.maxStamina ?? DEFAULT_MAX_STAMINA;

  // If stamina is full, no recovery needed. Clear lastStaminaRegenTime to null.
  if (currentStamina >= maxStamina) {
    if (state.hero.lastStaminaRegenTime !== null) {
      return {
        ...state,
        hero: {
          ...state.hero,
          stamina: maxStamina,
          lastStaminaRegenTime: null,
        },
      };
    }
    return state;
  }

  // If stamina is not full, but lastStaminaRegenTime is not set, initialize it to now.
  let lastRegen = state.hero.lastStaminaRegenTime;
  if (!lastRegen) {
    lastRegen = Date.now();
    return {
      ...state,
      hero: {
        ...state.hero,
        lastStaminaRegenTime: lastRegen,
      },
    };
  }

  const interval = getStaminaRegenInterval(state);
  const now = Date.now();
  const elapsed = now - lastRegen;

  if (elapsed >= interval) {
    const chargesToAdd = Math.floor(elapsed / interval);
    const newStamina = Math.min(maxStamina, currentStamina + chargesToAdd);
    let newLastRegen = lastRegen + chargesToAdd * interval;

    // If stamina is now full, reset regeneration timer.
    if (newStamina >= maxStamina) {
      newLastRegen = null;
    }

    return {
      ...state,
      hero: {
        ...state.hero,
        stamina: newStamina,
        lastStaminaRegenTime: newLastRegen,
      },
    };
  }

  return state;
}
