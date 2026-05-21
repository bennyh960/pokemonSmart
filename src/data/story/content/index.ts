/**
 * Story Content Index — imports all quest files to register their content.
 *
 * Each file registers its own quests, gates, cutscenes, and story events.
 * The files are imported in story order so registration is predictable.
 *
 * To add a new story beat:
 *   1. Create a new file in the appropriate act/ folder
 *   2. Add an import here
 *   That's it. No other files need to change.
 *
 * To find the code for a specific story beat:
 *   - Look at the file name — it matches the quest/location name.
 */

// Act 0 — Zeroville: The Beginning
import './act0/quest-zeroville-intro.js';

// Act 1 — First Steps: Route 1, Sumville, Route 2, Minusburg
import './act1/quest-route1.js';
import './act1/quest-sumville-arc.js';
import './act1/quest-route2.js';
import './act1/quest-minusburg.js';
import './act1/quest-route3.js';
import './act1/quest-route4.js';

// Act 2 — Trust Nobody: Multiplia, Dividia
import './act2/quest-multiplia.js';
import './act2/quest-dividia.js';

// Act 3 — Language Layer: Primore, Symmetrika
import './act3/quest-fractiles.js';
import './act3/quest-symmetrika.js';
import './act3/quest-raikou.js';

// Act 4 — Rocket Escalation: Integrala, Absoluta
import './act4/quest-percentiles.js';
import './act4/quest-algebria.js';

// Act 5 — The Core: NULL-X Tower
import './act5/quest-nullx-tower.js';
