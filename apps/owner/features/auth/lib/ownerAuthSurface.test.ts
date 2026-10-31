// Spec: odd/tasks/crystal-pr-handoff-fixes.md, T1, S2 (the email magic link is gone).
// The owner signs in through the onboarding sign-up/verify screens only.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { it } from 'node:test';
import { authCopys } from '../../../shared/copys/ownerAuthCopys.ts';

const appRoot = new URL('../../../', import.meta.url);

const removedFiles = [
  'app/auth/index.tsx',
  'app/auth/callback.tsx',
  'features/auth/components/OwnerAuthRoute.tsx',
  'features/auth/components/OwnerAuthScreen.tsx',
];

for (const file of removedFiles) {
  it(`S2 removes ${file}`, () => {
    assert.equal(existsSync(new URL(file, appRoot)), false);
  });
}

it('S2 keeps no email sign-in copy', () => {
  const texts: string[] = Object.values(authCopys);

  for (const removed of ['Owner sign-in', 'Owner email', 'Send sign-in link']) {
    assert.equal(texts.includes(removed), false, removed);
  }
  assert.equal(texts.some((text) => /email|link/i.test(text)), false);
});
