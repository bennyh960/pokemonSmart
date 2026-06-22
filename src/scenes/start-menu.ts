import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawRect, drawText, fillRoundRect, slider } from '../engine/renderer.js';
import { LOGICAL_WIDTH as SCREEN_W } from '../engine/config.js';
import { t, isRTL, getLocale, setLocale } from '../i18n/i18n.js';
import type { Locale } from '../i18n/i18n.js';
import { getPlayerData, hasActiveGame, autoSave } from '../systems/game-state.js';
import { applyDirectItemEffect, consumeItem } from '../systems/item-effects.js';
import { getGlobalAudio } from '../audio/audio-manager.js';
import { setPokedexBadgesMode } from './pokedex';
import { setBagMode } from './bag.js';
import { setPartyMode } from './party';
import { openSaveSlots } from './save-slots.js';
import { scheduleFishing, toggleLegend, isLegendVisible, setupWorldMapFly } from './overworld.js';

// 'actionsDropdown' = main panel visible + side dropdown open
// 'settings' = full-screen settings view
type MenuView = 'main' | 'actionsDropdown' | 'settings';

const PANEL_W = 100;
const DROP_W = 88; // actions dropdown width
const ITEM_H = 14;
const PAD_V = 4;

const MAIN_KEYS = ['pokedex', 'party', 'bag', 'map', 'trainerData', 'save', 'actions', 'settings', 'exit'] as const;
const ACTIONS_KEYS = ['fishing', 'telephone', 'battleHelper', 'learn'] as const;
const SETTINGS_KEYS = ['language', 'music_volume', 'music_mute', 'sfx_volume', 'sfx_mute', 'legend'] as const;

const ACTIONS_IDX = 6; // index of 'actions' in MAIN_KEYS

