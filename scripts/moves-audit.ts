/**
 * Moves audit — generates docs/moves-audit.md (outside the build).
 *
 *   npm run moves-audit
 *
 * For every move in src/data/moves.json it reports:
 *  - whether the move has an effect beyond plain damage (from damageClass / effectChance / description)
 *  - whether that effect is wired to battle logic (src/data/move-battle-overrides.ts + the tags the
 *    battle code actually reads — scanned from the source, nothing hand-listed)
 *  - which animation it gets (src/systems/move-animation.ts) and whether it is a dedicated one or the
 *    generic fallback
 *  - how many Pokémon can learn it (level-up / TM) → helps decide what to calibrate first
 *
 * Hand-written notes in the "Notes" column of the generated table are preserved between runs (by move id).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOVE_BATTLE_OVERRIDES } from '../src/data/move-battle-overrides';
import { getAttackAnimationProfile } from '../src/systems/move-animation';
import type { MoveBattleMetadata } from '../src/types/battle-metadata';
import { ITEM_GAME_DATA } from '../src/data/item-defs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/moves-audit.md');

interface MoveJson {
  id: number;
  name: { en: string; he: string };
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  effectChance: number | null;
  damageClass: string;
  description: { en: string; he: string };
}

const readJson = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
const moves = readJson<MoveJson[]>('src/data/moves.json');
const learnsets = readJson<Record<string, Array<{ moveId: number; levelLearned: number }>>>('src/data/learnsets.json');
const tmLearnsets = readJson<Record<string, Array<{ moveId: number }>>>('src/data/tm-learnsets.json');

// ── Which behavior tags / effect ids does the battle code actually read? ─────────────────────────
const TYPES_FILE = 'src/types/battle-metadata.ts';
const typesSrc = fs.readFileSync(path.join(ROOT, TYPES_FILE), 'utf8');
const unionMembers = (typeName: string): string[] => {
  const m = typesSrc.match(new RegExp(`export type ${typeName} =([^;]+);`));
  return m ? [...m[1].matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1]) : [];
};

function listTs(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : listTs(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}
const EXCLUDED = ['src/data/move-battle-overrides.ts', TYPES_FILE, 'src/systems/move-animation.ts', 'src/admin/'];
const logicSrc = listTs(path.join(ROOT, 'src'))
  .filter((f) => !EXCLUDED.some((x) => path.relative(ROOT, f).startsWith(x)))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');
const isRead = (id: string) => logicSrc.includes(`'${id}'`);
const unwiredTags = new Set(
  [
    ...unionMembers('MoveBattleBehaviorTag'),
    ...unionMembers('MoveBattleEffectId'),
    ...unionMembers('MoveBattleSideEffectId'),
  ].filter((id) => id !== 'other' && !isRead(id)),
);

// Moves the battle code handles by id (e.g. `export const RETURN_MOVE_ID = 216;`) instead of metadata.
const idHandled = new Map<number, string>();
for (const [, name, id] of logicSrc.matchAll(/\b([A-Z_]+_MOVE_ID)\s*=\s*(\d+)/g)) {
  if (logicSrc.split(name).length > 2) idHandled.set(Number(id), name);
}

// ── Learners (priority signal) ─────────────────────────────────────────────────────────────────
const levelLearners = new Map<number, Set<string>>();
const tmLearners = new Map<number, Set<string>>();
const add = (map: Map<number, Set<string>>, moveId: number, pid: string) =>
  (map.get(moveId) ?? map.set(moveId, new Set()).get(moveId)!).add(pid);
for (const [pid, list] of Object.entries(learnsets)) for (const l of list) add(levelLearners, l.moveId, pid);
for (const [pid, list] of Object.entries(tmLearnsets)) for (const l of list) add(tmLearners, l.moveId, pid);

// ── Reachability: can a player actually meet this move? ───────────────────────────────────────
// moves.json holds every move PokeAPI lists for our Pokémon (incl. modern TM lists). A move is only
// reachable through level-up, a TM item that exists in the game, or a trainer's hand-picked moves.
const tmItemMoves = new Set(
  Object.values(ITEM_GAME_DATA).flatMap((d) => (d.effect.type === 'tm' ? [d.effect.moveId] : [])),
);
const trainerMoves = new Set<number>();
function collectMoves(node: unknown): void {
  if (Array.isArray(node)) return node.forEach(collectMoves);
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (k === 'moves' && Array.isArray(v)) v.forEach((id) => typeof id === 'number' && trainerMoves.add(id));
    else collectMoves(v);
  }
}
function listJson(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'backup' ? [] : listJson(p);
    return e.name.endsWith('.json') ? [p] : [];
  });
}
for (const f of listJson(path.join(ROOT, 'src/data/maps'))) collectMoves(JSON.parse(fs.readFileSync(f, 'utf8')));
function reachability(moveId: number): { reachable: boolean; via: string } {
  const via = [
    levelLearners.get(moveId)?.size ? `lvl×${levelLearners.get(moveId)!.size}` : '',
    tmItemMoves.has(moveId) ? 'TM' : '',
    trainerMoves.has(moveId) ? 'trainer' : '',
  ].filter(Boolean);
  const tmOnly = tmLearners.get(moveId)?.size ?? 0;
  if (via.length) return { reachable: true, via: via.join(' · ') };
  return { reachable: false, via: tmOnly ? `needs a TM item (×${tmOnly} can learn)` : 'no Pokémon can learn it' };
}

// ── Effect detection (no PokeAPI meta in moves.json → description heuristics) ─────────────────
const EFFECT_HINTS =
  /critical|recoil|hurts the user|damaging the user|faints|2-5|twice|three times|double|turns?\b|steals|absorb|drain|user.s level|HP|switch|1st turn|KO|confus|immobile|first|stronger|weaker|\bpower\b|lower|raise|may |chance|flinch|burn|poison|paraly|freeze|sleep|trap|squeeze|wrap|money|coins|recharge|random|never misses|always|varies|depends|weight|priority|effective|item|stat|loyalty|in a row|2 to 5|two to five|drags out|Protect|Detect|Berry|damages the user|Defense|faster|retaliat|fixated|terrain|same type|party|physical damage|destroy|misses|used only|consecutive/i;

type Status = 'wired' | 'partial' | 'missing' | 'unreachable' | 'implicit' | 'none';

function summarizeOverride(o: Partial<MoveBattleMetadata>): string {
  const parts: string[] = [];
  if (o.priority) parts.push(`priority ${o.priority > 0 ? '+' : ''}${o.priority}`);
  if (o.ailment) parts.push(`${o.ailment.status}${o.ailment.badlyPoisoned ? ' (toxic)' : ''} ${o.ailment.chance}%`);
  for (const s of o.statChanges ?? []) parts.push(`${s.target} ${s.stat} ${s.stages > 0 ? '+' : ''}${s.stages}`);
  if (o.groupedStatChance) parts.push(`stats roll ${o.groupedStatChance}%`);
  for (const s of o.chargeStatChanges ?? []) parts.push(`charge: ${s.stat} ${s.stages > 0 ? '+' : ''}${s.stages}`);
  for (const e of o.effects ?? []) if (e.id !== 'other') parts.push(`${e.id} ${e.chance}%`);
  for (const e of o.sideEffects ?? []) parts.push(`${e.id} ${e.turns ?? ''}t`.trim());
  if (o.critRate) parts.push(`crit +${o.critRate}`);
  if (o.flinchChance) parts.push(`flinch ${o.flinchChance}%`);
  if (o.drainPercent) parts.push(`drain ${o.drainPercent}%`);
  if (o.recoilPercent) parts.push(`recoil ${o.recoilPercent}%`);
  if (o.healingPercent) parts.push(`heal ${o.healingPercent}%`);
  if (o.minHits) parts.push(`hits ${o.minHits}${o.maxHits !== o.minHits ? `-${o.maxHits}` : ''}`);
  if (o.minimumDamage) parts.push(`min dmg ${o.minimumDamage}`);
  if (o.fixedDamage) parts.push(`fixed dmg ${o.fixedDamage}`);
  for (const t of o.behaviorTags ?? []) parts.push(`\`${t}\``);
  return parts.join(', ');
}

function classify(m: MoveJson): { status: Status; logic: string; why: string } {
  const o = MOVE_BATTLE_OVERRIDES[m.name.en];
  if (o) {
    const ids = [
      ...(o.behaviorTags ?? []),
      ...(o.effects ?? []).map((e) => e.id),
      ...(o.sideEffects ?? []).map((e) => e.id),
    ];
    const unwired = ids.filter((id) => unwiredTags.has(id));
    return {
      status: unwired.length ? 'partial' : 'wired',
      logic: summarizeOverride(o),
      why: unwired.length ? `tag not read by battle code: ${unwired.join(', ')}` : '',
    };
  }
  const byId = idHandled.get(m.id);
  if (byId) return { status: 'wired', logic: `handled by id in code (\`${byId}\`)`, why: '' };
  const desc = m.description.en.replace(/­\s*/g, '');
  if (
    m.damageClass !== 'status' &&
    m.accuracy === null &&
    /never misses|sure-hit|always hits|never miss|unavoidable|not miss|cannot be evaded|certain to hit/i.test(desc)
  )
    return { status: 'implicit', logic: 'accuracy = null → always hits', why: '' };
  if (m.damageClass === 'status') return { status: 'missing', logic: '', why: 'status move with no effect' };
  if (m.effectChance !== null) return { status: 'missing', logic: '', why: `effectChance ${m.effectChance}%` };
  if (EFFECT_HINTS.test(desc)) return { status: 'missing', logic: '', why: 'description mentions an effect' };
  return { status: 'none', logic: '', why: '' };
}

