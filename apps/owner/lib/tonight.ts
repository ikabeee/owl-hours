// Pure inbox grouping for screen 04 (HfInbox tabs).
// Needs you: the agent proposed, a person must decide.
// Assistant: the agent is still working the triage.
// Booked: confirmed onward, including tonight's finished jobs.
export type TonightJob = {
  id: string;
  title: string;
  customer: string;
  state: string;
  total_min: number;
  total_max: number;
  arrival_window: string;
};

export type TonightTabs = {
  needsYou: TonightJob[];
  assistant: TonightJob[];
  booked: TonightJob[];
};

export function groupJobsByTab(jobs: TonightJob[]): TonightTabs {
  const tabs: TonightTabs = { needsYou: [], assistant: [], booked: [] };
  for (const job of jobs) {
    tabFor(job.state).push(job);
  }
  return tabs;

  function tabFor(state: string): TonightJob[] {
    if (state === "proposed") {
      return tabs.needsYou;
    }
    if (state === "requested" || state === "triaged") {
      return tabs.assistant;
    }
    return tabs.booked;
  }
}
