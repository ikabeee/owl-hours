// Spec: handoff section 6, job state machine.
// A person confirms every job: the agent proposes, the owner confirms,
// the customer approves. No job reaches customer_approved without both.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { InvalidTransitionError, transitionJob } from "../src/job-states.ts";

describe("job state machine", () => {
  it("walks the happy path with the right actor at each step", () => {
    let state = transitionJob("requested", "triaged", "agent");
    state = transitionJob(state, "proposed", "agent");
    state = transitionJob(state, "owner_confirmed", "owner");
    state = transitionJob(state, "customer_approved", "customer");
    state = transitionJob(state, "en_route", "owner");
    state = transitionJob(state, "on_site", "owner");
    state = transitionJob(state, "done", "owner");
    assert.equal(state, "done");
  });

  it("lets only an owner confirm a proposed job", () => {
    assert.throws(
      () => transitionJob("proposed", "owner_confirmed", "agent"),
      InvalidTransitionError,
    );
    assert.equal(transitionJob("proposed", "owner_confirmed", "owner"), "owner_confirmed");
  });

  it("lets only the customer approve an owner-confirmed job", () => {
    assert.throws(
      () => transitionJob("owner_confirmed", "customer_approved", "owner"),
      InvalidTransitionError,
    );
    assert.equal(
      transitionJob("owner_confirmed", "customer_approved", "customer"),
      "customer_approved",
    );
  });

  it("rejects skipping the owner confirmation", () => {
    assert.throws(
      () => transitionJob("proposed", "customer_approved", "customer"),
      InvalidTransitionError,
    );
  });

  it("allows declining before on_site but locks terminal states", () => {
    assert.equal(transitionJob("proposed", "declined", "owner"), "declined");
    assert.throws(() => transitionJob("declined", "proposed", "owner"), InvalidTransitionError);
    assert.throws(() => transitionJob("done", "on_site", "owner"), InvalidTransitionError);
  });
});
