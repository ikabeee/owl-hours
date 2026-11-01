import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  finding,
  locationRequest,
} from "../src/index.ts";

// GREEN-phase regression pins for producer variants with no JSON
// counterpart (handoff L5). Expected bodies are literals taken from
// apps/api's copy/outbox behavior today, not recomputed by the builders.

const TO = "15551234567";

describe("producer variants without a JSON counterpart (S5)", () => {
  it("05 uses the food noun with that for a non-urgent need", () => {
    assert.deepEqual(locationRequest({ to: TO, category: "food", waterOff: false }), {
      to: TO,
      type: "interactive",
      interactive: {
        type: "location_request_message",
        body: {
          text: "Share your location so I can find a place that is open near you. The business only sees the exact address after you approve a visit.",
        },
        action: { name: "send_location" },
      },
    });
  });

  it("06 uses an electrician for electrical", () => {
    assert.deepEqual(finding({ to: TO, category: "electrical" }), {
      to: TO,
      type: "text",
      text: { preview_url: false, body: "Thanks. I'm finding an electrician who is open near you." },
    });
  });
});
