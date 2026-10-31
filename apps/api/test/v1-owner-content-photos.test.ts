import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { ownerContentPhotoRoutes } from "../src/routes/owner-content-photos.ts";
import { requireOwner, type OwnerEnv } from "../src/http/auth.ts";
import { errorResponse } from "../src/http/respond.ts";
import { fakeSupabase, pgError, type FakeCall, type FakeReply } from "./helpers/fake-supabase.ts";

const JOB = "80000000-0000-4000-8000-000000000001";
const BEFORE = "60000000-0000-4000-8000-000000000081";
const AFTER = "60000000-0000-4000-8000-000000000082";
const USER = "20000000-0000-4000-8000-000000000001";
const TOKEN = "owner-access-token-0123456789";
const job = {
  id: JOB, businessName: "Northside Plumbing", jobTitle: "Synthetic repair",
  shareConsent: "yes", consentRecordedAt: "2026-10-30T00:00:00Z", assignmentBlockedReason: null,
  assets: [
    { id: BEFORE, role: "unassigned", storagePath: `conversations/${JOB}/before.png` },
    { id: AFTER, role: "unassigned", storagePath: `conversations/${JOB}/after.png` },
  ],
};

function setup(respond: (call: FakeCall) => FakeReply) {
  const { client, calls } = fakeSupabase(respond);
  const app = new Hono<OwnerEnv>();
  app.onError((e, c) => errorResponse(c, e));
  app.use("*", requireOwner(async (token) => token === TOKEN ? { userId: USER, db: client } : null));
  app.route("/content/photo-jobs", ownerContentPhotoRoutes());
  const call = (path = "", body?: unknown) => app.request(`/content/photo-jobs${path}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { call, calls, app };
}

function signReply() {
  return { body: job.assets.map((asset) => ({ path: asset.storagePath, signedURL: `/object/sign/media/${asset.id}?token=short`, error: null })) };
}

describe("owner photo attribution", () => {
  it("requires an owner session", async () => {
    const { app, calls } = setup(() => ({ body: [] }));
    assert.equal((await app.request('/content/photo-jobs')).status, 401);
    assert.equal(calls.length, 0);
  });

  it("returns short-lived links without raw storage paths", async () => {
    const { call, calls } = setup((request) => request.path.endsWith("owner_content_photo_jobs") ? { body: [job] } : signReply());
    const response = await call();
    assert.equal(response.status, 200);
    const { data } = await response.json() as { data: { assets: Record<string, unknown>[] }[] };
    assert.equal(data[0]?.assets.length, 2);
    assert.match(String(data[0]?.assets[0]?.imageUrl), /token=short/);
    assert.equal(data[0]?.assets[0]?.storagePath, undefined);
    assert.deepEqual(calls.find((c) => c.path.includes('/storage/'))?.body, { expiresIn: 600, paths: job.assets.map((a) => a.storagePath) });
  });

  it("never signs photos for missing consent or ambiguous ownership", async () => {
    for (const blocked of [
      { ...job, shareConsent: "not_asked", consentRecordedAt: null, assignmentBlockedReason: "consent_required", assets: [] },
      { ...job, assignmentBlockedReason: "ambiguous_conversation", assets: [] },
    ]) {
      const { call, calls } = setup(() => ({ body: [blocked] }));
      const { data } = await (await call()).json() as { data: { assets: unknown[] }[] };
      assert.deepEqual(data[0]?.assets, []);
      assert.equal(calls.some((c) => c.path.includes('/storage/')), false);
    }
  });

  it("passes through blocked jobs with empty assets directly from SQL without TS re-filtering", async () => {
    const blockedJob = {
      id: JOB,
      businessName: "Northside Plumbing",
      jobTitle: "Synthetic repair",
      shareConsent: "not_asked" as const,
      consentRecordedAt: null,
      assignmentBlockedReason: "consent_required" as const,
      assets: [],
    };
    const { call, calls } = setup((request) => request.path.endsWith("owner_content_photo_jobs")
      ? { body: [blockedJob] }
      : signReply());
    const response = await call();
    assert.equal(response.status, 200);
    const { data } = await response.json() as { data: typeof blockedJob[] };
    assert.deepEqual(data[0], blockedJob);
    assert.equal(calls.some((c) => c.path.includes("/storage/")), false);
  });

  it("drops signed photo links if consent is revoked while signing", async () => {
    let reads = 0;
    const { call } = setup((request) => {
      if (request.path.endsWith("owner_content_photo_jobs")) {
        reads += 1;
        return { body: reads === 1 ? [job] : [{ ...job, shareConsent: "no", assignmentBlockedReason: "consent_required", assets: [] }] };
      }
      return signReply();
    });
    const { data } = await (await call()).json() as { data: { assets: unknown[]; shareConsent: string }[] };
    assert.equal(data[0]?.shareConsent, "no");
    assert.deepEqual(data[0]?.assets, []);
  });

  it("sends only the explicit job and distinct before/after ids to the guarded RPC", async () => {
    const { call, calls } = setup(() => ({ body: { jobId: JOB, beforeMediaId: BEFORE, afterMediaId: AFTER } }));
    const response = await call(`/${JOB}/assign`, { beforeMediaId: BEFORE, afterMediaId: AFTER });
    assert.equal(response.status, 200);
    assert.deepEqual(calls[0]?.body, { p_job_id: JOB, p_before_media_id: BEFORE, p_after_media_id: AFTER });
    assert.equal((await call(`/${JOB}/assign`, { beforeMediaId: BEFORE, afterMediaId: BEFORE })).status, 400);
    assert.equal((await call(`/${JOB}/assign`, { beforeMediaId: BEFORE, afterMediaId: AFTER, consent: true })).status, 400);
    assert.equal(calls.length, 1);
  });

  it("returns an eligibility failure when consent changed before assignment", async () => {
    const { call } = setup(() => pgError("23514", "Current customer photo consent is required."));
    assert.equal((await call(`/${JOB}/assign`, { beforeMediaId: BEFORE, afterMediaId: AFTER })).status, 422);
  });
});
