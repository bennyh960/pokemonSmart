import { uiRegistry } from './uiRegistry';
import { type InputState, toCode } from './keyboard_input';

function handleCanvasInteraction(
  canvas: HTMLCanvasElement,
  state: InputState,
): (clientX: number, clientY: number) => void {
  return (clientX, clientY) => {
    state.tapDetected = true;
    state.tapPosition = { x: clientX, y: clientY };

    const hit = uiRegistry.processCanvasClick(canvas, clientX, clientY);
    if (!hit) return;

    const { region, isDoubleClick, gamePos } = hit;

    if (isDoubleClick) {
      //   state.virtualPressed.add(toCode('Enter'));
      //   state.virtualDown.add(toCode('Enter'));
      region.onSelect?.({
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        gamePos,
        isDoubleClick,
      });
    } else {
      if (typeof region.id === 'number') {
        const digit = ((region.id + 1) % 10).toString();
        if (digit >= '0' && digit <= '9') {
          state.numberBuffer += digit;
        }
      }
      //   state.virtualPressed.add(toCode('ArrowDown'));
      region.onSelect?.({
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        gamePos,
        isDoubleClick,
      });
    }
  };
}

export function createClickManager(canvas: HTMLCanvasElement, state: InputState) {
  const onInteraction = handleCanvasInteraction(canvas, state);

  function handleClick(e: MouseEvent) {
    console.log('[clickManager] click fired', e.clientX, e.clientY);

    onInteraction(e.clientX, e.clientY);
  }

  canvas.addEventListener('click', handleClick);

  return {
    onInteraction, // exposed so touch_manager can reuse it
    destroy() {
      canvas.removeEventListener('click', handleClick);
    },
  };
}
