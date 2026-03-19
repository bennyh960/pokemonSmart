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
  const musicCache = new Map<string, Howl>();
  const sfxCache = new Map<string, Howl>();
  let currentTrack: string | null = null;
  let musicVolume = 0.5;
  let sfxVolume = 0.7;
  let muted = false;

  function getMusicHowl(key: string): Howl | null {
    const src = MUSIC_TRACKS[key];
    if (!src) {
      console.warn(`[AudioManager] Unknown music track: "${key}"`);
      return null;
    }
    if (!musicCache.has(key)) {
      musicCache.set(key, new Howl({
        src: [src],
        loop: true,
        volume: muted ? 0 : musicVolume,
        html5: true,
      }));
    }
    return musicCache.get(key)!;
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

  function applyMusicVolume(): void {
    if (currentTrack) {
      const howl = musicCache.get(currentTrack);
      if (howl) howl.volume(muted ? 0 : musicVolume);
    }
  }

  function applySfxVolume(): void {
    for (const howl of sfxCache.values()) {
      howl.volume(muted ? 0 : sfxVolume);
    }
  }

  const manager = {
    playMusic(trackKey: string): void {
      if (currentTrack === trackKey) return;
      if (currentTrack) {
        manager.crossfade(currentTrack, trackKey, DEFAULT_CROSSFADE_MS);
        return;
      }
      const howl = getMusicHowl(trackKey);
      if (!howl) return;
      howl.volume(muted ? 0 : musicVolume);
      howl.play();
      currentTrack = trackKey;
    },

    stopMusic(fadeMs = DEFAULT_CROSSFADE_MS): void {
      if (!currentTrack) return;
      const howl = musicCache.get(currentTrack);
      if (howl) {
        if (fadeMs > 0) {
          howl.fade(howl.volume(), 0, fadeMs);
          howl.once('fade', () => howl.stop());
        } else {
          howl.stop();
        }
      }
      currentTrack = null;
    },

    playSFX(sfxKey: string): void {
      const howl = getSfxHowl(sfxKey);
      if (!howl) return;
      howl.volume(muted ? 0 : sfxVolume);
      howl.play();
    },

    crossfade(fromKey: string, toKey: string, durationMs = DEFAULT_CROSSFADE_MS): void {
      const fromHowl = musicCache.get(fromKey);
      const toHowl = getMusicHowl(toKey);
      if (fromHowl) {
        fromHowl.fade(fromHowl.volume(), 0, durationMs);
        fromHowl.once('fade', () => fromHowl.stop());
      }
      if (toHowl) {
        toHowl.volume(0);
        toHowl.play();
        toHowl.fade(0, muted ? 0 : musicVolume, durationMs);
      }
      currentTrack = toKey;
    },

    setMusicVolume(volume: number): void {
      musicVolume = Math.max(0, Math.min(1, volume));
      applyMusicVolume();
    },

    setSFXVolume(volume: number): void {
      sfxVolume = Math.max(0, Math.min(1, volume));
      applySfxVolume();
    },

    setMasterVolume(volume: number): void {
      Howler.volume(Math.max(0, Math.min(1, volume)));
    },

    toggleMute(): boolean {
      muted = !muted;
      applyMusicVolume();
      applySfxVolume();
      return muted;
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
