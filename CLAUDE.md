# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start the dev server (opens Expo Go QR code)
npm start

# Launch directly on a platform
npm run ios
npm run android
npm run web
```

No test runner or lint script is configured. There is no CI pipeline.

## Architecture Overview

**Meow Depths** is an Expo + React Native mobile RPG. Mochi (the hero cat) explores grid-based dungeons across three zones, fighting enemies in a turn-based combat system. Summary of it can be seen in [gamedetails.md](gamedetails.md)

### State management

All game data lives in a single React Context defined in [src/state/gameState.js](src/state/gameState.js). Every screen consumes it via `useGame()`, which returns `{ state, dispatch }`.

The state has three top-level branches:
- `state.hero` — persistent hero stats, gear, inventory, skills
- `state.progress` — cross-run flags (zones cleared, daily reward timestamp, floors cleared)
- `state.currentRun` — temporary run data reset by `END_RUN` (the active dungeon grid, player position, run-only buffs, loot collected mid-run)

State is auto-saved to AsyncStorage on every change. On first load, the saved state is **deep-merged** with `initialState`, so any new fields added to `initialState` after an existing save will be filled with their defaults (forward-compatibility guarantee).

### The combat/loot flow

This is the most important pattern to understand:

1. **`START_RUN`** — Generates a dungeon grid via `dungeonGenerator.js`, deducts packed consumables from `hero.inventory`, restores hero HP to full, and stores everything in `currentRun`.
2. **During a run** — Combat results are buffered; gold and materials go to `currentRun.lootCollected`, HP changes are synced back via `UPDATE_RUN_AFTER_COMBAT`. Run-only stat buffs (from Rest rooms) live in `currentRun.runBuffs`.
3. **`END_RUN`** — `outcome: 'win'` applies collected loot to permanent inventory; `outcome: 'flee'` keeps half; `outcome: 'lose'` discards it all. Remaining consumables from the run bag are returned to permanent inventory regardless.

### CombatScreen local state

[src/screens/CombatScreen.js](src/screens/CombatScreen.js) is intentionally isolated: it reads global state **once on mount** (to initialise hero stats and the encounter) and only writes back to global state when combat ends. All in-fight HP, effects, cooldowns, and enemy state live in local `useState`. This is by design — React's setState batching makes async combat animation sequences unworkable with the global reducer.

The combat turn sequence:
```
player picks action → executeAttack / executeSkill / useConsumable → 
processDeadEnemies → tickHeroStatusEffects → runEnemyTurn (async) → 
enemy attacks (each with animation delay) → processStatusEffects on enemies → 
decrement cooldowns → back to playerTurn
```

Enemy **intent** is chosen at the START of each player turn (Slay the Spire style) so the player can make informed decisions.

### Logic layer

Pure functions — no React, no side effects:

- [src/logic/combatEngine.js](src/logic/combatEngine.js) — `calculateDamage`, `executeAttack`, `executeSkill`, `executeEnemyTurn`, `processStatusEffects`, `generateEncounter`
- [src/logic/dungeonGenerator.js](src/logic/dungeonGenerator.js) — generates a 2D tile grid with hard constraints (start at bottom-left, boss on top/right edge, BFS-verified path) and soft constraints (rest tiles not adjacent to start, etc.). Retries up to 100 times; relaxes soft constraints after 50 attempts.
- [src/logic/lootEngine.js](src/logic/lootEngine.js) — `calculateDrops` (per-enemy RNG roll), `calculateEncounterLoot` (merges drops from the whole fight)
- [src/logic/progressionEngine.js](src/logic/progressionEngine.js) — `getXpForLevel`, `checkLevelUp`, `calculateEffectiveStats` (base stats + gear + passive skills + set bonuses + run buffs)

### Data layer

Static definitions with no logic — safe to edit freely:

- [src/data/zones.js](src/data/zones.js) — `ZONES`, `ENCOUNTER_CHANCES`, `GOLD_DROPS`, `XP_VALUES`
- [src/data/enemies.js](src/data/enemies.js) — `ENEMIES` map keyed by id; each enemy has `moves[]` with optional `effect` and `effectChance`
- [src/data/skills.js](src/data/skills.js) — `SKILLS` map; three paths (ironPaw / stonefur / shadowClaw), 4 tiers each, tiers 3-4 branch into mutually exclusive `a`/`b` choices
- [src/data/gear.js](src/data/gear.js) — `GEAR`, `MATERIALS`, `SET_BONUSES`, `CONSUMABLES`

### Effective stats calculation

`calculateEffectiveStats(hero, skillDefs, runBuffs)` in [src/logic/progressionEngine.js](src/logic/progressionEngine.js) is the single place that combines base stats + gear + passives + set bonuses + run-only buffs into the stats used in combat. **Always call this function to get the hero's real stats**; never read `hero.attack` directly in combat context.

### Sprite system

[src/constants/sprites.js](src/constants/sprites.js) maps enemy IDs to `{ idle, attack }` sprite-sheet definitions. Metro bundler requires fully static `require()` strings — no template literals or dynamic paths. `getEnemySprite(enemy)` strips an `elite_` prefix and looks up the base ID, falling back to `FALLBACK_ENEMY_SPRITE`.

### Navigation

Stack navigator defined in [App.js](App.js). `Camp` is the initial route. `Combat` and `DungeonMap` have `gestureEnabled: false` to prevent accidental back-swipes. Screens navigate by calling `navigation.navigate('RouteName')`.

### Theme and design system

All colors, fonts, spacing, and border-radius tokens are in [src/constants/theme.js](src/constants/theme.js). The design follows a "cozy meets grim" rule: **warm palette** (`hearthBlack`, `torchOrange`, `candleGold`) for safe screens (Camp, Shop, Inventory); **cold palette** (`voidNavy`, `coldBlue`, `mysteryViolet`) for dungeon and combat. See [assets/meow_depths_design_system.md](assets/meow_depths_design_system.md) for the full visual spec.
