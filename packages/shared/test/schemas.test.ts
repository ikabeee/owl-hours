// Spec: handoff section 6, ticket shape. Expected values come from the
// demo numbers: $45 visit + $25 night fee + $60-90 repair = $130-160.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { quoteSchema, ticketSchema } from "../src/schemas.ts";

const demoQuote = {
  lines: [
    { label: "Visit", min: 45, max: 45 },
    { label: "Night fee", min: 25, max: 25 },
    { label: "Fill valve repair", min: 60, max: 90 },
  ],
  total_min: 130,
  total_max: 160,
  excludes: "floor damage",
};

describe("ticket schemas", () => {
  it("accepts the demo ticket", () => {
    const ticket = {
      category: "toilet",
      title: "Toilet won't stop running",
      urgency: "now",
      safety: { water_flowing: true, cables_near_water: false, valve_closed: true },
      diagnosis: "worn fill valve",
      likely_part: "fill valve",
      quote: demoQuote,
      arrival_window: "12:40-1:10 AM",
    };
    assert.deepEqual(ticketSchema.parse(ticket), ticket);
  });

  it("rejects a line whose min exceeds its max", () => {
    const bad = {
      ...demoQuote,
      lines: [{ label: "Visit", min: 90, max: 45 }],
      total_min: 90,
      total_max: 45,
    };
    assert.throws(() => quoteSchema.parse(bad));
  });

  it("rejects totals that do not match the lines", () => {
    assert.throws(() => quoteSchema.parse({ ...demoQuote, total_max: 200 }));
  });
});
