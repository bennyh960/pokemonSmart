import type { ReactNode } from 'react';
import type { Pokemon } from '../../../types/index.js';
import { useI18n } from '../../../ui-react/context/i18n-context';
import {
  getAbilityDisplayName,
  getLocalizedName,
  getMoveDisplayName,
  getNatureDisplayName,
  getPokemonDisplayName,
} from '../../../services/pokemon-data.js';
import { getItem } from '../../../data/items';
import { TypeBadge } from '../../../ui-react/componenets/Typebadge';
import { PCSprite } from './PCSprite';

export interface InspectorAction {
  kind: 'deposit' | 'withdraw' | 'swap';
  disabled: boolean;
}

interface Props {
  pokemon: Pokemon | null;
  where: string;
  /** Main action (none while choosing a swap partner) */
  action: InspectorAction | null;
  canRelease: boolean;
  /** Why an action is greyed out, shown in gold under the buttons */
  hint: string | null;
  boxNumber: number;
  onAction: () => void;
  onRelease: () => void;
}

function ActionButton({
  icon,
  title,
  sub,
  keyHint,
  tone,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  keyHint: string;
  tone: 'green' | 'blue' | 'red';
  disabled: boolean;
  onClick: () => void;
}) {
  const tones = {
    green: 'border-transparent bg-[#20d860] text-[#04150b]',
    blue: 'border-transparent bg-[#5b8cff] text-white',
    red: 'border-[#ef5b5b]/50 text-[#ef5b5b] hover:enabled:bg-[#ef5b5b]/10',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start text-sm font-bold hover:enabled:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 ${tones[tone]}`}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-black/25 text-base">{icon}</span>
      <span className="min-w-0">
        {title}
        <small className="block text-xs font-normal opacity-80">{sub}</small>
      </span>
      <kbd className="ms-auto rounded border border-current/30 px-1.5 font-mono text-[10px] opacity-70">{keyHint}</kbd>
    </button>
  );
}

export function Inspector({ pokemon, where, action, canRelease, hint, boxNumber, onAction, onRelease }: Props) {
  const { t, locale } = useI18n();

  if (!pokemon) {
    return (
      <aside className="self-start rounded-xl border border-[#1f4a33] bg-[#132c20] px-3 py-8 text-center text-sm leading-relaxed text-[#5d7d69]">
        {t('pc.pickOne')}
      </aside>
    );
  }

  const hpPct = pokemon.maxHp > 0 ? Math.round((pokemon.hp / pokemon.maxHp) * 100) : 0;
  const item = pokemon.heldItemId ? getItem(pokemon.heldItemId) : null;
  const main =
    action?.kind === 'deposit'
      ? { icon: '📦', title: t('pc.deposit', { n: boxNumber }), sub: t('pc.depositSub'), tone: 'blue' as const }
      : action?.kind === 'swap'
        ? { icon: '⇄', title: t('pc.swap'), sub: t('pc.swapSub'), tone: 'green' as const }
        : { icon: '＋', title: t('pc.withdraw'), sub: t('pc.withdrawSub'), tone: 'green' as const };

  return (
    <aside className="flex flex-col gap-2.5 self-start rounded-xl border border-[#1f4a33] bg-[#132c20] p-3">
      <div className="grid h-28 place-items-center rounded-lg bg-[radial-gradient(circle_at_50%_65%,#1f4a33_0,#0b1b13_70%)]">
        <PCSprite id={pokemon.id} className="h-32 w-32" />
      </div>
      <div>
        <h2 className="flex items-baseline justify-between gap-2 text-xl font-bold">
          <span className="truncate">{getPokemonDisplayName(pokemon.id)}</span>
          <span className="shrink-0 font-mono text-xs text-[#8fb19c]" dir="ltr">
            Lv {pokemon.level}
          </span>
        </h2>
        <div className="text-xs text-[#5d7d69]">{where}</div>
      </div>
      <div className="flex gap-1">
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} locale={locale} />
        ))}
      </div>

      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-[13px]">
        <dt className="text-[#5d7d69]">{t('pc.hp')}</dt>
        <dd className="m-0 flex items-center gap-2">
          <span className="h-1 flex-1 overflow-hidden rounded bg-[#0a1912]">
            <span className="block h-full bg-[#20d860]" style={{ width: `${hpPct}%` }} />
          </span>
          <span className="font-mono text-[10px] text-[#8fb19c]" dir="ltr">
            {pokemon.hp}/{pokemon.maxHp}
          </span>
        </dd>
        <dt className="text-[#5d7d69]">{t('pc.nature')}</dt>
        <dd className="m-0 truncate">{pokemon.natureId ? getNatureDisplayName(pokemon.natureId) : t('pc.none')}</dd>
        <dt className="text-[#5d7d69]">{t('pc.ability')}</dt>
        <dd className="m-0 truncate">{pokemon.abilityId ? getAbilityDisplayName(pokemon.abilityId) : t('pc.none')}</dd>
        <dt className="text-[#5d7d69]">{t('pc.heldItem')}</dt>
        <dd className="m-0 truncate">{item ? getLocalizedName(item.name) : t('pc.none')}</dd>
      </dl>

      {pokemon.moves.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#5d7d69]">{t('pc.moves')}</div>
          <div className="grid grid-cols-2 gap-1">
            {pokemon.moves.map((m) => (
              <span key={m.id} className="truncate rounded-md bg-[#0b1b13] px-2 py-0.5 text-xs text-[#8fb19c]">
                {getMoveDisplayName(m.id)}
              </span>
            ))}
          </div>
        </div>
      )}

      {action && (
        <div className="grid gap-2">
          <ActionButton {...main} keyHint="Enter" disabled={action.disabled} onClick={onAction} />
          <ActionButton
            icon="🍃"
            title={t('pc.release')}
            sub={t('pc.releaseSub')}
            keyHint="R"
            tone="red"
            disabled={!canRelease}
            onClick={onRelease}
          />
        </div>
      )}
      {hint && <p className="m-0 text-xs leading-snug text-[#f8d030]">{hint}</p>}
    </aside>
  );
}
