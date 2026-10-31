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
import { requestsCopys } from '../copys/requestsCopys';
import type { RequestRowView } from '../lib/requestRow.ts';

// OwRequests: every request Zukki sent, open ones first in time order from the API.
export default function RequestsScreen(props: {
  rows: RequestRowView[];
  insets: { top: number; bottom: number };
  onOpenRequest: (id: string) => Promise<void>;
  dom?: DOMProps;
}) {
  const { rows, insets } = props;
  return (
    <Theme theme={neutralTheme}>
      <div className="zukki-root" style={{ paddingTop: insets.top, paddingBottom: insets.bottom, minHeight: '100vh', width: '100%' }}>
        <VStack gap={3} padding={4}>
          <Heading level={1}>{requestsCopys.inboxTitle}</Heading>
          {rows.length === 0 ? (
            <EmptyState title={requestsCopys.inboxEmpty} icon={<Owl src={owlWaiting} scale={0.6} clip />} />
          ) : (
            <VStack gap={2}>
              {rows.map((row) => (
                <ClickableCard key={row.id} label={`${row.title}, ${row.statusText}`} onClick={() => props.onOpenRequest(row.id)}>
                  <HStack gap={3} align="center">
                    <VStack gap={0.5}>
                      <Text type="label">{row.urgent ? `${requestsCopys.urgent} · ${row.title}` : row.title}</Text>
                      <Text type="supporting">{row.subtitle}</Text>
                      <Text type={row.isOpen ? 'label' : 'supporting'} className={row.isOpen ? 'zukki-success' : undefined}>{row.statusText}</Text>
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
