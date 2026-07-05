import type { PokedexPokemon } from '../../types';
import { useI18n } from '../../../../ui-react/context/i18n-context';
import { getEvolutionChain, getPokemonDisplayName } from '../../../../services/pokemon-data';
import { getItemGameDataBySlug } from '../../../../data/item-defs';
import useGetPokemonSprite from '../../../../ui-react/hooks/useGetPokemonSprite';
import type { Locale } from '../../../../i18n/i18n';

/**
 * NOTE: this interface mirrors the shape produced by getEvolutionChain().
 * The old canvas renderer declared/exported it locally — if it's now exported
 * from services/pokemon-data (or anywhere canonical), swap this for a type-only
 * import instead of redeclaring it here.
 */
interface EvolutionStage {
  id: number;
  name: { en: string; he: string };
  minLevel: number | null;
  trigger: string | null;
  item: string | null;
  evolvesFromId?: number | null;
  special?: { en: string; he: string };
}

interface EvolutionTabProps {
  pokemon: PokedexPokemon;
}

interface ResolvedLabel {
  text: string;
  icon: string;
  isTrade: boolean;
}

function resolveItemName(itemSlug: string, locale: Locale): string {
  const itemData = getItemGameDataBySlug(itemSlug);
  return itemData?.name ? itemData.name[locale] || itemData.name.en : itemSlug;
}

/**
 * Turns a stage's raw evolution data into a short, kid-readable label + icon.
 * Mirrors the priority order from the old drawDescription(): special text wins,
 * then trade (+ item), then item-only, then level-up-with-item, then plain level,
 * then a generic fallback for any other trigger.
 */
function resolveEvolutionLabel(stage: EvolutionStage, locale: Locale): ResolvedLabel {
  if (stage.special) {
    return { text: stage.special[locale] || stage.special.en, icon: '✨', isTrade: false };
  }

  if (stage.trigger === 'trade') {
    if (stage.item) {
      const itemName = resolveItemName(stage.item, locale);
      const text = locale === 'he' ? `החלפה + ${itemName}` : `Trade + ${itemName}`;
      return { text, icon: '🔁', isTrade: true };
    }
    return { text: locale === 'he' ? 'החלפה' : 'Trade', icon: '🔁', isTrade: true };
  }

  if (stage.trigger === 'use-item' && stage.item) {
    return { text: resolveItemName(stage.item, locale), icon: '🧪', isTrade: false };
  }

  if (stage.trigger === 'level-up' && stage.item) {
    const itemName = resolveItemName(stage.item, locale);
    const text = locale === 'he' ? `עליית רמה עם ${itemName}` : `Lv. Up holding ${itemName}`;
    return { text, icon: '🧪', isTrade: false };
  }

  if (stage.minLevel) {
    const text = locale === 'he' ? `רמה ${stage.minLevel}` : `Lv. ${stage.minLevel}`;
    return { text, icon: '⬆️', isTrade: false };
  }

  if (stage.trigger) {
    return { text: stage.trigger.replace(/-/g, ' '), icon: '⬆️', isTrade: false };
  }

  return { text: '', icon: '⬆️', isTrade: false };
}

function buildChildrenMap(stages: EvolutionStage[]): Map<number, EvolutionStage[]> {
  const byId = new Map(stages.map((s) => [s.id, s]));
  const childrenMap = new Map<number, EvolutionStage[]>();
  const linkedIds = new Set<number>();

  // 1. Prefer explicit evolvesFromId links when present and valid.
  for (const stage of stages) {
    if (stage.evolvesFromId != null && byId.has(stage.evolvesFromId)) {
      const list = childrenMap.get(stage.evolvesFromId) ?? [];
      list.push(stage);
      childrenMap.set(stage.evolvesFromId, list);
      linkedIds.add(stage.id);
    }
  }

  // 2. Fallback: any stage without a usable evolvesFromId link is attached to
  // the previous stage in array order — mirrors the legacy canvas renderer,
  // which relied on array position whenever the data link was missing
  // (see the old renderGridPipelineLayout's "stages[1]" fallback, and
  // renderStandardChain, which never used evolvesFromId at all).
  stages.forEach((stage, idx) => {
    if (linkedIds.has(stage.id) || idx === 0) return;
    const prevStage = stages[idx - 1];
    const list = childrenMap.get(prevStage.id) ?? [];
    list.push(stage);
    childrenMap.set(prevStage.id, list);
  });

  return childrenMap;
}

function findRoot(stages: EvolutionStage[]): EvolutionStage {
  return stages.find((s) => !s.evolvesFromId || !stages.some((p) => p.id === s.evolvesFromId)) ?? stages[0];
}

/** A single Pokémon box in the tree — sprite + dex id + name, highlighted if it's the one being viewed. */
function EvoNodeBox({ stage, isCurrent }: { stage: EvolutionStage; isCurrent: boolean }) {
  const { locale } = useI18n();
  const { sprite } = useGetPokemonSprite(stage.id, 'front', false);
  const displayName = getPokemonDisplayName(stage.id) ?? stage.name[locale as Locale] ?? stage.name.en;

  return (
    <div
      className={`flex w-24 shrink-0 flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-center transition ${
        isCurrent
          ? 'border-amber-400/70 bg-amber-950/20 shadow-[0_0_16px_-4px_rgba(251,191,36,0.5)]'
          : 'border-red-900/40 bg-zinc-900/60'
      }`}
    >
      {sprite ? (
        <img
          src={sprite}
          alt={displayName}
          className="h-14 w-14 [image-rendering:pixelated] drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)]"
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-zinc-700 font-mono text-lg text-zinc-600">
          ?
        </div>
      )}
      <div className="font-mono text-[10px] text-zinc-500">#{String(stage.id).padStart(3, '0')}</div>
      <div className={`truncate text-xs font-semibold ${isCurrent ? 'text-amber-300' : 'text-zinc-100'}`}>
        {displayName}
      </div>
    </div>
  );
}

