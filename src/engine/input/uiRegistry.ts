import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config';

export interface ClickableRegion {
  id: string | number;
  x: number;
  y: number;
  width: number;
  height: number;
  onSelect?: (event: {
    x: number;
    y: number;
    width: number;
    height: number;
    isDoubleClick?: boolean;
    gamePos: { x: number; y: number };
  }) => void;
  onScroll?: (delta: number) => void;
}

class UIRegistryManager {
  private regions: ClickableRegion[] = [];
  private lastClickedId: string | number | null = null;
  private lastClickTime = 0;
  private DOUBLE_CLICK_DELAY = 300;

  public registerRegion(region: ClickableRegion) {
    this.regions.push(region);
  }

  public clear() {
    this.regions = [];
  }

  public processCanvasClick(
    canvas: HTMLCanvasElement,
    screenX: number,
    screenY: number,
  ): { region: ClickableRegion; isDoubleClick: boolean; gamePos: { x: number; y: number } } | null {
    const gamePos = getCanvasCoordinates(canvas, screenX, screenY);

    const hit = this.regions.find(
      (r) => gamePos.x >= r.x && gamePos.x <= r.x + r.width && gamePos.y >= r.y && gamePos.y <= r.y + r.height,
    );

    if (!hit) return null;

    const now = performance.now();
    const isDoubleClick = this.lastClickedId === hit.id && now - this.lastClickTime < this.DOUBLE_CLICK_DELAY;

    this.lastClickedId = hit.id;
    this.lastClickTime = now;

    return { region: hit, isDoubleClick, gamePos };
  }

  public processCanvasScroll(canvas: HTMLCanvasElement, screenX: number, screenY: number, delta: number): boolean {
    const gamePos = getCanvasCoordinates(canvas, screenX, screenY);

    const hit = this.regions.find(
      (r) =>
        r.onScroll && gamePos.x >= r.x && gamePos.x <= r.x + r.width && gamePos.y >= r.y && gamePos.y <= r.y + r.height,
    );

    if (!hit?.onScroll) return false;
    hit.onScroll(delta);
    return true;
  }
}

export const uiRegistry = new UIRegistryManager();

export function getCanvasCoordinates(
  canvas: HTMLCanvasElement,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const canvasX = Math.floor(((screenX - rect.left) / rect.width) * LOGICAL_WIDTH);
  const canvasY = Math.floor(((screenY - rect.top) / rect.height) * LOGICAL_HEIGHT);
  return { x: canvasX, y: canvasY };
}
