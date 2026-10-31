// Spec: odd/tasks/owner-notification-test-zukki.md T2 (S5). The answer source line
// is pure logic: which line and which fix action the screen shows for an answer's
// sources. Copy fragments come from handoff-ui/owner-app/design/html/OwTestZukki.dc.html.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { testZukkiSourceLine } from "./testZukkiSourceLine.ts";

describe("testZukkiSourceLine", () => {
  it("lists the used sources with the Edit prices action", () => {
    assert.deepEqual(testZukkiSourceLine(["Visit", "Night fee", "Unclog a drain"]), {
      line: "From: Visit · Night fee · Unclog a drain",
      action: "Edit prices",
    });
  });

  it("shows Not in your services with the Add a service action when nothing was used", () => {
    assert.deepEqual(testZukkiSourceLine([]), {
      line: "Not in your services",
      action: "Add a service",
    });
  });
});
