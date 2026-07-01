import { useState } from 'react';
import { useI18n } from '../../../../ui-react/context/i18n-context';
import { getMove, getMoveDisplayName, getPokemonDisplayName } from '../../../../services/pokemon-data';
import { MoveCard, MoveMetaPanel } from '../InspectorPanel/tabs/MovesetTab';
import type { Move, Pokemon, PokemonType } from '../../../../types';

// מילון מקומי פשוט לטובת ה-i18n שלך - תוכל להעביר אותו למערכת הגלובלית בקלות
const DICT = {
  en: {
    wantsToLearn: 'wants to learn',
    selectToDelete: 'Please select a move from your moveset to forget, or skip learning this move.',
    skipBtn: 'Skip Learning',
    skipHover: 'Skip learning {newMove} and keep your current moveset.',
    replaceBtn: 'Replace Move',
    replaceHover: 'Learn {newMove} and forget {oldMove}.',
    confirmSkip: 'Are you sure you want to skip learning {newMove}?',
    confirmReplace: 'Are you sure you want to forget {oldMove} and learn {newMove}?',
    yes: 'Yes',
    no: 'No',
  },
  he: {
    wantsToLearn: 'רוצה ללמוד את',
    selectToDelete: 'אנא בחר מהלך מהסט הנוכחי שלך כדי לשכוח אותו, או דלג על למידת המהלך הנוכחי.',
    skipBtn: 'דלג על הלמידה',
    skipHover: 'ותר על למידת {newMove} והישאר עם סט המהלכים הנוכחי שלך.',
    replaceBtn: 'החלף מהלך',
    replaceHover: 'למד את {newMove} ושכח את {oldMove}.',
    confirmSkip: 'האם אתה בטוח שברצונך לוותר על למידת {newMove}?',
    confirmReplace: 'האם אתה בטוח שברצונך לשכוח את {oldMove} וללמוד את {newMove}?',
    yes: 'כן',
    no: 'לא',
  },
};

interface IMoveLearningProps {
  pokemon: Pokemon;
  newMoveId: Move['id'];
  selectedMoveToDelete: Move | null; // המהלך שנבחר מהפאנל השמאלי (אם יש)
  onConfirmReplace: (oldMoveId: Move['id'], newMoveId: Move['id']) => void;
  onConfirmSkip: () => void;
}

