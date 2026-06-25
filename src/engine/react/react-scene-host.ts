import { createRoot, type Root } from 'react-dom/client';
import { createElement, type ComponentType } from 'react';
import { I18nProvider } from '../../ui-react/context/i18n-context';

let root: Root | null = null;
let overlay: HTMLElement | null = null;

export function initReactHost(el: HTMLElement): void {
  overlay = el;
}

export function mountReactScene(Component: ComponentType<{ onClose: () => void }>, onClose: () => void): void {
  if (!overlay) throw new Error('ReactHost not initialized. Call initReactHost() first.');
  root = createRoot(overlay);
  root.render(createElement(I18nProvider, null, createElement(Component, { onClose })));
}

export function unmountReactScene(): void {
  root?.unmount();
  root = null;
}
