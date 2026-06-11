# Meow Depths Game Summary

## Overview
Meow Depths is an RPG/dungeon-crawler game built using React Native and Expo, featuring turn-based combat, skills, equipment, progression, and a town hub.

## Key Screens
- **Camp Hub (Main Screen)**: The player can navigate to the Dungeon Map, Loadout (Inventory), Skills, and Market (Shop).
- **Inventory/Loadout Screen**: Accessible from the hub. Contains three tabs (Consumables, Equipment, Materials) styled as cozy parchment/wood tabs.
- **Market (Shop) Screen**: Accessible from the hub. Contains three tabs (Consumables shop, Equipment armory, Forge fusion) styled as cozy parchment/wood tabs.
- **Dungeon Map Screen**: Allows entering zones to fight enemies.
- **Skill Tree Screen**: Unlocks and upgrades active and passive skills using gold/crystals.

## Crystal Forging & Fusion
Players can fuse lower-tier crystal shards and crystals into higher-tier ones in the **Forge** tab at the Market (Shop):
- **Fusion Rate**: 
  - 10x Crystal Shards ➔ 1x Small Crystal of the same color.
  - 10x Small Crystals ➔ 1x Big Crystal of the same color.
- **Cores**: Crystal Cores cannot be forged and are only obtained as rare boss/chest drops.
- **Progression Lock**: Crystals and fusion recipes are locked by dungeon zone progression:
  - **Black Crystals (Zone 1 - Soggy Sewers)**: Always unlocked and available from the start.
  - **Green Crystals (Zone 2 - Twisted Garden)**: Unlocked/visible only after Zone 1 is cleared (`state.progress.zone1Cleared` is true).
  - **Yellow Crystals (Zone 3 - Sunken Docks)**: Unlocked/visible only after Zone 2 is cleared (`state.progress.zone2Cleared` is true).

## Tabs Icons Reference (icons-1 spritesheet)
- **Consumables**: Frame index 26 (Frame 27)
- **Equipment**: Frame index 10 (Frame 11)
- **Forge**: Frame index 9 (Frame 10)
- **Materials**: Frame index 29 (Frame 30)
