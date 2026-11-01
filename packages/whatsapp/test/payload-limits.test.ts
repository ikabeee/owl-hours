import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  suggestBusiness,
  whatAreYouLookingFor,
} from "../src/index.ts";

// RED phase (T1): the builders above do not exist yet, so every test fails
// on the missing export. Overflow behavior copies apps/api today: copy.ts
// clips header/footer/body (HEADER_MAX, FOOTER_MAX, BUTTON_BODY_MAX) and
// outbox.ts falls back to text for 12 over INTERACTIVE_BODY_MAX.

const TO = "15551234567";
const BUSINESS_NAME = "Northside Plumbing";

const demoMatch = {
  businessId: "10000000-0000-4000-8000-000000000001",
  businessName: BUSINESS_NAME,
  rating: 4.9,
  reviews: 128,
  distanceKm: 1.2,
  openNow: true,
  visit: 45,
  nightFee: { amount: 25, window: "10 PM-7 AM" },
  repairFrom: 60,
  repairLabel: "Leak repair",
  etaMinutes: 40,
  currency: "USD",
  takesNightJobs: true,
};

describe("Cloud API limits (S2)", () => {
  it("clips an over-long header to 60 characters (S2)", () => {
    const message = suggestBusiness({ to: TO, category: "plumbing", match: { ...demoMatch, businessName: "N".repeat(80) } });
    assert.deepEqual(headerOf(message), { type: "text", text: `${"N".repeat(59)}…` });
  });

  it("keeps every list row title within 24 characters (S2)", () => {
    const message = whatAreYouLookingFor({ to: TO });
    const rows = rowsOf(message);
    assert.ok(rows.length > 0);
    for (const title of rows) {
      assert.ok(title.length <= 24, `row title over 24 chars: ${title}`);
    }
  });
});

function interactiveOf(message: unknown): Record<string, unknown> {
  return (message as { interactive: Record<string, unknown> }).interactive;
}

function headerOf(message: unknown): unknown {
  return interactiveOf(message).header;
}

function rowsOf(message: unknown): string[] {
  const action = interactiveOf(message).action as { sections: Array<{ rows: Array<{ title: string }> }> };
  return action.sections.flatMap((section) => section.rows.map((row) => row.title));
}
