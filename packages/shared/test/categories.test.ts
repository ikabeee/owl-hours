// The category list must match payload 02's rows exactly.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CATEGORIES, categoryFromListReply, isCategory } from "../src/categories.ts";

type ListPayload = { interactive: { action: { sections: { rows: { id: string }[] }[] } } };

describe("categories", () => {
  it("covers every row of the payload 02 list", async () => {
    const url = new URL("../../../handoff-ui/whatsapp/payloads/02-what-are-you-looking-for.json", import.meta.url);
    const payload = JSON.parse(await readFile(url, "utf8")) as ListPayload;
    const ids = payload.interactive.action.sections.flatMap((section) => section.rows.map((row) => row.id));
    assert.deepEqual(ids.filter((id) => id !== "cat_other").sort(), CATEGORIES.map((c) => `cat_${c}`).sort());
    for (const id of ids) {
      assert.notEqual(categoryFromListReply(id), null, id);
    }
  });

  it("maps list replies to directory categories", () => {
    assert.equal(categoryFromListReply("cat_plumbing"), "plumbing");
    assert.equal(categoryFromListReply("cat_other"), "other");
    assert.equal(categoryFromListReply("cat_weapons"), null);
    assert.equal(categoryFromListReply("plumbing"), null);
  });

  it("only accepts known categories, matching the database pattern", () => {
    assert.equal(isCategory("food"), true);
    assert.equal(isCategory("other"), false);
    for (const category of CATEGORIES) {
      assert.match(category, /^[a-z_]{2,32}$/);
    }
  });
});
