// Regression: price and fee rows render the OwPricesSetup.dc.html layouts from demo data.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { business } from "../../../shared/data/mock.ts";
import { feeAmountText, feeLabelText, priceAmountText, radiusText } from "./priceText.ts";

describe("priceAmountText", () => {
  it("renders flat and from-prices", () => {
    assert.equal(priceAmountText({ amount: 45, from: false }), "$45");
    assert.equal(priceAmountText({ amount: 60, from: true }), "from $60");
  });

  it("renders every demo price without inventing copy", () => {
    assert.deepEqual(business.prices.map(priceAmountText), ["$45", "from $60", "from $80", "from $350"]);
  });
});

describe("fee rows", () => {
  it("renders the demo fee labels and amounts", () => {
    assert.deepEqual(business.fees.map(feeLabelText), ["Night, 10 PM–7 AM", "Weekend", "Parts"]);
    assert.deepEqual(business.fees.map(feeAmountText), ["+$25", "+$15", "at cost"]);
  });
});

describe("radiusText", () => {
  it("renders the radius with its unit", () => {
    assert.equal(radiusText(5), "5 km");
  });
});
