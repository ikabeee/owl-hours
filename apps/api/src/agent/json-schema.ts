// Minimal zod -> JSON Schema for Spark tool parameters. Covers the shapes
// used in tools.ts; anything else fails loudly so a new tool can't ship a
// silently wrong schema.
import { z } from "zod";

export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const base = convert(schema);
  return schema.description ? { ...base, description: schema.description } : base;
}

function convert(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const keys = Object.keys(shape);
    return {
      type: "object",
      properties: Object.fromEntries(keys.map((key) => [key, zodToJsonSchema(shape[key] as z.ZodTypeAny)])),
      required: keys.filter((key) => !(shape[key] instanceof z.ZodOptional)),
      additionalProperties: false,
    };
  }
  if (schema instanceof z.ZodString) return schema.isUUID ? { type: "string", format: "uuid" } : { type: "string" };
  if (schema instanceof z.ZodNumber) return { type: schema.isInt ? "integer" : "number" };
  // .refine() wraps a schema; the model sees the shape, our code checks the rule.
  if (schema instanceof z.ZodEffects) return zodToJsonSchema(schema.innerType());
  if (schema instanceof z.ZodBoolean) return { type: "boolean" };
  if (schema instanceof z.ZodEnum) return { type: "string", enum: [...schema.options] };
  if (schema instanceof z.ZodArray) return { type: "array", items: zodToJsonSchema(schema.element) };
  if (schema instanceof z.ZodRecord) return { type: "object", additionalProperties: zodToJsonSchema(schema.valueSchema) };
  if (schema instanceof z.ZodOptional) return zodToJsonSchema(schema.unwrap());
  if (schema instanceof z.ZodNullable) return { anyOf: [zodToJsonSchema(schema.unwrap()), { type: "null" }] };
  if (schema instanceof z.ZodUnknown || schema instanceof z.ZodAny) return {};
  throw new Error(`zodToJsonSchema: unsupported type ${(schema._def as { typeName?: string }).typeName ?? "unknown"}`);
}
