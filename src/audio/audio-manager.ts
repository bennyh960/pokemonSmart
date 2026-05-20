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
  'pokeball-return': toAssetUrl('audio/sfx/menu-cancel.wav'),
};

/** Default crossfade duration in ms. */
const DEFAULT_CROSSFADE_MS = 500;

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

  let musicVolume = 0.5;
  let sfxVolume = 0.7;
  let muted = localStorage.getItem('muted') === 'true';

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
    if (muted) return;
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
      volume: muted ? 0 : musicVolume,
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
          volume: muted ? 0 : sfxVolume,
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

  function playToneSequence(options: {
    notes: number[];
    durations: number[];
    type: OscillatorType;
    gain: number;
    spacing?: number;
    sweepTo?: number | null;
  }): void {
    withSynthContext((actx) => {
      const vol = actx.createGain();
      vol.gain.value = sfxVolume * options.gain;
      vol.connect(actx.destination);

      let cursor = actx.currentTime;
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
      howl.volume(muted ? 0 : sfxVolume);
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
        howl.fade(0, muted ? 0 : musicVolume, durationMs);
        currentHowl = howl;
      } else {
        currentHowl = null;
      }
      currentTrack = toTrack;
    },

    setMusicVolume(volume: number): void {
      musicVolume = Math.max(0, Math.min(1, volume));
      if (currentHowl) currentHowl.volume(muted ? 0 : musicVolume);
    },

    setSFXVolume(volume: number): void {
      sfxVolume = Math.max(0, Math.min(1, volume));
      for (const howl of sfxCache.values()) {
        howl.volume(muted ? 0 : sfxVolume);
      }
    },

    setMasterVolume(volume: number): void {
      Howler.volume(Math.max(0, Math.min(1, volume)));
    },

    toggleMute(): boolean {
      muted = !muted;
      if (currentHowl) currentHowl.volume(muted ? 0 : musicVolume);
      for (const howl of sfxCache.values()) {
        howl.volume(muted ? 0 : sfxVolume);
      }
      return muted;
    },

    /** Play a Pokemon cry by pokedex number (ogg files from PokeAPI). */
    playCry(pokedexId: number): void {
      if (muted) return;
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

    playLetter(letter: string): void {
      if (muted) return;
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
          if (!muted) h.play();
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
      if (muted) return;
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
          if (!muted) h.play();
        });
        return;
      }
      const howl = wordCache.get(key);
      if (howl) howl.play();
      else speakText(word, 0.85);
    },

    setMuted(value: boolean): void {
      if (muted === value) return;
      muted = value;
      if (currentHowl) currentHowl.volume(muted ? 0 : musicVolume);
      for (const howl of sfxCache.values()) {
        howl.volume(muted ? 0 : sfxVolume);
      }
    },

    isMuted(): boolean {
      return muted;
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
