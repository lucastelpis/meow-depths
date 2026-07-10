# Meow Depths Game Summary

## Overview
Meow Depths is an RPG/region-crawler game built using React Native and Expo, featuring turn-based combat, skills, equipment, progression, and a town hub.

## Dungeon Floor Rules & Loot
- **Dungeon Loot**: Potions (health potions, super potions, mega potions, ultra potions) do not drop from treasure chests, gamble rooms, or combat in the dungeons. They must be purchased from the Market (Shop) or obtained via daily rewards at the Camp hub.
- **Floor Completion Rewards**: Each floor has pre-disclosed Gold and EXP rewards visible on its selection card and entry modal. These are awarded upon clearing all tiles on the floor grid and displayed in the floor complete modal.
  - **Zone 1**: Starts at 100 G and 50 XP on Floor 1, increasing by +100 G and +50 XP per floor (reaching 1000 G and 500 XP on Floor 10).
  - **Zone 2**: Starts at 1000 G and 500 XP on Floor 1, increasing by +500 G and +250 XP per floor (reaching 5500 G and 2750 XP on Floor 10).
  - **Zone 3**: Starts at 6000 G and 3000 XP on Floor 1, increasing by +100 G and +50 XP per floor (reaching 6900 G and 3450 XP on Floor 10).
- **Floor Grid Sizes & Enemies**: Dungeon grid sizes grow as the player descends. For **Dungeon 1 (Soggy Ruins)**, Floor 10 (Boss Floor) is specifically configured as **4x4 tiles** (instead of 4x5) and all combat tiles on this floor spawn exactly **4 enemies** at the same time.
- **Skill Popups in Combat**: In battle, opening the detail modal for an equipped skill displays its current level's multipliers and specific effects (damage multiplier, defense reduction, cooldown, etc.) rather than just the generic description.
- **Water Skill Mechanics**: The Water active skill **Tidal Strike** reduces the target's Defense (DEF) instead of Attack (ATK). The passive **Tidal Wave** adds Splash Damage to **Tidal Strike** (DEF reduction only applies to the main target). The passive **Hydration** increases healing efficiency by `5% / 10% / 15% / 20% / 25%` (★1 to ★5), and the active **Healing Current** heals for `5% / 10% / 15% / 20% / 25%` (★1 to ★5) Max HP per turn for 3 turns.
- **Earth Skill Mechanics**: The Earth active skill **Landslide** deals a total damage pool (ATK and Max HP scaling) divided and split evenly among all alive enemies, and stuns them. Mochi takes backfire damage equal to the HP-damage percent of Max HP, which is reduced by Mochi's DEF like any other attack.
- **Fire Skill Mechanics**: The Fire active skill **Flame Guard** creates a flame shield lasting for 3 turns (with a 6-turn cooldown). It reduces incoming damage by `10% / 15% / 20% / 25% / 30%` (★1 to ★5) and counter-burns attackers for a scaling percentage of Mochi's current ATK (`5% / 10% / 15% / 20% / 25%` from ★1 to ★5) on every attack received.
- **Wind Skill Mechanics**: The Wind active skill **Wind Blades** fires 2 blade hits by default: the 1st always strikes the selected target, and the 2nd hits a random alive enemy (may hit the same target). Each hit rolls crit independently with +10% bonus crit chance. The passive **Backwind** adds +1/2/3/4/5 extra random-targeting strikes to Wind Blades per star level, for a maximum of 7 total hits at ★5. The passive **Swiftness** increases dodge chance (2%–10%). The active skill **Critical Wind** (8-turn cooldown) channels the wind's fury for 3 turns: increases crit rate by +7/14/21/28/35% and crit damage by +5/10/15/20/25% (additive on top of base 1.5× multiplier) per star level.


## Key Screens
- **Onboarding Flow (First Launch)**: Shown when `hero.element` is null.
  - **Name Input Screen**: The player enters their character's name (defaults to "Mochi").
  - **Element Selection Screen**: A horizontal snap-carousel where players choose their starting element path (Fire, Water, Earth, Wind). Confirming dispatches the `SELECT_ELEMENT` action, locking in their choice and transitioning to the main game.
- **Camp Hub (Main Screen)**: The player can navigate to the Region Map, Quests Board, Skills, Market (Shop), and Profile. Features a Settings modal accessible via the gear icon. The secondary navigation buttons (Market, Skills, Quests, Profile, Journal, Settings) are styled as 3D pixel-art buttons with double outlines (dark bronze outline `#84735B` and inner gap `#4F3C1E`), top/side earthy moss green highlights (`#4F856C`), a deep forest green bottom shadow bevel (`#0D2118`), and an earthy green face (`#1B4030`). The settings modal contains options to reset game data or reset character progression (reclaiming spent attribute points and refunding all Skill Points spent on skill tree unlocks and upgrades).
  - **Banner Tags Stack**: Displays active character status tags (Gold, Level, Stats point availability, Skill point availability, Unread notes notification).
    - **Stats Tag**: Appears when there are available attribute points to allocate. Uses an icon-only style with the 5th frame of the 8th row of `icons-map.png` (frame index 109).
    - **Skill Points Tag**: Appears when there are available skill points to distribute. Uses an icon-only style matching the Skills button (icons-map frame index 14).
    - **Notes Tag**: Appears when there are unread collectible field notes. Uses an icon-only style with frame index 58 of `icons-map.png`.
