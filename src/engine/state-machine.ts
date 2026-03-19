/**
 * StateMachine - Stack-based scene manager.
 *
 * Scenes can be pushed on top (e.g. dialogue over overworld) and
 * popped to return. Also supports direct change() to swap entirely.
 */

import type { Scene, SceneId } from '../types/index.js';

/** Creates a stack-based state machine for managing game scenes. */
export function createStateMachine() {
  const scenes = new Map<SceneId, Scene>();
  let stack: SceneId[] = [];

  return {
    /** Register a scene so it can be activated by ID. */
    register(id: SceneId, scene: Scene): void {
      scenes.set(id, scene);
    },

    /** Get the scene instance for a given ID. */
    getScene(id: SceneId): Scene | undefined {
      return scenes.get(id);
    },

    /** Get the current (topmost) scene, or undefined if empty. */
    current(): Scene | undefined {
      if (stack.length === 0) return undefined;
      return scenes.get(stack[stack.length - 1]);
    },

    /** Get the current scene ID. */
    currentId(): SceneId | undefined {
      return stack.length > 0 ? stack[stack.length - 1] : undefined;
    },

    /**
     * Push a scene onto the stack (overlay behavior).
     * The previous scene stays underneath — its exit() is NOT called.
     */
    push(id: SceneId): void {
      const scene = scenes.get(id);
      if (!scene) {
        console.warn(`StateMachine: scene "${id}" not registered.`);
        return;
      }
      stack.push(id);
      scene.enter();
    },

    /** Pop the topmost scene, calling its exit(). */
    pop(): void {
      if (stack.length === 0) return;
      const oldId = stack.pop()!;
      scenes.get(oldId)?.exit();
    },

    /**
     * Replace the entire stack with a single scene.
     * Calls exit() on current scene and enter() on the new one.
     */
    change(id: SceneId): void {
      const scene = scenes.get(id);
      if (!scene) {
        console.warn(`StateMachine: scene "${id}" not registered.`);
        return;
      }

      if (stack.length > 0) {
        scenes.get(stack[stack.length - 1])?.exit();
      }

      stack = [id];
      scene.enter();
    },

    /** Update the topmost scene. */
    update(dt: number): void {
      if (stack.length === 0) return;
      scenes.get(stack[stack.length - 1])?.update(dt);
    },

    /** Render the topmost scene. */
    render(ctx: CanvasRenderingContext2D): void {
      if (stack.length === 0) return;
      scenes.get(stack[stack.length - 1])?.render(ctx);
    },
  };
}

/** The return type of createStateMachine, for use in type annotations. */
export type StateMachine = ReturnType<typeof createStateMachine>;
