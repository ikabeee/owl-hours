// Spec: odd/tasks/owner-onboarding.md, S2; unit T7, test file 1.
// Strings verbatim from handoff-ui/owner-app/design/html/Ow{Welcome,Intro2,Intro3}.dc.html.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { introSlides } from "./introSlides.ts";

const expectedSlides = [
  {
    title: "Hi, I'm Zukki",
    lead: "People message me on WhatsApp when they need a local business. I find them one nearby that is open, like yours.",
  },
  {
    title: "I bring you nearby requests",
    lead: "Day or night, I send you jobs in your area with the customer's photos or video. Urgent ones wait 5 minutes for you, the rest 30.",
  },
  {
    title: "You have the final word",
    lead: "I suggest replies, quotes and posts. Nothing reaches a customer or your Page until you approve it.",
  },
] as const;

describe("introSlides order and copy", () => {
  it("has three slides in order with the verbatim titles and leads", () => {
    assert.equal(introSlides.length, 3);
    for (const [index, expected] of expectedSlides.entries()) {
      assert.equal(introSlides[index]?.title, expected.title, `slide ${index + 1} title`);
      assert.equal(introSlides[index]?.lead, expected.lead, `slide ${index + 1} lead`);
    }
  });
});

describe("introSlides skip", () => {
  it("offers Skip on slides 1 and 2 only", () => {
    assert.equal(introSlides[0]?.showSkip, true);
    assert.equal(introSlides[1]?.showSkip, true);
    assert.equal(introSlides[2]?.showSkip, false);
  });
});

describe("introSlides final actions", () => {
  it("slide 3 offers Create my account and I already have an account", () => {
    assert.equal(introSlides[2]?.primaryAction, "Create my account");
    assert.equal(introSlides[2]?.secondaryAction, "I already have an account");
  });
});
