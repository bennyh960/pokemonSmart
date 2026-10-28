/**
 * AudioManager - Sound and music management using Howler.js.
 *
 * Handles background music playback (looping), SFX one-shots,
 * crossfading between tracks, volume control (music/sfx independent),
 * and mute toggle (M key).
 */

import { Howl, Howler } from 'howler';
import { toAssetUrl } from '../engine/asset-path.js';

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

/** Track definitions: key → file path under public/audio/ */
const MUSIC_TRACKS: Record<string, string> = {
  title: toAssetUrl('audio/music/title.mp3'),
  town: toAssetUrl('audio/music/town.mp3'),
  town2: toAssetUrl('audio/music/town2.mp3'),
  town3: toAssetUrl('audio/music/town3.mp3'),
  town4: toAssetUrl('audio/music/town4.mp3'),
  route: toAssetUrl('audio/music/route.mp3'),
  battle: toAssetUrl('audio/music/battle.mp3'),
  'gym-battle': toAssetUrl('audio/music/gym-battle.mp3'),
  victory: toAssetUrl('audio/music/victory.mp3'),
  pokecenter: toAssetUrl('audio/music/pokecenter.mp3'),
  shop: toAssetUrl('audio/music/shop.mp3'),
  'team-rocket-bgm': toAssetUrl('audio/music/team-rocket-bgm.mp3'),
  'team-rocket-grunt': toAssetUrl('audio/music/team-rocket-grunt.mp3'),
  challenger: toAssetUrl('audio/music/challenger.mp3'),
};

/** Exported list of music track keys — used by map editor settings. */
export const MUSIC_TRACK_KEYS = Object.keys(MUSIC_TRACKS);

const SFX_TRACKS: Record<string, string> = {
  'menu-select': toAssetUrl('audio/sfx/menu-select.wav'),
  'menu-cancel': toAssetUrl('audio/sfx/menu-cancel.wav'),
  hit: toAssetUrl('audio/sfx/hit.wav'),
  'text-blip': toAssetUrl('audio/sfx/text-blip.wav'),
  heal: toAssetUrl('audio/sfx/menu-select.wav'),
  'pokecenter-heal': toAssetUrl('audio/sfx/heal.mp3'),
  'item-found': toAssetUrl('audio/sfx/item-found.mp3'),
  'pokemon-returned': toAssetUrl('audio/sfx/item-found.mp3'),
  'bump-wall': toAssetUrl('audio/sfx/bumpintowall.mp3'),
  splash: toAssetUrl('audio/sfx/menu-select.wav'),
  confirm: toAssetUrl('audio/sfx/confirm.mp3'),
  'pokeball-return': toAssetUrl('audio/sfx/menu-cancel.wav'),
};

/** Default crossfade duration in ms. */
const DEFAULT_CROSSFADE_MS = 500;

// ── Synth building blocks ──────────────────────────────────────────────────

interface ToneSequenceOptions {
  notes: number[];
  durations: number[];
  type: OscillatorType;
  gain: number;
  spacing?: number;
  sweepTo?: number | null;
  /** Seconds to wait before the first note. */
  delay?: number;
}

interface NoiseBurstOptions {
  filter: BiquadFilterType;
  freq: number;
  sweepTo?: number;
  q?: number;
  duration: number;
  gain: number;
  delay?: number;
}

type CueLayer = ToneSequenceOptions | NoiseBurstOptions;

// ── Mini-game cues ─────────────────────────────────────────────────────────
// Bright, bouncy, never harsh. Each cue is a list of layers (tones + noise) built from options.

export interface MiniGameCueOptions {
  /** mg-correct: combo step (0 = first). mg-star: star index 0–2. mg-count: 3/2/1. mg-prize: tier 0–3 (3 = epic). */
  step?: number;
  /** mg-tick: true in the last 2 seconds (higher, sharper). */
  urgent?: boolean;
}

const C5 = 523.25;
/** C-major pentatonic, so any run of steps sounds happy. */
const PENTATONIC = [0, 2, 4, 7, 9];
const MAX_CORRECT_STEP = 11; // D7 — anything higher gets shrill

function pentatonicFreq(step: number): number {
  const s = Math.max(0, Math.min(MAX_CORRECT_STEP, Math.floor(step)));
  const semis = Math.floor(s / PENTATONIC.length) * 12 + PENTATONIC[s % PENTATONIC.length];
  return C5 * 2 ** (semis / 12);
}

/** A glassy bell: sine fundamental + soft overtones + a tiny strike click. */
function bell(freq: number, delay = 0, len = 0.45, gain = 0.3): CueLayer[] {
  return [
    { notes: [freq], durations: [len], type: 'sine', gain, delay },
    { notes: [freq * 2], durations: [len * 0.4], type: 'triangle', gain: gain * 0.3, delay },
    { notes: [freq * 3], durations: [len * 0.18], type: 'sine', gain: gain * 0.15, delay },
    { notes: [freq * 4], durations: [0.02], type: 'square', gain: gain * 0.08, delay },
  ];
}

/** Quick rising sparkle of high sine notes. */
function sparkle(notes: number[], delay = 0, gain = 0.12): CueLayer[] {
  return [
    { notes, durations: [0.06], type: 'sine', gain, spacing: 0.012, delay },
    { filter: 'highpass', freq: 6000, duration: 0.05 + notes.length * 0.07, gain: 0.04, delay },
  ];
}

