import { readFirebaseSettings } from '@captain/firebase-transport';
import { createCaptainAccountService } from '@captain/firebase-transport/account';
import { readCaptainSettings } from '@captain/firebase-transport/captain';
import type { AccountService } from '@captain/game-protocol';
import { createMockAccount } from './mockAccount';

/**
 * CAPTAIN accounts: the real CAPTAIN Firebase Auth when configured, a mock next to the
 * mock transport for local UI work, or null (Firebase without accounts: guests only).
 */
export function createAccount(): AccountService | null {
  const game = readFirebaseSettings(import.meta.env);
  if (!game) return createMockAccount();
  const captain = readCaptainSettings(import.meta.env);
  return captain ? createCaptainAccountService(captain, game.emulatorHost) : null;
}
