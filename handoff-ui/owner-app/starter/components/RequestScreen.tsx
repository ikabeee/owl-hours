'use dom';

import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '@astryxdesign/theme-neutral/fonts.css';
import './zukki-theme.css';

import type { DOMProps } from 'expo/dom';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Owl } from './dom/Owl';
import owlRunningRight from './dom/owl/running-right';

type Offer = { title: string; customerName: string; distanceKm: number; secondsLeft: number; zukkiSummary: string };

export default function RequestScreen(props: {
  offer: Offer;
  insets: { top: number; bottom: number };
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  dom?: DOMProps;
}) {
  const { offer, insets } = props;
  const mm = Math.floor(offer.secondsLeft / 60);
  const ss = String(offer.secondsLeft % 60).padStart(2, '0');
  return (
    <Theme theme={neutralTheme}>
      <div className="zukki-root" style={{ paddingTop: insets.top, paddingBottom: insets.bottom, minHeight: '100vh' }}>
        <VStack gap={3} padding={4}>
          <Card padding={4}>
            <HStack gap={2} align="center">
              <Owl src={owlRunningRight} scale={0.42} clip />
              <VStack gap={2} className="zukki-grow">
                <HStack justify="between">
                  <Text type="label">Accept within</Text>
                  <Text type="large" className="zukki-tabular">{mm}:{ss}</Text>
                </HStack>
                <ProgressBar label="Time left to accept" isLabelHidden value={offer.secondsLeft} max={300} variant="neutral" />
                <Text type="supporting">If you don't answer, Zukki offers the job to the next business.</Text>
              </VStack>
            </HStack>
          </Card>
          <Card padding={4}>
            <VStack gap={2}>
              <HStack gap={1} align="center">
                <StatusDot variant="error" label="Urgent" />
                <Text type="supporting">{offer.customerName} · {offer.distanceKm} km, approximate</Text>
              </HStack>
              <Heading level={1}>{offer.title}</Heading>
              <Text>{offer.zukkiSummary}</Text>
            </VStack>
          </Card>
          <div className="zukki-actions">
            <Button label="Decline" variant="secondary" size="lg" width="100%" onClick={() => props.onDecline()} />
            <Button label="Accept and chat" variant="primary" size="lg" width="100%" onClick={() => props.onAccept()} />
          </div>
        </VStack>
      </div>
    </Theme>
  );
}
