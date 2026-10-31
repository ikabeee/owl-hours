import assert from 'node:assert/strict';
import { it } from 'node:test';
import { authCopys } from '../../../shared/copys/ownerAuthCopys.ts';
import { createOwnerAuthController } from './ownerAuthController.ts';
import type { Session } from '../../../shared/infra/ownerSessionService.ts';

function ownerSession(email: string): Session {
  return {
    access_token: 'fixture-access-token',
    expires_at: 9999999999,
    user: { id: 'owner-id', email },
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve = (_value: T): void => undefined;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

it('R1 keeps the subscription session when a stale restore resolves afterwards', async () => {
  const signedIn = ownerSession('owner@example.test');
  const restoreGate = deferred<Session | null>();
  const listeners = new Set<(session: Session | null) => void>();
  const runtime = {
    restore: (): Promise<Session | null> => restoreGate.promise,
    sendCode: async (): Promise<boolean> => true,
    verifyCode: async (): Promise<boolean> => true,
    signOut: async (): Promise<void> => undefined,
    subscribe: (next: (session: Session | null) => void): (() => void) => {
      listeners.add(next);
      return (): void => {
        listeners.delete(next);
      };
    },
  };
  const controller = createOwnerAuthController(runtime);

  const pending = controller.restore();
  for (const listener of listeners) {
    listener(signedIn);
  }
  restoreGate.resolve(null);
  await pending;

  assert.equal(controller.getState().session, signedIn);
});

it('R2 surfaces a whitelisted sign-out failure as-is when nothing was cleared', async () => {
  const runtime = {
    restore: async (): Promise<Session | null> => ownerSession('owner@example.test'),
    sendCode: async (): Promise<boolean> => true,
    verifyCode: async (): Promise<boolean> => true,
    signOut: async (): Promise<void> => {
      throw new Error(authCopys.sessionExpired);
    },
    subscribe: (): (() => void) => (): void => undefined,
  };
  const controller = createOwnerAuthController(runtime);

  await controller.restore();
  await controller.signOut();

  assert.equal(controller.getState().error, authCopys.sessionExpired);
});
