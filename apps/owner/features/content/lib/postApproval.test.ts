// Spec: odd/tasks/owner-content.md, S4 requirement.
// Pure functions for post approval logic: target validation, scheduling vs publishing,
// draft status guards, and immutability.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEMO_NOW, drafts } from "../../../shared/data/mock.ts";
import type { PostDraft, PostStatus } from "../../../shared/data/types.ts";
import { approvePost, canApprovePost, regeneratePost } from "./postApproval.ts";

describe("canApprovePost", () => {
  it("allows approval when at least one target is checked", () => {
    assert.equal(canApprovePost({ facebook: true, instagram: false }), true);
    assert.equal(canApprovePost({ facebook: false, instagram: true }), true);
    assert.equal(canApprovePost({ facebook: true, instagram: true }), true);
  });

  it("disallows approval when no target is checked", () => {
    assert.equal(canApprovePost({ facebook: false, instagram: false }), false);
  });
});

describe("approvePost scheduling vs publishing", () => {
  const post91 = drafts.find((d) => d.id === "post_91")!;

  it("approving post_91 with scheduledFor after injected now gives scheduled", () => {
    const draft = structuredClone(post91);
    const result = approvePost(draft, { now: DEMO_NOW });

    assert.notEqual(result, null);
    assert.equal(result?.status, "scheduled");
    assert.equal(result?.scheduledFor, post91.scheduledFor);
    assert.equal(result?.publishedAt, undefined);
  });

  it("approving with no scheduledFor gives published with publishedAt equal to now", () => {
    const postNight = drafts.find((d) => d.id === "post_night")!;
    const draft = structuredClone(postNight);
    const result = approvePost(draft, { now: DEMO_NOW });

    assert.notEqual(result, null);
    assert.equal(result?.status, "published");
    assert.equal(result?.publishedAt, DEMO_NOW);
  });

  it("approving with past scheduledFor gives published with publishedAt equal to now", () => {
    const draft: PostDraft = {
      ...structuredClone(post91),
      scheduledFor: "2026-10-27T12:00:00-05:00",
    };
    const result = approvePost(draft, { now: DEMO_NOW });

    assert.notEqual(result, null);
    assert.equal(result?.status, "published");
    assert.equal(result?.publishedAt, DEMO_NOW);
  });
});

describe("approvePost updates and guards", () => {
  const post91 = drafts.find((d) => d.id === "post_91")!;

  it("keeps targets and the edited caption", () => {
    const draft = structuredClone(post91);
    const editedCaption = "Quick emergency plumbing response from Northside.";
    const targets = { facebook: false, instagram: true };

    const result = approvePost(draft, {
      now: DEMO_NOW,
      caption: editedCaption,
      targets,
    });

    assert.notEqual(result, null);
    assert.equal(result?.caption, editedCaption);
    assert.deepEqual(result?.targets, targets);
  });

  it("returns null when no target is checked", () => {
    const draft = structuredClone(post91);
    const result = approvePost(draft, {
      now: DEMO_NOW,
      targets: { facebook: false, instagram: false },
    });

    assert.equal(result, null);
  });

  it("returns null when approving a non-draft", () => {
    const nonDraftStatuses: PostStatus[] = ["scheduled", "published", "rejected"];

    for (const status of nonDraftStatuses) {
      const nonDraft: PostDraft = {
        ...structuredClone(post91),
        status,
      };
      assert.equal(
        approvePost(nonDraft, { now: DEMO_NOW }),
        null,
        `Expected approving a ${status} post to return null`,
      );
    }
  });

  it("returns null when regenerating a non-draft", () => {
    const nonDraftStatuses: PostStatus[] = ["scheduled", "published", "rejected"];

    for (const status of nonDraftStatuses) {
      const nonDraft: PostDraft = {
        ...structuredClone(post91),
        status,
      };
      assert.equal(
        regeneratePost(nonDraft),
        null,
        `Expected regenerating a ${status} post to return null`,
      );
    }
  });

  it("does not mutate the original draft object", () => {
    const draft = structuredClone(post91);
    const originalClone = structuredClone(post91);

    approvePost(draft, { now: DEMO_NOW, caption: "Mutated?" });

    assert.deepEqual(draft, originalClone);
  });
});
