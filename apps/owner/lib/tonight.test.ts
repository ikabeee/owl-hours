// Spec: handoff screen 04, inbox tabs Needs you / Assistant / Booked.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { groupJobsByTab } from "./tonight.ts";
import type { TonightJob } from "./tonight.ts";

function job(id: string, state: string): TonightJob {
  return {
    id,
    title: id,
    customer: "Test",
    state,
    total_min: 130,
    total_max: 160,
    arrival_window: "12:40-1:10 AM",
  };
}

describe("tonight inbox tabs", () => {
  it("routes proposed jobs to Needs you", () => {
    const tabs = groupJobsByTab([job("a", "proposed")]);
    assert.deepEqual(tabs.needsYou.map((j) => j.id), ["a"]);
    assert.deepEqual(tabs.assistant, []);
    assert.deepEqual(tabs.booked, []);
  });

  it("routes agent triage to Assistant and confirmations onward to Booked", () => {
    const tabs = groupJobsByTab([
      job("a", "triaged"),
      job("b", "owner_confirmed"),
      job("c", "en_route"),
    ]);
    assert.deepEqual(tabs.assistant.map((j) => j.id), ["a"]);
    assert.deepEqual(tabs.booked.map((j) => j.id), ["b", "c"]);
  });

  it("groups an empty night into empty tabs", () => {
    assert.deepEqual(groupJobsByTab([]), { needsYou: [], assistant: [], booked: [] });
  });
});
