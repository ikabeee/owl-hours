// Regression: the OwPrices editor field wording. Copy: OwPrices.dc.html.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { business } from "../../../shared/data/mock.ts";
import { feeAmountText, feeLabelText, priceAmountText, priceLabelText } from "./priceFields.ts";

describe("priceFields", () => {
  it("labels a flat price without suffix", () => {
    const [visit] = business.prices;
    assert.equal(priceLabelText(visit), "Visit");
    assert.equal(priceAmountText(visit.amount), "$45");
  });

  it('labels a from-price with ", from"', () => {
    const [, leak] = business.prices;
    assert.equal(priceLabelText(leak), "Leak repair, from");
    assert.equal(priceAmountText(leak.amount), "$60");
  });

  it("formats any amount through the single amount formatter", () => {
    assert.equal(priceAmountText(80), "$80");
    assert.equal(priceAmountText(350), "$350");
  });

  it("labels a timed fee with its window", () => {
    const [night] = business.fees;
    assert.equal(feeLabelText(night), "Night, 10 PM–7 AM");
    assert.equal(feeAmountText(night), "+$25");
  });

  it("labels parts at cost", () => {
    const [, , parts] = business.fees;
    assert.equal(feeLabelText(parts), "Parts");
    assert.equal(feeAmountText(parts), "at cost");
  });
});
