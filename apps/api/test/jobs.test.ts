// Example feature test: the confirmation flow through HTTP.
// Ana's job starts proposed; only the owner confirms, only Ana approves.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/index.ts";

describe("jobs routes", () => {
  it("lists tonight's jobs", async () => {
    const { app } = createApp();
    const res = await app.request("/jobs");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { jobs: { id: string }[] };
    assert.ok(body.jobs.some((job) => job.id === "job-ana-toilet"));
  });

  it("confirms Ana's job as the owner", async () => {
    const { app } = createApp();
    const res = await app.request("/jobs/job-ana-toilet/propose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "owner_confirmed", actor: "owner", reason: "prices verified" }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { job: { state: string } };
    assert.equal(body.job.state, "owner_confirmed");
  });

  it("rejects the agent confirming as owner with 409", async () => {
    const { app } = createApp();
    const res = await app.request("/jobs/job-ana-toilet/propose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "owner_confirmed", actor: "agent", reason: "looks fine" }),
    });
    assert.equal(res.status, 409);
  });

  it("rejects a malformed proposal with 400", async () => {
    const { app } = createApp();
    const res = await app.request("/jobs/job-ana-toilet/propose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "done", reason: "" }),
    });
    assert.equal(res.status, 400);
  });
});
