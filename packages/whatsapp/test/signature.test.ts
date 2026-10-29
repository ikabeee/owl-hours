import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifySignature } from "../src/index.ts";

const SECRET = "test-app-secret";
const BODY = '{"object":"whatsapp_business_account","entry":[]}';
const sign = (body: string, secret = SECRET) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

describe("verifySignature", () => {
  it("accepts Meta's signature over the raw body", () => {
    assert.equal(verifySignature(SECRET, BODY, sign(BODY)), true);
    assert.equal(verifySignature(SECRET, BODY, sign(BODY).toUpperCase().replace("SHA256", "sha256")), true);
  });

  it("rejects a changed body, another secret, or a missing header", () => {
    assert.equal(verifySignature(SECRET, `${BODY} `, sign(BODY)), false);
    assert.equal(verifySignature(SECRET, BODY, sign(BODY, "other")), false);
    assert.equal(verifySignature(SECRET, BODY, undefined), false);
    assert.equal(verifySignature(SECRET, BODY, "sha1=abc"), false);
    assert.equal(verifySignature("", BODY, sign(BODY, "")), false);
  });
});
