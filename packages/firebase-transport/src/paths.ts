/**
 * Realtime Database layout (see database.rules.json):
 *
 * sessions/{sessionId}/
 *   public      { status, hostUid, createdAt, heartbeatAt }               readable by anyone
 *   secret      { token }                                                readable by nobody
 *   controller  { uid, nickname, token, joinedAt }                       written once by the phone
 *   presence    { controller: boolean }                                  phone, onDisconnect → false
 *   ready       boolean                                                  phone
 *   shots/{id}  ShotCommand                                              phone, create-only
 *   view        ControllerView                                           desktop → phone
 */
export const sessionPath = (id: string) => `sessions/${id}`;
export const publicPath = (id: string) => `${sessionPath(id)}/public`;
export const controllerPath = (id: string) => `${sessionPath(id)}/controller`;
export const presencePath = (id: string) => `${sessionPath(id)}/presence/controller`;
export const readyPath = (id: string) => `${sessionPath(id)}/ready`;
export const shotsPath = (id: string) => `${sessionPath(id)}/shots`;
export const viewPath = (id: string) => `${sessionPath(id)}/view`;

export type SessionPublicStatus = 'open' | 'taken' | 'closed';

export interface SessionPublic {
  status: SessionPublicStatus;
  hostUid: string;
  createdAt: number;
  /** Server time of the host's last heartbeat; a stale value means the desktop is gone. */
  heartbeatAt: number;
}

export const HEARTBEAT_INTERVAL_MS = 30_000;
/** A phone refuses sessions whose host has been silent for longer than this. */
export const HEARTBEAT_STALE_MS = 90_000;

export interface SessionController {
  uid: string;
  nickname: string;
  token: string;
  joinedAt: number;
}

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Unpredictable id from an unambiguous alphabet. */
export function randomId(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
