type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
type Manifest = { version: 1; generation: string; count: number };
const prefix = 'zukki-chunks:';

// All chunks remain encrypted in SecureStore. Publish the manifest only after every
// write succeeds; old sessions survive a rejected replacement without partial reads.
export function createChunkedSecureStorage(store: Storage): Storage {
  const pending = new Map<string, Promise<unknown>>();
  return {
    getItem: key => serial(pending, key, () => readStoredValue(store, key)),
    setItem: (key, value) => serial(pending, key, () => writeStoredValue(store, key, value)),
    removeItem: key => serial(pending, key, () => removeStoredValue(store, key)),
  };
}

function serial<T>(pending: Map<string, Promise<unknown>>, key: string, action: () => Promise<T>): Promise<T> {
  const previous = pending.get(key) ?? Promise.resolve();
  const task = previous.catch(() => undefined).then(action).catch(error => {
    throw new Error('Could not persist or read the secure session. Please sign in again.', { cause: error });
  });
  pending.set(key, task);
  void task.finally(() => { if (pending.get(key) === task) pending.delete(key); }).catch(() => undefined);
  return task;
}

async function readStoredValue(store: Storage, key: string): Promise<string | null> {
  const raw = await store.getItem(key);
  const value = manifest(raw);
  if (!value) return raw;
  const parts = await Promise.all(Array.from({ length: value.count }, (_, i) => store.getItem(partKey(key, value, i))));
  if (parts.some(part => part === null)) throw new Error('Incomplete secure session.');
  return parts.join('');
}

async function writeStoredValue(store: Storage, key: string, value: string): Promise<void> {
  const old = await readPreviousManifest(store, key);
  const parts = chunks(value);
  const next: Manifest = { version: 1, generation: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, count: parts.length };
  await commitReplacement(store, key, parts, next);
  await removeSupersededParts(store, key, old);
}

async function removeStoredValue(store: Storage, key: string): Promise<void> {
  const old = await readPreviousManifest(store, key);
  // Remove the authoritative pointer first so cleanup failure cannot restore a
  // signed-out session on the next launch. A pointer failure is reported.
  await store.removeItem(key);
  await removeParts(store, key, old);
}

async function readPreviousManifest(store: Storage, key: string): Promise<Manifest | null> {
  try {
    return manifest(await store.getItem(key));
  } catch {
    return null;
  }
}

async function commitReplacement(store: Storage, key: string, parts: string[], next: Manifest): Promise<void> {
  try {
    for (const [i, part] of parts.entries()) await store.setItem(partKey(key, next, i), part);
    await store.setItem(key, prefix + JSON.stringify(next));
  } catch (error) {
    // Best-effort rollback cannot hide the original persistence failure.
    await rollbackReplacement(store, key, next, error);
  }
}

async function rollbackReplacement(store: Storage, key: string, next: Manifest, error: unknown): Promise<never> {
  try {
    await removeParts(store, key, next);
  } catch (cleanupError) {
    throw new AggregateError([error, cleanupError], 'Secure session write and rollback failed.');
  }
  throw error;
}

async function removeSupersededParts(store: Storage, key: string, old: Manifest | null): Promise<void> {
  try {
    await removeParts(store, key, old);
  } catch {
    // The new manifest is already committed, so orphaned old chunks stay
    // behind silently instead of failing the session that was just saved.
  }
}

async function removeParts(store: Storage, key: string, old: Manifest | null) {
  if (!old) return;
  const results = await Promise.allSettled(Array.from({ length: old.count }, (_, i) => store.removeItem(partKey(key, old, i))));
  const failure = results.find(result => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
}

function chunks(value: string): string[] {
  const result: string[] = [];
  let part = '';
  let bytes = 0;
  for (const char of value) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 1800) { result.push(part); part = ''; bytes = 0; }
    part += char;
    bytes += size;
  }
  result.push(part);
  return result;
}
function manifest(raw: string | null): Manifest | null {
  if (!raw?.startsWith(prefix)) return null;
  const value = JSON.parse(raw.slice(prefix.length)) as Manifest;
  if (value.version !== 1 || !/^[a-z0-9-]+$/.test(value.generation) || !Number.isSafeInteger(value.count) || value.count < 1 || value.count > 10000) {
    throw new Error('Invalid secure session manifest.');
  }
  return value;
}
const partKey = (key: string, value: Manifest, index: number) => `${key}.${value.generation}.${index}`;
