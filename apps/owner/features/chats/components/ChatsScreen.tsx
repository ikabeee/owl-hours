'use dom';

import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '@astryxdesign/theme-neutral/fonts.css';
import '../../../shared/theme/zukki-theme.css';

import type { DOMProps } from 'expo/dom';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Heading, Text } from '@astryxdesign/core/Text';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { ChevronRight } from 'lucide-react';
import { Owl } from '../../../shared/mascot/Owl';
import owlWaiting from '../../../shared/mascot/owl/waiting';
import { chatsCopys } from '../copys/chatsCopys';
import type { ChatRowView } from '../lib/chatRow.ts';

// OwChats: one row per accepted request, newest message first.
export default function ChatsScreen(props: {
  rows: ChatRowView[];
  insets: { top: number; bottom: number };
  onOpenChat: (id: string) => Promise<void>;
  dom?: DOMProps;
}) {
  const { rows, insets } = props;
  return (
    <Theme theme={neutralTheme}>
      <div className="zukki-root" style={{ paddingTop: insets.top, paddingBottom: insets.bottom, minHeight: '100vh', width: '100%' }}>
        <VStack gap={3} padding={4}>
          <Heading level={1}>{chatsCopys.chatsTitle}</Heading>
          {rows.length === 0 ? (
            <EmptyState title={chatsCopys.chatsEmpty} icon={<Owl src={owlWaiting} scale={0.6} clip />} />
          ) : (
            <VStack gap={2}>
              {rows.map((row) => (
                <ClickableCard key={row.id} label={`${row.title}, ${row.subtitle}`} onClick={() => props.onOpenChat(row.id)}>
                  <HStack gap={3} align="center">
                    <VStack gap={0.5}>
                      <Text type="label">{row.unread > 0 ? `${row.title} (${row.unread})` : row.title}</Text>
                      <Text type="supporting">{row.subtitle}</Text>
                      <Text type="supporting">{row.lastText}</Text>
                    </VStack>
                    <ChevronRight size={18} aria-hidden />
                  </HStack>
                </ClickableCard>
              ))}
            </VStack>
          )}
        </VStack>
      </div>
    </Theme>
  );
}
