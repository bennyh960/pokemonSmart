import React, { createContext, useContext, useState, useCallback } from 'react';
import { GameNotificationItem } from '../componenets/GameNotification';

export type NotificationPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center';

export type NotificationType = 'info' | 'success' | 'warning' | 'danger' | 'levelUp';

export interface GameNotificationProps {
  id: string; // Internal ID for filtering
  text: string;
  type: NotificationType;
  duration?: number;
  position?: NotificationPosition;
  onClose?: () => void;
}

// Omit ID for the trigger function input
export type ShowNotificationOptions = Omit<GameNotificationProps, 'id'>;

interface GameNotificationContextType {
  showNotification: (options: ShowNotificationOptions) => void;
}

const GameNotificationContext = createContext<GameNotificationContextType | undefined>(undefined);

export const GameNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<GameNotificationProps[]>([]);

  const showNotification = useCallback((options: ShowNotificationOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = options.duration ?? 3000;
    const position = options.position ?? 'top-right';

    const newNotification: GameNotificationProps = {
      ...options,
      id,
      duration,
      position,
    };

    setNotifications((prev) => [...prev, newNotification]);

    if (duration > 0) {
      setTimeout(() => {
        dismissNotification(id, options.onClose);
      }, duration);
    }
  }, []);

  const dismissNotification = useCallback((id: string, onClose?: () => void) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (onClose) onClose();
  }, []);

  // Group notifications by position for rendering
  const positions: NotificationPosition[] = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
    'top-center',
    'bottom-center',
  ];

  return (
    <GameNotificationContext.Provider value={{ showNotification }}>
      {children}

      {/* Containers for each position */}
      {positions.map((pos) => {
        const filtered = notifications.filter((n) => n.position === pos);
        if (filtered.length === 0) return null;

        return (
          <div key={pos} style={{ ...containerStyles[pos], zIndex: 9999 }}>
            {filtered.map((notification) => (
              <GameNotificationItem
                key={notification.id}
                notification={notification}
                onClose={() => dismissNotification(notification.id, notification.onClose)}
              />
            ))}
          </div>
        );
      })}
    </GameNotificationContext.Provider>
  );
};

export const useGameNotification = () => {
  const context = useContext(GameNotificationContext);
  if (!context) {
    throw new Error('useGameNotification must be used within a GameNotificationProvider');
  }
  return context;
};

// --- Container Positions Styling ---
const containerStyles: Record<NotificationPosition, React.CSSProperties> = {
  'top-left': { position: 'fixed', top: '20px', left: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  'top-right': { position: 'fixed', top: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  'bottom-left': {
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: '10px',
  },
  'bottom-right': {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: '10px',
  },
  'top-center': {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'center',
  },
  'bottom-center': {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: '10px',
    alignItems: 'center',
  },
};
