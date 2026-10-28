// The customer-facing copy must match the WhatsApp payloads in
// handoff-ui/whatsapp/payloads, which the WhatsApp integration sends.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AI_DISCLOSURE, CUSTOMER_SYSTEM_PROMPT, OFF_TOPIC_REPLY, nextSafetyQuestion } from "../src/agent/customer-agent.ts";

async function payloadBody(file: string): Promise<string> {
  const url = new URL(`../../../handoff-ui/whatsapp/payloads/${file}`, import.meta.url);
  const payload = JSON.parse(await readFile(url, "utf8")) as { text: { body: string } };
  return payload.text.body;
}

describe("customer agent copy", () => {
  it("discloses the AI with the exact payload 01 text", async () => {
    assert.equal(AI_DISCLOSURE, await payloadBody("01-disclosure.json"));
  });

  it("uses the exact payload 14 text for off-topic messages", async () => {
    assert.equal(OFF_TOPIC_REPLY, await payloadBody("14-off-topic.json"));
    assert.ok(CUSTOMER_SYSTEM_PROMPT.includes(OFF_TOPIC_REPLY));
  });

  it("leaves the disclosure to our code, not the model", () => {
    assert.ok(!CUSTOMER_SYSTEM_PROMPT.includes(AI_DISCLOSURE));
    assert.match(CUSTOMER_SYSTEM_PROMPT, /already been sent/);
  });

  it("presents Zukki as a directory, not one business's assistant", () => {
    assert.match(CUSTOMER_SYSTEM_PROMPT, /^You are Zukki/);
    assert.doesNotMatch(CUSTOMER_SYSTEM_PROMPT, /assistant for a small local plumbing business/);
  });

  it("never says a job is booked", () => {
    assert.match(CUSTOMER_SYSTEM_PROMPT, /Never say a job is booked/);
  });
});

describe("nextSafetyQuestion", () => {
  it("asks one safety question at a time, then stops", () => {
    assert.match(nextSafetyQuestion({ water_flowing: null, cables_near_water: null, valve_closed: null }) ?? "", /water/);
    assert.match(nextSafetyQuestion({ water_flowing: true, cables_near_water: null, valve_closed: null }) ?? "", /cables/);
    assert.match(nextSafetyQuestion({ water_flowing: true, cables_near_water: false, valve_closed: null }) ?? "", /valve/);
    assert.equal(nextSafetyQuestion({ water_flowing: true, cables_near_water: false, valve_closed: true }), null);
  });
});
