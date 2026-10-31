// Spec: odd/tasks/owner-content.md, S5 requirement.
// Service tests for linked social accounts: Facebook Page and Instagram both connected.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { accounts as mockAccounts } from "../../../shared/data/mock.ts";
import { createAccountsService, createFakeAccountsClient } from "./accountsService.ts";

function buildService() {
  return createAccountsService(createFakeAccountsClient());
}

describe("accountsService.getAccounts", () => {
  it("returns two accounts, both connected", async () => {
    const service = buildService();
    const accounts = await service.getAccounts();

    assert.equal(accounts.length, 2);
    assert.equal(
      accounts.every((account) => account.status === "connected"),
      true,
    );
  });

  it("includes Facebook Page as connected", async () => {
    const service = buildService();
    const accounts = await service.getAccounts();
    const facebook = accounts.find((a) => a.kind === "facebook_page");

    assert.notEqual(facebook, undefined);
    assert.equal(facebook?.status, "connected");
  });

  it("includes Instagram professional account as connected", async () => {
    const service = buildService();
    const accounts = await service.getAccounts();
    const instagram = accounts.find((a) => a.kind === "instagram");

    assert.notEqual(instagram, undefined);
    assert.equal(instagram?.name, "@northsideplumbing (professional)");
    assert.equal(instagram?.status, "connected");
  });
});

describe("accountsService isolation", () => {
  it("does not mutate the shared mock accounts", async () => {
    const snapshot = structuredClone(mockAccounts);
    const service = buildService();
    await service.getAccounts();

    assert.deepEqual(mockAccounts, snapshot);
  });
});
