# Meow Depths Game Summary

## Overview
Meow Depths is an RPG/dungeon-crawler game built using React Native and Expo, featuring turn-based combat, skills, equipment, progression, and a town hub.

## Key Screens
- **Onboarding Flow (First Launch)**: Shown when `hero.element` is null.
  - **Name Input Screen**: The player enters their character's name (defaults to "Mochi").
  - **Element Selection Screen**: A horizontal snap-carousel where players choose their starting element path (Fire, Water, Earth, Wind). Confirming dispatches the `SELECT_ELEMENT` action, locking in their choice and transitioning to the main game.
- **Camp Hub (Main Screen)**: The player can navigate to the Dungeon Map, Loadout (Inventory), Skills, Market (Shop), and Profile.
- **Profile Screen**: Accessible from the hub. Split into two tabs:
  - **Stats tab**: Displays base attributes (STR, AGI, VIT) where players allocate points earned from leveling up, previews and displays effective combat stats (ATK, DEF, MAX HP, etc.), and describes their current elemental stance.
  - **Gear tab**: Displays equipped gear across 8 slots (Head, Chest, Gloves, Legs, Boots, Weapon, Trinket, Storage) and displays active set bonuses.
- **Inventory/Loadout Screen**: Accessible from the hub. Contains three tabs (Supplies, Gear, Materials) styled as cozy parchment/wood tabs.
- **Market (Shop) Screen**: Accessible from the hub. Contains three tabs (Supplies shop, Gear armory, Forge fusion) styled as cozy parchment/wood tabs.
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
- **Synchronized Duration**: Both animations dynamically synchronize their durations to match the visual frame length of the active sprite sheet at 10 FPS.

## Matrix Spritesheet Reference (icons-map.png)
This is a 14-column layout matrix of various game icons:

### Row 1 (Frames 1 - 14)
- **1**: Striped tent (Red/White)
- **2**: Brown tent
- **3**: Red potion bottle
- **4**: Chicken leg (Meat on the bone)
- **5**: Bear trap / Spikes
- **6**: Iron sword
- **7**: Bowl of soup/stew
- **8**: Stone room with a bed
- **9**: Iron gate / Portcullis
- **10**: Wooden chest (Closed)
- **11**: Bow
- **12**: Sack of grain
- **13**: Treasure chest with gold
- **14**: Campfire with a cooking pot

### Row 2 (Frames 15 - 28)
- **15**: Campfire (Basic)
- **16**: Small brown tent
- **17**: Cooking pot over a fire
- **18**: Brown backpack
- **19**: Bronze key
- **20**: Jail door / Iron bars
- **21**: Green backpack
- **22**: Ornate gold key
- **23**: Cobweb in a stone window
- **24**: Tied wood logs
- **25**: Gold ring
- **26**: Quiver with arrows
- **27**: Compass
- **28**: Opened scroll / Map

### Row 3 (Frames 29 - 42)
- **29**: Fireplace (Stone)
- **30**: Small campfire
- **31**: Torch
- **32**: Opened map/scroll
- **33**: Skull
- **34**: Pickaxe
- **35**: Closed scroll
- **36**: Stone room with a stool
- **37**: Stack of books
- **38**: Gold necklace/amulet
- **39**: Battle axe
- **40**: Firewood stack
- **41**: Yellow potion bottle
- **42**: Campfire (Alternative)

### Row 4 (Frames 43 - 56)
- **43**: Mug of beer/ale
- **44**: Iron sword (Diagonal)
- **45**: Pile of gold coins
- **46**: Lock/Padlock (Gray)
- **47**: Blue potion bottle
- **48**: Stone room with a table
- **49**: Stone room with a wall torch
- **50**: Lit candle on a holder
- **51**: Green potion bottle
- **52**: Sleeping cat on a rug
- **53**: Vampire in a coffin
- **54**: Ornate red and gold chest
- **55**: Circus tent / Shop tent
- **56**: Loaf of bread

### Row 5 (Frames 57 - 70)
- **57**: Wooden shield
- **58**: Stone archway
- **59**: Stone block/cube
- **60**: Iron hammer/mallet
- **61**: Stone window looking outside
- **62**: Stone window with a map
- **63**: Red gem / Ruby
- **64**: Iron shield
- **65**: Lantern
- **66**: Pile of colorful gems
- **67**: Crossed swords icon (Combat)
- **68**: Treasure map
- **69**: Rolled up scroll
- **70**: Anvil

### Row 6 (Frames 71 - 84)
- **71**: Red chest with gold trim
- **72**: Pickaxe (Alternative)
- **73**: Blacksmith hammer
- **74**: Purple crystal cluster
- **75**: Tornado/Whirlwind
- **76**: Gold coin
- **77**: Cloud
- **78**: Purple rune stone
- **79**: Pocket watch / Clock
- **80**: Lit candle
- **81**: Mushroom (Red with white spots)
- **82**: Market stall / Shop
- **83**: Green gift box
- **84**: Crossed iron swords

### Row 7 (Frames 85 - 98)
- **85**: Fireball
- **86**: Winged boot (Speed)
- **87**: Purple wizard hat
- **88**: Simple iron key
- **89**: Water droplet
- **90**: Magic wand with stars
- **91**: Brown backpack (Alternative)
- **92**: Gold key (Alternative)
- **93**: Wooden signpost
- **94**: Red potion bottle (Round)
- **95**: Large meat on bone
- **96**: Gold star
- **97**: Magnifying glass
- **98**: Small stack of gold coins

### Row 8 (Frames 99 - 112)
- **99**: Gold key (Simple)
- **100**: Flexed arm (Strength)
- **101**: Feather / Quill
- **102**: Iron gear / Cog
- **103**: Magma / Fire rock
- **104**: Round wooden shield
- **105**: Large stack of gold coins
- **106**: Locked gold padlock
- **107**: Gold bars / Ingots
- **108**: Blue potion bottle (Round)
- **109**: Red apple
- **110**: Gray star
- **111**: Brown book (Closed)
- **112**: Small wooden chest

### Row 9 (Frames 113 - 126)
- **113**: Loaf of bread (Alternative)
- **114**: Hand with red cross (Healing)
- **115**: Green slime monster
- **116**: Crossed wrench and hammer
- **117**: Cat character running
- **118**: Lit torch
- **119**: Crown with gems
- **120**: Open book with text
- **121**: Mug of beer (Alternative)
- **122**: Green potion bottle (Round)
- **123**: Loaf of bread (Angle view)
- **124**: Red heart with a green plus (Health up)
- **125**: Cave entrance
- **126**: Big red chest with gold locks

### Row 10 (Frames 127 - 137)
- **127**: Compass (Alternative)
- **128**: Golden key with crown top
- **129**: Gold crown
- **130**: Flame / Fire
- **131**: Warning sign (Exclamation mark)
- **132**: Light blue potion bottle
- **133**: Wood logs stack
- **134**: Green arrow pointing up (Level up)
- **135**: Scroll with "EXP" text
- **136**: Grey mountain
- **137**: Blue fish
