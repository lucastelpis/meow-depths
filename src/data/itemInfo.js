/**
 * itemInfo.js — Single source of truth for the "(?)" item info popups.
 *
 * Given a reward/loot key (gold, xp, a consumable id, a material id), returns
 * the { title, desc } shown in the info popup. Used by every screen that renders
 * item / gold / XP chips so the explanations stay consistent everywhere.
 */

import { CONSUMABLES } from './gear';

export function getItemInfo(itemId) {
  const normalized = String(itemId).toLowerCase();

  if (normalized === 'gold') {
    return {
      title: 'GOLD',
      desc: 'Shiny gold coins. Used to purchase gear, consumables, and all kinds of stuff.',
    };
  }
  if (normalized === 'xp') {
    return {
      title: 'EXPERIENCE (XP)',
      desc: 'Earned in combat. Fills your level bar — reach the next level to grow stronger.',
    };
  }

  const def = CONSUMABLES.find(c => c.id === normalized);
  if (def) {
    return { title: def.name.toUpperCase(), desc: def.description };
  }

  if (normalized === 'wood') {
    return { title: 'WOOD', desc: 'Sturdy timber earned from quests. Used to upgrade Camp Improvements.' };
  }
  if (normalized === 'cloth') {
    return { title: 'CLOTH', desc: 'Woven fabric scraps earned from quests. Used to upgrade Camp Improvements.' };
  }
  if (normalized === 'stone') {
    return { title: 'STONE', desc: 'Rough stone blocks earned from quests. Used to upgrade Camp Improvements.' };
  }

  if (normalized === 'black_shard') {
    return { title: 'BLACK SHARD', desc: 'A fragmented piece of black crystal. Dropped by Sewer monsters. Used for crafting basic gear.' };
  }
  if (normalized === 'black_crystal_small') {
    return { title: 'SMALL BLACK CRYSTAL', desc: 'A low-purity black crystal. Used for crafting early-game equipment.' };
  }
  if (normalized === 'black_crystal_big') {
    return { title: 'BIG BLACK CRYSTAL', desc: 'A dense black crystal. Used for forging high-quality Sewer equipment.' };
  }
  if (normalized === 'black_crystal_core') {
    return { title: 'BLACK CRYSTAL CORE', desc: 'A powerful, concentrated core of black crystal energy. Required for legendary Sewer gear.' };
  }
  if (normalized === 'green_shard') {
    return { title: 'GREEN SHARD', desc: 'A shard of glowing green crystal. Dropped by Garden monsters. Used for crafting mid-game gear.' };
  }
  if (normalized === 'green_crystal_small') {
    return { title: 'SMALL GREEN CRYSTAL', desc: 'A low-purity green crystal. Used for crafting mid-game equipment.' };
  }
  if (normalized === 'green_crystal_big') {
    return { title: 'BIG GREEN CRYSTAL', desc: 'A dense green crystal. Used for forging high-quality Garden equipment.' };
  }
  if (normalized === 'green_crystal_core') {
    return { title: 'GREEN CRYSTAL CORE', desc: 'A powerful, concentrated core of green crystal energy. Required for legendary Garden gear.' };
  }
  if (normalized === 'yellow_shard') {
    return { title: 'YELLOW SHARD', desc: 'A shard of glowing yellow crystal. Dropped by Docks monsters. Used for crafting late-game gear.' };
  }
  if (normalized === 'yellow_crystal_small') {
    return { title: 'SMALL YELLOW CRYSTAL', desc: 'A low-purity yellow crystal. Used for crafting late-game equipment.' };
  }
  if (normalized === 'yellow_crystal_big') {
    return { title: 'BIG YELLOW CRYSTAL', desc: 'A dense yellow crystal. Used for forging high-quality Docks equipment.' };
  }
  if (normalized === 'yellow_crystal_core') {
    return { title: 'YELLOW CRYSTAL CORE', desc: 'A powerful, concentrated core of yellow crystal energy. Required for legendary Docks gear.' };
  }

  const displayName = normalized
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return { title: displayName.toUpperCase(), desc: 'A rare quest reward item.' };
}

export default getItemInfo;
