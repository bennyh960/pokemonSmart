Read CLAUDE.md for project context, then docs/sprint-2.md section 2, and your agent spec at .claude/agents/pixel-artist.md.

```bash
git checkout main
git pull 2>/dev/null
git checkout -b feature/real-assets
```

Implement ALL tasks 2.1-2.5: Replace ALL placeholder rectangles with real sprites.

Key tasks:
1. Battle scene: load real Pokemon sprites from public/sprites/pokemon/ (already downloaded!)
2. Player overworld: download Gold/Silver player sprite from Spriters Resource, add walk animation
3. Tilesets: download outdoor tileset from Spriters Resource, update tilemap renderer
4. UI frames: download GBC-style text box and menu frames
5. Battle background: download grass battle BG

The Pokemon sprites are ALREADY in public/sprites/pokemon/front/ and back/. You just need to load them in the battle scene using sprite-loader.ts.

For Spriters Resource assets, download the sprite sheets and save to public/sprites/.

When done: self-verify (tsc, dev), rebase on main, update sprint file, request QA per your agent instructions.
