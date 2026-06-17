# Meow Depths Game Summary

## Overview
Meow Depths is an RPG/region-crawler game built using React Native and Expo, featuring turn-based combat, skills, equipment, progression, and a town hub.

## Key Screens
- **Onboarding Flow (First Launch)**: Shown when `hero.element` is null.
  - **Name Input Screen**: The player enters their character's name (defaults to "Mochi").
  - **Element Selection Screen**: A horizontal snap-carousel where players choose their starting element path (Fire, Water, Earth, Wind). Confirming dispatches the `SELECT_ELEMENT` action, locking in their choice and transitioning to the main game.
- **Camp Hub (Main Screen)**: The player can navigate to the Region Map, Loadout (Inventory), Skills, Market (Shop), and Profile.
- **Profile Screen**: Accessible from the hub. Split into two tabs:
  - **Stats tab**: Displays base attributes (STR, AGI, VIT) where players allocate points earned from leveling up, previews and displays effective combat stats (ATK, DEF, MAX HP, etc.), and describes their current elemental stance.
  - **Gear tab**: Displays equipped gear across 8 slots (Head, Chest, Gloves, Legs, Boots, Weapon, Trinket, Storage) and displays active set bonuses.
- **Inventory/Loadout Screen**: Accessible from the hub. Contains three tabs (Supplies, Gear, Materials) styled as cozy parchment/wood tabs.
- **Market (Shop) Screen**: Accessible from the hub. Contains three tabs (Supplies shop, Gear armory, Forge fusion) styled as cozy parchment/wood tabs.
- **Region Map Screen**: Allows entering zones to fight enemies.
- **Expeditions Screen**: Displays available regions (Soggy Sewers, Twisted Gardens, Sunken Docks) with custom level ranges, run completion statistics, and zone completion status. Each region card features a full-bleed premium background banner image scaled to a perfect 2:1 aspect ratio matching the dimensions of the assets.
- **Skill Tree Screen**: Unlocks and upgrades active and passive skills using gold/crystals.

## Crystal Forging & Fusion
Players can fuse lower-tier crystal shards and crystals into higher-tier ones in the **Forge** tab at the Market (Shop):
- **Fusion Rate**: 
  - 10x Crystal Shards ➔ 1x Small Crystal of the same color.
  - 10x Small Crystals ➔ 1x Big Crystal of the same color.
- **Cores**: Crystal Cores cannot be forged and are only obtained as rare boss/chest drops.
- **Progression Lock**: Crystals and fusion recipes are locked by region progression:
  - **Black Crystals (Zone 1 - Soggy Sewers)**: Always unlocked and available from the start.
  - **Green Crystals (Zone 2 - Twisted Garden)**: Unlocked/visible only after Zone 1 is cleared (`state.progress.zone1Cleared` is true).
  - **Yellow Crystals (Zone 3 - Sunken Docks)**: Unlocked/visible only after Zone 2 is cleared (`state.progress.zone2Cleared` is true).

## Tabs Icons Reference (icons-1 spritesheet)
- **Supplies**: Frame index 26 (Frame 27)
- **Gear**: Frame index 10 (Frame 11)
- **Forge**: Frame index 9 (Frame 10)
- **Materials**: Frame index 29 (Frame 30)

## Crystals Spritesheet Reference (crystals-1 spritesheet)
Crystals and shards use frames from the `crystals-1` spritesheet:
- **Black Crystal family (Zone 1)**:
  - Shard: Frame index 0
  - Small: Frame index 1
  - Big: Frame index 2
  - Core: Frame index 3
- **Green Crystal family (Zone 2)**:
  - Shard: Frame index 4
  - Small: Frame index 5
  - Big: Frame index 6
  - Core: Frame index 7
- **Yellow Crystal family (Zone 3)**:
  - Shard: Frame index 8
  - Small: Frame index 9
  - Big: Frame index 10
  - Core: Frame index 11

## Consumables Spritesheet Reference (consumables-1 spritesheet)
- **Potion**: Frame index 0
- **Super Potion**: Frame index 1
- **Mega Potion**: Frame index 2
- **Ultra Potion**: Frame index 3
- **Antidote**: Frame index 7
- **Smoke Vial**: Frame index 9
*Note: Mystery Chest uses `icons-1` frame index 5.*

## Skill Icons Spritesheet Reference (skill-icons-1 spritesheet)
- **Fire Slash** (Fire Active Tier 1): Frame index 0
- **Smoldering** (Fire Passive Tier 1): Frame index 1
- **Fire Burst** (Fire Active Tier 2): Frame index 2
- **Flame Guard** (Fire Passive Tier 2): Frame index 3
- **Tidal Strike** (Water Active Tier 1): Frame index 4
- **Hydration** (Water Passive Tier 1): Frame index 5
- **Tidal Wave** (Water Active Tier 2): Frame index 6
- **Healing Current** (Water Passive Tier 2): Frame index 7
- **Boulder Slash** (Earth Active Tier 1): Frame index 8
- **Fortitude** (Earth Passive Tier 1): Frame index 9
- **Fortify** (Earth Active Tier 2): Frame index 10
- **Stone Thorns** (Earth Passive Tier 2): Frame index 11
- **Dual Slash** (Wind Active Tier 1): Frame index 12
- **Swiftness** (Wind Passive Tier 1): Frame index 13
- **Whirlwind Strike** (Wind Active Tier 2): Frame index 14
- **Critical Wind** (Wind Passive Tier 2): Frame index 15

