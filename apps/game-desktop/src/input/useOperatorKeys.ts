import { useEffect } from 'react';

export interface OperatorActions {
  onReset: () => void;
  onDemo: () => void;
}

/**
 * Staff shortcuts (see docs/DECISIONS.md):
 * Ctrl+Shift+X → force reset to attract · Ctrl+Shift+D → start a demo round.
 */
export function useOperatorKeys({ onReset, onDemo }: OperatorActions): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey || !e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key === 'x') {
        e.preventDefault();
        onReset();
      } else if (key === 'd') {
        e.preventDefault();
        onDemo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onReset, onDemo]);
}