// Generic fallback branches at the bottom of getAttackAnimationProfile (family + duration).
const GENERIC_ANIMS = new Set(['pulse@0.64', 'burst@0.34', 'beam@0.68', 'projectile@0.34', 'lunge@0.26']);
function animation(m: MoveJson): { family: string; dedicated: boolean } {
  const p = getAttackAnimationProfile({
    name: m.name,
    type: m.type as never,
    power: m.power ?? 0,
    damageClass: m.damageClass as never,
  });
  return {
    family: p.family + (p.variant ? `:${p.variant}` : ''),
    dedicated: !GENERIC_ANIMS.has(`${p.family}@${p.duration}`),
  };
}

// ── Preserve hand-written notes ────────────────────────────────────────────────────────────────
const notes = new Map<number, string>();
if (fs.existsSync(OUT)) {
  for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    const id = Number(cells[1]);
    if (cells.length > 3 && Number.isInteger(id) && cells[cells.length - 2]) notes.set(id, cells[cells.length - 2]);
  }
}

// ── Build rows ─────────────────────────────────────────────────────────────────────────────────
const STATUS_ICON: Record<Status, string> = {
  missing: '❌ missing',
  unreachable: '💤 missing, not reachable',
  partial: '⚠️ partial',
  wired: '✅ wired',
  implicit: '✅ data',
  none: '➖ none',
};
const ORDER: Status[] = ['missing', 'partial', 'unreachable', 'wired', 'implicit', 'none'];
const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/­\s*/g, '').replace(/\s+/g, ' ').trim();