export function createStartMenuScene(input: InputManager, stateMachine: StateMachine): Scene {
  let view: MenuView = 'main';
  let mainIdx = 0;
  let actionsIdx = 0;
  let settingsIdx = 0;
  let pendingBhConfirm = false;
  let bhNotice: string | null = null;
  let bhNoticeTimer = 0;

  function wrap(v: number, len: number): number {
    return ((v % len) + len) % len;
  }

  function hasFishingRod(): boolean {
    if (!hasActiveGame()) return false;
    return (getPlayerData().items['fishing-rod'] || 0) > 0;
  }

  function confirmMain(): void {
    switch (MAIN_KEYS[mainIdx]) {
      case 'pokedex':
        stateMachine.pop();
        stateMachine.push('POKEDEX');
        break;
      case 'party':
        setPartyMode('overworld');
        stateMachine.pop();
        stateMachine.push('PARTY');
        break;
      case 'bag':
        setBagMode('overworld');
        stateMachine.pop();
        stateMachine.push('BAG');
        break;
      case 'map':
        setupWorldMapFly();
        stateMachine.pop();
        stateMachine.push('WORLD_MAP');
        break;
      case 'trainerData':
        setPokedexBadgesMode(true);
        stateMachine.pop();
        stateMachine.push('POKEDEX');
        break;
      case 'save':
        if (hasActiveGame()) {
          openSaveSlots('save');
          stateMachine.pop();
          stateMachine.push('SAVE_SLOTS');
        }
        break;
      case 'actions':
        view = 'actionsDropdown';
        actionsIdx = 0;
        break;
      case 'settings':
        view = 'settings';
        settingsIdx = 0;
        break;
      case 'exit':
        stateMachine.pop();
        break;
    }
  }

  function confirmAction(): void {
    switch (ACTIONS_KEYS[actionsIdx]) {
      case 'fishing':
        if (hasFishingRod()) {
          scheduleFishing();
          stateMachine.pop();
        }
        break;
      case 'telephone':
        stateMachine.pop();
        stateMachine.push('PHONE');
        break;
      case 'learn':
        stateMachine.pop();
        stateMachine.push('ENGLISH_LEARNING');
        break;
      case 'battleHelper':
        if (!hasActiveGame()) break;
        if (pendingBhConfirm) break;
        {
          const pd = getPlayerData();
          if (pd.battleHelperBattles > 0) {
            pd.battleHelperEnabled = !pd.battleHelperEnabled;
            autoSave();
          } else {
            const count = pd.items['battle-helper'] || 0;
            if (count > 0) {
              pendingBhConfirm = true;
            } else {
              bhNotice = t('menu.actions.battleHelper.noItems');
              bhNoticeTimer = 2000;
            }
          }
        }
        break;
    }
  }

  function confirmSetting(): void {
    const audio = getGlobalAudio();
    if (!audio) return;

    const currentKey = SETTINGS_KEYS[settingsIdx];
    const isMasterMuted = audio.isMasterMuted();

    if (currentKey === 'language') {
      setLocale(getLocale() === 'he' ? 'en' : ('he' as Locale));
    } else if (currentKey === 'music_mute') {
      // משנים את המצב רק אם ה-Master Mute לא פעיל וכופה השתקה
      if (!isMasterMuted) {
        audio.setMusicMuted(!audio.isMusicMuted());
      }
    } else if (currentKey === 'sfx_mute') {
      if (!isMasterMuted) {
        audio.setSFXMuted(!audio.isSFXMuted());
      }
    } else if (currentKey === 'legend') {
      toggleLegend();
    }
  }

  // Draw a pill badge. fillRoundRect uses current ctx.fillStyle.
  function pill(
    ctx: CanvasRenderingContext2D,
    label: string,
    bg: string,
    fg: string,
    px: number,
    py: number,
    pw = 22,
    ph = 9,
  ): void {
    ctx.fillStyle = bg;
    fillRoundRect(ctx, px, py, pw, ph, 3);
    drawText(ctx, label, px + pw / 2, py + 2, { size: 5, color: fg, align: 'center' });
  }

  function onOffPill(ctx: CanvasRenderingContext2D, on: boolean, px: number, py: number, pw = 22, ph = 9): void {
    pill(ctx, on ? 'ON' : 'OFF', on ? '#1a4a1a' : '#2a2a3a', on ? '#20d860' : '#445544', px, py, pw, ph);
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  function renderMainPanel(
    ctx: CanvasRenderingContext2D,
    rtl: boolean,
    px: number,
    py: number,
    cursorIdx: number,
    showCursor: boolean,
  ): void {
    const ph = PAD_V * 2 + MAIN_KEYS.length * ITEM_H;

    fillRect(ctx, px + 2, py + 2, PANEL_W, ph, '#000000'); // shadow
    fillRect(ctx, px, py, PANEL_W, ph, '#1a1a2e'); // bg
    drawRect(ctx, px, py, PANEL_W, ph, '#6060a0', 1); // border

    for (let i = 0; i < MAIN_KEYS.length; i++) {
      const key = MAIN_KEYS[i];
      const sel = i === cursorIdx;
      const iy = py + PAD_V + i * ITEM_H;

      if (sel) fillRect(ctx, px + 1, iy, PANEL_W - 2, ITEM_H - 1, '#2a2a50');

      if (sel && showCursor) {
        drawText(ctx, rtl ? '◄' : '►', rtl ? px + PANEL_W - 5 : px + 5, iy + 2, {
          size: 6,
          color: '#ffff00',
          align: rtl ? 'right' : 'left',
        });
      }

      const lx = rtl ? px + PANEL_W - 13 : px + 13;
      drawText(ctx, t(`menu.${key}`), lx, iy + 2, {
        size: 7,
        color: sel ? '#ffffff' : '#aaaacc',
        align: rtl ? 'right' : 'left',
        direction: rtl ? 'rtl' : 'ltr',
        maxWidth: PANEL_W - 17,
      });
    }

    drawText(ctx, 'ESC', rtl ? px + 5 : px + PANEL_W - 5, py + ph - 8, {
      size: 5,
      color: '#3a3a5a',
      align: rtl ? 'left' : 'right',
    });
  }

  function renderDropdown(ctx: CanvasRenderingContext2D, rtl: boolean, mainPx: number, mainPy: number): void {
    const dropX = rtl ? mainPx + PANEL_W + 3 : mainPx - DROP_W - 3;
    const dropY = mainPy + PAD_V + ACTIONS_IDX * ITEM_H;
    const dropH = PAD_V * 2 + ACTIONS_KEYS.length * ITEM_H;

    // 3-px bridge connecting to main panel
    const bridgeX = rtl ? mainPx + PANEL_W : dropX + DROP_W;
    const bridgeY = dropY + ITEM_H / 2 - 1;
    fillRect(ctx, bridgeX, bridgeY, 3, 2, '#5050a0');

    fillRect(ctx, dropX + 2, dropY + 2, DROP_W, dropH, '#000000'); // shadow
    fillRect(ctx, dropX, dropY, DROP_W, dropH, '#161628'); // bg
    drawRect(ctx, dropX, dropY, DROP_W, dropH, '#5050a0', 1); // border

    for (let i = 0; i < ACTIONS_KEYS.length; i++) {
      const key = ACTIONS_KEYS[i];
      const sel = i === actionsIdx;
      const disabled = key === 'fishing' && !hasFishingRod();
      const iy = dropY + PAD_V + i * ITEM_H;
      const hasPill = key === 'battleHelper';

      if (sel) fillRect(ctx, dropX + 1, iy, DROP_W - 2, ITEM_H - 1, '#2a2a50');

      if (sel) {
        drawText(ctx, rtl ? '◄' : '►', rtl ? dropX + DROP_W - 5 : dropX + 5, iy + 2, {
          size: 6,
          color: '#ffff00',
          align: rtl ? 'right' : 'left',
        });
      }

      const bhPd = hasPill && hasActiveGame() ? getPlayerData() : null;
      const bhBattles = bhPd?.battleHelperBattles ?? 0;
      const hasCounter = hasPill && bhBattles > 0;
      const lx = rtl ? dropX + DROP_W - 13 : dropX + 13;
      drawText(ctx, t(`menu.actions.${key}`), lx, iy + 2, {
        size: 7,
        color: disabled ? '#555566' : sel ? '#ffffff' : '#aaaacc',
        align: rtl ? 'right' : 'left',
        direction: rtl ? 'rtl' : 'ltr',
        maxWidth: DROP_W - 13 - (hasPill ? (hasCounter ? 44 : 28) : 4),
      });

      if (hasPill) {
        const on = bhPd?.battleHelperEnabled ?? false;
        const pillX = rtl ? dropX + 4 : dropX + DROP_W - 26;
        onOffPill(ctx, on, pillX, iy + 2);
        if (hasCounter) {
          const cntX = rtl ? pillX + 26 : pillX - 16;
          pill(ctx, String(bhBattles), '#1a2a4a', '#88aaff', cntX, iy + 2, 14, 9);
        }
      }
    }

    // Confirmation overlay
    if (pendingBhConfirm && hasActiveGame()) {
      const count = getPlayerData().items['battle-helper'] || 0;
      const boxH = 36;
      const boxY = dropY + (dropH - boxH) / 2;
      fillRect(ctx, dropX, boxY, DROP_W, boxH, '#0d0d1a');
      drawRect(ctx, dropX, boxY, DROP_W, boxH, '#88aaff', 1);
      const cx = dropX + DROP_W / 2;
      drawText(ctx, t('menu.actions.battleHelper.confirm'), cx, boxY + 6, {
        size: 6,
        color: '#ffffff',
        align: 'center',
      });
      drawText(ctx, t('menu.actions.battleHelper.confirmSub', { count: String(count) }), cx, boxY + 16, {
        size: 5,
        color: '#88aaff',
        align: 'center',
      });
      drawText(ctx, '↵ Yes   ESC No', cx, boxY + 26, { size: 5, color: '#aaaacc', align: 'center' });
    }

    // Brief notice (no items)
    if (bhNotice) {
      const nx = dropX + DROP_W / 2;
      const ny = dropY + dropH + 5;
      fillRect(ctx, dropX, ny, DROP_W, 12, '#2a0a0a');
      drawRect(ctx, dropX, ny, DROP_W, 12, '#aa4444', 1);
      drawText(ctx, bhNotice, nx, ny + 2, { size: 5, color: '#ffaaaa', align: 'center', maxWidth: DROP_W - 4 });
    }
  }

  function renderSettings(ctx: CanvasRenderingContext2D, rtl: boolean): void {
    clearScreen(ctx, '#0d0d1a');
    const audio = getGlobalAudio();
    const isMasterMuted = audio ? audio.isMasterMuted() : false;

    // Title bar
    fillRect(ctx, 0, 0, 240, 20, '#161630');
    drawText(ctx, t('menu.settings'), 120, 11, { size: 8, color: '#aaaaff', align: 'center' });
    fillRect(ctx, 0, 19, 240, 1, '#3030a0');

    // שינוי גובה השורה ל-20 פיקסלים כדי שהכל ייכנס בתוך מסך של 160 פיקסלים
    const ROW_H = 18;
    const startY = 26;
    const PILL_W = 28;
    const PILL_H = 12;

    for (let i = 0; i < SETTINGS_KEYS.length; i++) {
      const key = SETTINGS_KEYS[i];
      const sel = i === settingsIdx;
      const iy = startY + i * ROW_H;

      if (sel) fillRect(ctx, 0, iy, 240, ROW_H - 1, '#1a1a40');

      if (sel) {
        drawText(ctx, rtl ? '◄' : '►', rtl ? 240 - 6 : 6, iy + ROW_H / 2 - 4, {
          size: 6,
          color: '#ffff00',
          align: rtl ? 'right' : 'left',
        });
      }

      const lx = rtl ? 240 - 16 : 16;
      drawText(ctx, t(`menu.settings.${key}`), lx, iy + ROW_H / 2 - 4, {
        size: 8,
        color: sel ? '#ffffff' : '#aaaacc',
        align: rtl ? 'right' : 'left',
        direction: rtl ? 'rtl' : 'ltr',
      });

      const pillX = rtl ? 8 : 240 - PILL_W - 8;
      const pillY = iy + ROW_H / 2 - PILL_H / 2;

      if (key === 'language') {
        const loc = getLocale();
        pill(ctx, loc === 'he' ? 'HE' : 'EN', '#1a3a5a', '#88ccff', pillX, pillY, PILL_W, PILL_H);
      } else if (key === 'music_volume') {
        const vol = audio ? audio.getMusicVolume() : 0.5;
        slider(ctx, vol, pillX, pillY, PILL_W, PILL_H);
      } else if (key === 'music_mute') {
        // אם יש Master Mute - הכפתור מושבת וצבוע באפור כהה
        if (isMasterMuted) {
          pill(ctx, 'MUTE', '#222222', '#555555', pillX, pillY, PILL_W, PILL_H);
        } else {
          const isMuted = audio ? audio.isMusicMuted() : false;
          onOffPill(ctx, !isMuted, pillX, pillY, PILL_W, PILL_H);
        }
      } else if (key === 'sfx_volume') {
        const vol = audio ? audio.getSFXVolume() : 0.7;
        slider(ctx, vol, pillX, pillY, PILL_W, PILL_H);
      } else if (key === 'sfx_mute') {
        if (isMasterMuted) {
          pill(ctx, 'MUTE', '#222222', '#555555', pillX, pillY, PILL_W, PILL_H);
        } else {
          const isMuted = audio ? audio.isSFXMuted() : false;
          onOffPill(ctx, !isMuted, pillX, pillY, PILL_W, PILL_H);
        }
      } else if (key === 'legend') {
        onOffPill(ctx, isLegendVisible(), pillX, pillY, PILL_W, PILL_H);
      }
    }

    // --- מקרא וכיתוב גלובלי לתחתית המסך (Legend) ---
    const footerY = 160 - 24;

    // ציור מדד ה-Master Mute הגלובלי
    fillRect(ctx, 0, footerY - 4, 240, 1, '#222244');
    if (isMasterMuted) {
      drawText(ctx, '⚠️ MASTER MUTED (All Sound Off)', 120, footerY, { size: 6, color: '#ff5555', align: 'center' });
    } else {
      drawText(ctx, '🎵 Sound System Active', 120, footerY, { size: 6, color: '#55ff55', align: 'center' });
    }

    // שורת כפתורי ניווט
    drawText(ctx, `[M] ${t('menu.settings.music_mute')}  |  [ESC] ${t('menu.exit')}`, 120, 160 - 10, {
      size: 6,
      color: '#44447a',
      align: 'center',
    });
  }

  // ── Scene ───────────────────────────────────────────────────────────────────

  return {
    enter(): void {
      view = 'main';
      mainIdx = 0;
      actionsIdx = 0;
      settingsIdx = 0;
      pendingBhConfirm = false;
      bhNotice = null;
      bhNoticeTimer = 0;
    },

    exit(): void {},

    update(dt: number): void {
      if (bhNoticeTimer > 0) {
        bhNoticeTimer -= dt * 1000;
        if (bhNoticeTimer <= 0) bhNotice = null;
      }

      const esc = input.isKeyPressed('Escape') || input.isKeyPressed('Backspace');
      const up = input.isKeyPressed('ArrowUp');
      const down = input.isKeyPressed('ArrowDown');
      const left = input.isKeyPressed('ArrowLeft'); // <-- הוספה של חץ שמאלה
      const right = input.isKeyPressed('ArrowRight'); // <-- הוספה של חץ ימינה
      const ok = input.isKeyPressed('Enter') || input.isKeyPressed(' ');

      if (pendingBhConfirm) {
        if (esc) {
          pendingBhConfirm = false;
          return;
        }
        if (ok) {
          const pd = getPlayerData();
          applyDirectItemEffect('battle-helper');
          consumeItem(pd.items, 'battle-helper');
          pd.battleHelperEnabled = true;
          pendingBhConfirm = false;
          autoSave();
        }
        return;
      }

      if (view === 'main') {
        if (esc) {
          stateMachine.pop();
          return;
        }
        if (up) {
          mainIdx = wrap(mainIdx - 1, MAIN_KEYS.length);
          return;
        }
        if (down) {
          mainIdx = wrap(mainIdx + 1, MAIN_KEYS.length);
          return;
        }
        if (ok) confirmMain();
      } else if (view === 'actionsDropdown') {
        if (esc) {
          view = 'main';
          return;
        }
        if (up) {
          actionsIdx = wrap(actionsIdx - 1, ACTIONS_KEYS.length);
          return;
        }
        if (down) {
          actionsIdx = wrap(actionsIdx + 1, ACTIONS_KEYS.length);
          return;
        }
        if (ok) confirmAction();
      } else {
        // --- אנחנו במסך ההגדרות (view === 'settings') ---
        if (esc) {
          view = 'main';
          return;
        }
        if (up) {
          settingsIdx = wrap(settingsIdx - 1, SETTINGS_KEYS.length);
          return;
        }
        if (down) {
          settingsIdx = wrap(settingsIdx + 1, SETTINGS_KEYS.length);
          return;
        }

        // שינוי סליידרים באמצעות חצים ימינה ושמאלה
        const audio = getGlobalAudio();
        if (audio) {
          const currentKey = SETTINGS_KEYS[settingsIdx];

          if (left) {
            if (currentKey === 'music_volume') {
              const newVol = Math.max(0, Math.round((audio.getMusicVolume() - 0.1) * 10) / 10);
              audio.setMusicVolume(newVol);
            } else if (currentKey === 'sfx_volume') {
              const newVol = Math.max(0, Math.round((audio.getSFXVolume() - 0.1) * 10) / 10);
              audio.setSFXVolume(newVol);
              audio.playSFX('confirm'); // השמעת צליל קטן לבדיקת העוצמה בזמן אמת
            }
          }

          if (right) {
            if (currentKey === 'music_volume') {
              const newVol = Math.min(1, Math.round((audio.getMusicVolume() + 0.1) * 10) / 10);
              audio.setMusicVolume(newVol);
            } else if (currentKey === 'sfx_volume') {
              const newVol = Math.min(1, Math.round((audio.getSFXVolume() + 0.1) * 10) / 10);
              audio.setSFXVolume(newVol);
              audio.playSFX('confirm'); // השמעת צליל קטן לבדיקת העוצמה בזמן אמת
            }
          }
        }

        if (ok) confirmSetting();
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      const rtl = isRTL();

      if (view === 'settings') {
        renderSettings(ctx, rtl);
        return;
      }

      // Main panel (+ optional dropdown) — overworld frame stays fully visible underneath
      const px = rtl ? 2 : SCREEN_W - PANEL_W - 2;
      const py = 2;

      if (view === 'actionsDropdown') {
        renderMainPanel(ctx, rtl, px, py, ACTIONS_IDX, false);
        renderDropdown(ctx, rtl, px, py);
      } else {
        renderMainPanel(ctx, rtl, px, py, mainIdx, true);
      }
    },
  };
}
