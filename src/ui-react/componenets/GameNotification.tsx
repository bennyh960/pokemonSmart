import React, { useEffect, useState } from 'react';

type NotificationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

// מיפוי מחלקות Tailwind לפי המיקום הנבחר
const positionStyles: Record<NotificationPosition, string> = {
  'top-left': 'top-4 left-4 flex-col',
  'top-right': 'top-4 right-4 flex-col',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 flex-col items-center',
  'bottom-left': 'bottom-4 left-4 flex-col-reverse', // flex-col-reverse גורם להתראות חדשות להדחף מלמטה
  'bottom-right': 'bottom-4 right-4 flex-col-reverse',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 flex-col-reverse items-center',
};

export type NotificationType = 'info' | 'success' | 'warning' | 'danger' | 'levelUp';

export interface GameNotificationProps {
  text: string;
  type: NotificationType;
  duration?: number;
  position: NotificationPosition;
  onClose?: () => void;
}

const typeStyles: Record<NotificationType, { container: string; border: string; icon: string }> = {
  info: {
    container: 'bg-slate-900/95 text-cyan-400',
    border: 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]',
    icon: 'ℹ️',
  },
  success: {
    container: 'bg-slate-900/95 text-emerald-400',
    border: 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
    icon: '⚔️',
  },
  warning: {
    container: 'bg-slate-900/95 text-amber-400',
    border: 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]',
    icon: '⚠️',
  },
  danger: {
    container: 'bg-slate-900/95 text-rose-500',
    border: 'border-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.4)]',
    icon: '💀',
  },
  levelUp: {
    container: 'bg-slate-900/95 text-purple-400 animate-pulse',
    border: 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]',
    icon: '🌟',
  },
};

// קביעת כיוון האנימציה לפי המיקום (למשל: התראה מימין תיכנס ביציאה מימין)
const getAnimationStyles = (position: NotificationPosition, isClosing: boolean) => {
  if (isClosing) return 'opacity-0 scale-95 translate-y-[-10px]';

  if (position.includes('left')) return 'animate-[slideInLeft_0.2s_ease-out]';
  if (position.includes('right')) return 'animate-[slideInRight_0.2s_ease-out]';
  if (position.includes('top')) return 'animate-[slideInTop_0.2s_ease-out]';
  return 'animate-[slideInBottom_0.2s_ease-out]';
};

export const GameNotification: React.FC<GameNotificationProps> = ({
  text,
  type,
  duration = 3000,
  position,
  onClose,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const styles = typeStyles[type];

  useEffect(() => {
    const exitTimeout = setTimeout(() => setIsClosing(true), duration - 300);
    const closeTimeout = setTimeout(() => onClose?.(), duration);
    return () => {
      clearTimeout(exitTimeout);
      clearTimeout(closeTimeout);
    };
  }, [duration, onClose]);

  return (
    <div
      className={`
        fixed z-50 flex gap-2
        pointer-events-auto
        flex flex-col
        min-w-[280px] max-w-sm
        border-2 rounded
        font-mono text-sm uppercase tracking-wide
        transition-all duration-300 ease-out
        ${styles.container} ${styles.border}
        ${getAnimationStyles(position, isClosing)}
        ${positionStyles[position]}
      `}
    >
      <div className="flex items-center gap-3 p-3">
        <span className="text-lg select-none">{styles.icon}</span>
        <div className="flex-1 font-bold">{text}</div>
        <button
          onClick={() => {
            setIsClosing(true);
            setTimeout(() => onClose?.(), 300);
          }}
          className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-white-500"
        >
          ✕
        </button>
      </div>

      <div className="w-full h-1 bg-slate-950/50 overflow-hidden">
        <div
          className="h-full opacity-70"
          style={{
            backgroundColor: 'currentColor',
            animation: `shrinkWidth ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
};