const rows = moves
  .filter((m) => m.id > 0)
  .map((m) => {
    const c = classify(m);
    const reach = reachability(m.id);
    if (c.status === 'missing' && !reach.reachable) c.status = 'unreachable';
    const lvl = levelLearners.get(m.id)?.size ?? 0;
    const tm = tmLearners.get(m.id)?.size ?? 0;
    return {
      m,
      ...c,
      anim: animation(m),
      reach,
      lvl,
      tm,
      learners: new Set([...(levelLearners.get(m.id) ?? []), ...(tmLearners.get(m.id) ?? [])]).size,
    };
  })
  .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || b.learners - a.learners || a.m.id - b.m.id);

const count = (s: Status) => rows.filter((r) => r.status === s).length;
const withEffect = rows.length - count('none');
const dedicated = rows.filter((r) => r.anim.dedicated).length;

const header =
  '| # | Move | Type | Class | Pow | Acc | Eff% | Effect | Logic (override) | Why / gap | Animation | Reachable | Learners (lvl/TM) | Description | Notes |\n' +
  '|---|------|------|-------|-----|-----|------|--------|------------------|-----------|-----------|-----------|-------------------|-------------|-------|';
const row = (r: (typeof rows)[number]) =>
  `| ${r.m.id} | ${esc(r.m.name.en)} (${esc(r.m.name.he)}) | ${r.m.type} | ${r.m.damageClass} | ${r.m.power ?? '—'} | ${r.m.accuracy ?? '—'} | ${r.m.effectChance ?? '—'} | ${STATUS_ICON[r.status]} | ${esc(r.logic) || '—'} | ${esc(r.why) || '—'} | ${r.anim.dedicated ? '🎬' : '▫️'} ${r.anim.family} | ${r.reach.reachable ? '✔' : '✖'} ${r.reach.via} | ${r.learners} (${r.lvl}/${r.tm}) | ${esc(r.m.description.en)} | ${notes.get(r.m.id) ?? ''} |`;

