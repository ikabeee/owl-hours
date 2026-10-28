import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/index.ts";
import { readPort } from "../src/port.ts";

describe("app surface", () => {
  it("answers /health", async () => {
    const { app } = createApp();
    const res = await app.request("/health");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });

  it("no longer serves the unauthenticated demo routes", async () => {
    const { app } = createApp();
    for (const [method, path] of [
      ["GET", "/jobs"],
      ["POST", "/jobs/job-ana-toilet/propose"],
      ["POST", "/voice/transcribe"],
      ["GET", "/studio/ads"],
    ] as const) {
      const res = await app.request(path, { method });
      assert.equal(res.status, 404, `${method} ${path}`);
    }
  });

  it("returns 503 on /v1 when the server is not configured", async () => {
    const { app } = createApp();
    const res = await app.request("/v1/owner/me");
    assert.equal(res.status, 503);
    const body = (await res.json()) as { success: boolean; error: { code: string } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, "not_configured");
  });
});

describe("readPort", () => {
  it("defaults to 3000", () => {
    assert.equal(readPort(undefined), 3000);
    assert.equal(readPort(""), 3000);
  });

  it("accepts a valid port", () => {
    assert.equal(readPort("8080"), 8080);
  });

  it("rejects anything else", () => {
    for (const bad of ["0", "65536", "80.5", "abc", "-1"]) {
      assert.throws(() => readPort(bad), /PORT must be/);
    }
  });
});
