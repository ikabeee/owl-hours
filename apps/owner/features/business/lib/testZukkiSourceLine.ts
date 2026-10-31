import { testZukkiCopys } from "../copys/testZukkiCopys.ts";

// Which line and fix action an answer shows: the used sources with
// "Edit prices", or "Not in your services" with "Add a service".
export type TestZukkiSourceLine = { line: string; action: string };

export function testZukkiSourceLine(sources: string[]): TestZukkiSourceLine {
  if (sources.length === 0) return { line: testZukkiCopys.notInServices, action: testZukkiCopys.addService };

  return { line: `${testZukkiCopys.sourcePrefix}${sources.join(" · ")}`, action: testZukkiCopys.editPrices };
}
