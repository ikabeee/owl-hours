import assert from 'node:assert/strict';
import { it } from 'node:test';
import { authCopys } from '../../../shared/copys/ownerAuthCopys.ts';
import { createOwnerAuthController } from './ownerAuthController.ts';
import type { Session } from '../../../shared/infra/ownerSessionService.ts';

type TestRuntime = {
  restore(): Promise<Session | null>;
  sendCode(phone: string): Promise<boolean>;
  verifyCode(phone: string, code: string): Promise<boolean>;
  signOut(): Promise<void>;
  subscribe(next: (session: Session | null) => void): () => void;
};

type SignOutBehavior = 'clear' | 'clear-then-throw-network-error' | 'throw-before-clearing';

function ownerSession(email: string): Session {
  return {
    access_token: 'fixture-access-token',
    expires_at: 9999999999,
    user: { id: 'owner-id', email },
  };
}

function fakeRuntimeWith(initial: Session | null): {
  runtime: TestRuntime;
  setSignOutBehavior: (behavior: SignOutBehavior) => void;
} {
  let current = initial;
  let behavior: SignOutBehavior = 'clear';
  const listeners = new Set<(session: Session | null) => void>();
  const emit = (next: Session | null): void => {
    for (const listener of listeners) {
      listener(next);
    }
  };
  const runtime: TestRuntime = {
    restore: async () => current,
    sendCode: async () => true,
    verifyCode: async () => true,
    signOut: async () => {
      if (behavior === 'throw-before-clearing') {
        throw new Error('Network request failed.');
      }
      current = null;
      emit(null);
      if (behavior === 'clear-then-throw-network-error') {
        throw new Error('Network request failed.');
      }
    },
    subscribe: (next: (session: Session | null) => void) => {
      listeners.add(next);
      return () => {
        listeners.delete(next);
      };
    },
  };
  return {
    runtime,
    setSignOutBehavior: (next: SignOutBehavior): void => {
      behavior = next;
    },
  };
}

it('S5 restores the session present at start through the injected runtime', async () => {
  const session = ownerSession('owner@example.test');
  const harness = fakeRuntimeWith(session);
  const controller = createOwnerAuthController(harness.runtime);

  await controller.restore();

  assert.equal(controller.getState().session, session);
  assert.equal(controller.getState().loading, false);
  assert.equal(controller.getState().error, null);
});

it('S5 clears the session on sign-out through the injected runtime', async () => {
  const harness = fakeRuntimeWith(ownerSession('owner@example.test'));
  const controller = createOwnerAuthController(harness.runtime);
  await controller.restore();

  await controller.signOut();

  assert.equal(controller.getState().session, null);
  assert.equal(controller.getState().error, null);
  assert.equal(controller.getState().loading, false);
});

it('S4 shows no sign-out error when revocation fails after the local session was cleared', async () => {
  const harness = fakeRuntimeWith(ownerSession('owner@example.test'));
  harness.setSignOutBehavior('clear-then-throw-network-error');
  const controller = createOwnerAuthController(harness.runtime);
  await controller.restore();

  await controller.signOut();

  assert.equal(controller.getState().session, null);
  assert.equal(controller.getState().error, null);
});

it('S4 keeps the sign-out error when sign-out fails before clearing the session', async () => {
  const harness = fakeRuntimeWith(ownerSession('owner@example.test'));
  harness.setSignOutBehavior('throw-before-clearing');
  const controller = createOwnerAuthController(harness.runtime);
  await controller.restore();

  await controller.signOut();

  assert.equal(controller.getState().session?.user.email, 'owner@example.test');
  assert.equal(controller.getState().error, authCopys.signOutError);
});

it('S1 sends the SMS code through the injected runtime', async () => {
  const sent: string[] = [];
  const harness = fakeRuntimeWith(null);
  const controller = createOwnerAuthController({
    ...harness.runtime,
    sendCode: async (phone) => {
      sent.push(phone);
      return true;
    },
  });

  assert.equal(await controller.sendCode('+1 555 014 2290'), true);
  assert.deepEqual(sent, ['+1 555 014 2290']);
});

it('S1 keeps the session the runtime emits once the SMS code is verified', async () => {
  const session = ownerSession('owner@example.test');
  const listeners = new Set<(next: Session | null) => void>();
  const verified: string[][] = [];
  const controller = createOwnerAuthController({
    restore: async () => null,
    sendCode: async () => true,
    verifyCode: async (phone, code) => {
      verified.push([phone, code]);
      for (const listener of listeners) listener(session);
      return true;
    },
    signOut: async () => undefined,
    subscribe: (next) => {
      listeners.add(next);
      return () => {
        listeners.delete(next);
      };
    },
  });

  assert.equal(await controller.verifyCode('+1 555 014 2290', '482910'), true);
  assert.deepEqual(verified, [['+1 555 014 2290', '482910']]);
  assert.equal(controller.getState().session, session);
});

it('S1 reports a rejected code as false and keeps the owner signed out', async () => {
  const harness = fakeRuntimeWith(null);
  const controller = createOwnerAuthController({ ...harness.runtime, verifyCode: async () => false });

  assert.equal(await controller.verifyCode('+1 555 014 2290', '000000'), false);
  assert.equal(controller.getState().session, null);
});

it('S1 resolves false when the runtime throws while sending or verifying', async () => {
  const harness = fakeRuntimeWith(null);
  const controller = createOwnerAuthController({
    ...harness.runtime,
    sendCode: async () => {
      throw new Error('Network request failed.');
    },
    verifyCode: async () => {
      throw new Error('Network request failed.');
    },
  });

  assert.equal(await controller.sendCode('+1 555 014 2290'), false);
  assert.equal(await controller.verifyCode('+1 555 014 2290', '482910'), false);
});

it('S3 demo mode has no runtime: sending and verifying resolve false', async () => {
  const controller = createOwnerAuthController(null);

  assert.equal(await controller.sendCode('+1 555 014 2290'), false);
  assert.equal(await controller.verifyCode('+1 555 014 2290', '482910'), false);
  assert.equal(controller.getState().loading, false);
});
