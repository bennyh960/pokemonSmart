# Bug Tracker

Open bugs must be resolved before starting a new sprint. See PM agent for triage process.

## Open Bugs

| # | Description | Severity | Area | Reported | Assigned To | Status |
|---|-------------|----------|------|----------|-------------|--------|
| 1 | Hebrew font barely readable — Pokemon-style pixel font doesn't render well for Hebrew characters | high | i18n | 2026-03-20 | frontend-developer | open |
| 2 | RTL text alignment inconsistent — Hebrew text not properly right-aligned across UI | medium | i18n | 2026-03-20 | frontend-developer | open |
| 3 | Battle move grid spacing too tight for 8 moves — text overflows/overlaps | high | battle | 2026-03-20 | frontend-developer | open |
| 4 | Pokemon sprites render with white background instead of transparent | high | battle | 2026-03-20 | frontend-developer | open |
| 5 | Tile sprites render with white background instead of transparent | medium | overworld | 2026-03-20 | asset-manager | open |
| 6 | Trainer battle: level-up message not displayed between sequential Pokemon — level-up applies mechanically but notification text is skipped | low | battle | 2026-03-20 | game-engine-developer | fixed |
| 7 | Trainer battle: XP gained text loops infinitely after defeating trainer. Root cause: `TRAINER_NEXT_POKEMON` and `TRAINER_REWARD` phases in battle.ts — textbox is set to null and the `if (!textBox)` block fires in the same frame, recreating the text endlessly. Fix: add a flag or sub-phase so the XP text is shown once, then advance to next phase only after it's dismissed | critical | battle | 2026-03-20 | game-engine-developer | fixed |
| 8 | Feature: Trainer encounter should show a "VS" intro scene (trainer sprite + name) before battle starts — currently goes straight to Pokemon battle screen after approach animation | low | battle | 2026-03-20 | frontend-developer | open |
| 9 | Pokemon Center interior always exits back to Zeroville regardless of which city the player entered from — needs source-map tracking to return to correct city | medium | overworld | 2026-03-20 | game-engine-developer | open |

## Closed Bugs

| # | Description | Severity | Area | Resolved | Fixed In |
|---|-------------|----------|------|----------|----------|
| | | | | | |

---

**Severity levels:** critical / high / medium / low

**Areas:** overworld, battle, ui, audio, math-engine, i18n, data, other

**Status:** open / in-progress / fixed / deferred
