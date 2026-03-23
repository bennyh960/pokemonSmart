/**
 * AudioManager - Sound and music management using Howler.js.
 *
 * Handles background music playback (looping), SFX one-shots,
 * crossfading between tracks, volume control (music/sfx independent),
 * and mute toggle (M key).
 */

import { Howl, Howler } from 'howler';

/** Track definitions: key → file path under public/audio/ */
const MUSIC_TRACKS: Record<string, string> = {
  title: '/audio/music/title.mp3',
  town: '/audio/music/town.mp3',
  route: '/audio/music/route.mp3',
  battle: '/audio/music/battle.mp3',
  victory: '/audio/music/victory.mp3',
};

const SFX_TRACKS: Record<string, string> = {
  'menu-select': '/audio/sfx/menu-select.wav',
  'menu-cancel': '/audio/sfx/menu-cancel.wav',
  hit: '/audio/sfx/hit.wav',
  'text-blip': '/audio/sfx/text-blip.wav',
};

/** Default crossfade duration in ms. */
const DEFAULT_CROSSFADE_MS = 500;

export function createAudioManager() {
  /** The currently playing music Howl instance. */
  let currentHowl: Howl | null = null;
  let currentTrack: string | null = null;

  /** Cached SFX Howl instances. */
  const sfxCache = new Map<string, Howl>();

  let musicVolume = 0.5;
  let sfxVolume = 0.7;
  let muted = true;

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
      sfxCache.set(key, new Howl({
        src: [src],
        volume: muted ? 0 : sfxVolume,
      }));
    }
    return sfxCache.get(key)!;
  }

  /** Play a synthesized level-up jingle (ascending arpeggio) via Web Audio API. */
  function playLevelUpJingle(): void {
    if (muted) return;
    try {
      const actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const vol = actx.createGain();
      vol.gain.value = sfxVolume * 0.4;
      vol.connect(actx.destination);

      // Ascending notes: C5 → E5 → G5 → C6 (classic level-up feel)
      const notes = [523.25, 659.25, 783.99, 1046.50];
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

      // Final sustained chord
      const chordTime = notes.length * noteLen;
      [523.25, 783.99, 1046.50].forEach(freq => {
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
    } catch {
      // Web Audio not available — silent fallback
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
        h.once('fade', () => { h.stop(); h.unload(); });
      } else {
        currentHowl.stop();
        currentHowl.unload();
      }
      currentHowl = null;
      currentTrack = null;
    },

    playSFX(sfxKey: string): void {
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
        old.once('fade', () => { old.stop(); old.unload(); });
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

    playLevelUp(): void {
      playLevelUpJingle();
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
