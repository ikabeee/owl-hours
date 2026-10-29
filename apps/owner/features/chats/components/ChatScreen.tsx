'use dom';

import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '@astryxdesign/theme-neutral/fonts.css';
import '../../../shared/theme/zukki-theme.css';

import { useState } from 'react';
import type { DOMProps } from 'expo/dom';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Switch } from '@astryxdesign/core/Switch';
import {
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatSystemMessage,
} from '@astryxdesign/core/Chat';
import { ArrowLeft } from 'lucide-react';
import { Owl } from '../../../shared/mascot/Owl';
import owlRunning from '../../../shared/mascot/owl/running';
import type { PolishPreview } from '../../../shared/data/types.ts';
import type { ComposerStep, SendOutcome, ThreadMessage } from '../lib/chatView.ts';
import type { PolishChoice } from '../lib/ownerDelivery.ts';
import { chatsCopys } from '../copys/chatsCopys';

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
        <ChatLayout style={{ flex: 1, minHeight: 0 }} composer={<Footer {...props} />}>
          <ChatMessageList align="bottom">
            {props.acceptedAt && (
              <ChatSystemMessage>{chatsCopys.youAcceptedAt} {formatClockTime(props.acceptedAt)}</ChatSystemMessage>
            )}
            {props.thread.map((message) => (
              <ThreadEntry key={message.id} message={message} onOpenJob={props.onOpenJob} />
            ))}
          </ChatMessageList>
        </ChatLayout>
      </div>
    </Theme>
  );
}

const pageStyle = { display: 'flex', flexDirection: 'column', height: '100dvh' } as const;

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

function Footer(props: FooterProps) {
  return (
    <VStack gap={2} padding={3}>
      <Switch
        label={chatsCopys.polishSwitchLabel}
        value={props.polishEnabled}
        isDisabled={props.step === 'polishing' || props.step === 'comparing'}
        changeAction={(enabled) => props.onSetPolishEnabled(enabled)}
      />
      <FooterBody {...props} />
    </VStack>
  );
}

function FooterBody(props: FooterProps) {
  if (props.step === 'polishing') return <PolishingNotice />;
  if (props.step === 'comparing' && props.preview) {
    return (
      <>
        {props.sendFailed && <Text style={errorTextStyle}>{chatsCopys.somethingWentWrong}</Text>}
        <PolishCompare preview={props.preview} onSendChoice={props.onSendChoice} />
      </>
    );
  }

  return (
    <>
      {props.polishFailed && <Text style={errorTextStyle}>{chatsCopys.polishFailed}</Text>}
      {props.sendFailed && <Text style={errorTextStyle}>{chatsCopys.somethingWentWrong}</Text>}
      <Composer customerFirstName={props.customerFirstName} onSend={props.onSend} />
    </>
  );
}

function PolishingNotice() {
  return (
    <HStack gap={2} align="center">
      <Owl src={owlRunning} scale={0.3} clip />
      <Text>{chatsCopys.polishing}</Text>
    </HStack>
  );
}

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
function Composer(props: { customerFirstName: string; onSend: (text: string) => Promise<SendOutcome> }) {
  const [draft, setDraft] = useState('');

  async function submit(text: string) {
    const outcome = await props.onSend(text);
    if (DRAFT_KEPT_OUTCOMES.includes(outcome)) setDraft(text);
  }

  return (
    <ChatComposer
      value={draft}
      onChange={setDraft}
      onSubmit={submit}
      placeholder={`${chatsCopys.writeToPlaceholder} ${props.customerFirstName}`}
    />
  );
}

// Local clock time of an ISO instant, e.g. "12:05 AM".
function formatClockTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
