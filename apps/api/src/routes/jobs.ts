// Example feature: tonight's jobs and the confirmation flow.
// GET /jobs lists the demo jobs; POST /jobs/:id/propose validates the
// transition through @owl-hours/shared, so the model can propose but the
// actor rules in code decide.
import { Hono } from "hono";
import { z } from "zod";
import { InvalidTransitionError, JOB_STATES } from "@owl-hours/shared";
import type { Store } from "../store.ts";

const proposeBody = z.object({
  to: z.enum(JOB_STATES),
  actor: z.enum(["agent", "owner", "customer", "system"]),
  reason: z.string().min(1),
});

export function jobsRoutes(store: Store): Hono {
  const routes = new Hono();

  routes.get("/", (c) => c.json({ jobs: store.listJobs() }));

  routes.get("/:id", (c) => {
    const job = store.getJob(c.req.param("id"));
    return job ? c.json({ job }) : c.json({ error: "not found" }, 404);
  });

  routes.post("/:id/propose", async (c) => {
    const parsed = proposeBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "invalid body" }, 400);
    }
    try {
      const job = store.propose(c.req.param("id"), parsed.data.to, parsed.data.actor, parsed.data.reason);
      return c.json({ job });
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        return c.json({ error: error.message }, 409);
      }
      return c.json({ error: "not found" }, 404);
    }
  });

  return routes;
}
