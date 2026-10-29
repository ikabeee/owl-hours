// Spec: odd/tasks/owner-content.md, S5 requirement.
// Service and fake adapter for linked social accounts.
import { accounts as mockAccounts } from "../../../shared/data/mock.ts";
import type { LinkedAccount } from "../../../shared/data/types.ts";

export type AccountsClient = {
  listAccounts(): Promise<LinkedAccount[]>;
};

export type AccountsService = {
  getAccounts(): Promise<LinkedAccount[]>;
};

export function createAccountsService(client: AccountsClient): AccountsService {
  return {
    getAccounts: () => client.listAccounts(),
  };
}

export function createFakeAccountsClient(): AccountsClient {
  const accounts = structuredClone(mockAccounts);

  return {
    listAccounts: async () => structuredClone(accounts),
  };
}
