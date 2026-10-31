import { useState } from "react";
import { createFakeTestZukkiClient, createTestZukkiSession } from "../services/testZukkiService.ts";
import type { TestZukkiClient, TestZukkiTurn } from "../services/testZukkiService.ts";

export type TestZukkiDeps = { client: TestZukkiClient };

// Serializable by design: turns cross into the DOM component as props; asking
// is a top-level async callback that reports whether the question was sent.
export type TestZukkiView = {
  turns: TestZukkiTurn[];
  hasError: boolean;
  isAsking: boolean;
  sendQuestion: (question: string) => Promise<boolean>;
};

export function useTestZukki(deps?: Partial<TestZukkiDeps>): TestZukkiView {
  const [session] = useState(() => createTestZukkiSession(deps?.client ?? createFakeTestZukkiClient()));
  const [snapshot, setSnapshot] = useState(session.getSnapshot);

  async function sendQuestion(question: string): Promise<boolean> {
    session.setDraft(question);
    const pending = session.ask();
    setSnapshot(session.getSnapshot());
    await pending;

    const done = session.getSnapshot();
    setSnapshot(done);
    return done.error === null;
  }

  return {
    turns: snapshot.turns,
    hasError: snapshot.error !== null,
    isAsking: snapshot.status === "asking",
    sendQuestion,
  };
}
