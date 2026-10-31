import { Hono } from "hono";
import { z } from "zod";
import type { OwnerEnv } from "../http/auth.ts";
import { ok, readId, readJson } from "../http/respond.ts";
import { assignContentPhotos, listContentPhotoJobs } from "../services/owner-content-photos.ts";

const assignment = z.object({
  beforeMediaId: z.string().uuid(),
  afterMediaId: z.string().uuid(),
}).strict().refine((input) => input.beforeMediaId !== input.afterMediaId, "Choose distinct before and after photos.");

// Mounted inside ownerRoutes, after its owner-auth and rate-limit middleware.
export function ownerContentPhotoRoutes(): Hono<OwnerEnv> {
  const app = new Hono<OwnerEnv>();
  app.get("/", async (c) => ok(c, await listContentPhotoJobs(c.get("session"))));
  app.post("/:id/assign", async (c) => {
    const jobId = readId(c);
    const body = await readJson(c, assignment);
    return ok(c, await assignContentPhotos(c.get("session"), jobId, body.beforeMediaId, body.afterMediaId));
  });
  return app;
}
