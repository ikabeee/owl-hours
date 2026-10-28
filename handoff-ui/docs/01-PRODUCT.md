# Product: Zukki

## The idea

Zukki is an AI assistant on WhatsApp that finds you a local business that is open and nearby, and connects you with it: plumbers, electricians, restaurants, salons, mechanics, any category. You send it a photo, a video, a voice note or a text. The pitch uses one story, an urgent home repair, because it shows every part of the product.
1. It tells you what to do right now to stop the damage.
2. It picks one nearby business that is available, and asks you before connecting.
3. Once the owner accepts, you keep talking in the same chat, now with the business.

For businesses, Zukki is a free stream of nearby requests, a chat they answer from one app, and an assistant that drafts their social media posts.

**Demo story:**
- At 12:04 AM, Ana's toilet won't stop running and water is reaching the hallway. She sends Zukki a 14-second video and a voice note.
- Zukki shows her which valve to close on a frame of her own video.
- It then suggests Northside Plumbing: open now, 1.2 km away, visit $45 + night fee $25.
- She taps **Connect me**. Northside's owner gets a notification with the video and accepts within the 5-minute window, then writes to Ana from the app.
- Mario fixes the leak. The next morning, Zukki drafts a before/after post, and the owner approves it.

**Origin:** Crystal (team lead) lived this: a leaking toilet at midnight, and no business answering.

## Who it is for

- **Customers, 25–50 years old.** Stressed, often at night. They already use WhatsApp and will not install an app.
- **Business owners, 25–50 years old.** Often on the road. They need to decide fast and answer from their phone.

## Three scenarios

1. **Zukki finds a business (the demo).** Request → safety help → one suggested business → customer connects → owner accepts in time (5 min if urgent, 30 min otherwise) → owner chats from the app.
2. **Multitenant platform.** Every business has its own profile, prices, extra fees, hours, service area and website. They all share Zukki's WhatsApp number, and each one sees only its own chats.
3. **Marketing content.** The owner links their Facebook Page and Instagram professional account. Zukki drafts posts (text + image), and the flow is review → approve → publish. No paid ads.

## Owner messages: two options

- **A · as written.** The customer receives the owner's text exactly, signed with the business name.
- **B · polished by Zukki.** The owner turns on "Polish with Zukki", sees both versions and picks one. The customer receives it as a WhatsApp interactive message with the footer "Written with Zukki, approved by Northside" and two reply buttons, Sounds good and Ask a question.

Both are designed in the canvas, side by side.

## Why it is not another PRO360 or Thumbtack

- **No auction.** Zukki suggests one business; nobody competes on price in front of the customer.
- **Safety first.** Before any business is involved, Zukki helps stop the damage, using the customer's own video.
- **The owner stays in control.** The owner accepts each request, writes in their own words (or approves Zukki's), and approves every post.

## How each Meta model is used

| Model | Role |
|---|---|
| Muse Voice Transcribe | Customer voice notes; owner hold-to-talk (realtime) |
| SAM 3.1 | Finds the shut-off valve for the marked frame; tracks the water as an urgency signal |
| Muse Spark 1.3 | Understands frames + transcript + signals; safety questions; picks the business through tools; summarizes for the owner; polishes owner messages; writes captions |
| Muse Image | Post images from consented job photos |

## Scope for 9 days

- **Must:** scenario 1 end to end, with option A.
- **Should:** option B, timeout → next business, "another option", business profile, **Test Zukki**.
- **Could:** approve and publish one organic post to the team's test Page.
- **Pitch only:** technician tracking, receipts and reviews.

## Decisions (Oct 27): the alternative model we did not take

The team reviewed another model: Zukki only does discovery, shows several businesses, and sends the customer to each business's own WhatsApp number and assistant. **We kept the current model.**

| Topic | Decision |
|---|---|
| WhatsApp numbers | One number, Zukki's, for everyone |
| Results | Zukki suggests **one** business; the customer taps Connect me |
| Safety step and location request | Kept |
| Owner acceptance | Required. **5 min for urgent requests, 30 min for the rest**, then the next business |
| Conversation | Same chat: the owner writes from the app, Zukki can polish (option A/B), the customer types "Zukki" to come back |
| Human | Always the business owner |
| Quote | Interactive message in the chat; jobs and quotes stay in the app |
| Agents | Zukki is the only agent; no per-business assistants |
| New | **Test Zukki:** the owner asks like a customer and sees what Zukki would answer with their profile, prices and hours |
| Marketing | Zukki proposes drafts (text + image); review → approve → publish to the Facebook Page and Instagram professional account; no paid ads |

## Risks

- **It is close to a marketplace again.** Say clearly in the pitch: one business, no bidding.
- **The owner doesn't answer.** The grace period and fallback to the next business cover this; the demo should show it once.
- **Quote accuracy.** Quotes are ranges, exclude damage, and need the owner's confirmation.
- **Impact needs a number.** Find a real statistic on missed after-hours requests before the pitch.
- **Meta permissions.** Publishing works in development mode on our own Page and Instagram professional account. Paid ads are out of scope.

## Team

- **Crystal** (Taipei): lead, story and pitch.
- **Oscar:** onboarding and content studio.
- **Nairobi and India teammates:** to be assigned.
- **Jorge** (Cancún): design and architecture.
