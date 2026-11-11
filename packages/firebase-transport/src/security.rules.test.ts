/**
 * Security rules tests. Run with `pnpm --filter @captain/firebase-transport test:rules`
 * (starts the Database + Firestore emulators).
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { get, ref, set, update } from 'firebase/database';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const SID = 'SESSION1';
const TOKEN = 'secrettoken12345';
const KIOSK_EMAIL = 'main@trycaptain.app';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-captain-shootout',
    database: {
      host: '127.0.0.1',
      port: 9000,
      rules: readFileSync(resolve(root, 'firebase/database.rules.json'), 'utf8'),
    },
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(resolve(root, 'firebase/firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearDatabase();
  await env.clearFirestore();
});

const host = () => env.authenticatedContext('host').database();
const phone = (uid = 'phone') => env.authenticatedContext(uid).database();
const controller = (uid = 'phone', token = TOKEN) => ({
  uid,
  nickname: 'BRUNO',
  token,
  joinedAt: 1,
});
const shot = (shotId = 'shot1', sessionId = SID) => ({
  sessionId,
  shotId,
  directionX: 0,
  directionY: 0.4,
  power: 0.5,
  clientTimestamp: 1,
});

async function openSession() {
  await assertSucceeds(
    set(ref(host(), `sessions/${SID}`), {
      public: { status: 'open', hostUid: 'host', createdAt: 1 },
      secret: { token: TOKEN },
    }),
  );
}

describe('realtime database sessions', () => {
  it('only the host can create a session for itself', async () => {
    await assertFails(
      set(ref(phone(), `sessions/X`), {
        public: { status: 'open', hostUid: 'host', createdAt: 1 },
      }),
    );
    await assertFails(
      set(ref(env.unauthenticatedContext().database(), `sessions/X`), {
        public: { status: 'open', hostUid: 'nobody', createdAt: 1 },
      }),
    );
    await openSession();
  });

  it('anyone can read public status, nobody can read the token', async () => {
    await openSession();
    await assertSucceeds(
      get(ref(env.unauthenticatedContext().database(), `sessions/${SID}/public`)),
    );
    await assertFails(get(ref(phone(), `sessions/${SID}/secret`)));
    await assertFails(get(ref(phone(), `sessions/${SID}`)));
  });

  it('a phone joins only with the right token, once', async () => {
    await openSession();
    await assertFails(
      set(ref(phone(), `sessions/${SID}/controller`), controller('phone', 'wrong')),
    );
    await assertFails(set(ref(phone(), `sessions/${SID}/controller`), controller('someone-else')));
    await assertSucceeds(set(ref(phone(), `sessions/${SID}/controller`), controller()));
    // Second phone cannot take over, the first cannot overwrite.
    await assertFails(
      set(ref(phone('phone2'), `sessions/${SID}/controller`), controller('phone2')),
    );
    await assertFails(set(ref(phone(), `sessions/${SID}/controller`), controller()));
  });

  it('a phone cannot join a session that is not open', async () => {
    await openSession();
    await assertSucceeds(set(ref(host(), `sessions/${SID}/public/status`), 'taken'));
    await assertFails(set(ref(phone(), `sessions/${SID}/controller`), controller()));
  });

  it('only the joined phone can send ready, presence and shots', async () => {
    await openSession();
    await assertSucceeds(set(ref(phone(), `sessions/${SID}/controller`), controller()));
    await assertSucceeds(set(ref(phone(), `sessions/${SID}/ready`), true));
    await assertSucceeds(set(ref(phone(), `sessions/${SID}/presence/controller`), true));
    await assertSucceeds(set(ref(phone(), `sessions/${SID}/shots/shot1`), shot()));
    await assertFails(set(ref(phone('intruder'), `sessions/${SID}/shots/shot2`), shot('shot2')));
    await assertFails(set(ref(phone('intruder'), `sessions/${SID}/ready`), true));
  });

  it('shots are create-only and must be well-formed', async () => {
    await openSession();
    await assertSucceeds(set(ref(phone(), `sessions/${SID}/controller`), controller()));
    await assertSucceeds(set(ref(phone(), `sessions/${SID}/shots/shot1`), shot()));
    await assertFails(set(ref(phone(), `sessions/${SID}/shots/shot1`), shot()));
    await assertFails(set(ref(phone(), `sessions/${SID}/shots/shot2`), shot('other-id')));
    await assertFails(set(ref(phone(), `sessions/${SID}/shots/shot3`), shot('shot3', 'OTHER')));
    await assertFails(
      set(ref(phone(), `sessions/${SID}/shots/shot4`), { ...shot('shot4'), power: 'max' }),
    );
  });

  it('the phone cannot write the view, score or status', async () => {
    await openSession();
    await assertSucceeds(set(ref(phone(), `sessions/${SID}/controller`), controller()));
    await assertFails(set(ref(phone(), `sessions/${SID}/view/score`), 999));
    await assertFails(update(ref(phone(), `sessions/${SID}/public`), { status: 'open' }));
    await assertSucceeds(set(ref(host(), `sessions/${SID}/view`), { status: 'playing', score: 4 }));
    await assertSucceeds(get(ref(phone(), `sessions/${SID}/view`)));
    await assertFails(get(ref(phone('intruder'), `sessions/${SID}/view`)));
  });
});

describe('firestore leaderboard', () => {
  const entry = {
    key: 'BRUNO',
    nickname: 'BRUNO',
    score: 20,
    baskets: 8,
    shots: 12,
    completedAt: 1,
  };

  it('is publicly readable', async () => {
    await assertSucceeds(
      getDoc(doc(env.unauthenticatedContext().firestore(), 'leaderboard/BRUNO')),
    );
  });

  it('only the kiosk account can write', async () => {
    const kiosk = env.authenticatedContext('kiosk', { email: KIOSK_EMAIL }).firestore();
    await assertSucceeds(setDoc(doc(kiosk, 'leaderboard/BRUNO'), entry));
    await assertFails(
      setDoc(doc(env.authenticatedContext('phone').firestore(), 'leaderboard/BRUNO'), entry),
    );
    await assertFails(
      setDoc(doc(env.unauthenticatedContext().firestore(), 'leaderboard/BRUNO'), entry),
    );
  });

  it('rejects malformed entries even from the kiosk', async () => {
    const kiosk = env.authenticatedContext('kiosk', { email: KIOSK_EMAIL }).firestore();
    await assertFails(setDoc(doc(kiosk, 'leaderboard/BRUNO'), { ...entry, key: 'OTHER' }));
    await assertFails(setDoc(doc(kiosk, 'leaderboard/BRUNO'), { ...entry, score: -1 }));
    await assertFails(setDoc(doc(kiosk, 'leaderboard/BRUNO'), { ...entry, baskets: 20 }));
    await assertFails(setDoc(doc(kiosk, 'leaderboard/BRUNO'), { ...entry, admin: true }));
  });
});
