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
  showCursor?: boolean; // defaults to true
  onHover?: (isHovering: boolean, gamePos: { x: number; y: number }) => void;
}

class UIRegistryManager {
  private regions: ClickableRegion[] = [];
  private lastClickedId: string | number | null = null;
  private lastClickTime = 0;
  private DOUBLE_CLICK_DELAY = 300;
  private currentlyHoveredRegion: ClickableRegion | null = null;

  public registerRegion(region: ClickableRegion) {
    this.regions.push(region);

    return {
      render: (
        callback: (config: { x: number; y: number; width: number; height: number; isHovered: boolean }) => void,
      ) => {
        const isHovered = this.currentlyHoveredRegion?.id === region.id;
        callback({
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
          isHovered,
        });
      },
    };
  }

  public clear() {
    this.regions = [];
    // this.currentlyHoveredRegion = null;
  }

  public processCanvasClick(
    canvas: HTMLCanvasElement,
    screenX: number,
    screenY: number,
  ): { region: ClickableRegion; isDoubleClick: boolean; gamePos: { x: number; y: number } } | null {
    const { region: hit, gamePos } = this.hitTest(canvas, screenX, screenY);

    if (!hit) return null;

    const now = performance.now();
    const isDoubleClick = this.lastClickedId === hit.id && now - this.lastClickTime < this.DOUBLE_CLICK_DELAY;

    this.lastClickedId = hit.id;
    this.lastClickTime = now;

    return { region: hit, isDoubleClick, gamePos };
  }

  public processCanvasScroll(canvas: HTMLCanvasElement, screenX: number, screenY: number, delta: number): boolean {
    const { region: hit } = this.hitTest(canvas, screenX, screenY, (r) => r.onScroll !== undefined);
    if (!hit?.onScroll) return false;
    hit.onScroll(delta);
    return true;
  }

  // for custom hover
  public processCanvasHover(canvas: HTMLCanvasElement, screenX: number, screenY: number): void {
    const { region: hit, gamePos } = this.hitTest(canvas, screenX, screenY);

    // Update canvas CSS cursor based on region settings
    if (hit && hit.showCursor !== false) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'default';
    }

    // Handle Hover State Changes (Enter / Leave / Move)
    if (hit !== this.currentlyHoveredRegion) {
      // Trigger leave on old region
      if (this.currentlyHoveredRegion?.onHover) {
        this.currentlyHoveredRegion.onHover(false, gamePos);
      }

      // Trigger enter on new region
      if (hit?.onHover) {
        hit.onHover(true, gamePos);
      }

      this.currentlyHoveredRegion = hit ?? null;
    } else if (hit?.onHover) {
      // Still hovering same region, just update position payload
      hit.onHover(true, gamePos);
    }
  }

  private hitTest(
    canvas: HTMLCanvasElement,
    screenX: number,
    screenY: number,
    filter?: (r: ClickableRegion) => boolean,
  ): { region: ClickableRegion | null; gamePos: { x: number; y: number } } {
    const gamePos = getCanvasCoordinates(canvas, screenX, screenY);

    const region =
      this.regions.find((r) => {
        // 1. Basic boundary check
        const isInside =
          gamePos.x >= r.x && gamePos.x <= r.x + r.width && gamePos.y >= r.y && gamePos.y <= r.y + r.height;

        if (!isInside) return false;

        // 2. If a specific condition is passed, check it (e.g., must support scrolling)
        if (filter) return filter(r);

        return true;
      }) ?? null;

    return { region, gamePos };
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