- **Quest Screen & Daily Quests Accordion**:
  - **Daily Quests Accordion (Camp Modal)**: An interactive list inside the Camp Hub where daily quests default to a collapsed header. Completed-unclaimed quests can be claimed directly from the header. The main Daily Quests entry button on the hub is styled as a 3D pixel-art button matching the Earthy Moss Green design with 3D outlines/bevels, a pulsing glow animation when active, and an all-caps subtitle.
  - **Quest Screen**: A full screen with tabs for Daily Quests (with countdown timers) and Campaign progression milestones. Top tab buttons, campaign sub-tab buttons, and active 'CLAIM REWARD' buttons are styled as 3D pixel-art buttons with double outlines (inactive in Earthy Moss Green, active/completed in warm Parchment or Earthy Moss Green).
  - **Reward Celebration Modal**: Triggered when claiming any quest reward. Opens a cozy parchment celebration popup with large retro item sprites (displaySize 32) and quantities. Pressing 'AWESOME!' dispatches the state action to claim rewards and closes the modal.
- **Profile Screen**: Accessible from the hub. Features a scaled-up avatar, a modern font style (`Jersey10-Regular`), and split tab buttons (Stats, Gear, Bag) styled as 3D pixel-art buttons with double outlines (inactive in Earthy Moss Green, active in warm Parchment). The screen is split into three tabs:
  - **Stats tab**: Displays base attributes (STR, AGI, VIT) where players allocate points earned from leveling up, previews and displays effective combat stats (ATK, DEF, MAX HP, etc.), describes their current elemental stance, and includes interactive `?` info tags next to attributes and stats which open a custom explanation popup modal.
  - **Gear tab**: Split into two subtabs (Equipped and Owned). Equipped displays equipped gear across 8 slots styled as 3D pixel-art buttons with double outlines (empty slots in Earthy Moss Green, equipped slots in warm Parchment) and active set bonuses. Owned displays a grid of crafted gear in inventory with side-by-side comparison overlays.
  - **Bag tab**: Displays Supplies (consumables).
- **Market (Shop) Screen**: Accessible from the hub. Contains two tabs (Supplies shop, Gear armory) styled as cozy parchment/wood tabs.
- **Region Map Screen**: Allows entering zones to fight enemies.
- **Expeditions Screen**: Displays available regions (Soggy Ruins, Twisted Gardens, Sunken Docks) with custom level ranges, run completion statistics, and zone completion status. Each region card features a full-bleed premium background banner image scaled to a perfect 2:1 aspect ratio matching the dimensions of the assets.
- **Skill Tree Screen**: Unlocks and upgrades active and passive skills using Skill Points (SP) gained on level-up. Skill cards are styled as 3D pixel-art buttons with double outlines, 3D bottom under-shadows, and colored inner highlights mapping to their current state (locked, available/unlockable, maxed, unlocked/equipped in earthy moss green instead of element colors). Equipped loadout slots in the footer dock are also styled as 3D moss green bevel buttons.
- **Journal Screen**: Split into two tabs:
  - **Creatures tab**: Displays discovered creature cards (sprite, name, region, item drops, and lore). Creature star levels are not shown because star levels dynamically scale in combat.
  - **Notes tab**: Lists collectible field notes unlocked on first-time floor clears by region, readable via a parchment reader modal. Unread notes display a red retro '!' badge in the top-right corner. When new unread notes are collected, a clickable notification badge tag (exclamation mark) appears on the main Camp Hub banner that links directly to this tab. Opening/reading the note clears its unread state.
- **Combat Screen (Battle)**: Features active action buttons redesigned as interactive 3D bevel buttons: Attack (3D Earthy Moss Green), Equipped Active Skills (unified 3D Purple design), Passives (3D Sage/Teal), Flee (3D soft Terracotta red), and Items (3D Warm Gold). Empty or exhausted/used slots retain their flat, disabled design for clear visual status. Victory and Defeat end-of-battle modals feature 3D bevel buttons (Earthy Moss Green for Victory, Crimson Red for Defeat) to complete the fight.

## Navigation Headers & UI Aesthetics
- **Unified Navigation Headers**: All secondary screens (WorldMap, Quest, Journal, Shop, Skill Tree, Profile, and Dungeon Floor selection) share a consistent, compact navigation bar:
  - **Header Heights**: Reduced vertical padding to `6px` to maximize map and gameplay container heights.
  - **3D Crimson Back Button**: Replaces text back buttons with a custom `44x44` 3D nested double-border button rendering the back arrow sprite (`frameIndex={43}` from `icons-map.png`). Uses a crimson fill (`#A61C1C`), light red inner border highlight (`#D8483F`), dark bronze outer outline (`#84735B`), and a dark bronze bottom shadow base (`#4F3C1E`).
  - **Gold-Rimmed Title Plaque**: Centers the screen title inside a custom plaque matching the Camp Hub's visual style (outer `#4A3917`, inner `#D4A754`, and charcoal background `#1E1E20`).
