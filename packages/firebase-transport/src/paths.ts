/**
 * Realtime Database layout (see database.rules.json):
 *
 * sessions/{sessionId}/
 *   public      { status: 'open'|'taken'|'closed', hostUid, createdAt }  readable by anyone
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
}

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