function chord(freqs: number[], delay: number, len: number, gain: number, type: OscillatorType = 'triangle'): CueLayer[] {
  return freqs.map((f) => ({ notes: [f], durations: [len], type, gain, delay }));
}

const MINI_GAME_CUES = {
  'mg-tap': (): CueLayer[] => [
    { notes: [1250], durations: [0.04], type: 'triangle', gain: 0.22, sweepTo: 650 },
    { notes: [2600], durations: [0.015], type: 'sine', gain: 0.07 },
  ],
  'mg-correct': ({ step = 0 }: MiniGameCueOptions): CueLayer[] => {
    const f = pentatonicFreq(step);
    return [
      { notes: [f * 0.75], durations: [0.035], type: 'sine', gain: 0.12 }, // grace note → "b-ling"
      ...bell(f, 0.035, 0.42, 0.3),
      ...(step >= MAX_CORRECT_STEP ? sparkle([f * 1.5, f * 2], 0.1, 0.08) : []),
    ];
  },
  'mg-combo-5': (): CueLayer[] => [
    { filter: 'bandpass', freq: 400, sweepTo: 5000, q: 0.8, duration: 0.35, gain: 0.14 },
    { notes: [1046.5, 1318.5, 1568, 2093, 2637], durations: [0.07], type: 'sine', gain: 0.2, spacing: 0.01, delay: 0.05 },
    { notes: [523.25, 659.25, 784, 1046.5, 1318.5], durations: [0.07], type: 'triangle', gain: 0.1, spacing: 0.01, delay: 0.05 },
    ...bell(2093, 0.45, 0.5, 0.16),
  ],
  'mg-wrong': (): CueLayer[] => [
    { notes: [330], durations: [0.1], type: 'triangle', gain: 0.24, sweepTo: 294 },
    { notes: [247], durations: [0.2], type: 'triangle', gain: 0.24, sweepTo: 196, delay: 0.12 },
    { notes: [165], durations: [0.24], type: 'sine', gain: 0.12, delay: 0.1 },
  ],
  'mg-count': (): CueLayer[] => [
    { notes: [587.33], durations: [0.18], type: 'triangle', gain: 0.26 },
    { notes: [1174.66], durations: [0.1], type: 'sine', gain: 0.1 },
    { notes: [587.33], durations: [0.08], type: 'square', gain: 0.04 },
  ],
  'mg-go': (): CueLayer[] => [
    { filter: 'bandpass', freq: 600, sweepTo: 6000, q: 0.7, duration: 0.3, gain: 0.1 },
    ...chord([523.25, 659.25, 784, 1046.5], 0, 0.6, 0.13),
    { notes: [1046.5], durations: [0.35], type: 'square', gain: 0.05 },
    { notes: [261.63], durations: [0.5], type: 'sine', gain: 0.2 },
    ...sparkle([2093, 2637, 3136], 0.12, 0.09),
  ],
  'mg-star': ({ step = 0 }: MiniGameCueOptions): CueLayer[] => {
    const f = [1046.5, 1318.5, 1568][Math.max(0, Math.min(2, step))]; // C6 → E6 → G6, a third each
    return [...bell(f, 0, 0.6, 0.28), ...bell(f * 2, 0.02, 0.25, 0.08), ...sparkle([f * 2, f * 2.5], 0.08, 0.06)];
  },
  'mg-clear': (): CueLayer[] => [
    { notes: [392, 523.25, 659.25, 784], durations: [0.09], type: 'triangle', gain: 0.24, spacing: 0.015 },
    { notes: [392, 523.25, 659.25, 784], durations: [0.09], type: 'square', gain: 0.05, spacing: 0.015 },
    { notes: [659.25, 784], durations: [0.08], type: 'triangle', gain: 0.22, spacing: 0.04, delay: 0.44 },
    ...chord([523.25, 659.25, 784, 1046.5], 0.66, 0.65, 0.13),
    { notes: [1046.5], durations: [0.5], type: 'square', gain: 0.05, delay: 0.66 },
    { notes: [130.81], durations: [0.6], type: 'sine', gain: 0.22, delay: 0.66 },
    ...sparkle([2093, 2637, 3136, 4186], 0.72, 0.1),
  ],
  'mg-record': (): CueLayer[] => [
    { notes: [392], durations: [0.35], type: 'sine', gain: 0.22, sweepTo: 1568 },
    { notes: [784], durations: [0.35], type: 'triangle', gain: 0.07, sweepTo: 3136 },
    ...bell(2093, 0.36, 0.4, 0.2),
    ...bell(2637, 0.46, 0.45, 0.18),
  ],
  'mg-ball-shake': (): CueLayer[] => [
    { filter: 'bandpass', freq: 2400, q: 2, duration: 0.05, gain: 0.2 },
    { notes: [560], durations: [0.045], type: 'square', gain: 0.09, sweepTo: 470 },
    { filter: 'bandpass', freq: 2000, q: 2, duration: 0.05, gain: 0.16, delay: 0.09 },
    { notes: [500], durations: [0.045], type: 'square', gain: 0.08, sweepTo: 420, delay: 0.09 },
  ],
  'mg-prize': ({ step = 0 }: MiniGameCueOptions): CueLayer[] => {
    const tier = Math.max(0, Math.min(3, step));
    const layers: CueLayer[] = [
      { notes: [784], durations: [0.09], type: 'triangle', gain: 0.24 }, // "ta-"
      ...chord(tier >= 2 ? [1046.5, 1318.5, 1568, 2093] : [1046.5, 1318.5, 1568], 0.11, 0.75, 0.12), // "-da!"
      { notes: [1046.5], durations: [0.4], type: 'square', gain: 0.05, delay: 0.11 },
      { notes: [261.63], durations: [0.6], type: 'sine', gain: 0.2, delay: 0.11 },
    ];
    if (tier >= 1) layers.push(...sparkle([2093, 2637, 3136], 0.2, 0.08));
    if (tier >= 3) {
      // epic: long shimmering tail
      layers.push(
        {
          notes: [2637, 3136, 2349, 2793, 2637, 3136, 3520, 4186],
          durations: [0.05],
          type: 'sine',
          gain: 0.1,
          spacing: 0.02,
          delay: 0.45,
        },
        { filter: 'highpass', freq: 5000, sweepTo: 9000, duration: 0.9, gain: 0.05, delay: 0.4 },
        ...bell(4186, 1.05, 0.6, 0.1),
      );
    }
    return layers;
  },
  'mg-tick': ({ urgent = false }: MiniGameCueOptions): CueLayer[] => [
    { notes: [urgent ? 2100 : 1600], durations: [0.025], type: 'triangle', gain: urgent ? 0.18 : 0.13 },
    { notes: [urgent ? 4200 : 3200], durations: [0.01], type: 'sine', gain: 0.05 },
  ],
} satisfies Record<string, (opts: MiniGameCueOptions) => CueLayer[]>;

