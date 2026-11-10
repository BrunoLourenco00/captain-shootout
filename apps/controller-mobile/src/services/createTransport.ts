import type { ControllerTransport } from '@captain/game-protocol';
import { createMockTransport } from './mockTransport';

/**
 * Single place that picks the transport implementation.
 * Phase 3 adds the Firebase transport here; until then the mock simulates the desktop.
 */
export function createTransport(): ControllerTransport {
  return createMockTransport();
}
