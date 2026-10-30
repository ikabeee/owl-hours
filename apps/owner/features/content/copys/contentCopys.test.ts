// Spec: odd/tasks/owner-content.md, S2, S3, S5, and S6 requirements.
// Visible copy strings for Content screens (OwContent, OwPostReview, OwAccounts).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { contentCopys } from "./contentCopys.ts";

const expectedVerbatimCopys = {
  madeFromJobsAndPrices: "Made from your jobs and prices",
  approveAndPost: "Approve and post",
  regenerate: "Regenerate",
  edit: "Edit",
  seeTodaysDrafts: "See today's drafts",
  whatZukkiCanDo: "What Zukki can do",
  somethingWentWrong: "Something went wrong.",
  tryAgain: "Try again",
  when: "When",
};

describe("contentCopys verbatim strings", () => {
  for (const [key, text] of Object.entries(expectedVerbatimCopys)) {
    it(`${key} is "${text}"`, () => {
      assert.equal(contentCopys[key as keyof typeof contentCopys], text);
    });
  }
});

describe("contentCopys template formatting", () => {
  it('formats "Drafts for you · {count}" template giving "Drafts for you · 3"', () => {
    assert.equal(contentCopys.draftsForYou(3), "Drafts for you · 3");
  });

  it('formats "Drafts for you · {count}" template for other counts', () => {
    assert.equal(contentCopys.draftsForYou(1), "Drafts for you · 1");
    assert.equal(contentCopys.draftsForYou(0), "Drafts for you · 0");
  });
});

describe("contentCopys draft subtitle", () => {
  it('formats "Draft {index} of {total} · {source}" for a job draft', () => {
    assert.equal(
      contentCopys.draftSubtitle(1, 3, contentCopys.sourceLine.job),
      "Draft 1 of 3 · made from last night's job",
    );
  });
});

describe("contentCopys completeness", () => {
  it("has every expected verbatim key", () => {
    const missing = Object.keys(expectedVerbatimCopys).filter(
      (key) => !(key in contentCopys),
    );
    assert.deepEqual(missing, []);
  });

  it("has no empty string among keys", () => {
    for (const [key, value] of Object.entries(contentCopys)) {
      if (typeof value === "string") {
        assert.notEqual(value.trim(), "", `${key} is empty`);
      } else if (typeof value === "function") {
        const sample = value(1);
        assert.notEqual(
          typeof sample === "string" ? sample.trim() : "",
          "",
          `${key} returned empty string`,
        );
      }
    }
  });
});
