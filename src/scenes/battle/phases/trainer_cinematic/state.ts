/**
 * Cinematic State Container
 * Manages runtime timeline variables, coordinates, and rendering layout profiles.
 */

export type IntroStyle = 0 | 1 | 2; // 0 = Radial Speed lines, 1 = Fire/Water Split, 2 = Electric Storm

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface CinematicState {
  timer: number;
  introStyle: IntroStyle;
  isLoaded: boolean;
  loadDispatched: boolean; // Tracks whether the image pre-fetch has already been executed once

  // VS Structural Positioning
  vsTimer: number;
  vsActive: boolean;
  vsScale: number;
  vsAngle: number;

  // Horizontal Slide Positions
  p1x: number;
  p2x: number;

  // Split-Screen Arena Entry State
  battleSceneActive: boolean;
  battleTimer: number;

  // Global Particle Array
  particles: Particle[];
  particlesSpawned: boolean;
}

export function createCinematicState(): CinematicState {
  return {
    timer: 0,
    introStyle: Math.floor(Math.random() * 3) as IntroStyle,
    isLoaded: false,
    loadDispatched: false, // Initializes false to allow a single load execution
    vsTimer: 0,
    vsActive: false,
    vsScale: 0,
    vsAngle: 0,
    p1x: -60,
    p2x: 300,
    battleSceneActive: false,
    battleTimer: 0,
    particles: [],
    particlesSpawned: false,
  };
}
