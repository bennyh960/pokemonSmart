import { LOGICAL_WIDTH } from '../../../engine/config';
import { drawRect, drawText, fillRect } from '../../../engine/renderer';
import { getCachedImage, loadImage } from '../../../engine/sprite-loader';
import { t } from '../../../i18n/i18n';
import { getEvolutionChain, getPokemonDisplayName } from '../../../services/pokemon-data';

interface EvolutionStage {
  id: number;
  name: { en: string; he: string };
  minLevel: number | null;
  trigger: string | null;
  item: string | null;
  evolvesFromId?: number | null;
}

export function renderEvolutionTab(ctx: CanvasRenderingContext2D, id: number, contentY: number): void {
  const chain = getEvolutionChain(id);

  if (!chain || chain.stages.length <= 1) {
    drawText(ctx, t('pokedex.evo.none'), LOGICAL_WIDTH / 2, contentY + 40, {
      size: 8,
      color: '#807070',
      font: 'monospace',
      align: 'center',
    });
    return;
  }

  const stages = chain.stages as EvolutionStage[];

  // 1. Identify root base node reliably
  const rootNode = stages.find((s) => !s.evolvesFromId || !stages.some((p) => p.id === s.evolvesFromId)) || stages[0];
  const totalStages = stages.length;
  const directLeaves = stages.filter((s) => s.evolvesFromId === rootNode.id).length;

  // 2. Identify if any item splits into multiple targets downstream (e.g. Poliwag system shape)
  const hasForkingEvolutions = stages.some(
    (parent) => stages.filter((child) => child.evolvesFromId === parent.id).length > 1,
  );

  // Layout Strategy Routing Matrix
  if (totalStages >= 6) {
    // Radial Layout Strategy (Eevee Shape)
    renderRadialTreeLayout(ctx, stages, rootNode, id, contentY);
  } else if (directLeaves >= 3) {
    // 3-Line Vertical Stack Layout Strategy (Tyrogue Shape)
    renderStackedSplitLayout(ctx, stages, rootNode, id, contentY);
  } else if (hasForkingEvolutions || totalStages === 4) {
    // Dynamic Grid Layout Strategy (Poliwag / Complex Forking Shapes)
    renderGridPipelineLayout(ctx, stages, rootNode, id, contentY);
  } else {
    // Fallback Standard Sequential Timeline Strategy
    renderStandardChain(ctx, stages, id, contentY);
  }
}

/**
 * Shared Graphics Component: Node Wrapper Frame
 */
function drawNode(
  ctx: CanvasRenderingContext2D,
  stage: EvolutionStage,
  x: number,
  y: number,
  size: number,
  isCurrent: boolean,
): void {
  if (isCurrent) {
    fillRect(ctx, x - 2, y - 2, size + 4, size + 4, '#582828');
    drawRect(ctx, x - 2, y - 2, size + 4, size + 4, '#f8a878');
  } else {
    fillRect(ctx, x - 1, y - 1, size + 2, size + 2, '#402020');
  }

  const sprite = getCachedImage(`/sprites/pokemon/front/${stage.id}.png`);
  if (sprite) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sprite, x, y, size, size);
    ctx.imageSmoothingEnabled = false;
  } else {
    fillRect(ctx, x, y, size, size, '#584040');
    loadImage(`/sprites/pokemon/front/${stage.id}.png`).catch(() => {});
  }

  const name = getPokemonDisplayName(stage.id);
  const nameColor = isCurrent ? '#f8a878' : '#cccccc';
  drawText(ctx, name, x + size / 2, y + size + 4, {
    size: size < 32 ? 5 : 6,
    color: nameColor,
    font: 'monospace',
    align: 'center',
  });
}

/**
 * Shared Graphics Component: Evolution Instruction Label
 */
function drawDescription(
  ctx: CanvasRenderingContext2D,
  stage: EvolutionStage,
  x: number,
  y: number,
  align: 'center' | 'left' | 'right' = 'left',
): void {
  let text = '';
  if (stage.minLevel) {
    text = `Lv.${stage.minLevel}`;
  } else if (stage.item) {
    text = stage.item.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  } else if (stage.trigger) {
    text = stage.trigger.replace(/-/g, ' ');
  }

  if (text) {
    drawText(ctx, text, x, y, {
      size: 5,
      color: '#a08080',
      font: 'monospace',
      align: align,
    });
  }
}

/**
 * Robust Grid Pipeline Layout
 * Automatically assigns nodes to columns based on family hierarchy paths
 */
