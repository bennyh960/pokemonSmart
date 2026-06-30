import { createRoot, type Root } from 'react-dom/client';
import { createElement, type ComponentType } from 'react';
import { I18nProvider } from '../../ui-react/context/i18n-context';
import { GameNotificationProvider } from '../../ui-react/context/GameNotifications-context';

let root: Root | null = null;
let overlay: HTMLElement | null = null;

export function initReactHost(el: HTMLElement): void {
  overlay = el;
}

export function mountReactScene<P extends { onClose: () => void }>(Component: ComponentType<P>, props: P): void {
  if (!overlay) throw new Error('ReactHost not initialized.');
  root = createRoot(overlay);
  root.render(
    createElement(I18nProvider, null, createElement(GameNotificationProvider, null, createElement(Component, props))),
  );
}

export function unmountReactScene(): void {
  root?.unmount();
  root = null;
}
