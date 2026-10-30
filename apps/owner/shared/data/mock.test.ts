// Spec: docs/HANDOFF-OWNER-APP.md, T5.1 assignment, operator decision: "`anaJob` and every existing export
// stay byte-identical" while the other jobs are added to mock.ts. The demoClient tests compare Ana with a
// copy taken from the same object, so they cannot notice an edit; this pins her against a literal.
// These numbers appear in the pitch video and the designs.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "./mock.ts";

describe("anaJob", () => {
  it("is still the demo job of the designs", () => {
    assert.deepEqual(anaJob, {
      id: "job_ana",
      conversationId: "c_ana",
      title: "Leaking toilet",
      customerName: "Ana L.",
      technician: "Mario R.",
      address: "128 Palm Ave, apt 4",
      distanceKm: 1.2,
      approvedAt: "2026-10-28T00:07:00-05:00",
      quote: {
        lines: [
          { label: "Visit", amount: 45 },
          { label: "Night fee", amount: 25 },
          { label: "Fill valve repair", amount: { min: 60, max: 90 } },
        ],
        total: { min: 130, max: 160 },
        arrival: { from: "12:55 AM", to: "1:25 AM" },
        technician: "Mario R.",
        note: "Excludes floor damage",
      },
      finalTotal: 145,
      status: "customer_approved",
      timeline: [
        { at: "2026-10-28T00:04:00-05:00", text: "Ana asked Zukki for help" },
        { at: "2026-10-28T00:05:00-05:00", text: "You accepted the request" },
        { at: "2026-10-28T00:07:00-05:00", text: "Quote sent and approved" },
      ],
      photos: { before: "bath-leak", after: "bath-fixed", extra: [] },
      shareConsent: "yes",
    });
  });
});
