'use dom';

import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '@astryxdesign/theme-neutral/fonts.css';
import '../../../shared/theme/zukki-theme.css';

import { useEffect, useRef, useState } from 'react';
import type { DOMProps } from 'expo/dom';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { InputGroup } from '@astryxdesign/core/InputGroup';
import { TextInput } from '@astryxdesign/core/TextInput';
import {
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatSystemMessage,
  useChatLayoutContext,
} from '@astryxdesign/core/Chat';
import { ArrowLeft, ArrowUp } from 'lucide-react';
import { Owl } from '../../../shared/mascot/Owl';
import owlRunning from '../../../shared/mascot/owl/running';
import owlStatic from '../../../shared/mascot/owl/static';
import type { PolishPreview } from '../../../shared/data/types.ts';
import type { ComposerStep, SendOutcome, ThreadMessage } from '../lib/chatView.ts';
import type { PolishChoice } from '../lib/ownerDelivery.ts';
import { chatsCopys } from '../copys/chatsCopys';
import { arrivedOwnMessage } from '../lib/followLatest.ts';

export default function ChatScreen(props: {
  customerName: string;
  customerFirstName: string;
  acceptedAt: string | null;
  thread: ThreadMessage[];
  step: ComposerStep;
  preview: PolishPreview | null;
  polishEnabled: boolean;
  polishFailed: boolean;
  sendFailed: boolean;
  insets: { top: number; bottom: number };
  onSend: (text: string) => Promise<SendOutcome>;
  onSendChoice: (choice: PolishChoice) => Promise<void>;
  onSetPolishEnabled: (enabled: boolean) => Promise<void>;
  onOpenJob: () => Promise<void>;
  onBack: () => Promise<void>;
  dom?: DOMProps;
}) {
  const { insets } = props;
  return (
    <Theme theme={neutralTheme}>
      <div className="zukki-root" style={{ ...pageStyle, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <TopBar customerName={props.customerName} onBack={props.onBack} />
        <ChatLayout density="compact" style={{ flex: 1, minHeight: 0 }} composer={<Footer {...props} />}>
          <ChatMessageList align="bottom">
            {props.acceptedAt && (
              <ChatSystemMessage>{chatsCopys.youAcceptedAt} {formatClockTime(props.acceptedAt)}</ChatSystemMessage>
            )}
            {props.thread.map((message) => (
              <ThreadEntry key={message.id} message={message} onOpenJob={props.onOpenJob} />
            ))}
          </ChatMessageList>
          <FollowOwnMessages thread={props.thread} />
        </ChatLayout>
      </div>
    </Theme>
  );
}

// The DOM host shrinks the root to its content width, and ChatLayout's inline-size
// containment contributes no width, so the root claims the full viewport explicitly.
const pageStyle = { display: 'flex', flexDirection: 'column', width: '100%', height: '100dvh' } as const;

// ChatLayout stops following once the keyboard or the dock moves the transcript,
// so the owner's own message is brought into view explicitly after every send.
function FollowOwnMessages(props: { thread: ThreadMessage[] }) {
  const layout = useChatLayoutContext();
  const previousLastId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (arrivedOwnMessage(previousLastId.current, props.thread)) {
      requestAnimationFrame(() => scrollToEnd(layout?.scrollContainerRef.current));
    }
    previousLastId.current = props.thread.at(-1)?.id;
  }, [props.thread, layout]);

  return null;
}

