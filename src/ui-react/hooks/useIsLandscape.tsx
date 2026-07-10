import { useEffect, useState } from 'react';

const useIsLandscape = (): [boolean, () => void] => {
  const [autoLandscape, setAutoLandscape] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches,
  );
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)');
    const handler = (e: MediaQueryListEvent) => setAutoLandscape(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const rotate = () => setForced((prev) => !prev);

  // XOR: a manual toggle flips whatever the device is currently reporting
  const isLandscape = autoLandscape !== forced;

  return [isLandscape, rotate];
};

export default useIsLandscape;
