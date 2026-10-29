import type { ExtraFee, Money, PriceItem } from "../../../shared/data/types.ts";
import { pricesCopys } from "../copys/pricesCopys.ts";

// Field wording of the OwPrices editor. Copy:
// handoff-ui/owner-app/design/html/OwPrices.dc.html ("Leak repair, from" /
// "$60", "Night, 10 PM–7 AM" / "+$25", "Parts" / "at cost"). The glue words
// live in copys/pricesCopys.ts (pattern: features/requests/lib/mediaAltText.ts),
// so this module holds no visible strings.
export function priceLabelText(price: PriceItem): string {
  return price.from ? `${price.label}, ${pricesCopys.labelFromWord}` : price.label;
}

// The single amount formatter of the slice: business rows and the editor show
// amounts through here, so the currency symbol lives in one copys entry.
export function priceAmountText(amount: Money): string {
  return `${pricesCopys.currencySymbol}${amount}`;
}

export function feeLabelText(fee: ExtraFee): string {
  return fee.window ? `${fee.label}, ${fee.window}` : fee.label;
}

export function feeAmountText(fee: ExtraFee): string {
  return fee.amount === "at_cost" ? pricesCopys.atCost : `+${priceAmountText(fee.amount)}`;
}