export type MiniGameCue = keyof typeof MINI_GAME_CUES;

function createWebAudioContext(): AudioContext | null {
  const ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  return ctor ? new ctor() : null;
}

export function createAudioManager() {
  /** The currently playing music Howl instance. */
  let currentHowl: Howl | null = null;
  let currentTrack: string | null = null;
  let synthContext: AudioContext | null = null;

  /** Cached SFX Howl instances. */
  const sfxCache = new Map<string, Howl>();

  /** Lazy-loaded letter phonics (null = file missing, use SpeechSynthesis). */
  const letterCache = new Map<string, Howl | null>();
  /** Lazy-loaded word audio (null = file missing, use SpeechSynthesis). */
  const wordCache = new Map<string, Howl | null>();

  let musicVolume = Number(localStorage.getItem('musicVolume') ?? '0.6');
  let sfxVolume = Number(localStorage.getItem('sfxVolume') ?? '0.3');

  let masterMuted = localStorage.getItem('masterMuted') === 'true';
  let musicMuted = localStorage.getItem('musicMuted') === 'true';
  let sfxMuted = localStorage.getItem('sfxMuted') === 'true';
  /** Temporary ceiling on music volume (not saved) — e.g. mini-games keep music quiet under speech. */
  let musicCap = 1;

  /** The volume music actually plays at: mute, the player's setting, and the temporary cap. */
  function musicLevel(): number {
    return masterMuted || musicMuted ? 0 : Math.min(musicVolume, musicCap);
  }

  function speakText(text: string, rate: number): void {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.rate = rate;
    utt.volume = sfxVolume;
    window.speechSynthesis.speak(utt);
  }

  function withSynthContext(run: (actx: AudioContext) => void): void {
    if (masterMuted || sfxMuted) return;
    synthContext ??= createWebAudioContext();
    if (!synthContext) return;

    if (synthContext.state === 'suspended') {
      void synthContext
        .resume()
        .then(() => run(synthContext!))
        .catch(() => {});
      return;
    }

    run(synthContext);
  }

  /** Create a fresh Howl for a music track (no caching — avoids stale state). */
  function newMusicHowl(key: string): Howl | null {
    const src = MUSIC_TRACKS[key];
    if (!src) {
      console.warn(`[AudioManager] Unknown music track: "${key}"`);
      return null;
    }
    return new Howl({
      src: [src],
      loop: true,
      volume: musicLevel(),
    });
  }

  function getSfxHowl(key: string): Howl | null {
    const src = SFX_TRACKS[key];
    if (!src) {
      console.warn(`[AudioManager] Unknown SFX: "${key}"`);
      return null;
    }
    if (!sfxCache.has(key)) {
      sfxCache.set(
        key,
        new Howl({
          src: [src],
          volume: masterMuted || sfxMuted ? 0 : sfxVolume,
        }),
      );
    }
    return sfxCache.get(key)!;
  }

  /** Play a synthesized level-up jingle (ascending arpeggio) via Web Audio API. */
  function playLevelUpJingle(): void {
    withSynthContext((actx) => {
      const vol = actx.createGain();
      vol.gain.value = sfxVolume * 0.4;
      vol.connect(actx.destination);

      // Ascending notes: C5 → E5 → G5 → C6 (classic level-up feel)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const noteLen = 0.12;
      notes.forEach((freq, i) => {
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.6, actx.currentTime + i * noteLen);
        env.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + i * noteLen + noteLen * 0.9);
        osc.connect(env);
        env.connect(vol);
        osc.start(actx.currentTime + i * noteLen);
        osc.stop(actx.currentTime + i * noteLen + noteLen);
      });

      const chordTime = notes.length * noteLen;
      [523.25, 783.99, 1046.5].forEach((freq) => {
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.4, actx.currentTime + chordTime);
        env.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + chordTime + 0.4);
        osc.connect(env);
        env.connect(vol);
        osc.start(actx.currentTime + chordTime);
        osc.stop(actx.currentTime + chordTime + 0.5);
      });
    });
  }

  function playCaptureSuccessJingle(): void {
    withSynthContext((actx) => {
      const vol = actx.createGain();
      vol.gain.value = sfxVolume * 0.32;
      vol.connect(actx.destination);

      const clicks = [880, 880, 880];
      const clickLen = 0.07;
      clicks.forEach((freq, i) => {
        const start = actx.currentTime + i * 0.12;
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, start);
        env.gain.setValueAtTime(0.001, start);
        env.gain.exponentialRampToValueAtTime(0.45, start + 0.01);
        env.gain.exponentialRampToValueAtTime(0.01, start + clickLen);
        osc.connect(env);
        env.connect(vol);
        osc.start(start);
        osc.stop(start + clickLen);
      });

      const chimeStart = actx.currentTime + 0.39;
      [1174.66, 1567.98].forEach((freq, i) => {
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, chimeStart);
        env.gain.setValueAtTime(0.001, chimeStart);
        env.gain.exponentialRampToValueAtTime(0.32 - i * 0.06, chimeStart + 0.02);
        env.gain.exponentialRampToValueAtTime(0.01, chimeStart + 0.28);
        osc.connect(env);
        env.connect(vol);
        osc.start(chimeStart);
        osc.stop(chimeStart + 0.3);
      });
    });
  }

  function playToneSequence(options: ToneSequenceOptions): void {
    withSynthContext((actx) => {
      const vol = actx.createGain();
      vol.gain.value = sfxVolume * options.gain;
      vol.connect(actx.destination);

      let cursor = actx.currentTime + (options.delay ?? 0);
      const spacing = options.spacing ?? 0.01;
      options.notes.forEach((freq, i) => {
        const duration = options.durations[Math.min(i, options.durations.length - 1)];
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = options.type;
        osc.frequency.setValueAtTime(freq, cursor);
        if (options.sweepTo != null) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.sweepTo), cursor + duration);
        }
        env.gain.setValueAtTime(0.001, cursor);
        env.gain.exponentialRampToValueAtTime(0.5, cursor + 0.01);
        env.gain.exponentialRampToValueAtTime(0.01, cursor + duration);
        osc.connect(env);
        env.connect(vol);
        osc.start(cursor);
        osc.stop(cursor + duration);
        cursor += duration + spacing;
      });
    });
  }

  /** One white-noise buffer per context, reused by every noise burst. */
  let noiseBuffer: AudioBuffer | null = null;

  /** Filtered white-noise burst (whoosh, rattle, sparkle). */
  function playNoiseBurst(options: NoiseBurstOptions): void {
    withSynthContext((actx) => {
      if (!noiseBuffer || noiseBuffer.sampleRate !== actx.sampleRate) {
        noiseBuffer = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      const start = actx.currentTime + (options.delay ?? 0);
      const src = actx.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = actx.createBiquadFilter();
      filter.type = options.filter;
      filter.Q.value = options.q ?? 1;
      filter.frequency.setValueAtTime(options.freq, start);
      if (options.sweepTo != null) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(20, options.sweepTo), start + options.duration);
      }
      const env = actx.createGain();
      env.gain.setValueAtTime(0.001, start);
      env.gain.exponentialRampToValueAtTime(sfxVolume * options.gain, start + Math.min(0.02, options.duration / 3));
      env.gain.exponentialRampToValueAtTime(0.001, start + options.duration);
      src.connect(filter);
      filter.connect(env);
      env.connect(actx.destination);
      src.start(start);
      src.stop(start + options.duration);
    });
  }

  /** Play a named mini-game cue from MINI_GAME_CUES (layers of tones + noise). */
  function playMiniGameCue(name: MiniGameCue, opts: MiniGameCueOptions = {}): void {
    const build: (o: MiniGameCueOptions) => CueLayer[] = MINI_GAME_CUES[name];
    for (const layer of build(opts)) {
      if ('filter' in layer) playNoiseBurst(layer);
      else playToneSequence(layer);
    }
  }

  function playEvolutionStart(): void {
    playToneSequence({
      notes: [261.63, 329.63, 392.0, 523.25],
      durations: [0.22, 0.22, 0.22, 0.38],
      type: 'triangle',
      gain: 0.22,
      spacing: 0.03,
    });
  }

  function playEvolutionFinish(): void {
    playToneSequence({
      notes: [523.25, 659.25, 783.99, 1046.5],
      durations: [0.1, 0.1, 0.14, 0.32],
      type: 'sawtooth',
      gain: 0.18,
      spacing: 0.02,
    });
  }

  function playSendOutCue(): void {
    playToneSequence({
      notes: [740, 990],
      durations: [0.06, 0.12],
      type: 'square',
      gain: 0.16,
      spacing: 0.01,
    });
  }

  function playWithdrawCue(): void {
    playToneSequence({
      notes: [960],
      durations: [0.14],
      type: 'triangle',
      gain: 0.14,
      sweepTo: 280,
    });
  }

  function playCaptureShakeCue(): void {
    playToneSequence({
      notes: [540],
      durations: [0.05],
      type: 'square',
      gain: 0.11,
      sweepTo: 500,
    });
  }

  function playBreakFreeCue(): void {
    playToneSequence({
      notes: [320, 220],
      durations: [0.05, 0.1],
      type: 'sawtooth',
      gain: 0.16,
      spacing: 0.005,
    });
  }

  function playRunCue(): void {
    playToneSequence({
      notes: [640],
      durations: [0.12],
      type: 'triangle',
      gain: 0.1,
      sweepTo: 260,
    });
  }

  function playBadgeEarnedJingle(): void {
    withSynthContext((actx) => {
      const vol = actx.createGain();
      vol.gain.value = sfxVolume * 0.38;
      vol.connect(actx.destination);

      // Triumphant ascending arpeggio: G4 → B4 → D5 → G5 → B5
      const arpNotes = [392.0, 493.88, 587.33, 783.99, 987.77];
      const arpLen = 0.09;
      arpNotes.forEach((freq, i) => {
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.55, actx.currentTime + i * arpLen);
        env.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + i * arpLen + arpLen * 0.85);
        osc.connect(env);
        env.connect(vol);
        osc.start(actx.currentTime + i * arpLen);
        osc.stop(actx.currentTime + i * arpLen + arpLen);
      });

      // Final G major chord (G4 + D5 + G5 + B5)
      const chordStart = actx.currentTime + arpNotes.length * arpLen + 0.04;
      const chordDur = 0.7;
      [392.0, 587.33, 783.99, 987.77].forEach((freq) => {
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.001, chordStart);
        env.gain.exponentialRampToValueAtTime(0.45, chordStart + 0.02);
        env.gain.exponentialRampToValueAtTime(0.01, chordStart + chordDur);
        osc.connect(env);
        env.connect(vol);
        osc.start(chordStart);
        osc.stop(chordStart + chordDur);
      });
    });
  }

  function playFaintCue(): void {
    playToneSequence({
      notes: [280, 220, 180],
      durations: [0.09, 0.09, 0.18],
      type: 'triangle',
      gain: 0.14,
      spacing: 0.01,
    });
  }

  function playItemPickup(): void {
    playToneSequence({
      notes: [523.25, 659.25, 783.99, 1046.5],
      durations: [0.07, 0.07, 0.07, 0.18],
      type: 'triangle',
      gain: 0.18,
      spacing: 0.01,
    });
  }

  function playTrainerSpot(): void {
    // Sharp high "!" pop, then two deep GBC-style hits: POP → DUN → DUN
    playToneSequence({
      notes: [1047, 196, 175],
      durations: [0.05, 0.13, 0.18],
      type: 'square',
      gain: 0.26,
      spacing: 0.04,
    });
  }

  function playTrainerStep(): void {
    playToneSequence({
      notes: [120],
      durations: [0.05],
      type: 'square',
      gain: 0.08,
      spacing: 0,
      sweepTo: 80,
    });
  }

  function playAlert(): void {
    playToneSequence({
      notes: [880, 1100, 880],
      durations: [0.07, 0.07, 0.1],
      type: 'square',
      gain: 0.22,
      spacing: 0.06,
    });
  }

  function playThunder(): void {
    withSynthContext((actx) => {
      const vol = actx.createGain();
      vol.gain.value = sfxVolume * 0.25;
      vol.connect(actx.destination);
      const bursts: [number, number][] = [
        [1200, 200],
        [900, 150],
        [600, 80],
      ];
      bursts.forEach(([from, to], i) => {
        const start = actx.currentTime + i * 0.08;
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(from, start);
        osc.frequency.exponentialRampToValueAtTime(to, start + 0.12);
        env.gain.setValueAtTime(0.001, start);
        env.gain.exponentialRampToValueAtTime(0.6, start + 0.01);
        env.gain.exponentialRampToValueAtTime(0.01, start + 0.15);
        osc.connect(env);
        env.connect(vol);
        osc.start(start);
        osc.stop(start + 0.18);
      });
    });
  }

  function playPhoneRing(): void {
    withSynthContext((actx) => {
      const vol = actx.createGain();
      vol.gain.value = sfxVolume * 0.2;
      vol.connect(actx.destination);
      [0, 0.6].forEach((offset) => {
        [480, 620].forEach((freq) => {
          const osc = actx.createOscillator();
          const env = actx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          env.gain.setValueAtTime(0.001, actx.currentTime + offset);
          env.gain.exponentialRampToValueAtTime(0.5, actx.currentTime + offset + 0.02);
          env.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + offset + 0.35);
          osc.connect(env);
          env.connect(vol);
          osc.start(actx.currentTime + offset);
          osc.stop(actx.currentTime + offset + 0.38);
        });
      });
    });
  }

  function playRivalEncounter(): void {
    withSynthContext((actx) => {
      const vol = actx.createGain();
      vol.gain.value = sfxVolume * 0.28;
      vol.connect(actx.destination);
      const steps = [
        { freq: 1320, dur: 0.04, t: 0 },
        { freq: 660, dur: 0.08, t: 0.06 },
        { freq: 494, dur: 0.08, t: 0.15 },
        { freq: 370, dur: 0.18, t: 0.24 },
      ];
      steps.forEach(({ freq, dur, t }) => {
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.001, actx.currentTime + t);
        env.gain.exponentialRampToValueAtTime(0.55, actx.currentTime + t + 0.01);
        env.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + t + dur);
        osc.connect(env);
        env.connect(vol);
        osc.start(actx.currentTime + t);
        osc.stop(actx.currentTime + t + dur + 0.01);
      });
    });
  }

  function playTeamRocketEncounter(): void {
    withSynthContext((actx) => {
      const vol = actx.createGain();
      vol.gain.value = sfxVolume * 0.3;
      vol.connect(actx.destination);
      const steps: { freq: number; dur: number; t: number; oscType: OscillatorType }[] = [
        { freq: 110, dur: 0.22, t: 0, oscType: 'sawtooth' },
        { freq: 146, dur: 0.18, t: 0.02, oscType: 'sawtooth' },
        { freq: 220, dur: 0.12, t: 0.18, oscType: 'square' },
        { freq: 185, dur: 0.16, t: 0.18, oscType: 'square' },
      ];
      steps.forEach(({ freq, dur, t, oscType }) => {
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = oscType;
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.001, actx.currentTime + t);
        env.gain.exponentialRampToValueAtTime(0.5, actx.currentTime + t + 0.015);
        env.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + t + dur);
        osc.connect(env);
        env.connect(vol);
        osc.start(actx.currentTime + t);
        osc.stop(actx.currentTime + t + dur + 0.01);
      });
    });
  }

  function playGymLeaderEncounter(): void {
    withSynthContext((actx) => {
      const vol = actx.createGain();
      vol.gain.value = sfxVolume * 0.32;
      vol.connect(actx.destination);
      const arpNotes = [261.63, 329.63, 392.0, 523.25];
      const arpLen = 0.1;
      arpNotes.forEach((freq, i) => {
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.001, actx.currentTime + i * arpLen);
        env.gain.exponentialRampToValueAtTime(0.5, actx.currentTime + i * arpLen + 0.015);
        env.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + i * arpLen + arpLen * 0.9);
        osc.connect(env);
        env.connect(vol);
        osc.start(actx.currentTime + i * arpLen);
        osc.stop(actx.currentTime + i * arpLen + arpLen);
      });
      const chordStart = actx.currentTime + arpNotes.length * arpLen + 0.03;
      [261.63, 392.0, 659.25].forEach((freq) => {
        const osc = actx.createOscillator();
        const env = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.001, chordStart);
        env.gain.exponentialRampToValueAtTime(0.42, chordStart + 0.02);
        env.gain.exponentialRampToValueAtTime(0.01, chordStart + 0.55);
        osc.connect(env);
        env.connect(vol);
        osc.start(chordStart);
        osc.stop(chordStart + 0.6);
      });
    });
  }

  const SYNTH_DISPATCH: Record<string, () => void> = {
    alert: playAlert,
    thunder: playThunder,
    'phone-ring': playPhoneRing,
    'rival-encounter': playRivalEncounter,
    'team-rocket-encounter': playTeamRocketEncounter,
    'gym-leader-encounter': playGymLeaderEncounter,
  };

  function playAttackFamilyCue(family: 'lunge' | 'projectile' | 'beam' | 'pulse' | 'burst'): void {
    switch (family) {
      case 'lunge':
        playToneSequence({
          notes: [520, 380],
          durations: [0.04, 0.06],
          type: 'square',
          gain: 0.1,
          spacing: 0.005,
        });
        break;
      case 'projectile':
        playToneSequence({
          notes: [460, 620, 760],
          durations: [0.03, 0.03, 0.08],
          type: 'triangle',
          gain: 0.1,
          spacing: 0.01,
        });
        break;
      case 'beam':
        playToneSequence({
          notes: [280, 420, 680],
          durations: [0.05, 0.05, 0.16],
          type: 'sawtooth',
          gain: 0.11,
          spacing: 0.005,
        });
        break;
      case 'pulse':
        manager.playSFX('menu-select');
        playToneSequence({
          notes: [440, 660, 880],
          durations: [0.08, 0.1, 0.18],
          type: 'square',
          gain: 0.2,
          spacing: 0.015,
        });
        break;
      case 'burst':
        playToneSequence({
          notes: [180, 140],
          durations: [0.06, 0.16],
          type: 'sawtooth',
          gain: 0.14,
          spacing: 0.005,
        });
        break;
    }
  }

  const manager = {
    playMusic(trackKey: string): void {
      if (currentTrack === trackKey && currentHowl && currentHowl.playing()) {
        return; // already playing this track
      }

      // Stop whatever is currently playing
      if (currentHowl) {
        currentHowl.stop();
        currentHowl.unload();
        currentHowl = null;
      }

      const howl = newMusicHowl(trackKey);
      if (!howl) return;
      currentHowl = howl;
      currentTrack = trackKey;
      howl.play();
    },

    stopMusic(fadeMs = DEFAULT_CROSSFADE_MS): void {
      if (!currentHowl) return;
      if (fadeMs > 0 && currentHowl.playing()) {
        const h = currentHowl;
        h.fade(h.volume(), 0, fadeMs);
        h.once('fade', () => {
          h.stop();
          h.unload();
        });
      } else {
        currentHowl.stop();
        currentHowl.unload();
      }
      currentHowl = null;
      currentTrack = null;
    },

    playSFX(sfxKey: string): void {
      if (SYNTH_DISPATCH[sfxKey]) {
        SYNTH_DISPATCH[sfxKey]();
        return;
      }
      const howl = getSfxHowl(sfxKey);
      if (!howl) return;
      howl.volume(masterMuted || sfxMuted ? 0 : sfxVolume);
      howl.play();
    },

    preloadMoveSFX(moveNames: string[]): void {
      for (const moveName of moveNames) {
        const key = moveToSfxKey(moveName);

        if (sfxCache.has(key)) continue;

        const src = toAssetUrl(`audio/movesSFX/${key}.mp3`);

        const howl = new Howl({
          src: [src],
          preload: true, // כופה על דפדפן להוריד את הקובץ מיד
          volume: sfxVolume,
          onload: () => {
            // console.log(`[MoveSFX Preload] Loaded and cached: "${key}"`);
          },
          onloaderror: () => {
            // To prevent load this to cache again
            const SILENT_HOWL = new Howl({ src: ['data:audio/mp3;base64,SUQzBA=='], volume: 0 });
            sfxCache.set(key, SILENT_HOWL);
          },
        });

        sfxCache.set(key, howl);
      }
    },

    playMoveSFX(moveName: string): void {
      if (masterMuted || sfxMuted) return;
      const key = moveToSfxKey(moveName);
      const src = toAssetUrl(`audio/movesSFX/${key}.mp3`);
      const howl = new Howl({
        src: [src],
        volume: sfxVolume,
        onloaderror: (_id, err) => {
          console.warn(`[MoveSFX] Load error for "${key}":`, err, '→ falling back to hit');
          getSfxHowl('hit')?.play();
        },
      });
      howl.play();
    },

    crossfade(_fromTrack: string, toTrack: string, durationMs = DEFAULT_CROSSFADE_MS): void {
      // Fade out old
      if (currentHowl && currentHowl.playing()) {
        const old = currentHowl;
        old.fade(old.volume(), 0, durationMs);
        old.once('fade', () => {
          old.stop();
          old.unload();
        });
      } else if (currentHowl) {
        currentHowl.stop();
        currentHowl.unload();
      }

      // Create and fade in new
      const howl = newMusicHowl(toTrack);
      if (howl) {
        howl.volume(0);
        howl.play();
        howl.fade(0, musicLevel(), durationMs);
        currentHowl = howl;
      } else {
        currentHowl = null;
      }
      currentTrack = toTrack;
    },

    setMusicVolume(volume: number): void {
      console.debug(`[AudioManager] Setting music volume to ${volume}`);
      musicVolume = Math.max(0.025, Math.min(1, volume));
      localStorage.setItem('musicVolume', musicVolume.toString());

      if (currentHowl) {
        currentHowl.volume(musicLevel());
      }
    },

    /** Cap music at `cap` (0–1) without changing the saved setting; null removes the cap. */
    setMusicCap(cap: number | null): void {
      musicCap = cap === null ? 1 : Math.max(0, Math.min(1, cap));
      if (currentHowl) currentHowl.volume(musicLevel());
    },

    setSFXVolume(volume: number): void {
      sfxVolume = Math.max(0, Math.min(1, volume));
      localStorage.setItem('sfxVolume', sfxVolume.toString());

      const isMuted = masterMuted || sfxMuted;
      for (const howl of sfxCache.values()) {
        howl.volume(isMuted ? 0 : sfxVolume);
      }
    },

    setMasterVolume(volume: number): void {
      Howler.volume(Math.max(0, Math.min(1, volume)));
    },

    setMusicMuted(value: boolean): void {
      if (musicMuted === value) return;
      musicMuted = value;
      localStorage.setItem('musicMuted', String(value));

      if (currentHowl) {
        currentHowl.volume(musicLevel());
      }
    },

    setSFXMuted(value: boolean): void {
      if (sfxMuted === value) return;
      sfxMuted = value;
      localStorage.setItem('sfxMuted', String(value));

      const shouldMute = masterMuted || sfxMuted;
      for (const howl of sfxCache.values()) {
        howl.volume(shouldMute ? 0 : sfxVolume);
      }
    },
    setMasterMuted(value: boolean): void {
      if (masterMuted === value) return;
      masterMuted = value;
      localStorage.setItem('masterMuted', String(value));

      // עדכון מוזיקה
      if (currentHowl) {
        currentHowl.volume(musicLevel());
      }
      // עדכון אפקטים
      const shouldMuteSFX = masterMuted || sfxMuted;
      for (const howl of sfxCache.values()) {
        howl.volume(shouldMuteSFX ? 0 : sfxVolume);
      }
    },

    toggleMute(): boolean {
      masterMuted = !masterMuted;
      if (currentHowl) currentHowl.volume(musicLevel());
      for (const howl of sfxCache.values()) {
        howl.volume(masterMuted || sfxMuted ? 0 : sfxVolume);
      }
      return masterMuted;
    },

    /** Play a Pokemon cry by pokedex number (ogg files from PokeAPI). */
    playCry(pokedexId: number): void {
      if (masterMuted || sfxMuted) return;
      const src = toAssetUrl(`audio/cries/${pokedexId}.ogg`);
      const howl = new Howl({ src: [src], volume: sfxVolume });
      howl.play();
    },

    playLevelUp(): void {
      playLevelUpJingle();
    },

    playCaptureSuccess(): void {
      playCaptureSuccessJingle();
    },

    playEvolutionStart(): void {
      playEvolutionStart();
    },

    playEvolutionFinish(): void {
      playEvolutionFinish();
    },

    playSendOutCue(): void {
      playSendOutCue();
    },

    playWithdrawCue(): void {
      playWithdrawCue();
    },

    playCaptureShakeCue(): void {
      playCaptureShakeCue();
    },

    playBreakFreeCue(): void {
      playBreakFreeCue();
    },

    playRunCue(): void {
      playRunCue();
    },

    playBadgeEarned(): void {
      playBadgeEarnedJingle();
    },

    playFaintCue(): void {
      playFaintCue();
    },

    playAttackFamilyCue(family: 'lunge' | 'projectile' | 'beam' | 'pulse' | 'burst'): void {
      playAttackFamilyCue(family);
    },

    playItemPickup(): void {
      playItemPickup();
    },

    playItemFound(): void {
      manager.playSFX('item-found');
    },

    playTrainerSpot(): void {
      playTrainerSpot();
    },

    playTrainerStep(): void {
      playTrainerStep();
    },

    playAlert(): void {
      playAlert();
    },
    playThunder(): void {
      playThunder();
    },
    playPhoneRing(): void {
      playPhoneRing();
    },
    playRivalEncounter(): void {
      playRivalEncounter();
    },
    playTeamRocketEncounter(): void {
      playTeamRocketEncounter();
    },
    playGymLeaderEncounter(): void {
      playGymLeaderEncounter();
    },

    playGateSuccess(): void {
      playToneSequence({
        notes: [523.25, 659.25, 783.99, 1046.5, 1318.51],
        durations: [0.08, 0.08, 0.08, 0.08, 0.28],
        type: 'triangle',
        gain: 0.22,
        spacing: 0.02,
      });
    },

    /** Mini-game sound cue — see MINI_GAME_CUES. */
    playMiniGameCue(name: MiniGameCue, opts?: MiniGameCueOptions): void {
      playMiniGameCue(name, opts);
    },

    playLetter(letter: string): void {
      if (masterMuted || sfxMuted) return;
      const key = letter.toLowerCase();
      if (!letterCache.has(key)) {
        const src = toAssetUrl(`audio/phonics/${key}.mp3`);
        const h = new Howl({
          src: [src],
          preload: false,
          format: ['mp3'],
          volume: sfxVolume,
          onloaderror: () => {
            letterCache.set(key, null);
            speakText(key, 0.75);
          },
        });
        letterCache.set(key, h);
        h.load();
        h.once('load', () => {
          if (!masterMuted && !sfxMuted) h.play();
        });
        return;
      }
      const howl = letterCache.get(key);
      if (howl) howl.play();
      else speakText(key, 0.75);
    },

    preloadLetters(letters: string[]): void {
      for (const letter of letters) {
        const key = letter.toLowerCase();
        if (!letterCache.has(key)) {
          const src = toAssetUrl(`audio/phonics/${key}.mp3`);
          const h = new Howl({
            src: [src],
            preload: false,
            format: ['mp3'],
            volume: sfxVolume,
            onloaderror: () => {
              letterCache.set(key, null);
            },
          });
          letterCache.set(key, h);
          h.load();
        }
      }
    },

    playWord(word: string): void {
      if (masterMuted || sfxMuted) return;
      const key = word.toLowerCase();
      if (!wordCache.has(key)) {
        const src = toAssetUrl(`audio/words/${key}.mp3`);
        const h = new Howl({
          src: [src],
          preload: false,
          format: ['mp3'],
          volume: sfxVolume,
          onloaderror: () => {
            wordCache.set(key, null);
            speakText(word, 0.85);
          },
        });
        wordCache.set(key, h);
        h.load();
        h.once('load', () => {
          if (!masterMuted && !sfxMuted) h.play();
        });
        return;
      }
      const howl = wordCache.get(key);
      if (howl) howl.play();
      else speakText(word, 0.85);
    },

    setMuted(value: boolean): void {
      if (masterMuted === value) return;
      masterMuted = value;
      if (currentHowl) currentHowl.volume(musicLevel());
      for (const howl of sfxCache.values()) {
        howl.volume(masterMuted || sfxMuted ? 0 : sfxVolume);
      }
    },

    isMuted(): boolean {
      return masterMuted;
    },
    isMusicMuted(): boolean {
      return musicMuted || masterMuted;
    },
    isSFXMuted(): boolean {
      return sfxMuted || masterMuted;
    },
    isMasterMuted(): boolean {
      return masterMuted;
    },
    getMusicVolume(): number {
      return musicVolume;
    },
    getSFXVolume(): number {
      return sfxVolume;
    },

    currentMusic(): string | null {
      return currentTrack;
    },
  };

  return manager;
}

/** The return type of createAudioManager, for use in type annotations. */
export type AudioManager = ReturnType<typeof createAudioManager>;

/** Global audio instance — set by game.ts on init, accessible from any module. */
let globalAudio: AudioManager | null = null;
export function setGlobalAudio(audio: AudioManager): void {
  globalAudio = audio;
}
export function getGlobalAudio(): AudioManager | null {
  return globalAudio;
}

/** MUST BE SYNC WITH THE DOWNLOAD MOVE SCRIPT. Normalizes a move name to match the SFX filename convention. */
function moveToSfxKey(moveName: string): string {
  return moveName.replaceAll(/ /g, '').toLowerCase();
}
