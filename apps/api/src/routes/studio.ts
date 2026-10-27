// Ad studio. Job photos become ads only with explicit customer consent
// (the review-form checkbox). No consents exist in the seed, so this
// returns an empty list until the review flow lands.
import { Hono } from "hono";

export function studioRoutes(): Hono {
  const routes = new Hono();

  routes.get("/ads", (c) => c.json({ ads: [] }));

  return routes;
}
