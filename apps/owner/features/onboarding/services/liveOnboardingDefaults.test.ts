// Spec: odd/tasks/crystal-pr-handoff-fixes.md, T1, S1 regression (coordinator decision):
// live sign-up starts with empty fields; demo sign-up keeps the mock owner.
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { owner as mockOwner } from '../../../shared/data/mock.ts';
import { onboardingServiceFor, type PhoneAuth } from './onboardingService.ts';

const phoneAuth: PhoneAuth = { sendCode: async () => true, verifyCode: async () => true };

it('live sign-up does not prefill the mock owner name or phone', async () => {
  const live = onboardingServiceFor(phoneAuth);

  assert.equal(await live.getOwnerName(), '');
  assert.equal((await live.getLastPhone()).phone, '');
});

it('demo sign-up keeps the mock owner name and phone', async () => {
  const demo = onboardingServiceFor(null);

  assert.equal(await demo.getOwnerName(), mockOwner.name);
  assert.equal((await demo.getLastPhone()).phone, mockOwner.phone);
});
