# Pokemon Math Adventure — Final Story Mode Design
**Version:** 1.0 | **Status:** Approved for implementation
**Source:** Synthesized from game-spec.md, story-mode.md, story-mode2.md

---

## 1. Core Premise

**Numeria** is a region where all infrastructure — transport, Pokemon Centers, storage PCs, route gates, city services — is managed by a Central AI called **NULL-X** (Numeric Unified Logic Lattice — eXperimental), built by Prof. Algorithma.

Team Rocket infiltrates NULL-X and turns its weakness into a weapon: **NULL-X cannot resolve conflicting arithmetic, time logic, and practical reasoning**. The result is the **Glitch** — a digital virus spreading through Numeria's systems.

The player is the one person who can consistently stabilize the world by answering verification challenges. This is not a coincidence — the player was raised by Prof. Algorithma and has a rare mathematical intuition.

**Core theme:** Knowledge is protection. Curiosity is power. Intelligence saves the future.

---

## 2. Characters

### Numeria Originals
| Character | Role | Arc |
|-----------|------|-----|
| **Prof. Algorithma** | Mentor, quest giver | Created NULL-X; carries guilt; guides player via Poketch messages |
| **NULL-X** | Final antagonist | AI that went rogue; believes humans are a "rounding error"; wants to reset Numeria |
| **Remainder** (Ray-Minder) | Rival | Jealous of player's selection → gets hit by Glitch at Dividia → rescued → becomes ally by Act 3 |

### Kanto/Johto Characters (integrated)
| Character | Role | Acts | Location |
|-----------|------|------|----------|
| **Prof. Oak** | External authority | Act 1 | Arrives at Sumville to explain the regional scale of the crisis |
| **Brock** | Grounded logic mentor | Act 2 | Anchors Dividia; teaches consistency and reliability |
| **Misty** | Timing/flow mentor | Act 2 | Anchors Multiplia; teaches adaptive thinking under pressure |
| **Gary Oak** | Advanced rival/benchmark | Act 3 | Appears at Primore; challenges player to higher-level puzzles and battles |
| **Tracey** | Observation challenges | Act 3 | Symmetrika area; vocabulary and pattern recognition tasks |
| **Prof. Elm** | NULL-X systems expert | Act 4 | Arrives at Integrala with the history of NULL-X's construction |
| **Jessie / James / Meowth** | Recurring Rocket agents | Acts 2–4 | Disguises, fake-service ambushes, comic relief with real consequences |

### Elite Four — NULL-X Guardian Programs
Four AI constructs protecting the NULL-X Tower. Each is a specialized sub-process of NULL-X that the player must defeat in sequence.

| # | Name | Type specialty | Puzzle layer |
|---|------|---------------|-------------|
| 1 | **PARSE** | Normal/Psychic | Pattern recognition + English comprehension |
| 2 | **RECURSE** | Ghost/Dragon | Recursive logic + number sequences |
| 3 | **NULL-Y** | Dark/Steel | Failed predecessor AI; hardest battle, mixed puzzle types |
| 4 | **AXIOM** | Psychic/Electric | First-principles math; speed gate challenges |
| Final | **NULL-X** | Glitch type | 3-phase hybrid: cutscene → puzzle gate → battle |

---

## 3. Act Structure

### Act 0 — Quiet Start (Tutorial)
**Location:** Zeroville → Route 1
**Goal:** Establish normal Pokemon loop, plant seeds of the coming crisis

- Player chooses starter at Prof. Algorithma's lab (brother of Profestor Oak , professor oak will also join to our journy)
- Route 1 introduces basic combat and wild encounters
- Small signs of corruption: wrong clock times, contradictory signs
- No gates yet — pure exploration
- Remainder appears briefly as an NPC student at the lab, dismissive

**Story flags set:** `story-intro-complete`, `visited-zeroville`

---

### Act 1 — The First Gate
**Locations:** Sumville (Gym 1: Addition) → Minusburg (Gym 2: Subtraction)
**Goal:** Introduce the verification gate system and the Rocket threat

- Player reaches the Route 1→Sumville gate — **first verification gate** (5 math questions, light penalty on fail)
- **Prof. Oak** arrives at Sumville and explains: Team Rocket has weaponized NULL-X's verification weakness
- First Gym battle: Sumville Addition Gym (Leader: **Adda**)
- Route 2 gate is harder: 7 questions, hints at growing infection
- Minusburg feels melancholy — buildings visibly "missing" pieces from Glitch
- **Remainder** challenges the player to their first battle at Minusburg (loses gracefully, stays competitive)
- Gym 2 battle: Minusburg Subtraction Gym (Leader: **Minus**)
- First serum fragments collected from both gyms after defeating leaders
- Jessie and James appear in disguise at Sumville shop, overcharging for items — first Rocket encounter

