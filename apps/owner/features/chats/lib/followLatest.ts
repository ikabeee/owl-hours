import type { ID, Sender } from "../../../shared/data/types.ts";

type ThreadTail = { id: ID; from: Sender };

// The owner just sent something: the last message changed and it is theirs.
// The first render (no previous id) is left to ChatLayout's own positioning.
export function arrivedOwnMessage(previousLastId: ID | undefined, thread: readonly ThreadTail[]): boolean {
  const last = thread.at(-1);
  if (!last || previousLastId === undefined) return false;

  return last.id !== previousLastId && last.from === "owner";
}
