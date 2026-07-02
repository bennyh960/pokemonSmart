import React, { useState } from 'react';
import { useI18n } from '../../../../ui-react/context/i18n-context';
import type { PlayerData } from '../../../../types';
import { getPokemonDisplayName } from '../../../../services/pokemon-data';
import { getPokemonSpriteUrl } from '../../../../utils/util';

interface AwayPokemonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMap: (mapId: string, pokemonId: number) => void;
  pd: PlayerData;
}

// === מילון תרגומים ===
const translations = {
  en: {
    'party.away.title': 'Away Pokémon',
    'party.away.stolenTitle': 'Stolen!',
    'party.away.stolenDesc': 'Stolen by',
    'party.away.stolenHint': 'Find them to rescue!',
    'party.away.daycareTitle': 'Day Care',
    'party.away.levelsGained': 'Levels Gained',
    'party.away.nextLevel': 'Next Level in',
    'party.away.steps': 'steps',
    'party.away.status.soon': 'Just deposited... feels too soon.',
    'party.away.status.nice': 'Growing nicely!',
    'party.away.status.energy': "It's full of energy!",
    'party.away.mapBtn': 'View Map',
    'party.away.trainerSteps': 'Trainer Steps',
    'party.away.empty': 'All Pokémon are currently in your party.',
  },
  he: {
    'party.away.title': 'פוקימונים חסרים',
    'party.away.stolenTitle': 'נחטף!',
    'party.away.stolenDesc': 'נגנב על ידי',
    'party.away.stolenHint': 'מצא אותם כדי להציל אותו!',
    'party.away.daycareTitle': 'פנסיון',
    'party.away.levelsGained': 'רמות שעלה',
    'party.away.nextLevel': 'רמה הבאה בעוד',
    'party.away.steps': 'צעדים',
    'party.away.status.soon': 'הופקד לא מזמן... מוקדם מדי.',
    'party.away.status.nice': 'מתפתח יפה מאוד!',
    'party.away.status.energy': 'מלא באנרגיה ומוכן!',
    'party.away.mapBtn': 'הצג מפה',
    'party.away.trainerSteps': 'צעדי מאמן',
    'party.away.empty': 'כל הפוקימונים נמצאים בשישייה שלך.',
  },
};

