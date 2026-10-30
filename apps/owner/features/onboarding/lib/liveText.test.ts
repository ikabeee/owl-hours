// Regression: the composed live sentences render the verbatim handoff copy for the demo
// business (OwLive.dc.html), and stay dynamic for anything the owner enters.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { business } from "../../../shared/data/mock.ts";
import { onboardingCopys } from "../copys/onboardingCopys.ts";
import { liveSubtitleFor, liveTitleFor } from "./liveText.ts";

describe("liveTitleFor", () => {
  it("renders the verbatim handoff title for the demo business", () => {
    assert.equal(liveTitleFor(business.name), onboardingCopys.liveTitle);
    assert.equal(liveTitleFor(business.name), "Northside is live on Zukki");
  });

  it("uses the first word of a renamed business", () => {
    assert.equal(liveTitleFor("Eastside Repairs"), "Eastside is live on Zukki");
  });
});

describe("liveSubtitleFor", () => {
  it("renders the verbatim handoff subtitle for the demo business and radius", () => {
    assert.equal(
      liveSubtitleFor(business.category, business.area.radiusKm),
      "Zukki can now suggest you for plumbing requests within 5 km.",
    );
  });

  it("follows the entered category and radius", () => {
    assert.equal(
      liveSubtitleFor("Plumbing", 8),
      "Zukki can now suggest you for plumbing requests within 8 km.",
    );
  });
});
