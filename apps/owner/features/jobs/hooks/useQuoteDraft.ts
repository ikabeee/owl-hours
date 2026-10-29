import { useEffect, useState } from "react";
import type { ID, QuoteLine } from "../../../shared/data/types.ts";
import { firstName } from "../../../shared/lib/firstName.ts";
import { arrivalWindowText } from "../lib/arrivalWindow.ts";
import { buildQuote } from "../lib/quoteEditing.ts";
import type { JobsService, QuoteDraft } from "../services/jobsService.ts";
import { createDemoJobsService } from "./demoJobsService.ts";

export type QuoteDraftDeps = { service: JobsService };

// Serializable by design: it crosses into the DOM component as props. The screen edits the lines
// itself (recalculating the total live) and hands the edited lines back through `send`.
export type QuoteDraftView = {
  title: string;
  customerName: string;
  customerFirstName: string;
  lines: QuoteLine[];
  arrivalText: string;
  technician: string;
  note: string | null;
  send: (lines: QuoteLine[]) => Promise<boolean>;
};

// Returns null while the draft loads, or when the conversation has no job to quote.
// Pass a stable service (a module constant or memoized): changing it reloads the draft.
export function useQuoteDraft(conversationId: ID, deps?: Partial<QuoteDraftDeps>): QuoteDraftView | null {
  const [defaults] = useState(createDemoDeps);
  const service = deps?.service ?? defaults.service;
  const [draft, setDraft] = useState<QuoteDraft | null>(null);

  useEffect(() => {
    let isCurrent = true;
    service.getQuoteDraft(conversationId).then((loaded) => {
      if (isCurrent) setDraft(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [service, conversationId]);

  if (!draft) return null;

  return {
    title: draft.title,
    customerName: draft.customerName,
    customerFirstName: firstName(draft.customerName),
    lines: draft.quote.lines,
    arrivalText: arrivalWindowText(draft.quote.arrival),
    technician: draft.quote.technician,
    note: draft.quote.note ?? null,
    send: (lines) => sendQuote(service, conversationId, draft, lines),
  };
}

// A refusal and a failure both mean the quote did not go out: the owner keeps the screen and can retry.
async function sendQuote(service: JobsService, conversationId: ID, draft: QuoteDraft, lines: QuoteLine[]): Promise<boolean> {
  try {
    return (await service.sendQuote(conversationId, buildQuote(draft.quote, lines))) !== null;
  } catch {
    return false;
  }
}

function createDemoDeps(): QuoteDraftDeps {
  return { service: createDemoJobsService() };
}
