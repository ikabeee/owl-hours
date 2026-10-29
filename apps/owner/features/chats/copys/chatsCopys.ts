// Visible text of the chat screen. Sources: handoff-ui/owner-app/design/html/OwChat.dc.html,
// OwChatPolish.dc.html and HANDOFF-RN-UI.md section 8.
const copys = {
  // top bar and thread
  backLabel: "Back",
  viaZukkiWhatsApp: "via Zukki · WhatsApp",
  youAcceptedAt: "You accepted at",
  zukkiName: "Zukki",
  viewJobAndEvidence: "View job and evidence",
  // composer
  messageLabel: "Message",
  writeToPlaceholder: "Write to",
  sendLabel: "Send",
  polishSwitchLabel: "Polish with Zukki",
  // metadata under the owner bubble
  sentAsWritten: "sent as written",
  sentPolished: "Written with Zukki, approved by Northside",
  // PolishCompare
  youWrote: "You wrote",
  zukkiVersion: "Zukki's version · English, Ana's language",
  sendMine: "Send mine",
  sendZukkis: "Send Zukki's",
  // polish states
  polishing: "Polishing…",
  polishFailed: "Couldn't polish. Send yours or try again.",
  // error state, HANDOFF-RN-UI.md section 8 "Every screen also needs"
  somethingWentWrong: "Something went wrong.",
  tryAgain: "Try again",
} as const;

// The string index signature lets tests and tooling walk the copys by key name.
export const chatsCopys: Readonly<Record<string, string>> & typeof copys = copys;
