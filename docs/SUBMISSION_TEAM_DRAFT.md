# Zukki submission: team review draft

Draft for the three required submission fields. Please verify details together before submission. This document distinguishes the materials shown in the video from features in the repository.

## 1. Project Description

Zukki is a night-shift assistant for local-service businesses, starting with plumbing emergencies. Inspired by a real experience of being unable to find a plumber late at night in Taipei, it helps customers describe an urgent problem and helps a business owner review the request.

A customer can communicate through WhatsApp using text or media. Zukki gathers the relevant details, provides safety guidance and helps match the customer with a business. The owner reviews the request in the owner app, decides whether to accept it, and can communicate with the customer and prepare a quote. The customer and owner remain responsible for confirming the work.

The owner experience also includes a Story Pack concept: with customer consent, the business can prepare a story from a completed job for review. Our owner preview uses fictional data and does not publish a post.

The demo combines distinct materials: an actual WhatsApp conversation recorded on a teammate's test account, a local end-to-end flow using a simulated WhatsApp customer and recorded model responses, and an owner-side preview with fictional data. These are separate demonstration cases, not one continuous live transaction.

Demo video:

- [Loom (recommended)](https://www.loom.com/share/61230607e154471ab9fb758fcb73b38d)
- [YouTube (backup, unlisted)](https://youtu.be/YWQmSCl_Huw)

Owner-side live preview: https://zukki-community-vote-demo.onrender.com/requests

This preview uses fictional data; it does not send customer messages or publish social posts. It is a separate demonstration from the local judge flow.

## 2. Describe your use of Meta products to build the submitted project

Zukki is designed around WhatsApp Cloud API for customer communication. The backend implements WhatsApp webhook handling and message delivery. The owner app is separate from the customer's WhatsApp conversation.

The code integrates Meta Model API models for multimodal understanding. Muse Spark 1.3 processes customer requests and visual evidence, helps produce structured triage and safety guidance, and identifies candidate valve locations. SAM 3.1 is used to segment a candidate valve so the application can mark the customer's supplied image or a video frame. The repository also contains a voice transcription integration; the submitted recorded demo does not show a voice note.

The judge's no-key local demo uses recorded Spark and SAM outputs rather than live model calls, and its customer-facing chat is simulated. The real WhatsApp footage and the static owner preview demonstrate separate parts of the experience. Facebook and Instagram publishing is not shown as a live post in our submitted demo.

## 3. Why are Meta's models important to your solution?

When water is leaking, a customer may not know the technical name of a part or how to describe what is wrong. Multimodal understanding can help turn a photo or short video into a structured request and practical safety guidance. Spark helps interpret the situation; SAM provides visual localization so a suggested valve can be marked on the customer's original image.

This makes it easier to give a business owner useful context before they decide whether to accept the job. The application uses ordinary code and the owner's saved rules for suggested pricing; the model does not set the price. The owner reviews the request and quote, and the customer approves the visit. Model guidance can be wrong, so original evidence and human review matter.

## Team verification before submission

- Confirm which exact Meta model names and features are in the submitted version, and distinguish implemented integrations from what the video actually shows.
- Confirm the public repository URL, demo video URL and the no-key setup instructions.
- The Taipei Murphy Plumbing seed and interactive customer simulator are described in open PR #127; do not claim they are merged into main without rechecking.
- The owner preview and the local replay use different fictional cases. Social publishing is not demonstrated as a live post.
- Check whether the sample leak video is synthetic and ensure the final description and video use matching disclosure.
- Proposed business model (0.5–1% of transaction value and $1/month business subscription) is a future concept, not a live payment feature.

Sources: [Local demo instructions](https://github.com/ikabeee/owl-hours/blob/main/docs/USAGE.md), [Spark implementation](https://github.com/ikabeee/owl-hours/blob/main/packages/meta-models/src/spark.ts), [quote calculation](https://github.com/ikabeee/owl-hours/blob/main/apps/api/src/services/suggested-quote.ts), [PR #127](https://github.com/ikabeee/owl-hours/pull/127).