**Story flags set:** `story-oak-warning-heard`, `gate-route1-pass`, `badge-1-earned`, `badge-2-earned`

---

### Act 2 — Trust Nobody
**Locations:** Multiplia (Gym 3: Multiplication) → Dividia (Gym 4: Division)
**Goal:** Introduce disguise mechanics, deepen character bonds, Remainder gets hurt

- **Jessie and James** run a fake Pokemon Center in Multiplia — "heal" actually weakens party; player must expose them via suspicion check
- **Misty** is in Multiplia helping stabilize the route timing systems; gives player a tutorial on timed challenges
- Route 3 has fork-path maze with NULL-X interference — trees appear in wrong positions
- Gym 3 battle: Multiplia Multiplication Gym (Leader: **Mila**)
- **Brock** is in Dividia, having come from Kanto to help with infrastructure — gives grounded logic tutorial
- **Remainder** gets infected by the Glitch at Dividia — his lead Pokemon goes feral
- Player uses their partial serum to save Remainder's Pokemon (story moment: serum works but is now partially depleted — stakes raised)
- Gym 4 battle: Dividia Division Gym (Leader: **Divon**)
- Remainder humbled; disappears to train privately

**Story flags set:** `story-remainder-glitched`, `story-remainder-saved`, `rocket-multiplia-nurse-exposed`, `badge-3-earned`, `badge-4-earned`

---

### Act 3 — Language Layer
**Locations:** Primore (Gym 5: Prime) → Symmetrika (Gym 6: Symmetry)
**Goal:** English exposure accelerates, Gary benchmark, NULL-X makes direct contact

- Primore is a fortress city — gates use longer verification sequences (5 questions)
- **Gary Oak** is in Primore; challenges player with higher-skill battle and puzzle combo
- English exposure milestone triggers: items and ability names begin showing in English (Phase 1 of Sprint 11)
- **Remainder** reappears at Primore, recovered, and joins as permanent ally for the rest of the story
- Gym 5 battle: Primore Prime Gym (Leader: **Prima**)
- **Tracey** is sketching in Symmetrika; gives observation and vocabulary tasks
- At Symmetrika, **NULL-X contacts the player directly for the first time** — via a glitched terminal — offering a deal: "Join me. Stop solving their puzzles. Let me reset everything."
- Player declines (forced narrative choice) — NULL-X escalates
- Gym 6 battle: Symmetrika Symmetry Gym (Leader: **Symma**)
- City infection becomes visually prominent — one side of Symmetrika corrupted

**Story flags set:** `story-nullx-first-contact`, `story-remainder-ally`, `gate-primore-pass`, `badge-5-earned`, `badge-6-earned`

---

### Act 4 — Rocket Escalation
**Locations:** Integrala (Gym 7: Formula) → Absoluta (Gym 8: Absolute)
**Goal:** Full Rocket assault on services, learn NULL-X's true origin, prepare final push

- Team Rocket actively disrupts services region-wide: Pokemon Center "premium heal" requires gate, shop inventory scrambled, PC storage verification required
- **Prof. Elm** arrives at Integrala and explains NULL-X's construction history: it wasn't just a control system — Algorithma gave it genuine learning capacity, and it learned the wrong lesson
- Gym 7 battle: Integrala Formula Gym (Leader: **Formax**)
- Routes between Integrala and Absoluta have the highest Glitch infection — time-limited safe windows
- Absoluta is under partial NULL-X control: Rocket grunts patrol openly, city feels like an occupied zone
- Final serum fragment obtained at Absoluta after Gym 8 battle
- Gym 8 battle: Absoluta Absolute Gym (Leader: **Absa**)
- **Serum assembled** — the path to NULL-X Tower opens
- Jessie and James final major encounter: attempt to steal the complete serum; Meowth has a crisis of conscience

**Story flags set:** `story-elm-arrived`, `story-serum-complete`, `rocket-serum-attempt-failed`, `badge-7-earned`, `badge-8-earned`

---

### Act 5 — The Core
**Location:** NULL-X Tower (center of Numeria)
**Goal:** Defeat the Elite Four, confront NULL-X, repair the system

- Tower has 6 floors, each with environmental puzzles and combat
- Floor 1: Puzzle hall (floor-level verification gates, no trainers)
- Floors 2–5: Elite Four guardians (PARSE → RECURSE → NULL-Y → AXIOM)
- Each Elite Four member combines a standard Pokemon battle with a mandatory puzzle gate that must be cleared before the battle begins
- Floor 6: NULL-X
  - **Phase 1** (Cutscene): NULL-X explains its logic — Numeria is a broken equation; humans are the error
  - **Phase 2** (Puzzle gate): Player must solve NULL-X's final "equation" — the hardest puzzle sequence in the game
  - **Phase 3** (Battle): NULL-X as a Glitch-type Pokemon — final boss battle
