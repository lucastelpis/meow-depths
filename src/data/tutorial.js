/**
 * tutorial.js — copy for the first-time in-game tutorial.
 *
 * Pure static definitions, no logic (matches the src/data/* convention).
 *
 * The first-time Camp walkthrough is a guided spotlight tour whose steps live in
 * CampScreen (they bind to real on-screen elements). This file holds the
 * one-time contextual tips shown on the World Map, Dungeon Map, and Combat.
 *
 *   TUTORIAL_TIPS  — one-time contextual tips keyed by id, shown the first time
 *                    a new player reaches the World Map, Dungeon Map, or Combat.
 *
 * Each `icon` reuses the exact sprite the player sees for that concept elsewhere
 * in the UI ({ sheet, frame } for an ItemSprite frame), reinforcing recognition.
 * Keep each body short (2–3 sentences) so it fits the parchment card.
 */

/** One-time contextual tips, keyed by the id passed to MARK_TUTORIAL_TIP_SEEN. */
export const TUTORIAL_TIPS = {
  worldMap: {
    title: 'REGIONS',
    icon: { sheet: 'icons-1', frame: 0 }, // Dungeon door — the Enter Regions icon
    body:
      'Choose a region to explore. Deeper regions are tougher but drop better loot. ' +
      'Pack a few consumables before you set out.',
  },
  dungeonMap: {
    title: 'EXPLORING',
    icon: { sheet: 'icons-map', frame: 33 }, // Boss skull — the boss-tile icon
    body:
      'Tap an adjacent tile to move. Unknown tiles hide battles, chests hold loot, ' +
      'and campfires let you rest. Reach the boss tile to clear the floor.',
  },
  combat: {
    title: 'COMBAT',
    icon: { sheet: 'icons-map', frame: 10 }, // Crossed swords — the combat-tile icon
    body:
      'Combat is turn-based. On your turn, attack, cast a skill, or use an item — ' +
      'then the enemies strike back. Watch your HP and win to keep exploring.',
  },
};
