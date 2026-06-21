import { seededRng } from '.';
import { BTL } from '../../data/battle-constants';
import { drawText } from '../../engine/renderer';

interface StatusTurnEffect {
  active: boolean;
  timer: number;
  duration: number;
  status: string;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export function createStatusTurnEffect(
  status: string,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): StatusTurnEffect {
  return {
    active: true,
    timer: 0,
    duration: 0.75,
    status,
    centerX,
    centerY,
    width,
    height,
  };
}

export function updateStatusTurnEffect(effect: StatusTurnEffect, dt: number): void {
  if (!effect.active) return;
  effect.timer += dt;
  if (effect.timer >= effect.duration) {
    effect.active = false;
  }
}

function renderBurnStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  const pulse = 0.75 + Math.sin(effect.timer * 18) * 0.15;
  ctx.save();
  ctx.globalAlpha = fade * 0.2;
  ctx.fillStyle = '#ff7a3d';
  ctx.beginPath();
  ctx.ellipse(
    effect.centerX,
    effect.centerY + effect.height * 0.15,
    effect.width * 0.28,
    effect.height * 0.22,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    const flameX = effect.centerX + (i - 1) * effect.width * 0.16;
    const flameY = effect.centerY + effect.height * 0.18 - Math.sin(effect.timer * 12 + i) * 2;
    const flameH = effect.height * (0.18 + i * 0.02) * pulse;
    const flameW = effect.width * 0.1;
    ctx.globalAlpha = fade * (0.42 - i * 0.06);
    ctx.fillStyle = i === 1 ? '#ffd27a' : '#ff5c3d';
    ctx.beginPath();
    ctx.moveTo(flameX, flameY - flameH);
    ctx.lineTo(flameX + flameW, flameY + flameH * 0.2);
    ctx.lineTo(flameX, flameY + flameH * 0.5);
    ctx.lineTo(flameX - flameW, flameY + flameH * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function renderPoisonStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const phase = (effect.timer * 1.8 + i * 0.18) % 1;
    const x = effect.centerX - effect.width * 0.16 + i * effect.width * 0.11;
    const y = effect.centerY + effect.height * 0.18 - phase * effect.height * 0.45;
    const radius = 2 + (1 - phase) * 2;
    ctx.globalAlpha = fade * (0.24 + (1 - phase) * 0.18);
    ctx.fillStyle = i % 2 === 0 ? '#a86cf0' : '#d080f0';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderParalyzeStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  const cx = effect.centerX;
  const cy = effect.centerY;
  const rng = seededRng(fade); // שינוי מהיר של הברק

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = '#ffff33';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#ffcc00';
  ctx.globalAlpha = Math.sin(fade * Math.PI * 4) * 0.6 + 0.4; // הבהוב מהיר

  ctx.beginPath();
  let sx = cx + (rng() - 0.5) * 30;
  let sy = cy + (rng() - 0.5) * 30;
  ctx.moveTo(sx, sy);

  // ציור קו זיגזג (ברק)
  for (let i = 0; i < 3; i++) {
    sx += (rng() - 0.5) * 15;
    sy += (rng() - 0.5) * 15;
    ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  ctx.restore();
}

function renderSleepStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  const chars = ['Z', 'z', 'z'];
  ctx.save();
  for (let i = 0; i < chars.length; i++) {
    const phase = (effect.timer * 1.4 + i * 0.16) % 1;
    const x = effect.centerX + effect.width * 0.08 + i * 5;
    const y = effect.centerY - effect.height * 0.34 - phase * 10;
    ctx.globalAlpha = fade * (0.35 + (1 - phase) * 0.35);
    drawText(ctx, chars[i], x, y, {
      size: 6 - i,
      color: '#d8dcff',
      align: 'center',
      direction: 'ltr',
    });
  }
  ctx.restore();
}

function renderFreezeStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  const cx = effect.centerX;
  const cy = effect.centerY;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // הילת קרח חצי שקופה מסביב לפוקימון
  ctx.globalAlpha = fade;

  const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 25);
  grad.addColorStop(0, 'rgba(200, 240, 255, 0.7)');
  grad.addColorStop(0.6, 'rgba(100, 200, 255, 0.3)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.arc(cx, cy, 25, 0, Math.PI * 2);
  ctx.fill();

  // ציור 2 גבישי קרח (מעוינים) חדים בחזית
  ctx.fillStyle = 'rgba(230, 245, 255, 0.8)';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;

  [-12, 12].forEach((offsetX) => {
    ctx.save();
    ctx.translate(cx + offsetX, cy + 5);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  ctx.restore();
}

function renderConfuseStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const phase = effect.timer * 2.2 + i * (Math.PI / 2);
    const orbitX = Math.cos(phase) * effect.width * 0.16;
    const orbitY = Math.sin(phase) * effect.height * 0.12;
    const x = effect.centerX + orbitX;
    const y = effect.centerY - effect.height * 0.16 + orbitY;
    ctx.globalAlpha = fade * (0.4 + i * 0.08);
    ctx.fillStyle = i % 2 === 0 ? '#ff9cc0' : '#f070c8';
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fade * 0.85;
    ctx.strokeStyle = '#fff2a6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 1.5, y);
    ctx.lineTo(x + 1.5, y);
    ctx.moveTo(x, y - 1.5);
    ctx.lineTo(x, y + 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

function renderSeedStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen'; // מצב מיזוג זוהר לחלקיקים

  // 1. חישוב אוטומטי של מקור (Source) ויעד (Target) לפי קבועי ה-BTL
  const isTargetOpponent = Math.abs(effect.centerX - BTL.OPP_SPRITE.x) < 40;

  // מרכז פוקימון השחקן (PLY)
  const plyX = BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2;
  const plyY = BTL.PLY_SPRITE.y + BTL.PLY_SPRITE.h / 2;

  // מרכז פוקימון האויב (OPP)
  const oppX = BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2;
  const oppY = BTL.OPP_SPRITE.y + BTL.OPP_SPRITE.h / 2;

  // הגדרת המטרה (הפוקימון המורעל בזרע) והשואב (הפוקימון שמקבל חיים)
  const targetX = isTargetOpponent ? oppX : plyX;
  const targetY = isTargetOpponent ? oppY : plyY;
  const sourceX = isTargetOpponent ? plyX : oppX;
  const sourceY = isTargetOpponent ? plyY : oppY;

  // -----------------------------------------------------------------
  // חלק א': ציור הגפן/שורשים סביב המטרה (מבוסס על הקוד המקורי שלך)
  // -----------------------------------------------------------------
  ctx.globalAlpha = fade * 0.25;
  ctx.strokeStyle = '#7ccf5c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(targetX, targetY + effect.height * 0.08, effect.width * 0.26, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  // עלים וזרעים קטנים שצומחים/מרחפים סביב המטרה
  for (let i = 0; i < 3; i++) {
    const phase = (effect.timer * 1.5 + i * 0.22) % 1;
    const x = targetX - effect.width * 0.18 + i * effect.width * 0.18;
    const y = targetY + effect.height * 0.18 - phase * effect.height * 0.38;

    ctx.globalAlpha = fade * (0.35 + (1 - phase) * 0.25);
    ctx.fillStyle = i === 1 ? '#a8e070' : '#78c850';
    ctx.beginPath();
    ctx.ellipse(x, y, 2.5, 1.8, i === 1 ? -0.6 : 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d8f8c8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 2);
    ctx.stroke();
  }

  // -----------------------------------------------------------------
  // חלק ב': אפקט שאיבת החיים (נסיעת חלקיקים מהמטרה אל המקור)
  // -----------------------------------------------------------------
  // נשתמש ב-Seeded RNG קבוע לפי הטימר כדי שהחלקיקים ירוצו בצורה חלקה במסלול
  const seed = Math.floor(effect.timer * 0.001) + 42;
  const rng = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  const particleCount = 5;
  for (let i = 0; i < particleCount; i++) {
    // לכל חלקיק יש התחלה קצת שונה (Delay)
    const pSeed = seed + i * 15;
    const offset = rng(pSeed);

    // התקדמות החלקיק בזמן לאורך הדרך מהמטרה אל השואב
    const progress = (effect.timer * 0.8 + offset) % 1.0;

    // חישוב מיקום ליניארי
    const lx = targetX + (sourceX - targetX) * progress;
    const ly = targetY + (sourceY - targetY) * progress;

    // הוספת קשת עיקול (Arc) קלה בשמיים כדי שהחלקיקים לא יטוסו בקו ישר ומשעמם
    const curveY = Math.sin(progress * Math.PI) * -15;
    const px = lx;
    const py = ly + curveY;

    // פייד-אין בהתחלה ופייד-אאוט חלק לקראת ההגעה לפוקימון התוקף
    const pAlpha = Math.sin(progress * Math.PI) * fade * 0.8;

    if (pAlpha > 0) {
      ctx.globalAlpha = pAlpha;

      // ליבה זוהרת ירוקה/לבנה (Health Particle)
      const grad = ctx.createRadialGradient(px, py, 0, px, py, 4);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#88ff88');
      grad.addColorStop(1, 'rgba(68, 204, 68, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function renderTrapStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  ctx.save();
  ctx.globalAlpha = fade * 0.75;
  ctx.strokeStyle = '#f0a060';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const y = effect.centerY - effect.height * 0.08 + i * effect.height * 0.12;
    ctx.beginPath();
    for (let step = 0; step <= 12; step++) {
      const progress = step / 12;
      const x = effect.centerX - effect.width * 0.24 + progress * effect.width * 0.48;
      const offsetY = Math.sin(progress * Math.PI * 2 + effect.timer * 10 + i) * 2.5;
      if (step === 0) {
        ctx.moveTo(x, y + offsetY);
      } else {
        ctx.lineTo(x, y + offsetY);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function renderStatusTurnEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect): void {
  if (!effect.active) return;

  const fade = Math.max(0, 1 - effect.timer / effect.duration);
  switch (effect.status) {
    case 'burn':
      renderBurnStatusEffect(ctx, effect, fade);
      break;
    case 'poison':
      renderPoisonStatusEffect(ctx, effect, fade);
      break;
    case 'paralyze':
      renderParalyzeStatusEffect(ctx, effect, fade);
      break;
    case 'sleep':
      renderSleepStatusEffect(ctx, effect, fade);
      break;
    case 'freeze':
      renderFreezeStatusEffect(ctx, effect, fade);
      break;
    case 'confuse':
      renderConfuseStatusEffect(ctx, effect, fade);
      break;
    case 'seed':
      renderSeedStatusEffect(ctx, effect, fade);
      break;
    case 'trap':
      renderTrapStatusEffect(ctx, effect, fade);
      break;
    case 'curse':
      //   todo
      break;
  }
}
