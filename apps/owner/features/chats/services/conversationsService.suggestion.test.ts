// Spec: docs/HANDOFF-OWNER-APP.md, T5 assignment, test file 4.
// The chat learns its job id and the suggested quote from its own service; the fake client
// reads shared/data/mock.ts (anaJob, offers).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createConversationsService, createFakeConversationsClient } from "./conversationsService.ts";

function buildService() {
  return createConversationsService(createFakeConversationsClient());
}

describe("conversationsService.getQuoteSuggestion", () => {
  it("returns job_ana and the $130–160 quote for Ana's conversation", async () => {
    const suggestion = await buildService().getQuoteSuggestion("c_ana");

    assert.deepEqual(suggestion, { jobId: "job_ana", suggestedQuote: { min: 130, max: 160 } });
  });

  it("returns null for a conversation with no job: c_carlos", async () => {
    assert.equal(await buildService().getQuoteSuggestion("c_carlos"), null);
  });

  it("returns null for an unknown conversation", async () => {
    assert.equal(await buildService().getQuoteSuggestion("nope"), null);
  });
});
