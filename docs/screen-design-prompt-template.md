# Screen Design Prompt Template

Use this template when asking an external HTML/CSS model to generate screen mockups for our game. Copy and customize the sections marked with `{...}`.

---

## The Prompt (copy everything below the line)

---

I'm building a Pokemon RPG game that renders on an **HTML5 Canvas at 240×160 logical pixels** (scaled up 3x to 720×480 for display). All rendering is done with direct canvas draw calls — no DOM, no CSS, no flexbox. Every element is positioned with absolute x,y coordinates.

I need you to generate a screen mockup as HTML at **exactly 240×160px** with `transform: scale(3)` for visibility, using **only absolute positioning** (`position: absolute` with `left`, `top`, `width`, `height` in pixels).

### Hard Constraints:
- Container: exactly `240px × 160px`, `overflow: hidden`
- Background: `#0d1a14`
- All fonts: `monospace` only
- Font sizes: `5px`, `6px`, `7px`, `8px`, or `10px` only
- All text and elements positioned with absolute pixel values — no flexbox, no grid, no %, no auto margins
- Hebrew text uses `direction: rtl; text-align: right`
- Numbers and English text use `direction: ltr; text-align: left`
- Everything must fit in 240×160 — no scrolling

### Color Palette:
```
Background:     #0d1a14
Card bg:        #0f2a1a
Card selected:  #1a3a2a
Border:         #1a4a30
Border selected:#2a6a40
Separator:      #1a3a2a
Text primary:   #ffffff
Text secondary: #aaccaa
Text muted:     #667766
Text dim:       #445544
Tab bg:         #0a2a1a
Tab active:     #1a5a35
Bottom bar bg:  #0a1a10
Key pill bg:    #1a3a2a
Key pill border:#2a5a3a
Selection green:#20d860
HP bar fill:    #20d860
HP bar mid:     #d8a020
HP bar low:     #d84040
XP bar fill:    #5080ff
PP bar fill:    #20a0d8
```

### Type Colors:
```
normal: #a8a878, fire: #f08030, water: #6890f0, grass: #78c850,
electric: #f8d030, ice: #98d8d8, fighting: #c03028, poison: #a040a0,
ground: #e0c068, flying: #a890f0, psychic: #f85888, bug: #a8b820,
rock: #b8a038, ghost: #705898, dragon: #7038f8, dark: #705848,
steel: #b8b8d0
```

### Damage Class Colors:
```
physical: #f08030 (symbol: ⚔)
special:  #6890f0 (symbol: ◆)
status:   #a040a0 (symbol: ☆)
```

### Common UI Patterns to follow:
- **Bottom bar** (y=150, h=10): Key pills `[ESC] חזרה [Enter] action [▲▼] ניווט`
  - Each pill: colored rect (#1a3a2a bg, #2a5a3a border), 6px text
- **Tab bar**: Centered pill container at y=2 or y=14, active tab highlighted #1a5a35
- **Card rows**: Items as cards with #0f2a1a bg, #1a4a30 border, selected gets #1a3a2a bg + #2a6a40 border + 2px green left bar
- **Title bar** (y=0, h=12): #0a1a10 bg, title 10px right-aligned

### Screen to design:

{DESCRIBE YOUR SCREEN HERE — what elements, their content, data, layout, interactions}

### Sample data to use:

{PROVIDE SAMPLE DATA — Pokemon names, stats, items, etc.}

### After generating the HTML, output a coordinate table with this format:

| Element | x | y | w | h | fontSize | color | bgColor | borderColor | text | align |
|---------|---|---|---|---|----------|-------|---------|-------------|------|-------|

And also output a **JavaScript constants block** like this:

```javascript
const SCREEN = {
  ELEMENT_NAME: { x: N, y: N, w: N, h: N },
  // ... for every element
};
```

This table is critical — I will use it to set exact pixel positions in my canvas rendering code. Please be precise to the pixel.

---

## Notes for the person using this template:

1. Replace `{DESCRIBE YOUR SCREEN HERE}` with a detailed description of the screen layout
2. Replace `{PROVIDE SAMPLE DATA}` with realistic data (Pokemon names in Hebrew, stats, items, etc.)
3. The model will generate HTML + a coordinate table
4. Save the coordinate table to `screens_examples_coords/{screen}_coordinated.md`
5. Save a screenshot to `screens_examples_coords/{screen}.png`
6. Hand the coordinate file to Claude Code for implementation
