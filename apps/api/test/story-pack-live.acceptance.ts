// Run with scripts/story-pack-acceptance.sh. This uses the product HTTP client,
// real API routes/services, real PostgREST and real Postgres/RLS. Only Auth and
// Storage are synthetic local fixtures; no hosted service or model is called.
import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { createApp } from "../src/index.ts";
import { createSupabaseAuthenticator } from "../src/http/auth.ts";
import {
  createHttpStoryPackClient,
  StoryPackHttpError,
} from "../../owner/features/story-pack/services/storyPackHttpClient.ts";
import { createStoryPackService } from "../../owner/features/story-pack/services/storyPackService.ts";
import type { StoryPackApprovalSnapshot } from "@owl-hours/shared";

const db = process.env.STORY_ACCEPTANCE_DB!;
const restUrl = process.env.STORY_ACCEPTANCE_REST!;
const secret = process.env.STORY_ACCEPTANCE_JWT_SECRET!;
assert(
  db?.startsWith("zukki-story-acceptance-"),
  "Only a disposable fixture database is allowed.",
);
assert(
  /^http:\/\/127\.0\.0\.1:\d+$/.test(restUrl),
  "Only local PostgREST is allowed.",
);
assert(secret?.startsWith("synthetic-local-"));
const JOB = "80000000-0000-4000-8000-000000000001";
const CONVERSATION = "40000000-0000-4000-8000-000000000001";
const BEFORE = "60000000-0000-4000-8000-000000000091";
const AFTER = "60000000-0000-4000-8000-000000000092";
const OTHER = "60000000-0000-4000-8000-000000000093";
const MARIO = "20000000-0000-4000-8000-000000000001";
const EASTSIDE = "20000000-0000-4000-8000-000000000002";
const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const sign = (value: string) =>
  createHmac("sha256", secret).update(value).digest("base64url");
