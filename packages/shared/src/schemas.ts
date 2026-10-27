// Zod schemas for Zukki tickets and quotes (handoff section 6).
// Quotes are ranges: totals always equal the sum of their lines, so the
// demo numbers stay consistent everywhere ($45 + $25 + $60-90 = $130-160).
import { z } from "zod";

export const priceRuleSchema = z
  .object({
    item: z.string().min(1),
    kind: z.enum(["callout", "night_fee", "repair_range"]),
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
  })
  .refine((rule) => rule.min <= rule.max, { message: "rule min must be <= max" });

export const quoteLineSchema = z
  .object({
    label: z.string().min(1),
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
  })
  .refine((line) => line.min <= line.max, { message: "line min must be <= max" });

export const quoteSchema = z
  .object({
    lines: z.array(quoteLineSchema).min(1),
    total_min: z.number().int().nonnegative(),
    total_max: z.number().int().nonnegative(),
    excludes: z.string().min(1),
  })
  .refine((quote) => quote.total_min === sum(quote.lines, "min"), {
    message: "total_min must equal the sum of line minimums",
  })
  .refine((quote) => quote.total_max === sum(quote.lines, "max"), {
    message: "total_max must equal the sum of line maximums",
  });

export const ticketSchema = z.object({
  category: z.string().min(1),
  title: z.string().min(1),
  urgency: z.enum(["now", "today", "week"]),
  safety: z.object({
    water_flowing: z.boolean(),
    cables_near_water: z.boolean(),
    valve_closed: z.boolean(),
  }),
  diagnosis: z.string().min(1),
  likely_part: z.string().min(1),
  quote: quoteSchema,
  arrival_window: z.string().min(1),
});

export type PriceRule = z.infer<typeof priceRuleSchema>;
export type QuoteLine = z.infer<typeof quoteLineSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type Ticket = z.infer<typeof ticketSchema>;

function sum(lines: QuoteLine[], key: "min" | "max"): number {
  return lines.reduce((total, line) => total + line[key], 0);
}
