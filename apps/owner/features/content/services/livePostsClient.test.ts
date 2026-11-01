// Live PostsClient over /v1/owner/content (S1-S5), driven through createOwnerApi with a fake fetch.
// The device zone is fixed so mapped instants are exact (Bogotá: UTC-5, no daylight saving).
process.env.TZ = "America/Bogota";

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { storyPackReviewSchema } from "@owl-hours/shared";
import { createOwnerApi } from "../../../shared/infra/ownerApi.ts";
import { createLivePostsClient } from "./livePostsClient.ts";
import { createPostsService } from "./postsService.ts";

type Call = { method: string; url: string; body: unknown };

const API = "https://api.example.com";
const DRAFT_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_ID = "22222222-2222-4222-8222-222222222222";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const BEFORE_ID = "44444444-4444-4444-8444-444444444444";
const AFTER_ID = "55555555-5555-4555-8555-555555555555";
const REVISION_BEFORE = "a".repeat(64);
const REVISION_AFTER = "b".repeat(64);
const UPDATED_AT = "2026-10-28T05:06:00+00:00";

function draftRow(overrides: Record<string, unknown> = {}) {
  return {
    id: DRAFT_ID,
    source: "story_pack",
    sourceJobId: JOB_ID,
    sourceMediaIds: [BEFORE_ID, AFTER_ID],
    title: "Fixed in 91 minutes",
    caption: "Original caption",
    slides: null,
    platforms: ["facebook_page", "instagram"],
    scheduledAt: "2026-10-28T23:00:00+00:00",
    status: "draft",
    reviewedAt: null,
    publishedAt: null,
    createdAt: "2026-10-28T05:05:00+00:00",
    updatedAt: UPDATED_AT,
    canHandoff: false,
    ...overrides,
  };
}

function sourceRow() {
  return {
    id: JOB_ID,
    businessName: "Northside Plumbing",
    jobTitle: "Leaking toilet",
    state: "done",
    shareConsent: "yes",
    isDemo: false,
    assets: [
      { id: BEFORE_ID, role: "before", label: "Before photo", imageUrl: `https://example.test/${BEFORE_ID}.png`, revision: REVISION_BEFORE },
      { id: AFTER_ID, role: "after", label: "After photo", imageUrl: `https://example.test/${AFTER_ID}.png`, revision: REVISION_AFTER },
    ],
  };
}

type FakeState = {
  drafts: Record<string, unknown>[];
  sources: Record<string, unknown>[];
  failDrafts?: boolean;
  failReview?: boolean;
};

function fakeContentApi(state: FakeState) {
  const calls: Call[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    calls.push({ method, url, body: init.body === undefined ? undefined : JSON.parse(String(init.body)) });
    const path = url.replace(`${API}/v1/owner`, "");
    if (method === "GET" && path === "/content/drafts") {
      if (state.failDrafts) return Response.json({ success: false, error: { code: "internal", message: "Boom." } }, { status: 500 });
      return Response.json({ success: true, data: state.drafts });
    }
    if (method === "GET" && path === "/content/sources") {
      return Response.json({ success: true, data: state.sources });
    }
    if (method === "GET" && path === "/me") {
      return Response.json({ success: true, data: { businesses: [{ name: "Northside Plumbing" }] } });
    }
    const reviewMatch = method === "POST" && /^\/content\/drafts\/[^/]+\/review$/.test(path);
    if (reviewMatch) {
      if (state.failReview) return Response.json({ success: false, error: { code: "internal", message: "Boom." } }, { status: 500 });
      const id = decodeURIComponent(path.split("/")[3] ?? "");
      const draft = state.drafts.find((row) => row.id === id);
      if (!draft) return Response.json({ success: false, error: { code: "not_found", message: "Not found." } }, { status: 404 });
      Object.assign(draft, { status: "approved", reviewedAt: "2026-10-28T05:08:00+00:00" });
      return Response.json({ success: true, data: draft });
    }
    return Response.json({ success: false, error: { code: "not_found", message: "Not found." } }, { status: 404 });
  }) as unknown as typeof globalThis.fetch;
  const api = createOwnerApi({ apiUrl: API, getAccessToken: async () => "tok", fetch });
  return { client: createLivePostsClient(api), calls };
}

describe("live posts client: S1 lists drafts from the live API", () => {
  it("maps GET /content/drafts onto the PostDraft shape", async () => {
    const { client, calls } = fakeContentApi({
      drafts: [
        draftRow(),
        draftRow({ id: SECOND_ID, title: null, caption: "Night caption", scheduledAt: null, platforms: ["instagram"] }),
      ],
      sources: [],
    });

    assert.deepEqual(await client.listPosts(), [
      {
        id: DRAFT_ID,
        title: "Fixed in 91 minutes",
        caption: "Original caption",
        source: "job",
        sourceJobId: JOB_ID,
        targets: { facebook: true, instagram: true },
        scheduledFor: "2026-10-28T18:00:00-05:00",
        status: "draft",
      },
      {
        id: SECOND_ID,
        title: "",
        caption: "Night caption",
        source: "job",
        sourceJobId: JOB_ID,
        targets: { facebook: false, instagram: true },
        status: "draft",
      },
    ]);
    assert.deepEqual(calls.map(({ method, url }) => `${method} ${url}`), [`GET ${API}/v1/owner/content/drafts`]);
  });
});

