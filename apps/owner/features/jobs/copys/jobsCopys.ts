// Visible text of the quote and job screens. Sources: handoff-ui/owner-app/design/html/OwQuote.dc.html,
// OwJob.dc.html and HANDOFF-RN-UI.md section 8. Copy that names the customer is a function of the
// customer's first name (and the distance), so no demo name is hardcoded.
const copys = {
  // shared
  backLabel: "Back",
  somethingWentWrong: "Something went wrong.", // HANDOFF-RN-UI.md section 8, "Every screen also needs"
  // quote modal
  sendAQuote: "Send a quote",
  filledInByZukki: "Filled in by Zukki from your prices. Change anything.",
  estimatedTotal: "Estimated total",
  arrival: "Arrival",
  technician: "Technician",
  note: "Note",
  invalidAmountHint: "Use whole numbers above 0. The first number can't be higher than the second.",
  cancel: "Cancel",
  sendQuote: "Send quote",
  minimum: "minimum",
  maximum: "maximum",
  approvalNotice: (firstName: string) => `${firstName} approves it in WhatsApp. Nothing is booked until she does.`,
  // job detail
  jobTitleBar: "Job",
  viaZukki: "via Zukki",
  approvedBy: "Approved by",
  atTime: "at",
  map: "Map",
  change: "Change",
  quoteLabel: "Quote",
  startTrip: "Start trip",
  imHere: "I'm here",
  finish: "Finish",
  sharedAfterApproved: (firstName: string, distanceKm?: number) =>
    distanceKm === undefined ? `Shared after ${firstName} approved` : `Shared after ${firstName} approved · ${distanceKm} km`,
  // timeline rows still ahead
  onTheWay: "On the way",
  timelineDone: "Done",
};

// The index signature lets tests and tooling walk the copys by key name.
export const jobsCopys: Readonly<Record<string, string | ((...args: never[]) => string)>> & typeof copys = copys;
