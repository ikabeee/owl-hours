import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createChunkedSecureStorage } from './ownerSecureStorage.ts';

type BackingStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const pointerKey = 'session';

function memoryBacking(): { values: Map<string, string>; store: BackingStore } {
  const values = new Map<string, string>();
  const store: BackingStore = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  };
  return { values, store };
}

function removedKeys(backing: { values: Map<string, string> }): { removed: string[]; removeItem: (key: string) => Promise<void> } {
  const removed: string[] = [];
  const removeItem = async (key: string): Promise<void> => {
    removed.push(key);
    backing.values.delete(key);
  };
  return { removed, removeItem };
}

function largeSession(tag: string): string {
  return `${tag}-${'n'.repeat(3000)}`;
}

it('S1 removes the pointer and resolves when the stored manifest is corrupt JSON', async () => {
  const backing = memoryBacking();
  backing.values.set(pointerKey, 'zukki-chunks:{not-json');
  const tracker = removedKeys(backing);
  const storage = createChunkedSecureStorage({ ...backing.store, removeItem: tracker.removeItem });

  await storage.removeItem(pointerKey);

  assert.ok(tracker.removed.includes(pointerKey));
  assert.equal(backing.values.get(pointerKey), undefined);
  assert.equal(await storage.getItem(pointerKey), null);
});

it('S1 removes the pointer and resolves when the stored manifest has an invalid shape', async () => {
  const backing = memoryBacking();
  backing.values.set(pointerKey, 'zukki-chunks:{"version":1,"generation":"!!!","count":2}');
  const tracker = removedKeys(backing);
  const storage = createChunkedSecureStorage({ ...backing.store, removeItem: tracker.removeItem });

  await storage.removeItem(pointerKey);

  assert.ok(tracker.removed.includes(pointerKey));
  assert.equal(backing.values.get(pointerKey), undefined);
  assert.equal(await storage.getItem(pointerKey), null);
});

it('S1 removes the pointer and resolves when reading the pointer rejects', async () => {
  const backing = memoryBacking();
  backing.values.set(pointerKey, 'stale-pointer');
  const tracker = removedKeys(backing);
  const storage = createChunkedSecureStorage({
    getItem: async () => {
      throw new Error('SecureStore read locked.');
    },
    setItem: backing.store.setItem,
    removeItem: tracker.removeItem,
  });

  await storage.removeItem(pointerKey);

  assert.ok(tracker.removed.includes(pointerKey));
  assert.equal(backing.values.get(pointerKey), undefined);
});

it('S2 writes the new session when the old manifest is corrupt', async () => {
  const backing = memoryBacking();
  backing.values.set(pointerKey, 'zukki-chunks:{not-json');
  const storage = createChunkedSecureStorage(backing.store);
  const next = largeSession('new-session');

  await storage.setItem(pointerKey, next);

  assert.equal(await storage.getItem(pointerKey), next);
});

it('S2 writes the new session when reading the old manifest rejects', async () => {
  const backing = memoryBacking();
  let reads = 0;
  const storage = createChunkedSecureStorage({
    ...backing.store,
    getItem: async (key: string) => {
      reads += 1;
      if (reads === 1) {
        throw new Error('SecureStore read locked.');
      }
      return backing.values.get(key) ?? null;
    },
  });
  const next = largeSession('new-session');

  await storage.setItem(pointerKey, next);

  assert.equal(await storage.getItem(pointerKey), next);
});

it('S3 resolves with the new session readable when old-chunk cleanup rejects', async () => {
  const backing = memoryBacking();
  const storage = createChunkedSecureStorage(backing.store);
  await storage.setItem(pointerKey, largeSession('old-session'));

  const cleanupFails = createChunkedSecureStorage({
    ...backing.store,
    removeItem: async (key: string) => {
      if (key !== pointerKey) {
        throw new Error('SecureStore chunk locked.');
      }
      backing.values.delete(key);
    },
  });
  const next = largeSession('new-session');

  await cleanupFails.setItem(pointerKey, next);

  assert.equal(await cleanupFails.getItem(pointerKey), next);
});

it('REG preserves the last complete session when the replacement write fails', async () => {
  const backing = memoryBacking();
  let writesFail = false;
  const storage = createChunkedSecureStorage({
    ...backing.store,
    setItem: async (key: string, value: string) => {
      if (writesFail) {
        throw new Error('SecureStore write locked.');
      }
      backing.values.set(key, value);
    },
  });
  await storage.setItem(pointerKey, largeSession('old-session'));

  writesFail = true;
  await assert.rejects(storage.setItem(pointerKey, largeSession('new-session')), /secure session/i);
  writesFail = false;

  assert.equal(await storage.getItem(pointerKey), largeSession('old-session'));
});
