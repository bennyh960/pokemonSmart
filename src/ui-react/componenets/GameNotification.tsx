import React from 'react';
import type { GameNotificationProps, NotificationType } from '../context/GameNotifications-context';

interface ItemProps {
  notification: GameNotificationProps;
  onClose?: () => void;
}

export const GameNotificationItem: React.FC<ItemProps> = ({ notification, onClose }) => {
  const { text, type } = notification;

  return (
    <div style={{ ...baseStyle, ...typeStyles[type] }}>
      <span style={iconStyles[type]}>{typeIcons[type]}</span>
      <div style={textStyle}>{text}</div>
      <button onClick={onClose} style={closeButtonStyles}>
        ×
      </button>
    </div>
  );
};

// --- UI Styling ---
const baseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 18px',
  borderRadius: '4px',
  border: '2px solid',
  boxShadow: '0 4px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
  fontFamily: '"Courier New", Courier, monospace',
  fontWeight: 'bold',
  minWidth: '260px',
  maxWidth: '400px',
  color: '#fff',
  textShadow: '1px 1px 0px #000',
  animation: 'slideIn 0.2s ease-out',
};

const textStyle: React.CSSProperties = {
  flexGrow: 1,
  marginRight: '12px',
};

const closeButtonStyles: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#fff',
  fontSize: '20px',
  cursor: 'pointer',
  opacity: 0.7,
  padding: '0 4px',
  lineHeight: 1,
};

const typeStyles: Record<NotificationType, React.CSSProperties> = {
  info: { backgroundColor: '#1a365d', borderColor: '#3182ce' },
  success: { backgroundColor: '#1c4532', borderColor: '#38a169' },
  warning: { backgroundColor: '#744210', borderColor: '#dd6b20' },
  danger: { backgroundColor: '#742a2a', borderColor: '#e53e3e' },
  levelUp: { backgroundColor: '#44337a', borderColor: '#9f7aea', boxShadow: '0 0 15px #9f7aea' },
};

const iconStyles: Record<NotificationType, React.CSSProperties> = {
  info: { marginRight: '10px' },
  success: { marginRight: '10px' },
  warning: { marginRight: '10px' },
  danger: { marginRight: '10px' },
  levelUp: { marginRight: '10px', animation: 'bounce 0.5s infinite alternate' },
};

const typeIcons: Record<NotificationType, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  danger: '🚨',
  levelUp: '✨',
};