- **Scroll Discovery**: Consumables supplies list utilizes visual truncation (`maxHeight: 134`) to render a 35% cutoff of the third row, breaking the illusion of completeness and acting as a clear indicator to scroll. Shows vertical scroll indicators on interaction.
- **Skill Tree SP Spacing**: Top Skill Points bar has `marginTop: 12` to space it cleanly below the compact header bottom divider.


## Tabs Icons Reference (icons-1 spritesheet)
- **Supplies**: Frame index 26 (Frame 27)
- **Gear**: Frame index 10 (Frame 11)

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
- **Tidal Wave** (Water Passive Tier 2): Frame index 6
- **Healing Current** (Water Active Tier 2): Frame index 7
- **Boulder Slash** (Earth Active Tier 1): Frame index 8
- **Living Stone** (Earth Passive Tier 1): Frame index 9
- **Landslide** (Earth Active Tier 2): Frame index 16
- **Calcify** (Earth Passive Tier 2): Frame index 17
- **Wind Blades** (Wind Active Tier 1): Frame index 12
- **Swiftness** (Wind Passive Tier 1): Frame index 13
- **Backwind** (Wind Passive Tier 2): Frame index 14
- **Critical Wind** (Wind Passive Tier 2): Frame index 15

## Combat Movement Animations
- **Attack/Skill Lunge**: Attacking characters lunge forward snappily (24px right for hero, 24px left for enemies) on their turn. The timing split is 30% lunge forward and 70% return.
- **Damage Recoil**: Characters move backward subtly (12px left for hero, 12px right for enemies) when taking damage. The timing split matches the attack's: 30% recoil backward and 70% return recovery.
- **Red Damage Overlay Tint**: When taking damage, a red color flash overlay (using `#ff3333` tint) is rendered over the unit, fading in to `0.75` opacity during the recoil phase and fading back to `0` opacity during the recovery phase.
- **Synchronized Duration**: Both animations dynamically synchronize their durations to match the visual frame length of the active sprite sheet or the active frame subset range. Single attacks/skills play at 10 FPS, while multi-hit skills/moves (like Wind Blades) play at a sped-up rate of 16 FPS.
- **Unified Spritesheets**: Zone 1 enemies (rat, rat king, toad, slime, cockroach), Zone 2 enemies (mutated plant, ironclad beetle, spore shroom, savage worm, caustic slug, granite crawler), and Zone 3 enemies (mineral pincher, neon jelly, toxic puff, sea abomination) use a single 8-frame spritesheet (128x128 per frame) for both idle and attack animations. The idle animation uses the first 4 frames (0 to 3), and the attack animation uses the next 4 frames (4 to 7) at a customized rate of 6 FPS for smoother playback. They are left-facing by default, so mirroring (flipX) is disabled for these units.
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
- **Zone 1 (Soggy Ruins)**: `assets/sprites/banners/soggy_sewers_banner_600x300.png`
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
19. **Ambush Icon (Battle & Map Popup)**: Row 7, Col 3 ➔ `frameIndex: 92` (Crossed swords alt)

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

## Audio & Music Systems
- **BGM Assets**:
  - Main Hub and menus BGM: `hub&menus.mp3`
  - Soggy Ruins (Zone 1) BGM: `soggy-ruins.mp3`
  - Twisted Garden (Zone 2) BGM: `forest.mp3`
  - Sunken Docks (Zone 3) BGM: `sunken-docks.mp3`
- **SFX Assets**:
  - Hero attacks/skills: `hero-attack.mp3` (played sequentially for multi-hits like dual-slash).
  - Enemy attacks/skills: `enemy-attack.mp3` (played sequentially for multi-hits).
- **Mute Control**: Mute toggle settings are persisted in global settings (`state.settings.muteSounds`) and can be adjusted from the settings modal in the Camp Hub. It instantly applies mute/unmute status to the active background music player.

## Simulation Script
A standalone Node-based simulation script is available at [simulate.js](file:///Users/lucastelpisferrante/Documents/Vibe_Coding_Projects/meow-depths/scripts/simulate.js) to model player progression from Floor 1 to 10.
- **Purpose**: Simulate full dungeon crawling, combat encounters (including the Tyrant Rat boss fight on Floor 10), camp hub shop management, skill upgrades/pricing, attribute allocations, and daily ration claims.
- **Interactive Stance Toggling**: Auto-swaps between Fire, Water, Earth, and Wind stances during the run depending on combat needs.
- **Output**: Logs the floor-by-floor level-ups, gear/potion purchases, combat encounters, potion consumption, and prints a final metrics report showing clear/death status, levels reached, damage dealt, and skill upgrade levels.
