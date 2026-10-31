// Review follow-up: an id equal to an inherited Object property must not resolve to a frame.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mediaFrameSource } from "./mediaFrameSource.ts";

describe("mediaFrameSource with inherited property names", () => {
  for (const id of ["constructor", "toString", "__proto__"]) {
    it(`returns null for "${id}"`, () => {
      assert.equal(mediaFrameSource(id, { "bath-leak": "data:image/svg+xml;base64,AAA" }), null);
    });
  }
});
