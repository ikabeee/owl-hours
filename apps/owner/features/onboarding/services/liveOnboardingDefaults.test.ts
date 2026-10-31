// Spec: odd/tasks/crystal-pr-handoff-fixes.md, T4, S1 regression (coordinator decision):
// live sign-up starts with empty fields; demo sign-up keeps the mock owner name and demo email.
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { owner as mockOwner } from '../../../shared/data/mock.ts';
import { onboardingServiceFor, type CodeAuth } from './onboardingService.ts';

const DEMO_EMAIL = 'daniel@northside-plumbing.example';

const codeAuth: CodeAuth = { sendCode: async () => true, verifyCode: async () => true };

it('live sign-up does not prefill the mock owner name or email', async () => {
  const live = onboardingServiceFor(codeAuth);

  assert.equal(await live.getOwnerName(), '');
  assert.equal((await live.getLastEmail()).email, '');
});

it('demo sign-up keeps the mock owner name and the demo email', async () => {
  const demo = onboardingServiceFor(null);

  assert.equal(await demo.getOwnerName(), mockOwner.name);
  assert.equal((await demo.getLastEmail()).email, DEMO_EMAIL);
});
