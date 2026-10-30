import assert from 'node:assert/strict';
import { it } from 'node:test';
import { authCopys } from '../../../shared/copys/ownerAuthCopys.ts';
import { createOwnerAuthController } from './ownerAuthController.ts';
import type { Session } from '../../../shared/infra/ownerSessionService.ts';

type TestRuntime = {
  restore(): Promise<Session | null>;
  signIn(email: string): Promise<void>;
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
    signIn: async () => undefined,
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