function renderGridPipelineLayout(
  ctx: CanvasRenderingContext2D,
  stages: EvolutionStage[],
  rootNode: EvolutionStage,
  currentId: number,
  contentY: number,
): void {
  const spriteSize = 26;
  const columnWidth = 72;
  const centerY = contentY + 24;

  // Column 1: Base stage (e.g. Poliwag)
  const col1X = 8;
  drawNode(ctx, rootNode, col1X, centerY, spriteSize, currentId === rootNode.id);

  // Column 2: First generation evolution stage (e.g. Poliwhirl)
  // Fallback to second element in array if data link is missing
  const col2Nodes = stages.filter((s) => s.evolvesFromId === rootNode.id);
  if (col2Nodes.length === 0 && stages[1]) {
    col2Nodes.push(stages[1]);
  }

  const col2X = col1X + columnWidth;
  col2Nodes.forEach((node, idx) => {
    const nodeY = col2Nodes.length > 1 ? contentY + 6 + idx * 36 : centerY;
    drawNode(ctx, node, col2X, nodeY, spriteSize, currentId === node.id);

    // Draw primary linking navigation arrow
    drawText(ctx, '\u2192', col1X + spriteSize + 4, centerY + 10, { size: 7, color: '#f8a878' });
    drawDescription(ctx, node, col1X + spriteSize + 6, centerY + 18, 'left');
  });

  // Column 3: Split variants (e.g. Poliwrath & Politoed)
  const col3X = col2X + columnWidth;
  const col3Nodes = stages.filter((s) => s.id !== rootNode.id && !col2Nodes.some((c) => c.id === s.id));

  col3Nodes.forEach((node, idx) => {
    const nodeY = contentY + 6 + idx * 36;
    drawNode(ctx, node, col3X, nodeY, spriteSize, currentId === node.id);

    // Draw graphic path lines connecting columns safely
    const parentNode = col2Nodes.find((c) => c.id === node.evolvesFromId) || col2Nodes[0];
    const parentY = parentNode && col2Nodes.length > 1 ? contentY + 6 + col2Nodes.indexOf(parentNode) * 36 : centerY;

    ctx.strokeStyle = '#582828';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(col2X + spriteSize + 2, parentY + 12);
    ctx.lineTo(col3X - 4, nodeY + 12);
    ctx.stroke();

    // Secondary text guidelines layout configuration printed to the right
    drawText(ctx, '\u2192', col3X + spriteSize + 2, nodeY + 8, { size: 6, color: '#f8a878' });
    drawDescription(ctx, node, col3X + spriteSize + 10, nodeY + 11, 'left');
  });
}

/**
 * Layout: Stacked Split Tree (3 Horizontal Lines Structure - Tyrogue Shape)
 */
function renderStackedSplitLayout(
  ctx: CanvasRenderingContext2D,
  stages: EvolutionStage[],
  rootNode: EvolutionStage,
  currentId: number,
  contentY: number,
): void {
  const leafBranches = stages.filter((s) => s.id !== rootNode.id);
  const spriteSize = 24;
  const horizontalGap = 16;

  const rootX = Math.floor(LOGICAL_WIDTH / 2 - spriteSize / 2);
  const rootY = contentY + 4;
  drawNode(ctx, rootNode, rootX, rootY, spriteSize, currentId === rootNode.id);

  const totalLeafWidth = leafBranches.length * spriteSize + (leafBranches.length - 1) * horizontalGap;
  const leavesStartX = Math.max(4, Math.floor((LOGICAL_WIDTH - totalLeafWidth) / 2));
  const leafRowY = contentY + 36;

  leafBranches.forEach((stage, idx) => {
    const nodeX = leavesStartX + idx * (spriteSize + horizontalGap);

    ctx.strokeStyle = '#402020';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LOGICAL_WIDTH / 2, rootY + spriteSize + 4);
    ctx.lineTo(nodeX + spriteSize / 2, leafRowY - 2);
    ctx.stroke();

    drawNode(ctx, stage, nodeX, leafRowY, spriteSize, currentId === stage.id);

    const descriptionY = leafRowY + spriteSize + 11;
    drawDescription(ctx, stage, nodeX + spriteSize / 2, descriptionY, 'center');
  });
}

/**
 * Layout: Radial Spreading Layout (Eevee Shape)
 */
function renderRadialTreeLayout(
  ctx: CanvasRenderingContext2D,
  stages: EvolutionStage[],
  rootNode: EvolutionStage,
  currentId: number,
  contentY: number,
): void {
  const evolutions = stages.filter((s) => s.id !== rootNode.id);
  const centerChunksX = LOGICAL_WIDTH / 2;
  const centerChunksY = contentY + 35;

  const baseSize = 24;
  const radiusX = 65;
  const radiusY = 26;

  drawNode(
    ctx,
    rootNode,
    centerChunksX - baseSize / 2,
    centerChunksY - baseSize / 2,
    baseSize,
    currentId === rootNode.id,
  );

  evolutions.forEach((stage, idx) => {
    const angle = (idx / evolutions.length) * Math.PI * 2 - Math.PI / 2;
    const targetX = centerChunksX + Math.cos(angle) * radiusX;
    const targetY = centerChunksY + Math.sin(angle) * radiusY;

    ctx.strokeStyle = '#402020';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerChunksX, centerChunksY);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();

    drawNode(ctx, stage, targetX - baseSize / 2, targetY - baseSize / 2, baseSize, currentId === stage.id);

    const textOffset = angle > 0 && angle < Math.PI ? 18 : -10;
    drawDescription(ctx, stage, targetX, targetY + textOffset, 'center');
  });
}

/**
 * Layout: Fallback Standard Sequential Layout
 */
function renderStandardChain(
  ctx: CanvasRenderingContext2D,
  stages: EvolutionStage[],
  currentId: number,
  contentY: number,
): void {
  const spriteSize = 32;
  const arrowSpace = 34;
  const stageWidth = spriteSize + arrowSpace;
  const totalWidth = stages.length * spriteSize + (stages.length - 1) * arrowSpace;
  const startX = Math.max(4, Math.floor((LOGICAL_WIDTH - totalWidth) / 2));
  const centerY = contentY + 20;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const x = startX + i * stageWidth;

    drawNode(ctx, stage, x, centerY, spriteSize, stage.id === currentId);

    if (i < stages.length - 1) {
      const nextStage = stages[i + 1];
      const arrowX = x + spriteSize + 2;
      const arrowY = centerY + spriteSize / 2 - 4;

      drawText(ctx, '\u2192', arrowX + 4, arrowY, { size: 8, color: '#f8a878', font: 'monospace' });
      drawDescription(ctx, nextStage, arrowX + 4, arrowY + 11, 'left');
    }
  }
}
