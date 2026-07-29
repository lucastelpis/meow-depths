# Meow Expeditions Game Summary

## Overview
Meow Expeditions is an RPG/region-crawler game built using React Native and Expo, featuring turn-based combat, skills, equipment, progression, and a town hub.

## Stamina System
- **Expedition Cost**: Starting any dungeon floor run consumes 1 stamina charge.
- **Recharge Mechanic**: Base recovery is 1 charge every 8 hours (can be scaled by equipped gear via `staminaRegenMultiplier`). Recharging only occurs when stamina is below the maximum capacity (base maximum of 3 charges). Starting a new game initializes stamina to full.
- **Hub Banner Display**: Current stamina is shown at the top-right of the main hub's banner as a rectangular tag, to the right of the Level tag. It displays the stamina icon (frame index 134, 26px) alongside the current/max charges (e.g. `3/3`) using the `Jersey10-Regular` pixel font. The tag itself acts as a horizontal progress bar, partially filled with green showing the next charge recovery progress when recharging, and fully green when fully charged. Tapping the tag opens the Stamina System info modal.
- **Visual Stamina Cost Cues**: The final "START EXPEDITION" button on the Floor Selection details contains a cozy, RPG-style parchment tag showing a `1` stamina cost next to the text. No stamina cost is displayed on the map navigation cards or packing screen buttons since browsing and packing do not consume stamina.
- **Expedition Gate**: Attempting to enter a dungeon floor with 0 stamina prompts an enlarged "Out of Stamina!" modal with inline stamina rules and blocks entry. If the player owns any Stamina Potions, this warning modal displays a button to instantly consume one to proceed.
- **Stamina Potion Consumable**: A new consumable item "Stamina Potion" is available in the Shop from level 1. It uses the 6th sprite frame of `consumables-1.png` (frame 5) and restores 1 stamina charge. Its purchase cost is dynamically read from game definitions. It is usable from the Camp's Profile Inventory list, the home screen's Stamina Info popup, or directly inside the "Out of Stamina!" warning modal. Stamina Potions are filtered out of the floor packing supplies list since they cannot be used inside dungeons.

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
  - **Lore Intro Screen**: The player learns about the corruption and the Meow Order. Features a welcome title plaque with an overlapping tag overlay `★ A NEW ADVENTURE BEGINS ★`. The main lore panel container spans the full height of the available screen (`flex: 1`) above the continue button, ensuring that the background image cuts/crops dynamically to fill the available space on taller screens without leaving any empty space. The continue button is locked at the bottom inside a fixed footer view to ensure consistency and accessibility across all screen sizes. Tapping continue goes to character creation.
  - **Hero Definition Screen**: A unified character creation screen (`HeroDefinitionScreen.js`) under the plaque title `DEFINE WHO YOU ARE` and a boxed banner artwork. To adapt to the screen size, the top banner's aspect ratio scales dynamically (from a 1.15 rectangle on large screens down to a 2.6 wide banner on small screens), vertically cutting/cropping the image to ensure the rest of the onboarding content fits perfectly on all devices. The confirm and continue action buttons are locked at the bottom inside a fixed footer view to ensure consistency and accessibility across all screen sizes. The player enters their character name (defaults to "Mochi") and selects their elemental affinity (Fire, Water, Earth, Wind) from a row of selector buttons. Choosing an element updates a details card below displaying its name, tagline, and innate power over a beautiful radial color gradient. Tapping the confirm button opens a modal warning that affinity cannot be changed later, then dispatches the `SELECT_ELEMENT` action to enter the Camp hub.
- **Camp Hub (Main Screen)**: The player can navigate to the Region Map, Quests Board, Skills, Market (Shop), and Profile. Features a Settings modal accessible via the gear icon. The secondary navigation buttons (Market, Skills, Quests, Profile, Journal, Settings) are styled as 3D pixel-art buttons with double outlines (dark bronze outline `#84735B` and inner gap `#4F3C1E`), top/side earthy moss green highlights (`#4F856C`), a deep forest green bottom shadow bevel (`#0D2118`), and an earthy green face (`#1B4030`). The settings modal contains options to reset game data or reset character progression (reclaiming spent attribute points and refunding all Skill Points spent on skill tree unlocks and upgrades).
  - **Banner Tags Stack**: Displays active character status tags (Gold, Level, and Stamina). Warning notifications are shown as retro red exclamation badges `(!)` on the corresponding navigation buttons in the bottom grid:
    - **Stats warning badge**: Appears on the **Profile** button when there are available attribute points to allocate.
    - **Skill Points warning badge**: Appears on the **Skills** button when there are available skill points to distribute.
    - **Notes warning badge**: Appears on the **Journal** button when there are unread collectible field notes.
