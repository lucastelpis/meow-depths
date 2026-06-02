# Meow Depths — Design System
### Reference document. Feed this to Claude Code so all UI matches one visual language.

---

## 1. Design principles

1. **Cozy meets grim.** Warm tones = safety (camp, shop, victory). Cold tones = danger (dungeons, combat, death). The player should feel the shift without being told.
2. **One clear action per screen.** The primary action is always the brightest, most saturated element. Everything else recedes.
3. **Readable on a moving bus.** Large touch targets, high contrast, no tiny text. One-handed play in spare moments.
4. **Flat and characterful.** Flat fills, chunky borders, no gradients. Personality comes from color and shape, not effects.
5. **The cat is the heart.** Mochi is always the most expressive, most detailed element.

---

## 2. Color palette

### Warm palette (safe — camp, shop, menus, victory)
| Name | Hex | Use |
|------|-----|-----|
| Hearth Black | `#1A1200` | Camp background |
| Ember Brown | `#3A2C14` | Cards, panels |
| Torch Orange | `#B5701A` | Primary buttons |
| Candle Gold | `#E8A73A` | Highlights, XP fill |
| Warm Glow | `#F5CF7A` | Gold, accents |
| Parchment | `#F3E2BD` | Warm text |

### Cold palette (danger — dungeons, combat)
| Name | Hex | Use |
|------|-----|-----|
| Void Navy | `#0D1016` | Combat background |
| Sewer Black | `#0A120C` | Dungeon background |
| Slate Steel | `#24323F` | Combat panels |
| Cold Blue | `#5A9FE0` | Combat rooms |
| Mystery Violet | `#A98EE0` | ??? rooms |
| Ghost White | `#CFE0EE` | Cold text |

### Functional colors (consistent meaning everywhere)
| Name | Hex | Use |
|------|-----|-----|
| Health Green | `#3FB56E` | Hero HP, healing, rest rooms |
| Damage Red | `#D8483F` | Enemy HP, danger |
| Crit Orange | `#F08A4A` | Crits, bleed |
| Treasure Gold | `#F5CF4A` | Loot, target selection |
| Skill Purple | `#A98EE0` | Skills, magic |
| Buff Mint | `#5CC489` | Buffs, success states |

### Zone background tints
- Soggy Sewers: green-black `#0A120C`
- Twisted Garden: deep green `#0C1A08`
- Sunken Docks: deep navy `#08101F`

---

## 3. Typography

- **Display / titles:** a pixel font ("Press Start 2P" or similar), 18-28px. Screen titles, boss names, logo.
- **Heading:** UI sans-serif medium (500 weight), 16px. Section headers, button labels, HP numbers.
- **Body:** UI sans-serif regular (400 weight), 13px, line-height 1.5. Combat log, descriptions, flavor text.
- **Label:** UI sans-serif caps, 11px, letter-spacing 0.06em, tertiary color. Stat labels, categories, metadata.

Rules: sentence case for body and headings; ALL CAPS only for small labels. Two weights only — 400 and 500. Never 600/700.

---

## 4. Layout tokens

| Token | Value | Use |
|-------|-------|-----|
| radius / card | 14px | Panels, room tiles |
| radius / button | 12px | All buttons |
| radius / pill | 20px | Badges, gold counter |
| border / default | 1px solid | Panel edges |
| border / focus | 2px glow | Active tile, selected target |
| gap / tight | 6-8px | Between buttons |
| gap / section | 14-16px | Between content blocks |
| padding / screen | 14px | Screen edges |

---

## 5. Components

### Health & resource bars
- Chunky, flat, with a darker recessed track behind (same hue darkened ~70%).
- Fill has a subtle lighter highlight strip across the top third.
- Hero HP: green `#3FB56E`, track `#0D2618`, 18px tall, rounded (radius 6), number aligned right.
- Enemy HP: red `#D8483F`, track `#241016`, 12px tall, smaller label.
- XP: gold `#E8A73A`, track `#2A2010`, 8px tall, slim.

### Buttons
- **Primary:** bg `#B5701A`, border `#E8A73A`, text `#FFF3DA`. Used once per screen for the main action.
- **Secondary:** bg `#241A0C`, border `#4A3917`, text `#F0E0BD`.
- **Danger:** bg `#3A1A1A`, border `#7A2D2D`, text `#F0A5A5`. Destructive/risky actions.
- **Disabled:** bg `#1A1A1A`, border `#2A2A2A`, text `#5A5A5A`.
- All buttons: radius 12px, padding ~11px 16px, icon + label, icon 16px.

