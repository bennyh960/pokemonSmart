// src/ui/animation-utils.ts

import { seededRng, type AttackEffect } from '..';

// TODO
/**
 * מייצר אפקט של חצים עולים (חיזוק) או יורדים (החלשה) סביב פוקימון
 * @param isBoost - true עבור עליית סטט, false עבור ירידה
 */
export function renderStatChangeEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const isBoost = effect.variant === 'boost';
  const rng = seededRng(effect.seed);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // צבע: כחול/סגול לירידה, אדום/כתום לעלייה
  ctx.fillStyle = isBoost ? '#ff3333' : '#3366ff';
  ctx.strokeStyle = isBoost ? '#ffaa44' : '#66ccff';
  ctx.lineWidth = 1.5;

  const arrowCount = 5;
  const alpha = Math.sin(t * Math.PI) * 0.7;
  ctx.globalAlpha = alpha;

  for (let i = 0; i < arrowCount; i++) {
    const startX = effect.targetX + (rng() - 0.5) * 40;
    // חצים עולים למעלה או יורדים למטה לאורך הזמן
    const startY = isBoost ? effect.targetY + 20 - t * 40 - rng() * 10 : effect.targetY - 20 + t * 40 + rng() * 10;

    ctx.save();
    ctx.translate(startX, startY);

    // ציור חץ קטן (משולש + קו)
    ctx.beginPath();
    if (isBoost) {
      // חץ למעלה
      ctx.moveTo(0, -6);
      ctx.lineTo(-4, 0);
      ctx.lineTo(4, 0);
    } else {
      // חץ למטה
      ctx.moveTo(0, 6);
      ctx.lineTo(-4, 0);
      ctx.lineTo(4, 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
