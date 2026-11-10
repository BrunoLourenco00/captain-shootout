import {
  isBetterResult,
  nicknameKey,
  type LeaderboardEntry,
  type LeaderboardStore,
} from '@captain/game-protocol';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getCountFromServer,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  where,
  type Firestore,
} from 'firebase/firestore';
import { EMULATOR_HOST, EMULATOR_PORTS, getFirebase, type FirebaseSettings } from './firebase';

/** Firestore: leaderboard/{nicknameKey} holds each nickname's best result. */
const COLLECTION = 'leaderboard';

let firestore: Firestore | null = null;

function getDb(settings: FirebaseSettings): Firestore {
  if (firestore) return firestore;
  const { app } = getFirebase(settings);
  firestore = getFirestore(app);
  if (settings.useEmulators) {
    connectFirestoreEmulator(firestore, EMULATOR_HOST, EMULATOR_PORTS.firestore);
  }
  return firestore;
}

function toEntry(data: Record<string, unknown>): LeaderboardEntry {
  return {
    nickname: String(data.nickname ?? ''),
    score: Number(data.score ?? 0),
    baskets: Number(data.baskets ?? 0),
    shots: Number(data.shots ?? 0),
    completedAt: Number(data.completedAt ?? 0),
  };
}

export function createFirestoreLeaderboard(settings: FirebaseSettings): LeaderboardStore {
  const db = getDb(settings);
  const col = collection(db, COLLECTION);

  return {
    async submit(entry) {
      const key = nicknameKey(entry.nickname);
      const docRef = doc(db, COLLECTION, key);
      const best = await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        const current = snap.exists() ? toEntry(snap.data()) : null;
        if (current && !isBetterResult(entry, current)) return current;
        tx.set(docRef, { ...entry, key });
        return entry;
      });
      // Rank of the nickname's best result (ties on score share the better rank).
      const higher = await getCountFromServer(query(col, where('score', '>', best.score)));
      return { rank: higher.data().count + 1 };
    },

    async top(n) {
      const snap = await getDocs(
        query(
          col,
          orderBy('score', 'desc'),
          orderBy('baskets', 'desc'),
          orderBy('completedAt', 'asc'),
          limit(n),
        ),
      );
      return snap.docs.map((d) => toEntry(d.data()));
    },
  };
}
