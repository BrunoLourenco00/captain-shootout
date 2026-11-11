import { readFirebaseSettings } from '@captain/firebase-transport';
import { createFirebaseControllerTransport } from '@captain/firebase-transport/controller';
import type { ControllerTransport } from '@captain/game-protocol';
import { createMockTransport } from './mockTransport';

/**
 * Single place that picks the transport implementation: Firebase when configured
 * (real project or local emulators), otherwise a mock that simulates the desktop.
 */
export function createTransport(): ControllerTransport {
  const settings = readFirebaseSettings(import.meta.env);
  return settings ? createFirebaseControllerTransport(settings) : createMockTransport();
}
