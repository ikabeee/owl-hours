// New tests (not part of the locked T5 set): the job detail screen draws a flat, serializable view
// of the job. The mapping is pure, so it is pinned here instead of in a React test (the app has none).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { anaJob } from "../../../shared/data/mock.ts";
import { buildJobView } from "./jobView.ts";

describe("buildJobView for Ana's approved job", () => {
  const view = buildJobView(anaJob);

  it("names the job and the customer", () => {
    assert.equal(view.title, "Leaking toilet");
    assert.equal(view.customerName, "Ana L.");
    assert.equal(view.customerFirstName, "Ana");
  });

  it("shows the approval line, the address and the distance", () => {
    assert.equal(view.approvalLine, "Approved by Ana at 12:07 AM");
    assert.equal(view.address, "128 Palm Ave, apt 4");
    assert.equal(view.distanceKm, 1.2);
  });

  it("summarises the quote: technician, total and arrival window", () => {
    assert.equal(view.technician, "Mario R.");
    assert.equal(view.quoteText, "$130–160");
    assert.equal(view.arrivalText, "12:55–1:25 AM");
  });

  it("lists the timeline with wall-clock times, then the steps still ahead", () => {
    assert.deepEqual(view.timeline, [
      { timeText: "12:04 AM", text: "Ana asked Zukki for help" },
      { timeText: "12:05 AM", text: "You accepted the request" },
      { timeText: "12:07 AM", text: "Quote sent and approved" },
    ]);
    assert.deepEqual(view.pendingSteps, ["On the way", "Done"]);
  });

  it('offers "Start trip" in a visible footer', () => {
    assert.deepEqual(view.action, { label: "Start trip", nextStatus: "en_route", isDisabled: false });
    assert.equal(view.isFooterVisible, true);
  });
});

describe("buildJobView before the customer approves", () => {
  const { approvedAt: _approvedAt, ...unapprovedFields } = anaJob;
  const view = buildJobView({ ...unapprovedFields, status: "quoted" });

  it("hides the address even though the job row carries one, and has no approval line", () => {
    assert.equal(view.address, null);
    assert.equal(view.approvalLine, null);
  });

  it("hides the footer", () => {
    assert.equal(view.isFooterVisible, false);
  });
});

describe("buildJobView with missing optional fields", () => {
  it("has no distance when the job does not carry one", () => {
    const { distanceKm: _distanceKm, ...jobWithoutDistance } = anaJob;

    assert.equal(buildJobView(jobWithoutDistance).distanceKm, null);
  });

  it("has no time for a timeline entry with a malformed timestamp", () => {
    const view = buildJobView({ ...anaJob, timeline: [{ at: "not-a-date", text: "Something happened" }] });

    assert.deepEqual(view.timeline, [{ timeText: null, text: "Something happened" }]);
  });
});
