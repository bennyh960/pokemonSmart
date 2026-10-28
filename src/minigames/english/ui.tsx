/** Shared pieces of the English modes: word picture, prompt bar with 🔊, progress dots. */

import type { ReactNode } from 'react';
import type { Bilingual } from '../types.js';
import type { Word } from './words.js';
import './english.css';

const PIC_SIZE = { sm: 'h-10 w-10 text-3xl', md: 'h-16 w-16 text-5xl', lg: 'h-24 w-24 text-7xl' } as const;

/** A word's picture: item sprite, emoji, or a colour swatch. */
export function WordPic({ word, size = 'md' }: { word: Word; size?: keyof typeof PIC_SIZE }) {
  const box = `${PIC_SIZE[size]} inline-flex shrink-0 items-center justify-center leading-none`;
  if (word.picture.kind === 'swatch') {
    return (
      <span
        className={`${box} rounded-full border-4 border-white/80 shadow-lg`}
        style={{ background: word.picture.color }}
        aria-hidden
      />
    );
  }
  if (word.picture.kind === 'item') {
    return (
      <img
        src={word.picture.src}
        alt=""
        draggable={false}
        className={`${box} object-contain`}
        style={{ imageRendering: 'pixelated' }}
      />
    );
  }
  return (
    <span className={box} aria-hidden>
      {word.picture.emoji}
    </span>
  );
}

interface PromptBarProps {
  /** English line (always LTR). */
  en: ReactNode;
  /** Hebrew help line, shown when set. */
  he?: ReactNode;
  onSpeak: () => void;
  /** Bump to replay the speaker wobble. */
  speakKey: number;
  speakLabel: string;
}

/** The glass bar on top of a question: 🔊 + English prompt + optional Hebrew help. */
export function PromptBar({ en, he, onSpeak, speakKey, speakLabel }: PromptBarProps) {
  return (
    <div className="mg-glass flex w-full max-w-2xl items-center gap-3 rounded-3xl px-4 py-3">
      <button
        type="button"
        tabIndex={-1}
        aria-label={speakLabel}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSpeak}
        key={speakKey}
        className={`mg-en-speaker ${speakKey ? 'is-playing' : ''}`}
      >
        🔊
      </button>
      <div className="min-w-0 flex-1">
        <p dir="ltr" className="text-start text-lg font-black leading-tight text-white drop-shadow sm:text-2xl">
          {en}
        </p>
        {he && (
          <p dir="rtl" className="mg-slide-up mt-1 text-base font-bold text-yellow-200 sm:text-lg">
            {he}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProgressDots({ total, current, solved }: { total: number; current: number; solved: boolean }) {
  return (
    <div className="flex gap-1.5" dir="ltr" aria-label={`${current + 1}/${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < current || (i === current && solved);
        return (
          <span
            key={i}
            className={`h-3 w-3 rounded-full transition-all duration-300 ${
              done ? 'bg-yellow-300 shadow' : i === current ? 'mg-glow scale-125 bg-white' : 'bg-white/30'
            }`}
          />
        );
      })}
    </div>
  );
}

/** Shared strings of the English modes. */
export const EN_TEXT = {
  replay: { en: 'Play the sound again', he: 'להשמיע שוב' },
  inHebrew: { en: 'In Hebrew:', he: 'בעברית:' },
} satisfies Record<string, Bilingual>;

/** Floating praise after a correct answer — English on purpose (short words kids pick up). */
export const PRAISE = ['Great!', 'Super!', 'Awesome!', 'Yes!', 'Wow!', 'Perfect!'];
