# E2E evidence — 2026-10-29

Maestro run of every flow in `apps/owner/.maestro/` on the iOS 27 simulator
(iPhone 16, Expo Go, Metro dev server). Result: **6/6 flows passed** (commit `2aa92cc`).

| Screenshot | Flow | What it shows |
|---|---|---|
| `01-requests-tab.png` | 01 Tab shell | App opens on Requests (tab placeholder) with the five-tab bar |
| `01-chats-tab.png` | 01 Tab shell | Chats tab selected (list placeholder) |
| `02-request-req_ana.png` | 02 Request detail | Ana's urgent request: countdown, owl, Decline / Accept and chat |
| `03-chat-after-accept.png` | 03 Accept opens chat | Accept and chat lands on Ana's conversation, full width |
| `04-chat-option-a-sent.png` | 04 Option A | Owner text sent as written, labelled "sent as written" |
| `05-chat-option-b-compare.png` | 05 Option B | Polish on: "You wrote" vs "Zukki's version", Send mine / Send Zukki's |
| `05-chat-option-b-sent.png` | 05 Option B | Zukki's version sent, labelled "Written with Zukki, approved by Northside" |
| `06-after-decline.png` | 06 Decline | Decline returns to the requests tab |

Known harness quirk: XCUITest typing into the WebView occasionally drops the
last character (`04` shows "12:5"); the flow asserts the delivery label, not the text.

Reproduce: start Metro (`npx expo start --ios` in `apps/owner`), then
`JAVA_HOME=$(brew --prefix openjdk@17) maestro test .maestro --test-output-dir <dir>`.