const MoveLearning = ({
  pokemon,
  newMoveId,
  selectedMoveToDelete,
  onConfirmReplace,
  onConfirmSkip,
}: IMoveLearningProps) => {
  const { locale } = useI18n(); // שימוש בשפה הנוכחית מהמערכת שלך
  const t = DICT[locale];
  const [isReplaced, setIsReplaced] = useState(false); // מצב שמציין אם המהלך הוחלף

  // ניהול מצבי אישור (Confirmation View)
  const [confirmationType, setConfirmationType] = useState<'none' | 'skip' | 'replace'>('none');

  // פונקציית עזר להחלפת טקסט דינמי במילון
  const interpolate = (text: string, values: Record<string, string>) => {
    let result = text;
    for (const key in values) {
      result = result.replace(`{${key}}`, values[key]);
    }
    return result;
  };

  const newMoveData = getMove(newMoveId);
  if (!newMoveData) {
    return <div className="text-red-500">Error: Move data not found.</div>;
  }

  const newMove: Move = {
    accuracy: newMoveData.accuracy ?? 0,
    currentPp: newMoveData.pp,
    id: newMoveData.id,
    name: newMoveData.name.en,
    pp: newMoveData.pp,
    power: newMoveData.power ?? 0,
    type: newMoveData.type as PokemonType,
  };
  const newMoveName = newMoveData.name[locale] ?? '???';
  const oldMoveName = selectedMoveToDelete ? getMoveDisplayName(selectedMoveToDelete.id) : '';

  // 1. שלב אישור סופי (Confirmation Screen)
  if (confirmationType !== 'none') {
    return (
      <div className="flex flex-col gap-5 p-5 bg-slate-900/40 rounded-2xl border border-white/5 animate-fade-in text-center">
        <h3 className="text-lg font-bold text-white leading-snug">
          {confirmationType === 'skip'
            ? interpolate(t.confirmSkip, { newMove: newMoveName })
            : interpolate(t.confirmReplace, { oldMove: oldMoveName, newMove: newMoveName })}
        </h3>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              if (confirmationType === 'skip') {
                onConfirmSkip();
              } else if (selectedMoveToDelete) {
                onConfirmReplace(selectedMoveToDelete.id, newMoveId);
                setIsReplaced(true); // עדכון מצב שהמהלך הוחלף
              }
              setConfirmationType('none');
            }}
            className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
          >
            {t.yes}
          </button>
          <button
            onClick={() => setConfirmationType('none')}
            className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl border border-white/10 transition-all transform active:scale-95"
          >
            {t.no}
          </button>
        </div>
      </div>
    );
  }

  // 2. מסך ראשי: בחירה והסברים
  return (
    <div
      className={`flex flex-col gap-4 p-4 bg-slate-900/20 rounded-2xl border border-white/5 h-full justify-between ${isReplaced ? 'pointer-events-none blur-xs ' : ''}`}
    >
      <div className="flex flex-col gap-4">
        <h3 className="text-base font-medium text-white/90 leading-tight">
          <span className="font-bold text-amber-400">{getPokemonDisplayName(pokemon.id)}</span> {t.wantsToLearn}{' '}
          <span className="font-bold text-emerald-400">{newMoveName}</span>
        </h3>

        {/* New Move To learn */}
        <MoveCard
          dragHandlers={null}
          index={0}
          isSelected={true}
          isDragging={false}
          isMoveToDelete={false}
          move={newMove}
          onClick={() => {}}
        />

        {/* פאנל המידע הטכני של המהלך */}
        <MoveMetaPanel move={newMove} />
      </div>

      {/* אזור פעולות והנחיות תחתון */}
      <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
        {/* רמז הדרכה דינמי למשתמש */}
        <p className="text-xs text-white/60 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
          {!selectedMoveToDelete
            ? t.selectToDelete
            : interpolate(t.replaceHover, { oldMove: oldMoveName, newMove: newMoveName })}
        </p>

        <div className="flex flex-col gap-2">
          {/* כפתור החלפה - מופיע רק אם נבחר מהלך מהרשימה השמאלית */}
          {selectedMoveToDelete ? (
            <button
              onClick={() => setConfirmationType('replace')}
              className="group relative flex flex-col items-center justify-center w-full py-3 px-4 bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/10 transition-all duration-200 hover:bg-blue-600 active:scale-98 overflow-hidden"
            >
              <span>{t.replaceBtn}</span>
              {/* רמז מורחב ב-Hover */}
              <span className="max-h-0 opacity-0 text-[10px] font-normal text-blue-100 transition-all duration-300 group-hover:max-h-12 group-hover:opacity-100 group-hover:mt-1">
                {interpolate(t.replaceHover, { oldMove: oldMoveName, newMove: newMoveName })}
              </span>
            </button>
          ) : null}

          {/* כפתור דילוג (Skip) */}
          <button
            onClick={() => setConfirmationType('skip')}
            className="group relative flex flex-col items-center justify-center w-full py-3 px-4 bg-white/5 text-white/80 rounded-xl font-medium border border-white/10 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 active:scale-98 overflow-hidden"
          >
            <span>{t.skipBtn}</span>
            {/* רמז מורחב ב-Hover שבוחן מה יקרה אם נדלג */}
            <span className="max-h-0 opacity-0 text-[10px] font-normal text-white/50 transition-all duration-300 group-hover:max-h-12 group-hover:opacity-100 group-hover:mt-1 group-hover:text-red-300/80">
              {interpolate(t.skipHover, { newMove: newMoveName })}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveLearning;
