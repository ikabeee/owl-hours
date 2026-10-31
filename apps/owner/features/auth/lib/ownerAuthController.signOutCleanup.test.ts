// Spec: odd/tasks/owner-notification-test-zukki.md T4 (S11). Sign-out deletes
// the device push token before the session ends, best-effort: the cleanup runs
// before the runtime signs out, and a failing cleanup still signs out.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createOwnerAuthController } from "./ownerAuthController.ts";
import type { Session } from "../../../shared/infra/ownerSessionService.ts";

function ownerSession(): Session {
  return { access_token: "fixture-access-token", expires_at: 9999999999, user: { id: "owner-id" } };
}

function fakeRuntime(initial: Session | null = null) {
  const order: string[] = [];
  const runtime = {
    restore: async (): Promise<Session | null> => initial,
    sendCode: async () => true,
    verifyCode: async () => true,
    signOut: async () => {
      order.push("signOut");
    },
    subscribe: () => () => {},
  };
  return { order, runtime };
}

describe("sign-out push cleanup", () => {
  it("runs the cleanup with the current session before the runtime signs out", async () => {
    const { order, runtime } = fakeRuntime(ownerSession());
    const seen: (Session | null)[] = [];
    const controller = createOwnerAuthController(runtime, {
      beforeSignOut: async (session) => {
        seen.push(session);
        order.push("cleanup");
      },
    });
    await controller.restore();

    await controller.signOut();

    assert.deepEqual(order, ["cleanup", "signOut"]);
    assert.equal(seen.length, 1);
    assert.equal(seen[0]?.access_token, "fixture-access-token");
  });

  it("still signs out when the cleanup fails", async () => {
    const { order, runtime } = fakeRuntime();
    const controller = createOwnerAuthController(runtime, {
      beforeSignOut: async () => {
        throw new Error("network down");
      },
    });

    await controller.signOut();

    assert.deepEqual(order, ["signOut"]);
    assert.equal(controller.getState().session, null);
    assert.equal(controller.getState().error, null);
  });
});
