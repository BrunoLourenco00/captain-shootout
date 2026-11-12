import { SignJWT, UnsecuredJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { createCaptainTokenVerifier, type CaptainTokenVerifier } from './captainToken';

const PROJECT = 'captain-app23';
const NOW = 1_800_000_000;

let sign: (claims: Record<string, unknown>) => Promise<string>;
let verify: CaptainTokenVerifier;
let forged = '';

const base = {
  iss: `https://securetoken.google.com/${PROJECT}`,
  aud: PROJECT,
  sub: 'user-123',
  iat: NOW - 60,
  exp: NOW + 3000,
  firebase: { sign_in_provider: 'google.com' },
};

beforeAll(async () => {
  const good = await generateKeyPair('RS256');
  const evil = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(good.publicKey)), kid: 'k1', alg: 'RS256' };
  verify = createCaptainTokenVerifier({
    projectId: PROJECT,
    keys: createLocalJWKSet({ keys: [jwk] }),
    now: NOW,
  });
  sign = (claims) =>
    new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'k1' }).sign(good.privateKey);
  // Claims the real key id but is signed with another key.
  forged = await new SignJWT(base)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .sign(evil.privateKey);
});

describe('createCaptainTokenVerifier', () => {
  it('returns the uid of a valid CAPTAIN token', async () => {
    expect(await verify(await sign(base))).toBe('user-123');
  });

  it('rejects a token signed with another key', async () => {
    expect(await verify(forged)).toBeNull();
  });

  it('rejects tokens for another project, expired or anonymous', async () => {
    expect(await verify(await sign({ ...base, aud: 'captain-shootout' }))).toBeNull();
    expect(
      await verify(await sign({ ...base, iss: 'https://securetoken.google.com/other' })),
    ).toBeNull();
    expect(await verify(await sign({ ...base, exp: NOW - 1 }))).toBeNull();
    expect(
      await verify(await sign({ ...base, firebase: { sign_in_provider: 'anonymous' } })),
    ).toBeNull();
    expect(await verify(await sign({ ...base, sub: '' }))).toBeNull();
  });

  it('rejects junk without throwing', async () => {
    for (const junk of [undefined, null, 42, '', 'not.a.jwt', 'x'.repeat(5000)]) {
      expect(await verify(junk)).toBeNull();
    }
  });

  it('accepts unsigned emulator tokens only with unsigned mode, still checking claims', async () => {
    const unsigned = new UnsecuredJWT(base).encode();
    expect(await verify(unsigned)).toBeNull();
    const emulator = createCaptainTokenVerifier({ projectId: PROJECT, unsigned: true, now: NOW });
    expect(await emulator(unsigned)).toBe('user-123');
    expect(await emulator(new UnsecuredJWT({ ...base, aud: 'other' }).encode())).toBeNull();
    expect(await emulator(new UnsecuredJWT({ ...base, exp: NOW - 1 }).encode())).toBeNull();
  });
});
