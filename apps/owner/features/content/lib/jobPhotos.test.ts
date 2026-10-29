// Spec: odd/tasks/owner-content.md, S3 requirement.
// Resolves job photos and consent line for post review: appears only when shareConsent is "yes",
// extracts the customer's first name, and yields null otherwise.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob, drafts } from "../../../shared/data/mock.ts";
import type { Job, PostDraft } from "../../../shared/data/types.ts";
import { resolveJobPhotos } from "./jobPhotos.ts";

describe("resolveJobPhotos", () => {
  const post91 = drafts.find((d) => d.id === "post_91")!;

  it('returns job photos and consent line when shareConsent is "yes"', () => {
    const job = structuredClone(anaJob);
    const draft = structuredClone(post91);

    const result = resolveJobPhotos(draft, job);

    assert.notEqual(result, null);
    assert.deepEqual(result?.photos, {
      before: "bath-leak",
      after: "bath-fixed",
      extra: [],
    });
    assert.equal(
      result?.consentLine,
      "Image made from your job photos. Ana agreed to share them.",
    );
  });

  it("extracts the customer's first name from full name for the consent line", () => {
    const job: Job = {
      ...structuredClone(anaJob),
      customerName: "Carlos M.",
    };
    const draft = structuredClone(post91);

    const result = resolveJobPhotos(draft, job);

    assert.equal(
      result?.consentLine,
      "Image made from your job photos. Carlos agreed to share them.",
    );
  });

  it("extracts single first name for the consent line", () => {
    const job: Job = {
      ...structuredClone(anaJob),
      customerName: "Elena",
    };
    const draft = structuredClone(post91);

    const result = resolveJobPhotos(draft, job);

    assert.equal(
      result?.consentLine,
      "Image made from your job photos. Elena agreed to share them.",
    );
  });

  const nonConsentingStatuses = ["no", "asked", "not_asked"] as const;
  for (const consent of nonConsentingStatuses) {
    it(`returns null when shareConsent is "${consent}"`, () => {
      const job: Job = {
        ...structuredClone(anaJob),
        shareConsent: consent,
      };
      const draft = structuredClone(post91);

      assert.equal(resolveJobPhotos(draft, job), null);
    });
  }

  it("returns null for a draft with no source job", () => {
    const postNight = drafts.find((d) => d.id === "post_night")!;
    const draft = structuredClone(postNight);

    assert.equal(resolveJobPhotos(draft, anaJob), null);
  });

  it("returns null when job is null or undefined", () => {
    const draft = structuredClone(post91);

    assert.equal(resolveJobPhotos(draft, null), null);
    assert.equal(resolveJobPhotos(draft, undefined), null);
  });

  it("does not mutate the source job or draft", () => {
    const job = structuredClone(anaJob);
    const draft = structuredClone(post91);
    const originalJob = structuredClone(anaJob);
    const originalDraft = structuredClone(post91);

    resolveJobPhotos(draft, job);

    assert.deepEqual(job, originalJob);
    assert.deepEqual(draft, originalDraft);
  });
});