- **Quest Screen & Daily Tasks Accordion**:
  - **Daily Tasks Accordion (Camp Modal)**: A list inside the Camp Hub where daily tasks default to a collapsed header. Completed-unclaimed tasks are claimed via a full-width "CLAIM REWARD" button rendered below the header (title) when collapsed, or from the bottom of the card when expanded/uncollapsed. The icon to the left of completed quests uses the fireplace icon (frame index 28 from `icons-map.png`). The main Daily Tasks entry button on the hub is styled as a 3D pixel-art button matching the Earthy Moss Green design with 3D outlines/bevels, a pulsing glow animation when active, and an all-caps subtitle showing the task completion count (e.g. "0/3 COMPLETE"). The progress bar has a height of 24 and font size of 14 for optimal legibility.
  - **Quest Screen**: A full screen with tabs for Daily Tasks (with countdown timers) and Campaign progression milestones. Quests are presented in an accordion style, naturally showing only the name and progress. Clicking a quest card expands it to reveal description, rewards, and the claim/status button. Only one quest can be expanded at any time; clicking a quest collapses any other active one. Top tab buttons, campaign sub-tab buttons, and active 'CLAIM REWARD' buttons are styled as 3D pixel-art buttons with double outlines (inactive in Earthy Moss Green, active/completed in warm Parchment or Earthy Moss Green).
  - **Quest Progress Bar**: Designed with a dark brown background (#3A2210), a green fill (#1c823eff), a height of 24, a gold border of 1.5, and a font size of 14 for highly legible progression tracking on mobile.
  - **Square Reward Chips**: Reward items are displayed on larger 84x84 squares beneath the "Rewards:" label (instead of horizontal tags next to it). They feature a custom 36 displaySize icon, quantity text at 14 (with small "x" prefix at 11), and a 20x20 absolute-positioned "?" tooltip button in the top-right corner to view names and descriptions in a cozy charcoal info modal.
  - **Reward Celebration Modal**: Triggered when claiming any quest reward. Opens a cozy parchment celebration popup with large retro item sprites (displaySize 32) and quantities. Pressing 'AWESOME!' dispatches the state action to claim rewards and closes the modal.
- **Profile Screen**: Accessible from the hub. Features a scaled-up avatar, a modern font style (`Jersey10-Regular`), and split tab buttons (Stats, Gear, Bag) styled as 3D pixel-art buttons with double outlines (inactive in Earthy Moss Green, active in warm Parchment). The screen is split into three tabs:
  - **Stats tab**: Displays base attributes (STR, AGI, VIT) where players allocate points earned from leveling up, previews and displays effective combat stats (ATK, DEF, MAX HP, etc.), describes their current elemental affinity, and includes interactive `?` info tags next to attributes and stats which open a custom explanation popup modal.
  - **Gear tab**: Split into two subtabs (Equipped and Owned). Equipped displays equipped gear across 8 slots styled as 3D pixel-art buttons with double outlines (empty slots in Earthy Moss Green, equipped slots in warm Parchment) and active set bonuses. Owned displays a grid of crafted gear in inventory with side-by-side comparison overlays.
  - **Bag tab**: Displays Supplies (consumables).
- **Market (Shop) Screen**: Accessible from the hub. Contains two tabs (Consumables shop, Gear armory) styled as cozy parchment/wood tabs.
- **Region Map Screen**: Allows entering zones to fight enemies.
- **Expeditions Screen**: Displays available regions (Soggy Ruins, Twisted Gardens, Sunken Docks) with custom level ranges, run completion statistics, and zone completion status. Each region card features a full-bleed premium background banner image scaled to a perfect 2:1 aspect ratio matching the dimensions of the assets.
- **Skill Tree Screen**: Unlocks and upgrades active and passive skills using Skill Points (SP) gained on level-up. Skill cards are styled as 3D pixel-art buttons with double outlines, 3D bottom under-shadows, and colored inner highlights mapping to their current state (locked, available/unlockable, maxed, unlocked/equipped in earthy moss green instead of element colors). Equipped loadout slots in the footer dock are also styled as 3D moss green bevel buttons.
  - **Skill Upgrade Detail Modal**: Refactored to a modern, cozy charcoal theme with translucent panels.
    - **Centered Stats Grid**: Uses a row-based layout and locked percentage column widths (`44.44%` / `27.78%` / `27.78%`) corresponding to absolute vertical gridlines. Column 2 and 3 values are wrapped in container Views and horizontally centered (`alignItems: 'center'`) to avoid alignment drift. The first vertical line starts below the header (at `top: 41.5`) so the left header is kept open.
    - **Scroll Container**: Content is wrapped in a `<ScrollView>` capped at `82%` of screen height. Uses a sibling backdrop `<Pressable>` layout to bypass React Native scroll gesture interception.
    - **Stacked Action Rows**: Unified to vertical stacked rows with a clean `10px` gap. Row 1 renders Unlock/Level Up; Row 2 renders either the passive badge, the unequip button (`UNEQUIP (SLOT X)`), or side-by-side slot assignments.
    - **Assignment Buttons**: Custom two-line labels (`ASSIGN TO` and `SLOT X`). Hides empty subtitle notifications; only renders occupant warnings (e.g. `(Tidal Strike)`) if a slot is already occupied.
- **Journal Screen**: Split into two tabs, featuring enlarged typography and retro pixel-art styling aligning with other screens:
  - **Creatures tab**: Displays discovered creature cards (enlarged creature name at size 24, boss tags at 11, region/drops at 16, and lore blurb at 20) with accent borders matching the region's theme. Creature star levels are not shown because star levels dynamically scale in combat.
  - **Notes tab**: Lists collectible field notes unlocked on first-time floor clears by region (note title at 22, context at 16), readable via an expanded parchment reader modal (fixed header at top displaying note title at 26 and context, separator divider line, and a body text scrollview at 20 with 10px right gutter padding to prevent scrollbar overlapping the text) that utilizes an explicit height ('70%'), flex layout parameters to prevent collapsing, and a sibling Pressable backdrop to avoid gesture/press conflicts on touch devices. Unread notes display a red retro '!' badge in the top-right corner. When new unread notes are collected, a clickable notification badge tag (exclamation mark) appears on the main Camp Hub banner that links directly to this tab. Opening/reading the note clears its unread state.
- **Combat Screen (Battle)**: Features active action buttons redesigned as interactive 3D bevel buttons: Attack (3D Earthy Moss Green), Equipped Active Skills (unified 3D Purple design), Passives (3D Sage/Teal), Flee (3D soft Terracotta red), and Items (3D Warm Gold). Empty or exhausted/used slots retain their flat, disabled design for clear visual status. Victory and Defeat end-of-battle modals feature 3D bevel buttons (Earthy Moss Green for Victory, Crimson Red for Defeat) to complete the fight. The big action buttons in Row 1 (Attack, Active Skills, Passives) render their icons as large absolute background watermark icons (size 44-48, 22% opacity, reduced to 12% for disabled/empty states) behind the text titles (size 12, allowing compound names to wrap to 2 lines instead of auto-scaling down) and sub-labels (size 11) which are overlaid on top (using zIndex 2 with a 1px solid black text outline/shadow to maximize legibility). To save vertical space, the header (infoBar showing encounter type, zone details, and current turn) is positioned as a distinct floating panel inside the battlefield banner at the top, styled with a semi-transparent dark overlay (`rgba(0,0,0,0.65)`), margins separating it from the banner's outer edges, a gold-tinted border outline, and card-style rounded corners. Character name text (Mochi and enemies) is enlarged to size 14. The Hero's level number (e.g. `1`) and enemy star ratings (`5★`) are displayed directly next to their names using the `PressStart2P-Regular` pixel font (size 8). Both Hero and Enemy HP bars share the exact same thickness (`barHeight=13`, `fontSize=13`). All combat highlights (sprite glow, HP bar border, target arrow bounce) are driven by a single native-driver `pulseAnim` (`useNativeDriver: true`) so they stay perfectly synced and never freeze during JS-heavy combat turns. HP bar borders use a fixed-color overlay `Animated.View` with animated opacity instead of animated `borderColor`, avoiding the need for JS-thread color interpolations. Active turn units (Hero on player turn, or acting Enemy on enemy turn) display a smoothly pulsing yellow sprite glow and HP bar outline. Enemy turns feature a dramatic 1-second buffer delay (`1000ms`) after highlighting before launching their attack. During the Hero's turn, the selected target enemy displays a pulsing red sprite glow, red HP bar outline, and two red target arrows pointing inwards on its left and right sides.

## Navigation Headers & UI Aesthetics
- **Unified Navigation Headers**: All secondary screens (WorldMap, Quest, Journal, Shop, Skill Tree, Profile, and Dungeon Floor selection) share a consistent, compact navigation bar:
  - **Header Heights**: Reduced vertical padding to `6px` to maximize map and gameplay container heights.
  - **3D Crimson Back Button**: Replaces text back buttons with a custom `44x44` 3D nested double-border button rendering the back arrow sprite (`frameIndex={43}` from `icons-map.png`). Uses a crimson fill (`#A61C1C`), light red inner border highlight (`#D8483F`), dark bronze outer outline (`#84735B`), and a dark bronze bottom shadow base (`#4F3C1E`).
  - **Gold-Rimmed Title Plaque**: Centers the screen title inside a custom plaque matching the Camp Hub's visual style (outer `#4A3917`, inner `#D4A754`, and charcoal background `#1E1E20`).
- **Scroll Discovery**: Consumables supplies list utilizes a shrunken row size (36px icon container, reduced paddings, and smaller fonts) and visual truncation (`maxHeight: 134`) to render two items fully without clipping, while cutting off the third row by ~50% to visually indicate scroll availability. Shows vertical scroll indicators on interaction.
- **Skill Tree SP Spacing**: Top Skill Points bar has `marginTop: 12` to space it cleanly below the compact header bottom divider.


## Tabs Icons Reference (icons-1 spritesheet)
- **Consumables**: Frame index 26 (Frame 27)
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
- **Unified Hero Spritesheet**: The hero (Mochi) uses a single 6-row grid spritesheet (`hero_sheet.png`, 128x128 px per frame), where each row contains exactly 4 frames. The rows represent: Row 0: Idle, Row 1: Physical Attack, Row 2: Fire skill attack, Row 3: Water skill attack, Row 4: Earth skill attack, and Row 5: Wind skill attack. This optimizes preloading and resolves animation transition issues.
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
- **BGM Assets & Routing**:
  - Main Hub and menus BGM: `hub&menus.mp3`. Playback is dynamically routed: outside/hub screens (such as Camp, World Map, Shop, Profile, Quests) play the hub theme.
  - Soggy Ruins (Zone 1) BGM: `soggy-ruins.mp3` (plays when actively inside Zone 1 dungeon/combat).
  - Twisted Garden (Zone 2) BGM: `forest.mp3` (plays when actively inside Zone 2 dungeon/combat).
  - Sunken Docks (Zone 3) BGM: `sunken-docks.mp3` (plays when actively inside Zone 3 dungeon/combat).
- **SFX Assets**:
  - Hero attacks/skills: `hero-attack.mp3` (played sequentially for multi-hits like dual-slash).
  - Enemy attacks/skills: `enemy-attack.mp3` (played sequentially for multi-hits).
- **Mute Control**: Mute toggle settings are persisted in global settings (`state.settings.muteSounds`) and can be adjusted from the settings modal in the Camp Hub. It instantly applies mute/unmute status to the active background music player.
- **Auto-Resume & Navigation Guards**: If the app is closed and restarted during a run, the game loads the Camp screen and opens a confirmation modal prompting the player to either resume the run or flee to Camp. To prevent orphaned runs during gameplay, Android hardware back presses on `DungeonMap` and `Combat` are intercepted to present the Flee Confirmation modal instead of popping back to outside screens.

## Simulation Script
A standalone Node-based simulation script is available at [simulate.js](scripts/simulate.js) to model player progression from Floor 1 to 10.
- **Purpose**: Simulate full dungeon crawling, combat encounters (including the Tyrant Rat boss fight on Floor 10), camp hub shop management, skill upgrades/pricing, attribute allocations, and daily ration claims.
- **Interactive Affinity Toggling**: Auto-swaps between Fire, Water, Earth, and Wind affinities during the run depending on combat needs.
- **Output**: Logs the floor-by-floor level-ups, gear/potion purchases, combat encounters, potion consumption, and prints a final metrics report showing clear/death status, levels reached, damage dealt, and skill upgrade levels.
