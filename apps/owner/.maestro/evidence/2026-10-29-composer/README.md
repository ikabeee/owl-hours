# Chat composer redesign — 2026-10-29

iOS 27 simulator (iPhone 16, Expo Go). WhatsApp-style composer: an Astryx
`InputGroup` pill (Zukki owl toggle + message field) and a round Send outside it.

| Screenshot | State |
|---|---|
| `1-zukki-off.png` | Polish off: grey owl; Send delivers the text as written |
| `2-zukki-on.png` | Polish on: owl in color; Send polishes first |
| `3-zukki-polishing.png` | Zukki working: running owl, "Polishing…" in the field |
| `4-compare.png` | "You wrote" vs "Zukki's version", Send mine / Send Zukki's |

The polishing frame was captured with the fake polish delayed for the screenshot only.