## Combat Movement Animations
- **Attack/Skill Lunge**: Attacking characters lunge forward snappily (24px right for hero, 24px left for enemies) on their turn. The timing split is 30% lunge forward and 70% return.
- **Damage Recoil**: Characters move backward subtly (12px left for hero, 12px right for enemies) when taking damage. The timing split matches the attack's: 30% recoil backward and 70% return recovery.
- **Red Damage Overlay Tint**: When taking damage, a red color flash overlay (using `#ff3333` tint) is rendered over the unit, fading in to `0.75` opacity during the recoil phase and fading back to `0` opacity during the recovery phase.
- **Synchronized Duration**: Both animations dynamically synchronize their durations to match the visual frame length of the active sprite sheet. Single attacks/skills play at 10 FPS, while multi-hit skills/moves (like Dual Slash and Whirlwind Strike) play at a sped-up rate of 16 FPS.
- **Sequential Multi-Hits**: Multi-hit skills/moves are executed as a sequence of rapid individual hits (each taking 350ms). Each hit resets the sprite animation sheet, triggers its own attack lunge, target recoil, damage popup, and step-by-step HP bar depletion, making them feel like actual successive attacks.

## Combat & Battle Log Formatting
- **Skill Usage Log Messages**: Battle log messages generated during skill usage are kept clean and free of all starting emojis, icons, or special symbols (e.g. 🔥, 🛡️, 💨). All skill log entries are prefixed with `[CharacterName] uses [SkillName]: ` (or `uses [SkillName] and...`/`raises...` etc.) and fully preserve the descriptive combat details, formulas, and damage tracking.

- **Log Text Coloring Rules**: Log text colors are parsed dynamically in the UI:
  - Hero actions (attacks, active skills, heals/shields when cast, and critical hits): Colored **Treasure Gold** (`#F5CF4A`).
  - Damage taken and unit deaths: Colored **Damage Red** (`#D8483F`).
  - Active healing source/HP ticks: Colored **Buff Mint Green** (`#5CC489`).
  - Stuns, bleeds, guards, and status applications: Colored **Cold Blue** (`#5A9FE0`).
  - Standard/enemy text: Colored default cool parchment grey.

- **Combat Flee Mechanic**: The player can escape combat using the "Flee" button under the main actions.
  - **Constraint**: Can only be used once per run.
  - **Outcome**: Sends the player back to the last visited room they entered from, leaving the combat room uncleared/active on the map (so they can re-enter it or go elsewhere).
  - **Status Preservation**: HP is kept at its current combat level, and all consumables used during combat remain consumed (not recovered).
  - **Visual Indicator**: The Flee button renders as shaded/greyed-out and disabled if it has already been used during the current run.



## Region Banners Reference
Region cards on the Expeditions screen use high-quality banner images as backgrounds, which are preloaded and tinted dynamically using zone-specific colors:
- **Zone 1 (Soggy Sewers)**: `assets/sprites/banners/soggy_sewers_banner_600x300.png`
- **Zone 2 (Twisted Garden)**: `assets/sprites/banners/twisted_gardens_banner_600x300.png`
- **Zone 3 (Sunken Docks)**: `assets/sprites/banners/sunken_docks_banner_600x300.png`

## Matrix Spritesheet Reference (icons-map.png)
This is a 15-column layout matrix of various game icons (480x320 px, 32x32 px per tile). The frame index is calculated as:
`frameIndex = (row - 1) * 15 + (col - 1)` (0-based indexing).

