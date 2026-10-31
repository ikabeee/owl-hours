// Spec: odd/tasks/crystal-pr-handoff-fixes.md, T1, S1 + S4.
// Live mode sends and checks the code through the injected phone auth (Supabase SMS OTP
// behind the auth controller); demo mode keeps the DEMO_CODE fake.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_CODE,
  createFakeOnboardingClient,
  createLiveOnboardingClient,
  createOnboardingService,
  demoOnboardingService,
  onboardingServiceFor,
  type PhoneAuth,
} from './onboardingService.ts';

const PHONE = '+1 555 014 2290';
const SENT_AT = '2026-10-30T12:00:00.000Z';

function recordingPhoneAuth(answers: { send: boolean; verify: boolean }) {
  const calls: string[][] = [];
  const phoneAuth: PhoneAuth = {
    sendCode: async (phone) => {
      calls.push(['send', phone]);
      return answers.send;
    },
    verifyCode: async (phone, code) => {
      calls.push(['verify', phone, code]);
      return answers.verify;
    },
  };
  return { phoneAuth, calls };
}

function liveService(phoneAuth: PhoneAuth) {
  return createOnboardingService(createLiveOnboardingClient(phoneAuth, createFakeOnboardingClient()), {
    now: () => SENT_AT,
  });
}

describe('live onboarding sendCode', () => {
  it('S1 texts the code through phone auth and remembers the number', async () => {
    const { phoneAuth, calls } = recordingPhoneAuth({ send: true, verify: true });
    const service = liveService(phoneAuth);

    assert.deepEqual(await service.sendCode(PHONE), { ok: true });
    assert.deepEqual(calls, [['send', PHONE]]);
    assert.deepEqual(await service.getLastPhone(), { phone: PHONE, sentAt: SENT_AT });
  });

  it('S1 fails without remembering the number when the send is rejected', async () => {
    const { phoneAuth } = recordingPhoneAuth({ send: false, verify: true });
    const service = liveService(phoneAuth);

    assert.deepEqual(await service.sendCode(PHONE), { ok: false });
    assert.notEqual((await service.getLastPhone()).sentAt, SENT_AT);
  });

  it('S1 never texts a blank number', async () => {
    const { phoneAuth, calls } = recordingPhoneAuth({ send: true, verify: true });

    assert.deepEqual(await liveService(phoneAuth).sendCode(' '), { ok: false });
    assert.deepEqual(calls, []);
  });
});

describe('live onboarding verifyCode', () => {
  it('S1 verifies the code for that number through phone auth', async () => {
    const { phoneAuth, calls } = recordingPhoneAuth({ send: true, verify: true });

    assert.deepEqual(await liveService(phoneAuth).verifyCode(PHONE, '123456'), { ok: true });
    assert.deepEqual(calls, [['verify', PHONE, '123456']]);
  });

  it('S1 returns the wrong_code state when phone auth rejects the code', async () => {
    const { phoneAuth } = recordingPhoneAuth({ send: true, verify: false });

    assert.deepEqual(await liveService(phoneAuth).verifyCode(PHONE, DEMO_CODE), {
      ok: false,
      error: 'wrong_code',
    });
  });
});

describe('onboardingServiceFor', () => {
  it('S1 keeps the demo fake when there is no phone auth (demo mode)', () => {
    assert.equal(onboardingServiceFor(null), demoOnboardingService);
  });

  it('S4 builds the live service from the injected phone auth', async () => {
    const { phoneAuth, calls } = recordingPhoneAuth({ send: true, verify: true });
    const service = onboardingServiceFor(phoneAuth);

    assert.notEqual(service, demoOnboardingService);
    await service.verifyCode(PHONE, '123456');
    assert.deepEqual(calls, [['verify', PHONE, '123456']]);
  });

  it('S4 returns the same live service for the same phone auth, so sign-up and verify share the number', () => {
    const { phoneAuth } = recordingPhoneAuth({ send: true, verify: true });

    assert.equal(onboardingServiceFor(phoneAuth), onboardingServiceFor(phoneAuth));
  });
});
