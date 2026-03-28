export type BattleActorId = 'player' | 'enemy' | 'trainer' | 'ball';

export interface BattleActorState {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  rotation: number;
  visible: boolean;
}

export type BattleActorTweenTarget = Partial<BattleActorState>;
export type BattleAnimationEasing = 'linear' | 'easeOut' | 'easeInOut';

export interface BattleAnimationDirector {
  clear(): void;
  enqueue(step: BattleAnimationStep): void;
  getActorState(actor: BattleActorId): Readonly<BattleActorState>;
  isBusy(): boolean;
  play(step: BattleAnimationStep): void;
  resetActors(): void;
  setActorState(actor: BattleActorId, patch: BattleActorTweenTarget): void;
  update(dt: number): void;
}

export type BattleAnimationStep =
  | { type: 'wait'; duration: number }
  | { type: 'call'; fn: () => void }
  | { type: 'tween-actor'; actor: BattleActorId; to: BattleActorTweenTarget; duration: number; easing?: BattleAnimationEasing }
  | { type: 'sequence'; steps: BattleAnimationStep[] }
  | { type: 'parallel'; steps: BattleAnimationStep[] };

const ACTORS: BattleActorId[] = ['player', 'enemy', 'trainer', 'ball'];

const DEFAULT_ACTOR_STATE: BattleActorState = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  alpha: 1,
  rotation: 0,
  visible: true,
};

export function waitStep(duration: number): BattleAnimationStep {
  return { type: 'wait', duration };
}

export function callStep(fn: () => void): BattleAnimationStep {
  return { type: 'call', fn };
}

export function tweenActorStep(
  actor: BattleActorId,
  to: BattleActorTweenTarget,
  duration: number,
  easing: BattleAnimationEasing = 'easeInOut',
): BattleAnimationStep {
  return { type: 'tween-actor', actor, to, duration, easing };
}

export function sequenceStep(...steps: BattleAnimationStep[]): BattleAnimationStep {
  return { type: 'sequence', steps };
}

export function parallelStep(...steps: BattleAnimationStep[]): BattleAnimationStep {
  return { type: 'parallel', steps };
}

export function createBattleAnimationDirector(): BattleAnimationDirector {
  const actors = new Map<BattleActorId, BattleActorState>();
  const queue: BattleAnimationRunner[] = [];

  function resetActors(): void {
    actors.clear();
    for (const actor of ACTORS) {
      actors.set(actor, { ...DEFAULT_ACTOR_STATE });
    }
  }

  function setActorState(actor: BattleActorId, patch: BattleActorTweenTarget): void {
    const current = actors.get(actor);
    if (!current) return;
    Object.assign(current, patch);
  }

  function getActorState(actor: BattleActorId): Readonly<BattleActorState> {
    return actors.get(actor) ?? DEFAULT_ACTOR_STATE;
  }

  function createRunner(step: BattleAnimationStep): BattleAnimationRunner {
    switch (step.type) {
      case 'wait':
        return new WaitRunner(step.duration);
      case 'call':
        return new CallRunner(step.fn);
      case 'tween-actor':
        return new TweenActorRunner(step.actor, step.to, step.duration, step.easing ?? 'easeInOut', actors);
      case 'sequence':
        return new SequenceRunner(step.steps.map(createRunner));
      case 'parallel':
        return new ParallelRunner(step.steps.map(createRunner));
    }
  }

  function clear(): void {
    queue.length = 0;
  }

  function enqueue(step: BattleAnimationStep): void {
    queue.push(createRunner(step));
  }

  function play(step: BattleAnimationStep): void {
    clear();
    enqueue(step);
  }

  function isBusy(): boolean {
    return queue.length > 0;
  }

  function update(dt: number): void {
    while (queue.length > 0) {
      const current = queue[0];
      if (!current.started) current.start();
      if (!current.update(dt)) break;
      current.finish();
      queue.shift();
      dt = 0;
    }
  }

  resetActors();

  return {
    clear,
    enqueue,
    getActorState,
    isBusy,
    play,
    resetActors,
    setActorState,
    update,
  };
}

interface BattleAnimationRunner {
  started: boolean;
  finish(): void;
  start(): void;
  update(dt: number): boolean;
}

class WaitRunner implements BattleAnimationRunner {
  public started = false;
  private elapsed = 0;
  private readonly duration: number;

  public constructor(duration: number) {
    this.duration = duration;
  }

