# Zukki demo screens

The 10 screens of the demo, in order, as the pitch shows them.

| # | Who | Screen | Time |
|---|---|---|---|
| 01 | Customer (WhatsApp) | Sends a 14 s video and a voice note; Zukki says it's an AI and marks the valve | 0:15 |
| 02 | Customer (WhatsApp) | Zukki asks for the location (location request); she taps Send location | 0:30 |
| 03 | Customer (WhatsApp) | Zukki suggests one business, Northside (interactive message) | 0:40 |
| 04 | Owner (app) | Lock-screen notification | 0:55 |
| 05 | Owner (app) | Request detail, 4:32 left, Accept and chat | 1:00 |
| 06 | Owner (app) | Owner's text + Zukki's polished version; picks Zukki's | 1:15 |
| 07 | Customer (WhatsApp) | Receives it: bold business line, footer "Written with Zukki, approved by Northside" | 1:30 |
| 08 | Owner (app) | Quote filled in from the owner's prices | 1:45 |
| 09 | Customer (WhatsApp) | Quote as an interactive message; Approve visit | 1:55 |
| 10 | Owner (app) | Next morning: approves a before/after post | 2:05 |

## Folders

- `png/`: each screen at 2× (780×1688), for slides and video editing.
- `html/`: the same screens as a click-through. Open `html/index.html` in a browser.
- `extras/png/`: optional screens:
  - A: the business doesn't answer in 5 minutes, so Zukki offers the next one.
  - B: first contact without media, where Zukki sends a list message.
  - C: the list WhatsApp opens.

Every WhatsApp screen uses only message types the WhatsApp Cloud API can send: text, media, reply buttons, list, and location request.
