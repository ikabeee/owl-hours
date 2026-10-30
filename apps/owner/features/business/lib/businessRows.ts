import type { Business, ExtraFee, PriceItem } from "../../../shared/data/types.ts";
import { businessCopys } from "../copys/businessCopys.ts";
import { priceAmountText } from "./priceFields.ts";

// Feature-local demo values. The service area label and the imported-services
// count are not in shared/data/mock.ts, so the fake client seeds them here
// (operator decision, odd/tasks/owner-business.md L2).
export type BusinessDemo = { areaLabel: string; importedServices: number };

export const BUSINESS_DEMO: BusinessDemo = { areaLabel: "Northside", importedServices: 12 };

// Every value the OwBusiness rows show, derived from the demo business.
// Copy: handoff-ui/owner-app/design/html/OwBusiness.dc.html; the hours suffix
// and the "from"/"at cost" words are that file's own wording. The glue words
// live in copys/businessCopys.ts (pattern:
// features/requests/lib/mediaAltText.ts), so this module holds no visible
// strings and the rows stay byte-identical.
export type BusinessRowValues = {
  profile: string;
  prices: string;
  extraFees: string;
  hours: string;
  serviceArea: string;
  website: string;
};

export function businessRows(business: Business, demo: BusinessDemo = BUSINESS_DEMO): BusinessRowValues {
  return {
    profile: profileText(business),
    prices: business.prices.slice(0, 3).map(priceText).join(" · "),
    extraFees: business.fees.map(feeText).join(" · "),
    hours: hoursText(business),
    serviceArea: `${business.area.radiusKm} ${businessCopys.areaAround} ${demo.areaLabel}`,
    website: websiteText(business, demo.importedServices),
  };
}

function profileText(business: Business): string {
  return `${tradeName(business.category)} · ${business.rating.value} ${businessCopys.ratingWord} · ${business.technicians} ${businessCopys.techniciansWord}`;
}

// The demo category "plumbing" reads "Plumber" in the design; anything else
// falls back to a capitalized category.
const TRADE_NAMES: Record<string, string> = { plumbing: businessCopys.tradePlumber };

function tradeName(category: string): string {
  return TRADE_NAMES[category] ?? (category.charAt(0).toUpperCase() + category.slice(1));
}

function priceText(price: PriceItem): string {
  return `${price.label}${price.from ? ` ${businessCopys.fromWord}` : ""} ${priceAmountText(price.amount)}`;
}

function feeText(fee: ExtraFee): string {
  if (fee.amount === "at_cost") return `${fee.label} ${businessCopys.atCost}`;
  return `${fee.label}${fee.window ? ` ${fee.window}` : ""} +${priceAmountText(fee.amount)}`;
}

function hoursText(business: Business): string {
  if (!business.hours.nightUrgent) return business.hours.summary;
  return `${business.hours.summary} · ${businessCopys.nightUrgent}`;
}

function websiteText(business: Business, importedServices: number): string {
  const imported = `${importedServices} ${businessCopys.servicesImported}`;
  return business.website ? `${business.website} · ${imported}` : imported;
}