/** Horizontal connector: a short line + directional arrow, with the icon/label stacked underneath. */
function EvoConnectorArrow({ label }: { label: ResolvedLabel }) {
  const { isRTL } = useI18n();

  return (
    <div className="flex shrink-0 flex-col items-center gap-1 px-1" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-0.5">
        <div className="h-px w-5 bg-red-900/50" />
        <span className="text-base leading-none text-red-500/80">{isRTL ? '←' : '→'}</span>
        <div className="h-px w-5 bg-red-900/50" />
      </div>
      {label.text && (
        <div className="flex max-w-[6.5rem] flex-col items-center gap-0.5">
          <span className="text-sm leading-none">{label.icon}</span>
          <span className="whitespace-pre-line text-center text-[10px] leading-snug text-zinc-400">{label.text}</span>
        </div>
      )}
    </div>
  );
}

/** Downward connector used for the small-fork "tree" layout (parent on top, branches below). */
function EvoConnectorDown({ label }: { label: ResolvedLabel }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <span className="text-base leading-none text-red-500/80">↓</span>
      {label.text && (
        <div className="flex max-w-[7rem] flex-col items-center gap-0.5">
          <span className="text-sm leading-none">{label.icon}</span>
          <span className="whitespace-pre-line text-center text-[10px] leading-snug text-zinc-400">{label.text}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Recursively renders a stage and all of its descendants. The shape adapts to
 * how many branches come off this stage:
 *  - 0 children: just the box (leaf).
 *  - 1 child: keep growing the same horizontal line.
 *  - 2–3 children: classic tree — this stage on top, branches spread in a row below.
 *  - 4+ children: repeat this stage once per branch (e.g. Eevee) instead of
 *    cramming many spokes off a single hub, which stays readable at any width.
 */
function EvoBranch({
  stage,
  childrenMap,
  currentId,
  locale,
}: {
  stage: EvolutionStage;
  childrenMap: Map<number, EvolutionStage[]>;
  currentId: number;
  locale: Locale;
}) {
  const children = childrenMap.get(stage.id) ?? [];
  const isCurrent = stage.id === currentId;

  if (children.length === 0) {
    return <EvoNodeBox stage={stage} isCurrent={isCurrent} />;
  }

  if (children.length === 1) {
    return (
      <div className="flex items-center gap-1">
        <EvoNodeBox stage={stage} isCurrent={isCurrent} />
        <EvoConnectorArrow label={resolveEvolutionLabel(children[0], locale)} />
        <EvoBranch stage={children[0]} childrenMap={childrenMap} currentId={currentId} locale={locale} />
      </div>
    );
  }

  if (children.length <= 3) {
    return (
      <div className="flex flex-col items-center gap-2">
        <EvoNodeBox stage={stage} isCurrent={isCurrent} />
        <div className="flex flex-wrap justify-center gap-8">
          {children.map((child) => (
            <div key={child.id} className="flex flex-col items-center gap-2">
              <EvoConnectorDown label={resolveEvolutionLabel(child, locale)} />
              <EvoBranch stage={child} childrenMap={childrenMap} currentId={currentId} locale={locale} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {children.map((child) => (
        <div key={child.id} className="flex items-center gap-1">
          <EvoNodeBox stage={stage} isCurrent={isCurrent} />
          <EvoConnectorArrow label={resolveEvolutionLabel(child, locale)} />
          <EvoBranch stage={child} childrenMap={childrenMap} currentId={currentId} locale={locale} />
        </div>
      ))}
    </div>
  );
}

export function EvolutionTab({ pokemon }: EvolutionTabProps) {
  const { t, locale } = useI18n();
  const chain = getEvolutionChain(pokemon.id);
  const stages = (chain?.stages ?? []) as EvolutionStage[];

  if (stages.length <= 1) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-red-900/40 bg-zinc-950/40">
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-600">{t('pokedex.evo.none')}</span>
      </div>
    );
  }

  const rootNode = findRoot(stages);
  const childrenMap = buildChildrenMap(stages);
  const hasTradeStage = stages.some((s) => s.trigger === 'trade');

  return (
    <div className="rounded-2xl border border-red-900/40 bg-zinc-950/60 p-5">
      <div className="overflow-x-auto">
        <div className="flex min-w-fit items-center justify-center py-4">
          <EvoBranch stage={rootNode} childrenMap={childrenMap} currentId={pokemon.id} locale={locale as Locale} />
        </div>
      </div>

      {hasTradeStage && (
        <div className="mt-6 rounded-xl border border-dashed border-amber-700/40 bg-amber-950/20 px-4 py-3 text-center text-xs leading-relaxed text-amber-300/90">
          {t('pokedex.evo.tradeHint')}
        </div>
      )}
    </div>
  );
}