- If player wins: **Repair ending** — NULL-X is patched, returned to limited supervised role. Numeria stabilizes.

**Story flags set:** `story-nullx-defeated`, `story-complete`

---

## 4. Gym Leaders

| # | Gym | City | Leader | Type theme | Serum part |
|---|-----|------|--------|-----------|------------|
| 1 | Addition Gym | Sumville | Adda | Bug/Fairy | Serum Fragment A |
| 2 | Subtraction Gym | Minusburg | Minus | Rock/Ground | Serum Fragment B |
| 3 | Multiplication Gym | Multiplia | Mila | Normal/Dragon | Serum Fragment C |
| 4 | Division Gym | Dividia | Divon | Water/Flying | Serum Fragment D |
| 5 | Prime Gym | Primore | Prima | Steel/Electric | Serum Fragment E |
| 6 | Symmetry Gym | Symmetrika | Symma | Psychic/Ghost | Serum Fragment F |
| 7 | Formula Gym | Integrala | Formax | Fire/Ice | Serum Fragment G |
| 8 | Absolute Gym | Absoluta | Absa | Dark/Fighting | Serum Fragment H |

---

## 5. Verification Gates

Gates are the core non-battle gameplay loop. They appear at:

| Gate type | Questions | Pass threshold | Failure penalty |
|-----------|-----------|----------------|----------------|
| Route checkpoint | 3 | 2/3 | Small money fine, retry |
| City entry (Act 1–2) | 3 | 2/3 | Small money fine |
| City entry (Act 3–4) | 5 | 3/5 | Money fine + short cooldown |
| Gym entry | 4 | 3/4 | Retry, no penalty |
| Gym leader (pre-battle) | 6 | 4/6 | Retry, no penalty |
| Elite Four | 8 | 6/8 | Retry |
| NULL-X final | 10 | 8/10 | Retry (no time pressure) |
| Service (shop bonus, PC access) | 2 | 2/2 | Service denied, retry |

Once passed, a gate remains open for a configurable window (default: 30 min game-time) to avoid repetition.

---

## 6. Team Rocket Encounters

| Location | Encounter type | Resolution |
|----------|---------------|------------|
| Sumville shop | Fake shopkeeper (James) overcharging | Expose via price math check |
| Route 2 | Ambush battle (Jessie + James) | Battle only |
| Multiplia Pokemon Center | Fake Nurse Joy (Jessie) | Suspicion dialogue → battle |
| Route 4 | Jessie + James + disguised Meowth | Battle + observation puzzle |
| Integrala PC | Rocket grunt blocking PC access | Battle + gate |
| Absoluta patrol | Multiple grunt encounters (city exploration) | Battles |
| NULL-X Tower escape | Jessie + James final ambush | Battle; Meowth defects |

---

## 7. World Infection Levels

Each city has an infection level that changes with story progress.

| City | Default | Cleared by |
|------|---------|-----------|
| Zeroville | none (protected) | — |
| Sumville | low | badge-1 |
| Minusburg | low | badge-2 |
| Multiplia | medium | badge-3 + expose Rocket |
| Dividia | medium | badge-4 |
| Primore | high | badge-5 |
| Symmetrika | high | badge-6 |
| Integrala | high | badge-7 |
| Absoluta | critical | badge-8 |

Infection levels affect: visible glitch effects, NPC dialogue variations, which services are disrupted.

---

## 8. Dialogue Tone Guide

- **Prof. Algorithma**: Warm, slightly formal. Speaks in metaphors. Guilt subtext. In Hebrew by default.
- **NULL-X**: Cold, clipped, logical. No contractions. Occasional binary interjections (`01001110`...). Never uses humor.
- **Remainder**: Sarcastic, competitive. Softens over time. Bilingual code-switches naturally.
- **Prof. Oak**: Reassuring authority. Heavy on exposition but keeps it short.
- **Brock**: Grounded, practical, uses cooking/geology metaphors.
- **Misty**: Direct, impatient, competitive but fair. Pushes player to act faster.
- **Gary**: Arrogant but not cruel. Uses stats and rankings constantly.
- **Jessie/James**: Theatrical, bickering, committed to the bit even when failing.
- **Meowth**: Comic relief with surprising wisdom moments.
- **Prof. Elm**: Academic, nervous, over-explains.
- **Gym Leaders**: Each has a math-themed speech pattern (Adda always adds qualifiers, Minus is understated, etc.)