### Mappings Used in Region & Battle UI:
1. **Fog / Unexplored Locked Room Tile**: Row 4, Col 5 ➔ `frameIndex: 49` (Lock)
2. **Sealed Boss Padlock Overlay**: Row 4, Col 5 ➔ `frameIndex: 49` (Lock)
3. **Room Completion Counter (HUD)**: Row 4, Col 8 ➔ `frameIndex: 52` (Lit candle)
4. **EXP Icon (HUD)**: Row 10, Col 12 ➔ `frameIndex: 146` (EXP scroll)
5. **Run Bag Button / Modal Header**: Row 7, Col 10 ➔ `frameIndex: 99` (Backpack)
6. **Loot Collected Section Header (Run Bag popup)**: Row 1, Col 12 ➔ `frameIndex: 11` (Sack of grain)
7. **Flee Button / Modal Header**: Row 9, Col 8 ➔ `frameIndex: 127` (Open book)
8. **Rest Room Tile**: Row 3, Col 2 ➔ `frameIndex: 31` (Fireplace)
9. **Surprise Room Tile**: Row 2, Col 5 ➔ `frameIndex: 19` (Jail Door / Iron Bars)
10. **Start Room Tile**: Row 1, Col 5 ➔ `frameIndex: 4` (Bear Trap / Spikes)
11. **Dying Enemy Skull Overlay (Battle)**: Row 3, Col 5 ➔ `frameIndex: 34` (Skull)
12. **Victory Overlay Title**: Row 7, Col 6 ➔ `frameIndex: 95` (Gold star)
13. **Defeat Overlay Title**: Row 3, Col 5 ➔ `frameIndex: 34` (Skull)
14. **ATK Buff Icon (HUD)**: Row 7, Col 3 ➔ `frameIndex: 92` (Crossed swords alt)
15. **CRIT Buff Icon (HUD)**: Row 4, Col 3 ➔ `frameIndex: 47` (Sword diag / Dagger)
16. **DODGE Buff Icon (HUD)**: Row 7, Col 5 ➔ `frameIndex: 94` (Winged boot)
17. **DEF Buff Icon (HUD)**: Row 5, Col 3 ➔ `frameIndex: 62` (Wooden shield)
18. **HP Buff Icon (HUD)**: Row 10, Col 1 ➔ `frameIndex: 135` (Heart/plus)

### Rows & Columns Layout Matrix:
- **Row 1**: 1: Striped tent, 2: Brown tent, 3: Red potion, 4: Chicken leg, 5: Bear trap/Spikes, 6: Iron sword, 7: Bowl of soup, 8: Stone room/bed, 9: Iron gate, 10: Closed wooden chest, 11: Bow, 12: Sack of grain, 13: Treasure chest, 14: Campfire/pot, 15: Campfire
- **Row 2**: 16: Small tent, 17: Pot over fire, 18: Backpack, 19: Bronze key, 20: Jail door/Iron bars, 21: Green backpack, 22: Gold key, 23: Cobweb window, 24: Wood logs, 25: Gold ring, 26: Quiver/arrows, 27: Compass, 28: Opened scroll/map, 29: Fireplace, 30: Small campfire
- **Row 3**: 31: Fireplace, 32: Torch, 33: Opened map, 34: Skull, 35: Pickaxe, 36: Closed scroll, 37: Stone room/stool, 38: Stack of books, 39: Gold necklace, 40: Battle axe, 41: Firewood stack, 42: Yellow potion, 43: Campfire alt, 44: Beer mug, 45: Sword diag
- **Row 4**: 46: Lock, 47: Blue potion, 48: Table room, 49: Wall torch room, 50: Lit candle, 51: Green potion, 52: Sleeping cat, 53: Vampire coffin, 54: Ornate chest, 55: Shop tent, 56: Bread loaf, 57: Shield, 58: Archway, 59: Stone block, 60: Mallet
- **Row 5**: 61: Window, 62: Map window, 63: Ruby, 64: Iron shield, 65: Lantern, 66: Pile of gems, 67: Crossed swords, 68: Treasure map, 69: Scroll, 70: Anvil, 71: Red chest, 72: Pickaxe alt, 73: Hammer, 74: Purple crystal, 75: Tornado
- **Row 6**: 76: Gold coin, 77: Cloud, 78: Purple rune, 79: Pocket watch, 80: Lit candle, 81: Mushroom, 82: Shop stall, 83: Gift box, 84: Crossed swords alt, 85: Fireball, 86: Winged boot, 87: Wizard hat, 88: Iron key, 89: Water drop, 90: Wand
- **Row 7**: 91: Backpack alt, 92: Gold key alt, 93: Signpost, 94: Red potion round, 95: Meat, 96: Gold star, 97: Magnifying glass, 98: Gold coins, 99: Gold key, 100: Flexed arm, 101: Feather, 102: Gear, 103: Magma rock, 104: Wooden shield, 105: Gold coins stack
- **Row 8**: 106: Locked padlock, 107: Gold bars, 108: Blue potion round, 109: Red apple, 110: Gray star, 111: Brown book, 112: Wooden chest small, 113: Bread loaf alt, 114: Hand/cross, 115: Green slime, 116: Wrench/hammer, 117: Running cat, 118: Torch alt, 119: Crown, 120: Open book
- **Row 9**: 121: Beer alt, 122: Green potion round, 123: Bread angle, 124: Heart/plus, 125: Cave entrance, 126: Red chest gold locks, 127: Compass alt, 128: Gold key crown, 129: Gold crown, 130: Flame/fire, 131: Warning sign, 132: Blue potion light, 133: Wood stack, 134: Green arrow, 135: EXP Scroll
- **Row 10**: 136: Grey mountain, 137: Blue fish, 138-150: Additional cells.
