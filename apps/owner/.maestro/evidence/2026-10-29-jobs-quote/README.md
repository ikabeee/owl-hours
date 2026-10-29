# Quote and job detail — 2026-10-29

Flows `08-chat-review-quote.yaml` and `09-chat-job-start-trip.yaml` on the iOS 27 simulator (iPhone 16, Expo Go). Full suite: 8/9 in one run; the failing flow (`03-accept-opens-chat`, known flaky since L19) passed when run alone.

| Screenshot | What it shows |
|---|---|
| `08-chat-suggestion-row.png` | "Zukki suggests sending the quote: $130–160" with "Review" above the composer |
| `08-quote-modal.png` | The quote modal: editable Visit, Night fee and Fill valve repair, "Estimated total $130–160", arrival, technician and note |
| `08-chat-after-quote.png` | "Send quote" closes the modal and returns to the chat |
| `09-job-detail.png` | "Approved by Ana at 12:07 AM", the address shared after approval, quote, arrival, timeline with pending steps, "Start trip" |
| `09-job-en-route.png` | After "Start trip": "On the way" recorded, the primary reads "I'm here" |
| `09-job-on-site.png` | After "I'm here": "Finish" disabled until the finish screen lands (T5.1) |
