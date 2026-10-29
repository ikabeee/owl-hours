import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDemoJobsService } from "./demoJobsService.ts";

// The demo timeline must read in order: a trip started from the job screen cannot predate the
// "Quote sent and approved" entry the seed already holds (12:07 AM).
describe("createDemoJobsService", () => {
  it("records 'On the way' no earlier than the approval entry", async () => {
    const service = createDemoJobsService();

    const job = await service.updateJobStatus("job_ana", "en_route");

    const [approval, trip] = job?.timeline.slice(-2) ?? [];
    assert.equal(approval?.text, "Quote sent and approved");
    assert.equal(trip?.text, "On the way");
    assert.ok(Date.parse(trip.at) >= Date.parse(approval.at), `${trip.at} is before ${approval.at}`);
  });
});
