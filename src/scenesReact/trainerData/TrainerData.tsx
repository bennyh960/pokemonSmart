import { useState } from 'react';
import { useInputLayer } from '../../engine/input';
import { useI18n } from '../../ui-react/context/i18n-context';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData';
import { BADGES, hasBadge } from '../../data/badges';
import { TRAINER_RANKS } from '../../data/trainer-ranks';
import {
  describeActivePerks,
  describeRankPerks,
  describeRankRequirements,
  getTrainerRank,
} from '../../systems/trainer-rank';

interface ITrainerDataProps {
  onClose: () => void;
}

const TrainerData = ({ onClose }: ITrainerDataProps) => {
  const { t, locale, isRTL } = useI18n();
  const [pd] = usePlayerData();
  const [roadmapOpen, setRoadmapOpen] = useState(false);

  useInputLayer({
    id: 'trainerData',
    name: 'Trainer Data',
    keyBindings: [{ action: 'close', code: 'Escape' }],
    onAction: (action) => {
      if (action !== 'close') return;
      // Escape closes the rank roadmap first, then the card
      if (roadmapOpen) setRoadmapOpen(false);
      else onClose();
    },
  });

  const trainerRank = getTrainerRank(pd);
  const trainer = {
    name: pd.name,
    birthYear: pd.birthYear,
    money: pd.money,
    playTime: pd.playtime,
    totalSteps: pd.totalSteps,
    pokemonSeen: trainerRank.stats.seen,
    pokemonCaught: trainerRank.stats.caught,
    leagueWins: trainerRank.stats.leagueWins,
    badges: pd.badges, // This should be a bitmask or array of badge IDs the player has earned
  };
  const currentYear = new Date().getFullYear();
  const age = currentYear - trainer.birthYear;

  // play time in hours and minutes hh:mm format
  const playTimeMinutes = trainer.playTime % 60;
  const playTime = Math.round(trainer.playTime / 60 + playTimeMinutes);

  const currentTheme = trainerRank.rank.theme;
  const activePerks = describeActivePerks(trainerRank.index);

  const RenderRankContainer = () => {
    const { badge, label: rank } = trainerRank.rank;
    const value = trainerRank.xp;

    return (
      <div
        className={`bg-gradient-to-b ${currentTheme.bg} p-4 rounded-xl border flex flex-col items-center text-center shadow-md mb-2 md:mb-0 relative group/rank`}
      >
        <div className="w-full flex justify-between items-center mb-1">
          <span className="text-[10px] uppercase text-slate-400 tracking-wider block">
            {t('trainerData.trainerRank')}
          </span>

          <button
            type="button"
            onClick={() => setRoadmapOpen(true)}
            aria-label={t('trainerData.rankRoadmap')}
            className="text-[10px] bg-slate-800/80 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 w-5 h-5 rounded-full flex items-center justify-center border border-slate-700 transition-colors"
          >
            ℹ️
          </button>
        </div>

        {/* Main Rank Display */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{badge}</span>
          <span className={`text-base md:text-lg font-bold ${currentTheme.text}`}>{rank[locale]}</span>
        </div>

        {/* Active Perks Box */}
        {activePerks.length > 0 && (
          <div
            className="w-full bg-black/40 rounded-lg p-2 border border-white/5 text-start mb-2.5 max-h-28 overflow-y-auto overscroll-contain game-scrollbar game-scrollbar-thin"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <span className="text-[9px] uppercase font-bold text-amber-500 block mb-0.5 tracking-wide">
              ✨ {t('trainerData.activePerks')}:
            </span>
            {activePerks.map((perkLine) => (
              <p key={perkLine.en} className="text-xs text-slate-300 leading-tight">
                • {perkLine[locale]}
              </p>
            ))}
          </div>
        )}

        {/* Real-time Score Counter */}
        <div className="bg-black/40 rounded-md px-2.5 py-1 border border-white/5 w-full flex justify-center items-center">
          <span className="text-[10px] font-mono font-bold text-amber-500/90 tracking-wide">
            XP: {value.toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      {/* Close Button UI */}
      <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} flex items-center gap-2 z-10`}>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-colors border border-slate-700 flex items-center justify-center"
        >
          <span className="sm:hidden font-sans text-xs px-1">✕</span>
          <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-600 rounded shadow">
            ESC
          </kbd>
        </button>
      </div>

      {/* Rank Roadmap modal (opened from the ℹ️ button on the rank box) */}
      {roadmapOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-fade-in"
          onClick={() => setRoadmapOpen(false)}
        >
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="relative w-full max-w-md max-h-[85vh] flex flex-col bg-slate-950 border-2 border-slate-700 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="font-bold text-cyan-400 text-sm">🏆 {t('trainerData.rankRoadmap')}</h3>
              <button
                type="button"
                onClick={() => setRoadmapOpen(false)}
                aria-label="close"
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-7 h-7 rounded-lg border border-slate-700 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto overscroll-contain game-scrollbar game-scrollbar-thin">
              {TRAINER_RANKS.map((rankItem) => {
                const isCurrent = rankItem.id === trainerRank.rank.id;
                return (
                  <div
                    key={rankItem.id}
                    className={`p-2 rounded-lg ${isCurrent ? 'bg-white/5 border border-white/15' : 'border border-transparent'}`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${rankItem.theme.text}`}>
                        {rankItem.badge} {rankItem.label[locale]}
                      </span>
                      <span className="font-mono font-bold text-slate-400">{rankItem.minExp.toLocaleString()} XP</span>
                    </div>
                    {rankItem.requires && (
                      <div className="text-[11px] text-amber-500/80 mt-1">
                        📌 {describeRankRequirements(rankItem)[locale]}
                      </div>
                    )}
                    {describeRankPerks(rankItem).map((perkLine) => (
                      <div key={perkLine.en} className="text-[11px] text-slate-300 mt-0.5">
                        ✨ {perkLine[locale]}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="relative w-full max-w-4xl h-full max-h-[95vh] md:h-[600px] bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-y-auto md:overflow-hidden text-slate-100 select-none font-sans game-scrollbar"
      >
        {/* ================= Left/Top Side: Profile Section (33% on Desktop) ================= */}
        <div
          className={`w-full md:w-1/3 bg-slate-950 p-6 flex flex-col justify-between md:overflow-y-auto game-scrollbar game-scrollbar-thin border-b md:border-b-0 ${isRTL ? 'md:border-l' : 'md:border-r'} border-slate-800`}
        >
          <div className="flex flex-col items-center text-center mt-6 md:mt-4">
            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-b from-indigo-500/20 to-cyan-500/20 border-2 border-cyan-500/50 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/10 mb-4 overflow-hidden relative group">
              <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-4xl sm:text-5xl animate-pulse">
                <img
                  src={`/sprites/trainers/${pd.heroCharacterId}.png`}
                  alt="Trainer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-cyan-400">{trainer.name}</h2>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">ID: #24019</p>
          </div>

          <div className="space-y-3 my-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">{t('trainerData.age')}</span>
              <span className="font-semibold text-slate-200">
                {age} <span className="text-xs text-slate-500">({trainer.birthYear})</span>
              </span>
            </div>
            <div className="h-[1px] bg-slate-800" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">{t('trainerData.pokecoins')}</span>
              <span className="font-bold text-amber-400 flex items-center gap-1">
                🪙 {trainer.money.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Dynamic & Decorative Rank Area using currentTheme mappings */}
          <div
            className={`bg-gradient-to-b ${currentTheme.bg} p-4 rounded-xl border flex flex-col items-center text-center shadow-md mb-2 md:mb-0`}
          >
            <RenderRankContainer />
          </div>
        </div>

        {/* ================= Right/Bottom Side: Metadata & Showcase Case (66% on Desktop) ================= */}
        <div className="w-full md:w-2/3 p-4 sm:p-6 flex flex-col justify-between bg-gradient-to-br from-slate-900 to-slate-950 min-h-[400px] md:min-h-0">
          {/* Top Mini-Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800/80 mb-6">
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                {t('trainerData.playTime')}
              </span>
              <span className="text-sm font-mono font-bold text-slate-200">{playTime}</span>
            </div>
            <div
              className={`text-center border-slate-800 ${isRTL ? 'sm:border-r' : 'sm:border-l'} border-l sm:border-l-0`}
            >
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                {t('trainerData.totalSteps')}
              </span>
              <span className="text-sm font-mono font-bold text-slate-200">{trainer.totalSteps}</span>
            </div>
            <div
              className={`text-center border-slate-800 border-t sm:border-t-0 pt-2 sm:pt-0 ${isRTL ? 'sm:border-r' : 'sm:border-l'}`}
            >
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                {t('trainerData.pokedexSeen')}
              </span>
              <span className="text-sm font-mono font-bold text-cyan-400">{trainer.pokemonSeen}</span>
            </div>
            <div
              className={`text-center border-slate-800 border-t sm:border-t-0 pt-2 sm:pt-0 border-l sm:border-l-0 ${isRTL ? 'sm:border-r' : 'sm:border-l'}`}
            >
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                {t('trainerData.caught')}
              </span>
              <span className="text-sm font-mono font-bold text-emerald-400">{trainer.pokemonCaught}</span>
            </div>
            <div
              className={`text-center border-slate-800 border-t sm:border-t-0 pt-2 sm:pt-0 ${isRTL ? 'sm:border-r' : 'sm:border-l'}`}
            >
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                {t('trainerData.leagueWins')}
              </span>
              <span className="text-sm font-mono font-bold text-amber-400">{trainer.leagueWins}</span>
            </div>
          </div>

          {/* Badge Showcase Case */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <span>🏆</span> {t('trainerData.badgeShowcase')}
            </h3>

            <div className="flex-1 bg-neutral-950 border-2 border-amber-600/30 rounded-xl p-4 sm:p-6 shadow-inner grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4 items-center justify-items-center relative overflow-hidden min-h-[220px]">
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/10 pointer-events-none" />

              {BADGES.map((badge) => (
                <div
                  key={badge.id}
                  className="group relative flex flex-col items-center justify-center w-full h-20 sm:h-24 rounded-lg transition-all duration-300 bg-neutral-900/40 border border-neutral-800/60"
                >
                  <div
                    className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                      hasBadge(trainer.badges, badge.id)
                        ? 'bg-neutral-800 border-2 border-amber-500/40 shadow-md shadow-amber-500/5 text-xl sm:text-2xl filter drop-shadow-[0_4px_6px_rgba(251,191,36,0.3)] hover:scale-110'
                        : 'bg-neutral-950 border border-neutral-900 opacity-20 text-lg sm:text-xl grayscale'
                    }`}
                  >
                    {badge.icon}
                  </div>

                  {hasBadge(trainer.badges, badge.id) && (
                    <div className="absolute bottom-1 bg-slate-950/90 text-[10px] px-2 py-0.5 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center whitespace-nowrap z-10 min-w-[90px]">
                      <p className="font-bold text-amber-400">{badge.name[locale]}</p>
                      <p className="text-slate-400 text-[8px]">{badge.city[locale]}</p>
                      <p className="text-slate-400 text-[8px]">{badge.leader[locale]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerData;
