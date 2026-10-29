import { useEffect, useState } from "react";
import type { ID, Message, PolishPreview } from "../../../shared/data/types.ts";
import { firstName } from "../lib/customerName.ts";
import { deliveryLabel } from "../lib/ownerDelivery.ts";
import type { PolishChoice } from "../lib/ownerDelivery.ts";
import type { ComposerStep, SendOutcome, ThreadMessage } from "../lib/chatView.ts";
import { createConversationsService, createFakeConversationsClient } from "../services/conversationsService.ts";
import type { ConversationsService, SendResult } from "../services/conversationsService.ts";

export type ConversationDeps = { service: ConversationsService };

// Serializable by design: it crosses into the DOM component as props.
export type ConversationView = {
  customerName: string;
  customerFirstName: string;
  acceptedAt: string; // ISO instant of the first thread message (Zukki's summary is posted on accept)
  thread: ThreadMessage[];
  step: ComposerStep;
  preview: PolishPreview | null; // set only while step is "comparing"
  polishEnabled: boolean;
  polishFailed: boolean;
  send: (text: string) => Promise<SendOutcome>;
  sendChoice: (choice: PolishChoice) => Promise<void>;
  setPolishEnabled: (enabled: boolean) => Promise<void>;
};

type Composer = { step: "composing" | "polishing" | "sent" } | { step: "comparing"; preview: PolishPreview };

type LoadedChat = { customerName: string; messages: Message[] };

// Returns null while the chat loads, or when it does not exist.
// The polish switch is hook state, default off, until Settings can provide the default.
export function useConversation(id: ID, deps?: Partial<ConversationDeps>): ConversationView | null {
  const [defaults] = useState(createDemoDeps);
  const service = deps?.service ?? defaults.service;

  const [chat, setChat] = useState<LoadedChat | null>(null);
  const [composer, setComposer] = useState<Composer>({ step: "composing" });
  const [polishEnabled, setPolishEnabled] = useState(false);
  const [polishFailed, setPolishFailed] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    loadChat(service, id).then((loaded) => {
      if (isCurrent) setChat(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [service, id]);

  async function reloadThread() {
    setChat(await loadChat(service, id));
  }

  async function send(text: string): Promise<SendOutcome> {
    setPolishFailed(false);
    if (polishEnabled) return preparePolish(text);

    const result = await service.sendMessage(id, text, { polish: false });
    if (!result) return "not_sent";

    await reloadThread();
    setComposer({ step: "sent" });
    return "sent";
  }

  async function preparePolish(text: string): Promise<SendOutcome> {
    setComposer({ step: "polishing" });
    try {
      const result = await service.sendMessage(id, text, { polish: true });
      if (!result || isSent(result)) return backToComposing("not_sent");

      setComposer({ step: "comparing", preview: result });
      return "comparing";
    } catch {
      setPolishFailed(true);
      return backToComposing("polish_failed");
    }
  }

  function backToComposing(outcome: SendOutcome): SendOutcome {
    setComposer({ step: "composing" });
    return outcome;
  }

  async function sendChoice(choice: PolishChoice) {
    if (composer.step !== "comparing") return;

    const sent = await service.sendPolishChoice(id, composer.preview, choice);
    if (!sent) return;

    await reloadThread();
    setComposer({ step: "sent" });
  }

  async function changePolishEnabled(enabled: boolean) {
    setPolishEnabled(enabled);
    setPolishFailed(false);
  }

  if (!chat) return null;

  return {
    customerName: chat.customerName,
    customerFirstName: firstName(chat.customerName),
    acceptedAt: chat.messages[0]?.sentAt ?? "",
    thread: chat.messages.map(withDeliveryLabel),
    step: composer.step,
    preview: composer.step === "comparing" ? composer.preview : null,
    polishEnabled,
    polishFailed,
    send,
    sendChoice,
    setPolishEnabled: changePolishEnabled,
  };
}

async function loadChat(service: ConversationsService, id: ID): Promise<LoadedChat | null> {
  const [conversation, messages] = await Promise.all([service.getConversation(id), service.getMessages(id)]);
  if (!conversation || !messages) return null;

  return { customerName: conversation.customerName, messages };
}

function isSent(result: SendResult): result is { sent: Message } {
  return "sent" in result;
}

function withDeliveryLabel(message: Message): ThreadMessage {
  return { ...message, deliveryLabel: deliveryLabel(message) };
}

function createDemoDeps(): ConversationDeps {
  return { service: createConversationsService(createFakeConversationsClient()) };
}
