import type { DeclineReason } from "../../../shared/data/types.ts";
import { declineCopys } from "../copys/declineCopys.ts";

// One decline reason: the API id with its design label.
export type DeclineOption = { id: DeclineReason; label: string };

// The four design reasons in order, with the API reason ids.
export const DECLINE_REASONS: DeclineOption[] = [
  { id: "busy", label: declineCopys.busyNow },
  { id: "too_far", label: declineCopys.tooFar },
  { id: "not_offered", label: declineCopys.notOffered },
  { id: "other", label: declineCopys.other },
];

// "Decline request" is enabled only once a reason is chosen.
export function canSubmitDecline(selection: DeclineReason | null): boolean {
  return selection !== null;
}

// The route owns the param; this module owns the decision: only ?decline=1
// opens the sheet, so a stray value never declines by accident.
export function shouldOpenDeclineSheet(param: string | string[] | undefined): boolean {
  return param === "1";
}

export type DeclineSheetSnapshot = { isOpen: boolean; selection: DeclineReason | null };

export type DeclineSheet = {
  select(reason: DeclineReason): void;
  cancel(): void;
  confirm(): DeclineReason | null;
  getSnapshot(): DeclineSheetSnapshot;
};

// Local sheet state: cancel closes it and clears the choice, so a later
// confirm submits nothing; confirm hands the reason to the service call.
export function createDeclineSheet(options: { startOpen: boolean }): DeclineSheet {
  let snapshot: DeclineSheetSnapshot = { isOpen: options.startOpen, selection: null };

  return {
    select(reason) {
      snapshot = { ...snapshot, selection: reason };
    },
    cancel() {
      snapshot = { isOpen: false, selection: null };
    },
    confirm() {
      return snapshot.selection;
    },
    getSnapshot() {
      return snapshot;
    },
  };
}
