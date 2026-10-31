// The Requests inbox row: who and how far, and what state the request is in (an offered request
// whose window has closed reads as expired).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { offers } from "../../../shared/data/mock.ts";
import { requestRow } from "./requestRow.ts";

const ana = { ...offers[0], status: "offered" as const, expiresAt: "2026-10-31T16:05:00Z", distanceKm: 0.9 };

describe("requestRow", () => {
  it("shows an open request as waiting for the owner", () => {
    const row = requestRow(ana, "2026-10-31T16:01:00Z");
    assert.equal(row.isOpen, true);
    assert.equal(row.statusText, "Waiting for you");
    assert.equal(row.subtitle, `${ana.customerName} · 0.9 km`);
  });

  it("reads an offered request past its window as expired", () => {
    const row = requestRow(ana, "2026-10-31T16:06:00Z");
    assert.equal(row.isOpen, false);
    assert.equal(row.statusText, "Expired");
  });

  it("names answered requests and leaves out an unknown distance", () => {
    assert.equal(requestRow({ ...ana, status: "accepted" }, "2026-10-31T16:01:00Z").statusText, "Accepted");
    assert.equal(requestRow({ ...ana, status: "declined", distanceKm: 0 }, "2026-10-31T16:01:00Z").subtitle, ana.customerName);
  });
});
