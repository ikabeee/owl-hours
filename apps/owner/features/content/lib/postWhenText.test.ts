// Spec: odd/tasks/owner-content.md, S3 requirement.
// Formats the post scheduling time with clock injection, returning the value only ("Today, 6:00 PM"); the "When" label lives in copys.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEMO_NOW, drafts } from "../../../shared/data/mock.ts";
import { postWhenText } from "./postWhenText.ts";

describe("postWhenText", () => {
  const post91 = drafts.find((d) => d.id === "post_91")!;

  it('post_91.scheduledFor at DEMO_NOW reads "Today, 6:00 PM"', () => {
    assert.equal(postWhenText(post91.scheduledFor, DEMO_NOW), "Today, 6:00 PM");
  });

  it("formats morning scheduled times with AM", () => {
    assert.equal(
      postWhenText("2026-10-28T09:30:00-05:00", DEMO_NOW),
      "Today, 9:30 AM",
    );
  });

  it("is null when scheduledFor is undefined or null", () => {
    assert.equal(postWhenText(undefined, DEMO_NOW), null);
    assert.equal(postWhenText(null as unknown as undefined, DEMO_NOW), null);
  });

  it("is null for a malformed timestamp", () => {
    assert.equal(postWhenText("not-a-valid-date", DEMO_NOW), null);
  });
});