### Combat action buttons
- **Attack:** bg `#10241A`, border `#1D4A32`, content `#5CC489` (green).
- **Skill (ready):** bg `#1A1230`, border `#382860`, content `#A98EE0` (purple).
- **Skill (cooldown):** bg `#1A1408`, border `#3A2C14`, content `#9C7D44`, 50% opacity, shows turns-remaining badge.
- Each shows: icon, name, and a sub-line (damage range / "Ready" / cooldown).

### Dungeon room tiles
Each room type has a fixed color + icon:
| Room | Bg | Border | Accent | Icon |
|------|-----|--------|--------|------|
| Fog (hidden) | `#15191F` | `#252A32` | `#454A52` | question-mark |
| Combat | `#10243A` | `#1D3A5E` | `#5A9FE0` | sword |
| Rest | `#10301F` | `#1D4A32` | `#3FB56E` | bed |
| Treasure | `#2A2410` | `#57431A` | `#F5CF4A` | diamond |
| ??? (gamble) | `#241A2E` | `#3D2A5E` | `#A98EE0` | question-mark (never reveals) |
| Boss | `#3A1A22` | `#6A2535` | `#DD7A86` | skull |

- Current tile: 2px gold `#F5CF4A` glow border.
- Cleared tile: 40% opacity + green checkmark overlay. Not tappable.
- Tile size: ~60px square, radius 12px.

### Badges & status pills
- Radius 20px (pill), 10px text, 500 weight, icon + label.
- Gold: bg `#3A2C14`, text `#F5CF7A`.
- Rare: bg `#10243A`, text `#5A9FE0`.
- Cleared: bg `#10301F`, text `#5CC489`.
- Locked: bg `#1A1A1A`, text `#6A6A6A`.
- New: bg `#3A1A22`, text `#DD7A86`.

---

## 6. Icon language

Use one consistent icon per concept across the whole game (Tabler-style outline icons, or pixel equivalents):
- Attack / Combat → sword
- Skill → bolt
- Potion / Item → flask
- Health → heart
- Defence → shield
- Crit / Bleed → flame
- Gold → coin
- Treasure / Rare → diamond
- Forge → hammer
- Skills / New → sparkles
- Inventory → backpack
- World Map → map
- Rest → bed
- Boss / Death → skull
- ??? / Fog → question-mark
- Enter → door

---

## 7. Sprite & illustration art direction

Feed these rules to any AI image generator alongside each prompt:

- **Chibi anime proportions** — big heads, small bodies, large expressive eyes. Cute even when grim.
- **Thick clean outlines** — bold dark outline on every character/item, reads at small sizes.
- **Flat cel shading** — two tones per surface max (base + one shadow). No gradients.
- **Limited palette per sprite** — 4-6 colors, pulled from the game palette.
- **Silhouette-first** — each enemy recognizable by silhouette alone. Distinct shapes.
- **Warm hero, cold foes** — Mochi warm neutral tones; dungeon enemies cold and desaturated.

**Do:** keep Mochi consistent across poses (generate one master, reuse as reference); match palette; bold outlines; cute with stakes.

**Don't:** mix art styles; use gradients or 3D rendering; let enemies blur together; make the tone so soft it loses menace; use off-palette colors.

### Master AI art prompt template
```
[SUBJECT], chibi anime style, big expressive eyes, thick clean dark
outlines, flat cel shading with two tones, limited warm palette, cute
but adventurous, mobile RPG sprite, centered, transparent background,
Monster Hunter Palico inspired, charming and cozy with a hint of grim
fantasy
```
Keep every word after [SUBJECT] identical across all sprite prompts. Only change the bracketed subject. This is what keeps every sprite looking like one game.

---

## 8. Technical art stack (React Native)

- **Backgrounds:** high-res PNG, provided at @2x and @3x for crisp rendering on all phones.
- **Characters & items:** PNG sprite sheets, cropped per frame for animation.
- **UI elements (buttons, bars, panels, icons):** SVG via react-native-svg — scales perfectly at any size.
- Layer order: SVG/PNG background (z0) → PNG sprites (z1) → UI layer (z2).
- For pixel art sprites: set image rendering to pixelated to keep frames crisp.
