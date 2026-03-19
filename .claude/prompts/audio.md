Read CLAUDE.md for project context, then docs/sprint-2.md section 5, and your agent spec at .claude/agents/frontend-developer.md.

```bash
git checkout main
git pull 2>/dev/null
git checkout -b feature/audio
```

Implement ALL tasks 5.1-5.5: Audio system with Howler.js.

Key tasks:
1. Full audio-manager.ts: playMusic, stopMusic, playSfx, setVolume, crossfade
2. Download 3-5 essential tracks from Khinsider Gold/Silver OST (title, town, route, battle, victory)
3. Download basic SFX from Pokemon Showdown /audio/ (menu beep, hit, text blip)
4. Wire audio into scenes: title music, overworld music, battle music crossfade, victory fanfare
5. Mute toggle with M key, default volumes: music 50%, sfx 70%

Save music to public/audio/music/, SFX to public/audio/sfx/.
Howler.js is already installed.

IMPORTANT: Music files can be large. Download MP3 format (smaller than WAV/FLAC).
Add public/audio/ to .gitignore if files are too large for git.

When done: self-verify (tsc, dev), rebase on main, update sprint file, request QA per your agent instructions.
