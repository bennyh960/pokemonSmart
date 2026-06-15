import { LOGICAL_WIDTH } from '../../../engine/config';
import { drawRect, drawText, fillRect } from '../../../engine/renderer';
import { getCachedImage, loadImage } from '../../../engine/sprite-loader';
import { t } from '../../../i18n/i18n';
import { getEvolutionChain, getPokemonDisplayName } from '../../../services/pokemon-data';

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

  const stages = chain.stages;
  const spriteSize = 32;
  const arrowSpace = 30;
  const stageWidth = spriteSize + arrowSpace;
  const totalWidth = stages.length * spriteSize + (stages.length - 1) * arrowSpace;
  const startX = Math.max(4, Math.floor((LOGICAL_WIDTH - totalWidth) / 2));
  const centerY = contentY + 20;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const x = startX + i * stageWidth;
    const isCurrent = stage.id === id;

    // Background highlight for current stage
    if (isCurrent) {
      fillRect(ctx, x - 2, centerY - 2, spriteSize + 4, spriteSize + 4, '#582828');
      drawRect(ctx, x - 2, centerY - 2, spriteSize + 4, spriteSize + 4, '#f8a878');
    } else {
      fillRect(ctx, x - 1, centerY - 1, spriteSize + 2, spriteSize + 2, '#402020');
    }

    // Sprite
    const sprite = getCachedImage(`/sprites/pokemon/front/${stage.id}.png`);
    if (sprite) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sprite, x, centerY, spriteSize, spriteSize);
      ctx.imageSmoothingEnabled = false;
    } else {
      fillRect(ctx, x, centerY, spriteSize, spriteSize, '#584040');
      loadImage(`/sprites/pokemon/front/${stage.id}.png`).catch(() => {});
    }

    // Name below sprite
    const name = getPokemonDisplayName(stage.id);
    const nameColor = isCurrent ? '#f8a878' : '#cccccc';
    drawText(ctx, name, x + spriteSize / 2, centerY + spriteSize + 4, {
      size: 6,
      color: nameColor,
      font: 'monospace',
      align: 'center',
    });

    // Arrow and evolution info between stages
    if (i < stages.length - 1) {
      const nextStage = stages[i + 1];
      const arrowX = x + spriteSize + 2;
      const arrowY = centerY + spriteSize / 2 - 4;

      drawText(ctx, '\u2192', arrowX + 4, arrowY, { size: 8, color: '#f8a878', font: 'monospace' });

      let evoText = '';
      if (nextStage.minLevel) {
        evoText = `Lv.${nextStage.minLevel}`;
      } else if (nextStage.item) {
        evoText = nextStage.item;
      } else if (nextStage.trigger) {
        evoText = nextStage.trigger;
      }
      if (evoText) {
        drawText(ctx, evoText, arrowX + 4, arrowY + 10, {
          size: 5,
          color: '#a08080',
          font: 'monospace',
        });
      }
    }
  }
}
