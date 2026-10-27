// Job state machine for Zukki (handoff section 6).
// The model proposes transitions; this module validates them.
// The model never writes state directly.

export const JOB_STATES = [
  "requested",
  "triaged",
  "proposed",
  "owner_confirmed",
  "customer_approved",
  "en_route",
  "on_site",
  "done",
  "declined",
  "cancelled",
] as const;

export type JobState = (typeof JOB_STATES)[number];

export type JobActor = "agent" | "owner" | "customer" | "system";

export class InvalidTransitionError extends Error {
  readonly from: JobState;
  readonly to: JobState;
  readonly actor: JobActor;

  constructor(from: JobState, to: JobState, actor: JobActor) {
    super(`Cannot transition job from ${from} to ${to} as ${actor}`);
    this.name = "InvalidTransitionError";
    this.from = from;
    this.to = to;
    this.actor = actor;
  }
}

// Validates a proposed transition and returns the new state.
// Throws InvalidTransitionError when the move is not allowed.
export function transitionJob(from: JobState, to: JobState, actor: JobActor): JobState {
  if (!canTransitionJob(from, to, actor)) {
    throw new InvalidTransitionError(from, to, actor);
  }
  return to;
}

// Reports whether the actor may move the job from one state to another.
export function canTransitionJob(from: JobState, to: JobState, actor: JobActor): boolean {
  if (isTerminalState(from)) {
    return false;
  }
  if (isEarlyExit(to)) {
    return canExitEarly(from, actor);
  }
  return canAdvance(from, to, actor);
}

function isTerminalState(state: JobState): boolean {
  return state === "done" || state === "declined" || state === "cancelled";
}

function isEarlyExit(state: JobState): boolean {
  return state === "declined" || state === "cancelled";
}

// Jobs can be declined or cancelled from any state before on_site.
// Only the people involved (or the system on their behalf) can do it.
function canExitEarly(from: JobState, actor: JobActor): boolean {
  const stillOpen = from !== "on_site";
  const humanSide = actor === "owner" || actor === "customer" || actor === "system";
  return stillOpen && humanSide;
}

// The happy path. The two confirmation steps are actor-locked:
// only an owner confirm reaches owner_confirmed, only the customer's
// WhatsApp tap reaches customer_approved.
function canAdvance(from: JobState, to: JobState, actor: JobActor): boolean {
  switch (from) {
    case "requested":
      return to === "triaged" && isAgentSide(actor);
    case "triaged":
      return to === "proposed" && isAgentSide(actor);
    case "proposed":
      return to === "owner_confirmed" && actor === "owner";
    case "owner_confirmed":
      return to === "customer_approved" && actor === "customer";
    case "customer_approved":
      return to === "en_route" && isDispatchSide(actor);
    case "en_route":
      return to === "on_site" && isDispatchSide(actor);
    case "on_site":
      return to === "done" && isDispatchSide(actor);
    default:
      return false;
  }
}

function isAgentSide(actor: JobActor): boolean {
  return actor === "agent" || actor === "system";
}

function isDispatchSide(actor: JobActor): boolean {
  return actor === "owner" || actor === "system";
}
