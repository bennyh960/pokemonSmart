import type { InputManager } from "../engine/input";
import { drawText } from "../engine/renderer";
import type { StateMachine } from "../engine/state-machine";
import type { Scene } from "../types";

// use labels
// "worldMap.title"
// "worldMap.hint"
// "worldMap.badge.earned"
// "worldMap.currentLocation"


export function createWorldMapScene(
  input: InputManager,
  stateMachine: StateMachine,
): Scene {
  let time = 0;

  return {
    enter(): void { time = 0; },
    exit():  void {},

    update(dt: number): void {
      time += dt;
      if (
        input.isKeyPressed('Escape') ||
        input.isKeyPressed('w') || input.isKeyPressed('W') ||
        input.isKeyPressed('m') || input.isKeyPressed('M')
      ) {
        stateMachine.pop();
      }
    },

    render(ctx: CanvasRenderingContext2D): void {

      drawText(ctx, "TODO", 130, 80, {
        size: 5, color: '#4a8fb5', align: 'center', direction: 'ltr',
      });

      // Badge counter
      

      
    },
  };
}