function jwt(role: string, sub?: string) {
  const payload = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role, ...(sub ? { sub } : {}), aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 7200 })}`;
  return `${payload}.${sign(payload)}`;
}
const anonKey = jwt("anon");
const ownerToken = jwt("authenticated", MARIO);
const otherToken = jwt("authenticated", EASTSIDE);
const serviceKey = jwt("service_role");
function authenticated(token: string | undefined) {
  if (token === `Bearer ${ownerToken}`) return MARIO;
  if (token === `Bearer ${otherToken}`) return EASTSIDE;
  return null;
}
function user(id: string) {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: id === MARIO ? "owner@synthetic.example" : "other@synthetic.example",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-10-30T00:00:00Z",
  };
}
function sql(statement: string): string {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      db,
      "psql",
      "-U",
      "postgres",
      "-d",
      "zukki_acceptance",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-Atq",
    ],
    { input: statement, encoding: "utf8" },
  ).trim();
}
let consentVersion = 0;
function consent(granted: boolean) {
  consentVersion++;
  sql(
    `insert into public.consents(conversation_id,kind,granted,at) values ('${CONVERSATION}','photos_for_marketing',${granted},'2099-01-01'::timestamptz+interval '${consentVersion} second');`,
  );
}
async function localServer(app: Hono) {
  let server: ReturnType<typeof serve>;
  const url = await new Promise<string>((resolve) => {
    server = serve(
      { fetch: app.fetch, hostname: "127.0.0.1", port: 0 },
      (address) => resolve(`http://127.0.0.1:${address.port}`),
    );
  });
  return {
    url,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(restUrl)).ok) break;
  } catch {}
  if (i === 59) throw new Error("Local PostgREST did not start.");
  await new Promise((resolve) => setTimeout(resolve, 250));
}
// A real PNG object is served through a fixture URL signed for 600 seconds.
// The object fixture is intentionally not claimed as Supabase Storage evidence.
const pngFixtures = new Map<string, Buffer>(
  await Promise.all(
    ["before", "after", "other"].map(async (kind) => {
      const fills: Record<string, string> = {
        before: "#e6c9b7",
        after: "#c4d6c8",
        other: "#c7cfe4",
      };
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960">
        <rect width="720" height="960" fill="${fills[kind]}"/>
        <rect x="90" y="180" width="540" height="560" rx="30" fill="#fff8e9"/>
        <path d="M180 330H530V510H360V680" fill="none" stroke="#506357" stroke-width="50"/>
        <circle cx="360" cy="695" r="30" fill="${kind === "before" ? "#ad5747" : "#508068"}"/>
        <text x="360" y="100" text-anchor="middle"
          font-family="sans-serif" font-size="38" fill="#25382e">SYNTHETIC ${kind.toUpperCase()}</text>
        <text x="360" y="840" text-anchor="middle"
          font-family="sans-serif" font-size="27" fill="#25382e">LOCAL FIXTURE · NO CUSTOMER DATA</text>
      </svg>`;
      return [
        `conversations/${CONVERSATION}/acceptance-${kind}.png`,
        await sharp(Buffer.from(svg)).png().toBuffer(),
      ] as const;
    }),
  ),
);
const objectPaths = new Set(pngFixtures.keys());
const printedMagicLinks: string[] = [];
const pendingCodes = new Map<
  string,
  { id: string; challenge: string; expires: number }
>();
function magicLink(redirect: string, id: string, challenge: string): string {
  const callback = new URL(redirect);
  if (
    callback.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(callback.hostname)
  ) {
    throw new Error("Synthetic callbacks must stay on localhost.");
  }
  const code = randomUUID();
  pendingCodes.set(code, { id, challenge, expires: Date.now() + 600_000 });
  callback.searchParams.set("code", code);
  return callback.toString();
}
function fixtureAccount(email: unknown): string | null {
  if (email === "owner@synthetic.example") return MARIO;
  if (email === "other@synthetic.example") return EASTSIDE;
  return null;
}
const fixture = new Hono();
fixture.use("*", cors());
fixture.get("/auth/v1/user", (c) => {
  const id = authenticated(c.req.header("authorization"));
  return id
    ? c.json(user(id))
    : c.json({ message: "Invalid synthetic session" }, 401);
});
fixture.post("/auth/v1/otp", async (c) => {
  const body = await c.req.json();
  const id = fixtureAccount(body.email);
  if (!id) return c.json({ message: "Use a synthetic fixture account" }, 401);
  try {
    const callback = magicLink(
      c.req.query("redirect_to") ??
        process.env.STORY_ACCEPTANCE_WEB_URL ??
        "http://127.0.0.1:8768/auth/callback",
      id,
      body.code_challenge,
    );
    printedMagicLinks.push(callback);
    console.log(
      JSON.stringify({
        syntheticMagicLink: callback,
        note: "Local fixture only. No email was sent.",
      }),
    );
    return c.json({});
  } catch {
    return c.json(
      { message: "Synthetic callbacks must stay on localhost" },
      400,
    );
  }
});
fixture.post("/auth/v1/token", async (c) => {
  const body = await c.req.json();
  const grant = c.req.query("grant_type");
  let id: string | null = null;
  if (grant === "pkce") {
    const pending = pendingCodes.get(body.auth_code);
    const digest =
      typeof body.code_verifier === "string"
        ? createHash("sha256").update(body.code_verifier).digest("base64url")
        : null;
    if (
      pending &&
      pending.expires > Date.now() &&
      digest === pending.challenge
    ) {
      id = pending.id;
      pendingCodes.delete(body.auth_code);
    }
  } else if (grant === "refresh_token") {
    if (body.refresh_token === "synthetic-owner-refresh") id = MARIO;
    if (body.refresh_token === "synthetic-other-refresh") id = EASTSIDE;
  } else if (body.password === "synthetic-fixture") {
    id = fixtureAccount(body.email);
  }
  if (!id) return c.json({ message: "Use the synthetic fixture account" }, 401);
  return c.json({
    access_token: id === MARIO ? ownerToken : otherToken,
    refresh_token:
      id === MARIO ? "synthetic-owner-refresh" : "synthetic-other-refresh",
    expires_in: 7200,
    token_type: "bearer",
    user: user(id),
  });
});
fixture.post("/auth/v1/logout", (c) => c.body(null, 204));
fixture.all("/rest/v1/*", async (c) => {
  const url = new URL(c.req.url);
  const response = await fetch(
    `${restUrl}${url.pathname.replace("/rest/v1", "")}${url.search}`,
    {
      method: c.req.method,
      headers: c.req.raw.headers,
      ...(["GET", "HEAD"].includes(c.req.method)
        ? {}
        : { body: await c.req.arrayBuffer() }),
    },
  );
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
});
fixture.post("/storage/v1/object/sign/media", async (c) => {
  if (!authenticated(c.req.header("authorization")))
    return c.json({ message: "Unauthorized" }, 401);
  const body = (await c.req.json()) as { paths: string[]; expiresIn: number };
  assert.equal(body.expiresIn, 600);
  const signed = await Promise.all(
    body.paths.map(async (path) => {
      // Use the caller's real JWT and the real media SELECT RLS policy to decide
      // access, then sign only the known local fixture objects.
      const query = new URL(`${restUrl}/media`);
      query.searchParams.set("select", "id");
      query.searchParams.set("storage_path", `eq.${path}`);
      const response = await fetch(query, {
        headers: { authorization: c.req.header("authorization")! },
      });
      const rows = await response.json();
      if (
        !response.ok ||
        !Array.isArray(rows) ||
        rows.length !== 1 ||
        !objectPaths.has(path)
      )
        return { path, error: "Fixture object unavailable" };
      const payload = encode({ path, expires: Date.now() + 600_000 });
      return {
        path,
        signedURL: `/object/sign/media/${path}?token=${payload}.${sign(payload)}`,
      };
    }),
  );
  return c.json(signed);
});
fixture.get("/storage/v1/object/sign/media/*", (c) => {
  const [payload, signature] = String(c.req.query("token")).split(".");
  if (!payload || signature !== sign(payload))
    return c.json({ message: "Invalid fixture link" }, 403);
  const value = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
    path: string;
    expires: number;
  };
  if (
    value.expires < Date.now() ||
    !objectPaths.has(value.path) ||
    !c.req.path.endsWith(value.path)
  )
    return c.json({ message: "Expired fixture link" }, 403);
  return c.body(new Uint8Array(pngFixtures.get(value.path)!), 200, {
    "content-type": "image/png",
    "cache-control": "no-store",
  });
});
const storage = await localServer(fixture);
const raw = createApp({
  ownerAppOrigins: ["http://127.0.0.1:8768", "http://127.0.0.1:8081"],
  v1: {
    authenticate: createSupabaseAuthenticator({
      supabaseUrl: storage.url,
      supabaseAnonKey: anonKey,
    }),
    serviceDb: createClient(storage.url, serviceKey, {
      auth: { persistSession: false },
    }),
    serverKey: "synthetic-local-internal-key-at-least-32-characters",
  },
}).app;
const running = await localServer(raw);
const clientFor = (token = ownerToken) =>
  createHttpStoryPackClient({
    apiUrl: running.url,
    getAccessToken: async () => token,
    fetch: (url, options) =>
      fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10_000),
      }),
  });
const endpoint = (path: string, token = ownerToken, init: RequestInit = {}) =>
  fetch(`${running.url}/v1/owner/content${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
const rejectsStatus = (status: number) => (error: unknown) =>
  error instanceof StoryPackHttpError && error.status === status;
let passed = 0;
function evidence(label: string) {
  passed++;
  console.log(`PASS ${label}`);
}
try {
  const preflight = await fetch(`${running.url}/v1/owner/content/photo-jobs`, {
    method: "OPTIONS",
    headers: {
      origin: "http://127.0.0.1:8768",
      "access-control-request-method": "POST",
      "access-control-request-headers": "authorization,content-type",
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "http://127.0.0.1:8768",
  );
  const unlistedOrigin = await fetch(
    `${running.url}/v1/owner/content/photo-jobs`,
    {
      method: "OPTIONS",
      headers: {
        origin: "https://unlisted.example",
        "access-control-request-method": "POST",
      },
    },
  );
  assert.equal(unlistedOrigin.headers.get("access-control-allow-origin"), null);
  evidence(
    "production owner CORS accepts the local browser origin and rejects an unlisted origin",
  );
  const authClient = createClient(storage.url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
  const otp = await authClient.auth.signInWithOtp({
    email: "owner@synthetic.example",
    options: {
      shouldCreateUser: false,
      emailRedirectTo: "http://127.0.0.1:8081/auth/callback",
    },
  });
  assert.equal(otp.error, null);
  assert.equal(printedMagicLinks.length, 1);
  const callback = new URL(printedMagicLinks[0]!);
  assert.equal(callback.origin, "http://127.0.0.1:8081");
  assert.equal(callback.hash, "");
  assert.equal(callback.pathname, "/auth/callback");
  const code = callback.searchParams.get("code");
  const flowId = callback.searchParams.get("sb_flow_id");
  assert(code, "The callback carries a PKCE code rather than session tokens.");
  const session = await authClient.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );
  assert.equal(session.error, null);
  assert.equal(session.data.session?.access_token, ownerToken);
  const denied = await fetch(
    `${storage.url}/auth/v1/otp?redirect_to=https%3A%2F%2Fexample.com`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "owner@synthetic.example" }),
    },
  );
  assert.equal(denied.status, 400);
  evidence(
    "local PKCE callback exchanges a matching verifier, sends no email and rejects remote redirects",
  );
  const first = clientFor();
  const jobs = await first.listPhotoJobs();
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.shareConsent, "not_asked");
  assert.deepEqual(jobs[0]?.assets, []);
  await assert.rejects(
    first.assignPhotos(JOB, BEFORE, AFTER),
    rejectsStatus(422),
  );
  evidence("missing customer consent blocks previews and attribution");
  assert.deepEqual(await clientFor(otherToken).listPhotoJobs(), []);
  await assert.rejects(
    clientFor(otherToken).assignPhotos(JOB, BEFORE, AFTER),
    rejectsStatus(404),
  );
  evidence("other tenant cannot list or assign this job");
  consent(true);
  await first.assignPhotos(JOB, BEFORE, AFTER);
  const offers = await fetch(`${running.url}/v1/owner/offers?status=accepted`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.equal(offers.status, 200);
  const requestData = (await offers.json()) as {
    data: Array<{
      conversationId: string;
      media: Array<{ id: string; role: string }>;
    }>;
  };
  const request = requestData.data.find(
    (item) => item.conversationId === CONVERSATION,
  );
  assert(
    request,
    "The accepted request remains available after Story Pack assignment.",
  );
  for (const id of [BEFORE, AFTER, OTHER]) {
    assert.equal(
      request.media.find((item) => item.id === id)?.role,
      "evidence",
      "Story Pack assignment must preserve customer evidence in the request view.",
    );
  }
  evidence(
    "Story Pack assignment preserves original customer evidence in the request API",
  );
  const sources = await first.listSources();
  assert.deepEqual(
    sources[0]?.assets.map((a) => a.id),
    [BEFORE, AFTER],
  );
  const photo = await fetch(sources[0]!.assets[0]!.imageUrl!);
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get("content-type"), "image/png");
  assert.equal(
    sql(`select job_assigned_by from public.media where id='${BEFORE}';`),
    MARIO,
  );
  assert.equal(
    sql(
      `select count(*) from public.consents where conversation_id='${CONVERSATION}' and kind='photos_for_marketing';`,
    ),
    "1",
  );
  evidence(
    "owner attribution reaches SQL audit; source URLs fetch a signed fixture PNG",
  );
  const service = createStoryPackService(first);
  const draft = await service.createFromJob(JOB);
  assert.equal(draft.status, "draft");
  assert.equal(draft.canHandoff, false);
  const edited = [1, 2, 3].map((i) => ({
    title: `Saved slide ${i}`,
    body: `Synthetic persisted copy ${i}`,
  }));
  await service.updateDraft(draft.id, {
    caption: "Synthetic caption saved through the real API.",
    slides: edited,
    platforms: { facebook: true, instagram: true },
  });
  const fresh = clientFor();
  await fresh.listSources();
  const reloaded = await fresh.findPack(draft.id);
  assert.deepEqual(reloaded?.slides, edited);
  assert.deepEqual(reloaded?.sourceMediaIds, [BEFORE, AFTER]);
  assert.equal(
    sql(
      `select slides->0->>'title' from public.content_drafts where id='${draft.id}';`,
    ),
    "Saved slide 1",
  );
  evidence(
    "product client/shared DTO saves three slides; a fresh client reloads identical SQL state",
  );
  const freshService = createStoryPackService(fresh);
  assert(reloaded);
  const displayedSource = sources.find(
    (source) => source.id === reloaded.sourceJobId,
  )!;
  const displayedSnapshot: StoryPackApprovalSnapshot = {
    expectedUpdatedAt: reloaded.updatedAt,
    expectedMedia: reloaded.sourceMediaIds.map((id) => {
      const asset = displayedSource.assets.find((asset) => asset.id === id)!;
      assert(asset.role === "before" || asset.role === "after");
      assert(
        typeof asset.revision === "string" &&
          /^[a-f0-9]{64}$/.test(asset.revision),
      );
      return { id: asset.id, role: asset.role, revision: asset.revision };
    }),
  };
  // A different owner session edits the same draft after this view was read.
  await createStoryPackService(clientFor()).updateDraft(draft.id, {
    caption: "Synthetic concurrent caption saved by another client.",
  });
  const staleReviewStarted = performance.now();
  await assert.rejects(
    fresh.review(draft.id, displayedSnapshot),
    rejectsStatus(409),
  );
  const staleReviewMs = performance.now() - staleReviewStarted;
  assert(
    staleReviewMs < 10_000,
    "An obsolete draft must return a conflict without transaction retries.",
  );
  assert.equal((await fresh.findPack(draft.id))?.status, "draft");
  evidence(
    `concurrent saved copy changes return 409 in ${Math.round(staleReviewMs)}ms and cannot approve a stale displayed version`,
  );
  const reviewed = await fresh.findPack(draft.id);
  assert(reviewed);
  const approved = await freshService.approve(draft.id, {
    ...displayedSnapshot,
    expectedUpdatedAt: reviewed.updatedAt,
  });
  assert.equal(approved.status, "approved");
  assert.equal(
    approved.canHandoff,
    false,
    "Review returns a receipt, not a fresh handoff authorization.",
  );
  assert.equal((await fresh.findPack(draft.id))?.canHandoff, true);
  for (let i = 0; i < 2; i++) {
    const ready = await freshService.prepareHandoff(draft.id);
    assert.deepEqual(ready.pack.slides, edited);
    assert.deepEqual(
      ready.source.assets.map((a) => a.id),
      [BEFORE, AFTER],
    );
    assert.equal(ready.pack.canHandoff, true);
  }
  evidence(
    "owner approval persists the displayed photo snapshot; repeated handoffs retain the exact pair",
  );
  await fresh.assignPhotos(JOB, AFTER, BEFORE);
  assert.equal((await fresh.findPack(draft.id))?.canHandoff, false);
  await assert.rejects(fresh.handoff(draft.id), rejectsStatus(422));
  evidence(
    "swapping the same selected photo ids after approval invalidates handoff",
  );
  await fresh.assignPhotos(JOB, BEFORE, AFTER);
  assert.equal((await fresh.handoff(draft.id)).pack.canHandoff, true);
  assert.equal(
    (
      await endpoint(`/drafts/${draft.id}/publish`, ownerToken, {
        method: "POST",
        body: "{}",
      })
    ).status,
    404,
  );
  assert.equal(
    sql(
      `select published_at is null from public.content_drafts where id='${draft.id}';`,
    ),
    "t",
  );
  evidence("handoff never publishes");
  consent(false);
  assert.deepEqual(await fresh.listSources(), []);
  assert.equal((await fresh.findPack(draft.id))?.canHandoff, false);
  await assert.rejects(fresh.handoff(draft.id), rejectsStatus(422));
  await assert.rejects(
    fresh.assignPhotos(JOB, BEFORE, AFTER),
    rejectsStatus(422),
  );
  evidence(
    "customer revocation immediately blocks fresh sources, handoff and attribution",
  );
  consent(true);
  await fresh.assignPhotos(JOB, BEFORE, OTHER);
  const alternative = await fresh.listSources();
  assert.deepEqual(
    alternative[0]?.assets.map((a) => a.id),
    [BEFORE, OTHER],
  );
  assert.equal((await fresh.findPack(draft.id))?.canHandoff, false);
  await assert.rejects(fresh.handoff(draft.id), rejectsStatus(422));
  evidence(
    "selected after-photo reclassification blocks handoff even when another after-photo exists",
  );
  // Restore a reviewable synthetic fixture for --serve browser acceptance.
  await fresh.assignPhotos(JOB, BEFORE, AFTER);
  assert.equal((await fresh.handoff(draft.id)).pack.canHandoff, true);
  console.log(
    JSON.stringify(
      {
        result: "PASS",
        checks: passed,
        scope:
          "Real product HTTP client, API service, PostgREST, Postgres and RLS. Synthetic Auth and Storage fixtures only.",
        apiUrl: running.url,
        supabaseUrl: storage.url,
        anonKey,
        ownerEmail: "owner@synthetic.example",
        ownerPassword: "synthetic-fixture",
        ownerAccessToken: ownerToken,
        otherAccessToken: otherToken,
        jobId: JOB,
        draftId: draft.id,
        dbContainer: db,
      },
      null,
      2,
    ),
  );
  if (process.argv.includes("--serve")) {
    console.log(
      "Synthetic browser fixture remains available until this process is stopped.",
    );
    await new Promise<void>((resolve) => {
      process.once("SIGINT", () => resolve());
      process.once("SIGTERM", () => resolve());
    });
  }
} finally {
  await running.close();
  await storage.close();
}