  public start(): void {
    this.started = true;
    this.elapsed = 0;
  }

  public update(dt: number): boolean {
    this.elapsed += dt;
    return this.elapsed >= this.duration;
  }

  public finish(): void {}
}

class CallRunner implements BattleAnimationRunner {
  public started = false;
  private readonly fn: () => void;

  public constructor(fn: () => void) {
    this.fn = fn;
  }

  public start(): void {
    this.started = true;
    this.fn();
  }

  public update(_dt: number): boolean {
    return true;
  }

  public finish(): void {}
}

class TweenActorRunner implements BattleAnimationRunner {
  public started = false;
  private elapsed = 0;
  private from: BattleActorState | null = null;
  private readonly actor: BattleActorId;
  private readonly to: BattleActorTweenTarget;
  private readonly duration: number;
  private readonly easing: BattleAnimationEasing;
  private readonly actors: Map<BattleActorId, BattleActorState>;

  public constructor(
    actor: BattleActorId,
    to: BattleActorTweenTarget,
    duration: number,
    easing: BattleAnimationEasing,
    actors: Map<BattleActorId, BattleActorState>,
  ) {
    this.actor = actor;
    this.to = to;
    this.duration = duration;
    this.easing = easing;
    this.actors = actors;
  }

  public start(): void {
    this.started = true;
    this.elapsed = 0;
    const current = this.actors.get(this.actor);
    this.from = current ? { ...current } : { ...DEFAULT_ACTOR_STATE };
    if (this.duration <= 0) {
      const actor = this.actors.get(this.actor);
      if (actor) Object.assign(actor, this.to);
    }
  }

  public update(dt: number): boolean {
    if (this.duration <= 0) return true;

    this.elapsed += dt;
    const rawProgress = Math.max(0, Math.min(1, this.elapsed / this.duration));
    const eased = applyEasing(rawProgress, this.easing);
    const actor = this.actors.get(this.actor);
    if (!actor || !this.from) return true;

    actor.x = tweenNumber(this.from.x, this.to.x ?? this.from.x, eased);
    actor.y = tweenNumber(this.from.y, this.to.y ?? this.from.y, eased);
    actor.scaleX = tweenNumber(this.from.scaleX, this.to.scaleX ?? this.from.scaleX, eased);
    actor.scaleY = tweenNumber(this.from.scaleY, this.to.scaleY ?? this.from.scaleY, eased);
    actor.alpha = tweenNumber(this.from.alpha, this.to.alpha ?? this.from.alpha, eased);
    actor.rotation = tweenNumber(this.from.rotation, this.to.rotation ?? this.from.rotation, eased);
    actor.visible = rawProgress < 1 ? this.from.visible : (this.to.visible ?? this.from.visible);

    return rawProgress >= 1;
  }

  public finish(): void {
    const actor = this.actors.get(this.actor);
    if (!actor || !this.from) return;
    Object.assign(actor, this.to);
  }
}

class SequenceRunner implements BattleAnimationRunner {
  public started = false;
  private index = 0;
  private readonly steps: BattleAnimationRunner[];

  public constructor(steps: BattleAnimationRunner[]) {
    this.steps = steps;
  }

  public start(): void {
    this.started = true;
    this.index = 0;
  }

  public update(dt: number): boolean {
    while (this.index < this.steps.length) {
      const current = this.steps[this.index];
      if (!current.started) current.start();
      if (!current.update(dt)) return false;
      current.finish();
      this.index++;
      dt = 0;
    }
    return true;
  }

  public finish(): void {}
}

class ParallelRunner implements BattleAnimationRunner {
  public started = false;
  private readonly steps: BattleAnimationRunner[];

  public constructor(steps: BattleAnimationRunner[]) {
    this.steps = steps;
  }

  public start(): void {
    this.started = true;
    for (const step of this.steps) {
      if (!step.started) step.start();
    }
  }

  public update(dt: number): boolean {
    let allFinished = true;
    for (const step of this.steps) {
      if (step.update(dt)) {
        step.finish();
      } else {
        allFinished = false;
      }
    }
    return allFinished;
  }

  public finish(): void {}
}

function tweenNumber(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function applyEasing(progress: number, easing: BattleAnimationEasing): number {
  switch (easing) {
    case 'linear':
      return progress;
    case 'easeOut':
      return 1 - Math.pow(1 - progress, 2);
    case 'easeInOut':
      return progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  }
}