function scrollToEnd(container: HTMLElement | null | undefined) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  container?.scrollTo({ top: container.scrollHeight, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

function TopBar(props: { customerName: string; onBack: () => Promise<void> }) {
  return (
    <HStack gap={1} align="center" padding={2}>
      <IconButton label={chatsCopys.backLabel} icon={<ArrowLeft size={22} />} variant="ghost" onClick={() => props.onBack()} />
      <VStack>
        <Heading level={1}>{props.customerName}</Heading>
        <Text type="supporting">{chatsCopys.viaZukkiWhatsApp}</Text>
      </VStack>
    </HStack>
  );
}

function ThreadEntry(props: { message: ThreadMessage; onOpenJob: () => Promise<void> }) {
  const { message } = props;
  if (message.from === 'zukki') return <ZukkiSummary text={message.text} onOpenJob={props.onOpenJob} />;
  if (message.from === 'customer') return <CustomerMessage text={message.text} />;
  return <OwnerMessage text={message.text} label={message.deliveryLabel} />;
}

function ZukkiSummary(props: { text: string; onOpenJob: () => Promise<void> }) {
  return (
    <Card padding={3}>
      <VStack gap={1}>
        <Text type="label">{chatsCopys.zukkiName}</Text>
        <Text type="supporting">{props.text}</Text>
        <Button label={chatsCopys.viewJobAndEvidence} variant="ghost" size="lg" onClick={() => props.onOpenJob()} />
      </VStack>
    </Card>
  );
}

function CustomerMessage(props: { text: string }) {
  return (
    <ChatMessage sender="assistant">
      <ChatMessageBubble>{props.text}</ChatMessageBubble>
    </ChatMessage>
  );
}

function OwnerMessage(props: { text: string; label: string | null }) {
  const metadata = props.label ? <ChatMessageMetadata footer={props.label} /> : undefined;
  return (
    <ChatMessage sender="user" metadata={metadata}>
      <ChatMessageBubble>{props.text}</ChatMessageBubble>
    </ChatMessage>
  );
}

type FooterProps = Pick<
  Parameters<typeof ChatScreen>[0],
  'customerFirstName' | 'step' | 'preview' | 'polishEnabled' | 'polishFailed' | 'sendFailed' | 'onSend' | 'onSendChoice' | 'onSetPolishEnabled'
>;

// The draft lives here, not in Composer: Composer unmounts while polishing, and a
// failed polish must still hand the owner's text back.
function Footer(props: FooterProps) {
  const [draft, setDraft] = useState('');

  return (
    <VStack gap={2} padding={3}>
      <FooterBody {...props} draft={draft} onDraftChange={setDraft} />
    </VStack>
  );
}

function FooterBody(props: FooterProps & DraftProps) {
  if (props.step === 'comparing' && props.preview) {
    return (
      <>
        {props.sendFailed && <Text style={errorTextStyle}>{chatsCopys.somethingWentWrong}</Text>}
        <PolishCompare preview={props.preview} onSendChoice={props.onSendChoice} />
      </>
    );
  }

  const isPolishing = props.step === 'polishing';
  return (
    <>
      {props.polishFailed && <Text style={errorTextStyle}>{chatsCopys.polishFailed}</Text>}
      {props.sendFailed && <Text style={errorTextStyle}>{chatsCopys.somethingWentWrong}</Text>}
      <Composer
        customerFirstName={props.customerFirstName}
        onSend={props.onSend}
        draft={props.draft}
        onDraftChange={props.onDraftChange}
        isPolishing={isPolishing}
        zukkiToggle={<ZukkiToggle isOn={props.polishEnabled} isPolishing={isPolishing} onToggle={props.onSetPolishEnabled} />}
      />
    </>
  );
}

// Replaces the "Polish with Zukki" switch: Zukki on means Send polishes first.
// While polishing, Zukki is busy, not disabled: the owl keeps its color and runs.
function ZukkiToggle(props: { isOn: boolean; isPolishing: boolean; onToggle: (enabled: boolean) => Promise<void> }) {
  return (
    <IconButton
      label={chatsCopys.polishSwitchLabel}
      aria-pressed={props.isOn}
      aria-busy={props.isPolishing}
      variant="secondary"
      size="lg"
      onClick={() => (props.isPolishing ? undefined : props.onToggle(!props.isOn))}
      icon={
        <span style={props.isOn || props.isPolishing ? undefined : zukkiOffStyle}>
          <Owl src={props.isPolishing ? owlRunning : owlStatic} scale={0.17} clip />
        </span>
      }
    />
  );
}

const zukkiOffStyle = { filter: 'grayscale(1)', opacity: 0.5 } as const;

const composerSlotStyle = { flex: 1, minWidth: 0 } as const;
const roundStyle = { borderRadius: 9999 } as const;

function PolishCompare(props: { preview: PolishPreview; onSendChoice: (choice: PolishChoice) => Promise<void> }) {
  return (
    <VStack gap={2}>
      <VStack gap={1}>
        <Text type="label">{chatsCopys.youWrote}</Text>
        <Text type="supporting">{props.preview.original}</Text>
      </VStack>
      <Card padding={3}>
        <VStack gap={1}>
          <Text type="label">{chatsCopys.zukkiVersion}</Text>
          <Text>{props.preview.polished}</Text>
        </VStack>
      </Card>
      <div style={compareActionsStyle}>
        <Button label={chatsCopys.sendMine} variant="secondary" size="lg" width="100%" onClick={() => props.onSendChoice('mine')} />
        <Button label={chatsCopys.sendZukkis} variant="primary" size="lg" width="100%" onClick={() => props.onSendChoice('zukki')} />
      </div>
    </VStack>
  );
}

const errorTextStyle = { color: 'var(--color-error)' } as const;

const compareActionsStyle = { display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 } as const;

const DRAFT_KEPT_OUTCOMES: SendOutcome[] = ['polish_failed', 'send_failed', 'not_sent'];

// The draft is cleared on submit; it comes back when nothing was sent or compared, so the owner can retry.
type DraftProps = { draft: string; onDraftChange: (draft: string) => void };

// WhatsApp-style row: one pill (Zukki toggle + message field) and a round Send outside it.
function Composer(
  props: {
    customerFirstName: string;
    onSend: (text: string) => Promise<SendOutcome>;
    isPolishing: boolean;
    zukkiToggle: React.ReactNode;
  } & DraftProps,
) {
  const canSend = props.draft.trim() !== '' && !props.isPolishing;

  async function submit() {
    if (!canSend) return;
    const text = props.draft.trim();
    props.onDraftChange('');
    const outcome = await props.onSend(text);
    if (DRAFT_KEPT_OUTCOMES.includes(outcome)) props.onDraftChange(text);
  }

  return (
    <HStack gap={2} align="center">
      <div className="zukki-pill" style={composerSlotStyle}>
        <InputGroup label={chatsCopys.messageLabel} isLabelHidden size="lg">
          {props.zukkiToggle}
          <TextInput
            label={chatsCopys.messageLabel}
            isLabelHidden
            size="lg"
            value={props.draft}
            onChange={props.onDraftChange}
            onEnter={submit}
            placeholder={props.isPolishing ? chatsCopys.polishing : `${chatsCopys.writeToPlaceholder} ${props.customerFirstName}`}
          />
        </InputGroup>
      </div>
      <IconButton
        label={chatsCopys.sendLabel}
        icon={<ArrowUp size={22} />}
        variant="primary"
        size="lg"
        isDisabled={!canSend}
        onClick={submit}
        style={roundStyle}
      />
    </HStack>
  );
}

// Local clock time of an ISO instant, e.g. "12:05 AM".
function formatClockTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