const sections = ORDER.map((s) => {
  const list = rows.filter((r) => r.status === s);
  return `## ${STATUS_ICON[s]} (${list.length})\n\n${header}\n${list.map(row).join('\n')}\n`;
});

const md = `# Moves audit

> Generated by \`npm run moves-audit\` (scripts/moves-audit.ts) — do not hand-edit the tables except the **Notes** column (kept between runs).
> Re-run after changing \`src/data/move-battle-overrides.ts\`, the battle code, or \`src/systems/move-animation.ts\`.

## Summary

| | Count |
|---|---|
| Moves total | ${rows.length} |
| Have an effect beyond damage | ${withEffect} |
| ✅ wired (override + battle code reads it) | ${count('wired')} |
| ✅ data (handled by raw data, e.g. accuracy null = never misses) | ${count('implicit')} |
| ⚠️ partial (override uses a tag the battle code never reads) | ${count('partial')} |
| ❌ missing (effect described, no logic at all — a player can meet it) | ${count('missing')} |
| 💤 missing, not reachable (only in modern TM lists — no level-up, TM item or trainer uses it) | ${count('unreachable')} |
| ➖ plain damage | ${count('none')} |
| 🎬 dedicated animation / ▫️ generic fallback | ${dedicated} / ${rows.length - dedicated} |

Unwired tags in \`${TYPES_FILE}\`: ${unwiredTags.size ? [...unwiredTags].map((t) => `\`${t}\``).join(', ') : 'none'}

### Legend
- **Effect** — ❌ effect exists but no logic · ⚠️ override exists but part of it is ignored by the battle code · ✅ wired · ➖ plain damage.
  "Has an effect" is a heuristic (status class / effectChance / description keywords) — a ❌ on a damaging move may be a false positive; mark it in Notes.
- ✅ wired means the metadata is read by the engine — not that it was play-tested. Manual QA lives in the admin page (Moves tab → "effect works" checkbox).
- **Animation** — 🎬 dedicated profile in \`move-animation.ts\` · ▫️ generic fallback (pulse / burst / beam / projectile / lunge by class & type).
- **Reachable** — ✔ learned by level-up (lvl×N Pokémon), a TM item that exists in the game, or a trainer's hand-picked moves in the maps. ✖ = only in PokeAPI's modern TM lists: no player meets it (except Metronome, which can call any move). 💤 rows are the lowest priority.
- **Learners** — distinct Pokémon that learn it (level-up / TM). Within each section rows are sorted by learners, so the top rows are the ones players meet most.

${sections.join('\n')}`;

fs.writeFileSync(OUT, md);
console.log(
  `Wrote ${path.relative(ROOT, OUT)} — ${rows.length} moves: missing ${count('missing')}, unreachable ${count('unreachable')}, partial ${count('partial')}, wired ${count('wired')}, implicit ${count('implicit')}, none ${count('none')}`,
);
