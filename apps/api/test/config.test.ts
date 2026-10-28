// Startup config: fail fast on missing settings without echoing secrets.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.ts";

describe("loadConfig", () => {
  it("reads the required settings", () => {
    const config = loadConfig({
      META_MODEL_API_KEY: "meta-test",
      SUPABASE_URL: "https://abc.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key-0123456789",
      SUPABASE_ANON_KEY: "anon-test-key-0123456789-0123456789",
      ZUKKI_SERVER_KEY: "server-key-0123456789-0123456789-0123",
    });
    assert.equal(config.supabaseUrl, "https://abc.supabase.co");
    assert.equal(config.serverKey, "server-key-0123456789-0123456789-0123");
  });

  it("names what is missing or invalid but never prints values", () => {
    assert.throws(
      () => loadConfig({ SUPABASE_URL: "not a url", SUPABASE_SERVICE_ROLE_KEY: "short-secret" }),
      (error: unknown) => {
        const message = String(error);
        assert.match(message, /META_MODEL_API_KEY/);
        assert.match(message, /SUPABASE_URL/);
        assert.match(message, /SUPABASE_SERVICE_ROLE_KEY/);
        assert.match(message, /ZUKKI_SERVER_KEY/);
        assert.doesNotMatch(message, /short-secret|not a url/);
        return true;
      },
    );
  });
});
