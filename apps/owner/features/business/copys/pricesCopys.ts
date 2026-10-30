// Visible text of the prices editor. Source:
// handoff-ui/owner-app/design/html/OwPrices.dc.html. Price and fee labels come
// from the data (lib/priceFields.ts), not from here. newPriceName labels the
// name field of an added row; the handoff shows no added row, so it reuses the
// "name" of OwProfileSetup's "Business name". The glue words below are that
// file's own wording, owned here so lib/priceFields.ts holds no visible
// strings; editor wording stays byte-identical.
export const pricesCopys = {
  backLabel: "Back",
  pricesTitle: "Prices and fees",
  pricesLead: 'Zukki uses these to suggest quotes. Customers see "from" prices.',
  extraFees: "Extra fees",
  addPrice: "Add a price",
  save: "Save",
  newPriceName: "Name",
  currencySymbol: "$",
  labelFromWord: "from",
  atCost: "at cost",
} as const;
