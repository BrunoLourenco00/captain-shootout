import { useEffect, useState } from 'react';

/** Current time, refreshed every `intervalMs`. For display only; the reducer owns the clock. */
export function useNow(intervalMs = 100): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
