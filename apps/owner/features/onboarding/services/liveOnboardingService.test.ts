// Spec: odd/tasks/crystal-pr-handoff-fixes.md, T4, S1 + S4.
// Live mode sends and checks the emailed code through the injected code auth
// (Supabase email OTP behind the auth controller); demo mode keeps the DEMO_CODE fake.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_CODE,
  createFakeOnboardingClient,
  createLiveOnboardingClient,
  createOnboardingService,
  demoOnboardingService,
  onboardingServiceFor,
  type CodeAuth,
} from './onboardingService.ts';

const EMAIL = 'daniel@northside-plumbing.example';
const SENT_AT = '2026-10-30T12:00:00.000Z';

function recordingCodeAuth(answers: { send: boolean; verify: boolean }) {
  const calls: string[][] = [];
  const codeAuth: CodeAuth = {
    sendCode: async (email) => {
      calls.push(['send', email]);
      return answers.send;
    },
    verifyCode: async (email, code) => {
      calls.push(['verify', email, code]);
      return answers.verify;
    },
  };
  return { codeAuth, calls };
}

function liveService(codeAuth: CodeAuth) {
  return createOnboardingService(createLiveOnboardingClient(codeAuth, createFakeOnboardingClient()), {
    now: () => SENT_AT,
  });
}

describe('live onboarding sendCode', () => {
  it('S1 emails the code through code auth and remembers the address', async () => {
    const { codeAuth, calls } = recordingCodeAuth({ send: true, verify: true });
    const service = liveService(codeAuth);

    assert.deepEqual(await service.sendCode(EMAIL), { ok: true });
    assert.deepEqual(calls, [['send', EMAIL]]);
    assert.deepEqual(await service.getLastEmail(), { email: EMAIL, sentAt: SENT_AT });
  });

  it('S1 fails without remembering the address when the send is rejected', async () => {
    const { codeAuth } = recordingCodeAuth({ send: false, verify: true });
    const service = liveService(codeAuth);

    assert.deepEqual(await service.sendCode(EMAIL), { ok: false });
    assert.notEqual((await service.getLastEmail()).sentAt, SENT_AT);
  });

  it('S1 never emails a blank address', async () => {
    const { codeAuth, calls } = recordingCodeAuth({ send: true, verify: true });

    assert.deepEqual(await liveService(codeAuth).sendCode(' '), { ok: false });
    assert.deepEqual(calls, []);
  });
});

describe('live onboarding verifyCode', () => {
  it('S1 verifies the code for that address through code auth', async () => {
    const { codeAuth, calls } = recordingCodeAuth({ send: true, verify: true });

    assert.deepEqual(await liveService(codeAuth).verifyCode(EMAIL, '123456'), { ok: true });
    assert.deepEqual(calls, [['verify', EMAIL, '123456']]);
  });

  it('S1 returns the wrong_code state when code auth rejects the code', async () => {
    const { codeAuth } = recordingCodeAuth({ send: true, verify: false });

    assert.deepEqual(await liveService(codeAuth).verifyCode(EMAIL, DEMO_CODE), {
      ok: false,
      error: 'wrong_code',
    });
  });
});

describe('onboardingServiceFor', () => {
  it('S1 keeps the demo fake when there is no code auth (demo mode)', () => {
    assert.equal(onboardingServiceFor(null), demoOnboardingService);
  });

  it('S4 builds the live service from the injected code auth', async () => {
    const { codeAuth, calls } = recordingCodeAuth({ send: true, verify: true });
    const service = onboardingServiceFor(codeAuth);

    assert.notEqual(service, demoOnboardingService);
    await service.verifyCode(EMAIL, '123456');
    assert.deepEqual(calls, [['verify', EMAIL, '123456']]);
  });

  it('S4 returns the same live service for the same code auth, so sign-up and verify share the address', () => {
    const { codeAuth } = recordingCodeAuth({ send: true, verify: true });

    assert.equal(onboardingServiceFor(codeAuth), onboardingServiceFor(codeAuth));
  });
});
