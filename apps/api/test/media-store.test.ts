// Marked-frame upload: private bucket, conversation folder, signed URL.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { SIGNED_URL_SECONDS, createMediaStore } from "../src/media/media-store.ts";

const ANA = "40000000-0000-4000-8000-000000000001";

const VIDEO = "50000000-0000-4000-8000-000000000001";

function fakeStorage(fail?: "upload" | "row") {
  const calls: { method: string; path: string; body: string | null }[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    calls.push({ method: init?.method ?? "GET", path: url.pathname, body: typeof init?.body === "string" ? init.body : null });
    if (url.pathname.includes("/object/sign/")) {
      return Response.json({ signedURL: `/object/sign/media/x.jpg?token=t` });
    }
    if (url.pathname === "/rest/v1/media") {
      if (fail === "row") {
        return Response.json({ code: "23514", message: "check violation" }, { status: 400 });
      }
      return Response.json({ id: "60000000-0000-4000-8000-000000000001" }, { status: 201 });
    }
    if (fail === "upload") {
      return Response.json({ statusCode: "409", error: "Duplicate", message: "exists" }, { status: 409 });
    }
    return Response.json({ Key: "media/x.jpg" });
  }) as typeof fetch;
  const client = createClient("https://example.supabase.co", "service-role-test-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchImpl },
  });
  return { store: createMediaStore(client), calls };
}

describe("createMediaStore", () => {
  it("uploads into the conversation folder and returns a signed URL", async () => {
    const { store, calls } = fakeStorage();
    const result = await store.publishJpeg(ANA, new Uint8Array([0xff, 0xd8]));

    assert.match(result.path, new RegExp(`^conversations/${ANA}/marked-frame-[0-9a-f-]{36}\\.jpg$`));
    assert.equal(calls[0]?.method, "POST");
    assert.equal(calls[0]?.path, `/storage/v1/object/media/${result.path}`);
    assert.equal(calls[1]?.path, `/storage/v1/object/sign/media/${result.path}`);
    assert.equal(JSON.parse(calls[1]?.body ?? "{}").expiresIn, SIGNED_URL_SECONDS);
    assert.match(result.url, /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/sign\/.+token=/);
  });

  it("refuses a conversation id that is not a uuid, so paths cannot escape the folder", async () => {
    const { store, calls } = fakeStorage();
    await assert.rejects(store.publishJpeg("../tenants", new Uint8Array([1])), /uuid/);
    assert.equal(calls.length, 0);
  });

  it("surfaces upload errors", async () => {
    const { store } = fakeStorage("upload");
    await assert.rejects(store.publishJpeg(ANA, new Uint8Array([1])), /upload failed/);
  });
});

describe("saveMarkedFrame", () => {
  it("uploads the frame and adds a marked_frame row linked to the source video", async () => {
    const { store, calls } = fakeStorage();
    const saved = await store.saveMarkedFrame(ANA, VIDEO, new Uint8Array([0xff, 0xd8, 0xff]));

    assert.equal(saved.mediaId, "60000000-0000-4000-8000-000000000001");
    assert.match(saved.url, /token=/);
    const insert = calls.find((call) => call.path === "/rest/v1/media");
    assert.deepEqual(JSON.parse(insert?.body ?? "{}"), {
      conversation_id: ANA,
      kind: "image",
      role: "marked_frame",
      storage_path: saved.path,
      mime_type: "image/jpeg",
      size_bytes: 3,
      derived_from_media_id: VIDEO,
    });
  });

  it("refuses a source id that is not a uuid before uploading", async () => {
    const { store, calls } = fakeStorage();
    await assert.rejects(store.saveMarkedFrame(ANA, "nope", new Uint8Array([1])), /uuid/);
    assert.equal(calls.length, 0);
  });

  it("surfaces a failed row insert", async () => {
    const { store } = fakeStorage("row");
    await assert.rejects(store.saveMarkedFrame(ANA, VIDEO, new Uint8Array([1])), /marked frame row failed/);
  });
});