export const AwayPokemonModal: React.FC<AwayPokemonModalProps> = ({ pd, isOpen, onClose, onNavigateToMap }) => {
  const { locale, isRTL } = useI18n();
  if (!isOpen) return null;

  const t = (key: keyof (typeof translations)['en']) => translations[locale][key];
  const awayPokemon = Object.keys(pd.awayPokemon);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 select-none"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center px-6 py-4 bg-slate-950/50 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <h2 className="text-lg font-semibold tracking-wide bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              {t('party.away.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/80 hover:bg-red-500/20 hover:text-red-400 transition-colors text-slate-400 text-sm font-medium"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 game-scrollbar">
          {awayPokemon.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">{t('party.away.empty')}</div>
          ) : (
            awayPokemon.map((key, idx) => {
              const entry = pd.awayPokemon[key];
              if (entry.kind === 'stolen') {
                return (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-red-950/30 to-slate-900 border border-red-900/40 p-4 shadow-lg hover:border-red-500/40 transition-all duration-300"
                  >
                    {/* תגית סטטוס עליונה */}
                    <div
                      className={`absolute top-3 ${isRTL ? 'left-4' : 'right-4'} bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full`}
                    >
                      {t('party.away.stolenTitle')}
                    </div>

                    <div className="flex items-center gap-4">
                      {/* תמונת פוקימון שנחטף */}
                      <div className="w-14 h-14 bg-gradient-to-b from-red-500/10 to-red-950/40 border border-red-500/30 rounded-xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
                        <img
                          src={getPokemonSpriteUrl(entry.pokemon.id)}
                          alt={entry.pokemon.name}
                          className="w-10 h-10 object-contain select-none"
                        />
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="text-xs text-red-400/70 font-medium">
                          #{entry.pokemon.id.toString().padStart(3, '0')}
                        </div>
                        <div className="text-base font-bold text-slate-200">
                          {getPokemonDisplayName(entry.pokemon.id)}
                        </div>

                        {/* פרטי החוטף */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60">
                          <span className="text-sm">👤</span>
                          <span className="text-xs text-slate-400">
                            {t('party.away.stolenDesc')}{' '}
                            <strong className="text-red-300">
                              {locale === 'he' ? entry.thiefName.he : entry.thiefName.en}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 bg-red-950/20 border border-red-900/20 rounded-lg py-1.5 px-3 text-[11px] text-red-300/80 italic">
                      🎯 {t('party.away.stolenHint')}
                    </div>
                  </div>
                );
              }

              if (entry.kind === 'day-care') {
                const accumulatedSteps = pd.totalSteps - entry.depositedAtSteps;
                const levelsGained = Math.floor(accumulatedSteps / entry.stepsPerLevel);
                const stepsToNextLevel = entry.stepsPerLevel - (accumulatedSteps % entry.stepsPerLevel);

                let statusKey: 'party.away.status.soon' | 'party.away.status.nice' | 'party.away.status.energy' =
                  'party.away.status.soon';
                if (levelsGained > 0 && levelsGained < 5) statusKey = 'party.away.status.nice';
                if (levelsGained >= 5) statusKey = 'party.away.status.energy';

                return (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-950/20 to-slate-900 border border-indigo-900/40 p-4 shadow-lg hover:border-indigo-500/40 transition-all duration-300"
                  >
                    {/* תגית סטטוס פנסיון */}
                    <div
                      className={`absolute top-3 ${isRTL ? 'left-4' : 'right-4'} bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full`}
                    >
                      {t('party.away.daycareTitle')}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-b from-indigo-500/10 to-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
                        <img
                          src={getPokemonSpriteUrl(entry.pokemon.id)}
                          alt={entry.pokemon.name}
                          className="w-10 h-10 object-contain select-none"
                        />
                      </div>

                      <div className="flex-1 space-y-2">
                        <div>
                          <div className="text-xs text-indigo-400/70 font-medium">
                            #{entry.pokemon.id.toString().padStart(3, '0')}
                          </div>
                          <div className="text-base font-bold text-slate-200">
                            {getPokemonDisplayName(entry.pokemon.id)}
                          </div>
                        </div>

                        {/* נתוני רמות וצעדים */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800 text-xs">
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-medium">
                              {t('party.away.levelsGained')}
                            </span>
                            <span className="font-bold text-emerald-400 text-sm">+{levelsGained} LVL</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-medium">
                              {t('party.away.nextLevel')}
                            </span>
                            <span className="font-semibold text-slate-300 text-sm">
                              {stepsToNextLevel}{' '}
                              <span className="text-[10px] text-slate-500">{t('party.away.steps')}</span>
                            </span>
                          </div>
                        </div>

                        {/* טקסט המצב המשתנה */}
                        <p className="text-[11px] text-indigo-300/90 italic bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10">
                          💬 "{t(statusKey)}"
                        </p>

                        {/* כפתור למפה ומיקום */}
                        <div className="flex justify-between items-center pt-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <span>📍</span>
                            <span>{locale === 'he' ? entry.route.he : entry.route.en}</span>
                          </div>
                          <button
                            onClick={() => onNavigateToMap(entry.mapId.split('/')[0], entry.pokemon.id)}
                            className="cursor-pointer text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-md border border-indigo-500/20"
                          >
                            {t('party.away.mapBtn')} {isRTL ? '←' : '→'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })
          )}
        </div>

        <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">{t('party.away.trainerSteps')}</span>
          <span className="font-semibold text-indigo-400 bg-indigo-500/5 px-2.5 py-1 rounded-md border border-indigo-500/10 font-mono tracking-wider">
            {pd.totalSteps.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
