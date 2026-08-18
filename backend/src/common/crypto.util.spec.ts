import { hashPassword, hashToken, verifyPassword } from './crypto.util';

describe('crypto.util', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('Password123!');
    expect(await verifyPassword(hash, 'Password123!')).toBe(true);
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
  });

  it('hashes tokens deterministically', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('def'));
  });
});