describe("live posts client: S2 opens a draft from the live list", () => {
  it("finds one draft by id, and answers null for an unknown id", async () => {
    const { client, calls } = fakeContentApi({ drafts: [draftRow()], sources: [] });

    const draft = await client.findPost(DRAFT_ID);
    assert.equal(draft?.id, DRAFT_ID);
    assert.equal(draft?.status, "draft");
    assert.equal(await client.findPost("missing"), null);
    assert.deepEqual(
      calls.map(({ url }) => url),
      [`${API}/v1/owner/content/drafts`, `${API}/v1/owner/content/drafts`],
    );
  });
});

describe("live posts client: S3 approves through the review endpoint", () => {
  it("posts approve with the API snapshot, then the list shows the new status", async () => {
    const { client, calls } = fakeContentApi({ drafts: [draftRow(), draftRow({ id: SECOND_ID })], sources: [sourceRow()] });
    const service = createPostsService(client, { now: () => "2026-10-28T00:07:00-05:00" });

    const approved = await service.approve(DRAFT_ID, {
      caption: "Water on the floor at midnight? We come the same night.",
      targets: { facebook: true, instagram: false },
    });

    const reviewCall = calls.find(({ url }) => url.endsWith(`/content/drafts/${DRAFT_ID}/review`));
    assert.equal(reviewCall?.method, "POST");
    assert.deepEqual(reviewCall?.body, {
      approve: true,
      expectedUpdatedAt: UPDATED_AT,
      expectedMedia: [
        { id: BEFORE_ID, role: "before", revision: REVISION_BEFORE },
        { id: AFTER_ID, role: "after", revision: REVISION_AFTER },
      ],
    });
    storyPackReviewSchema.parse(reviewCall?.body);

    assert.equal(approved?.status, "approved");
    assert.deepEqual((await service.getDrafts()).map((draft) => draft.id), [SECOND_ID]);
    assert.equal((await service.getPost(DRAFT_ID))?.status, "approved");
  });

  it("shows the API's status after approve: a draft with no time is approved, never published", async () => {
    const { client } = fakeContentApi({ drafts: [draftRow({ scheduledAt: null })], sources: [sourceRow()] });
    const service = createPostsService(client, { now: () => "2026-10-28T00:07:00-05:00" });

    const approved = await service.approve(DRAFT_ID);

    assert.equal(approved?.status, "approved");
    assert.equal(approved?.publishedAt, undefined);
    assert.deepEqual(await service.getPublished(), []);
    assert.deepEqual(await service.getScheduled(), []);
  });

  it("shows published only when the API says published", async () => {
    const { client } = fakeContentApi({
      drafts: [draftRow({ status: "published", publishedAt: "2026-10-28T23:00:00+00:00" })],
      sources: [],
    });
    const service = createPostsService(client);

    assert.deepEqual((await service.getPublished()).map((post) => post.status), ["published"]);
  });
});

describe("live posts client: Regenerate is not offered, the API has no copy generator", () => {
  it("answers no regenerate and never clones the draft locally", async () => {
    const { client, calls } = fakeContentApi({ drafts: [draftRow()], sources: [] });
    const service = createPostsService(client, { canRegenerate: false });

    assert.equal(service.canRegenerate, false);
    assert.equal(await service.regenerate(DRAFT_ID), null);
    assert.deepEqual(calls, []);
  });
});

describe("live posts client: S4 the job lookup returns the source's signed before/after photos", () => {
  it("maps GET /content/sources onto the consented photo pair the review screen draws", async () => {
    const { client, calls } = fakeContentApi({ drafts: [draftRow()], sources: [sourceRow()] });

    assert.deepEqual(await client.findJob(JOB_ID), {
      id: JOB_ID,
      customerName: "",
      photos: {
        before: `https://example.test/${BEFORE_ID}.png`,
        after: `https://example.test/${AFTER_ID}.png`,
        extra: [],
      },
      shareConsent: "yes",
    });
    assert.deepEqual(calls.map((call) => `${call.method} ${call.url}`), [`GET ${API}/v1/owner/content/sources`]);
  });

  it("answers null for a job that is not a content source", async () => {
    const { client } = fakeContentApi({ drafts: [draftRow()], sources: [sourceRow()] });

    assert.equal(await client.findJob("66666666-6666-4666-8666-666666666666"), null);
  });
});

describe("live posts client: S5 HTTP failures reject, never silent lists", () => {
  it("rejects the list and the approval when the API answers 500", async () => {
    const failingList = fakeContentApi({ drafts: [], sources: [], failDrafts: true });
    await assert.rejects(failingList.client.listPosts(), /Boom/);

    const failingReview = fakeContentApi({ drafts: [draftRow()], sources: [sourceRow()], failReview: true });
    const service = createPostsService(failingReview.client, { now: () => "2026-10-28T00:07:00-05:00" });
    await assert.rejects(service.approve(DRAFT_ID), /Boom/);
  });
});
