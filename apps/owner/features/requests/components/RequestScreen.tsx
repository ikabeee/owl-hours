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
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Divider } from '@astryxdesign/core/Divider';
import { Owl } from '../../../shared/mascot/Owl';
import owlRunningRight from '../../../shared/mascot/owl/running-right';
import owlStatic from '../../../shared/mascot/owl/static';
import { requestsCopys } from '../copys/requestsCopys';
import type { RequestOfferDetails } from '../hooks/useRequestOffer';
import { CustomerMedia } from './CustomerMedia';
import { PossibleFaults } from './PossibleFaults';

export default function RequestScreen(props: {
  offer: RequestOfferDetails;
  countdownText: string;
  secondsLeft: number;
  maxSeconds: number;
  isExpired: boolean;
  insets: { top: number; bottom: number };
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  dom?: DOMProps;
}) {
  const { offer, insets, isExpired } = props;
  const firstMedia = offer.media[0];
  return (
    <Theme theme={neutralTheme}>
      <div className="zukki-root" style={{ paddingTop: insets.top, paddingBottom: insets.bottom, minHeight: '100vh', width: '100%' }}>
        <VStack gap={3} padding={4}>
          <VStack>
            <Heading level={1}>{requestsCopys.newRequest}</Heading>
            <Text type="supporting">{requestsCopys.sentByZukki} · {formatClockTime(offer.offeredAt)}</Text>
          </VStack>
          <Card padding={4}>
            <HStack gap={2} align="center">
              <Owl src={owlRunningRight} scale={0.42} clip />
              <VStack gap={2} className="zukki-grow">
                <HStack justify="between">
                  <Text type="label">{requestsCopys.acceptWithin}</Text>
                  <Text type="large" className="zukki-tabular">{props.countdownText}</Text>
                </HStack>
                <ProgressBar label={requestsCopys.countdownLabel} isLabelHidden value={props.secondsLeft} max={props.maxSeconds} variant="neutral" />
                <Text type="supporting">{requestsCopys.ignoredNotice}</Text>
              </VStack>
            </HStack>
          </Card>
          <Card padding={4}>
            <VStack gap={2}>
              <HStack gap={1} align="center">
                <StatusDot variant="error" label={requestsCopys.urgent} />
                <Text type="supporting">{offer.customerName} · {offer.distanceKm} {requestsCopys.approximateDistance}</Text>
              </HStack>
              <Heading level={1} accessibilityLevel={2}>{offer.title}</Heading>
              {firstMedia && <CustomerMedia media={firstMedia} />}
              {offer.customerQuote && <Text color="secondary" style={{ fontStyle: 'italic' }}>"{offer.customerQuote}"</Text>}
              <Divider />
              <HStack gap={1} align="center">
                <Avatar size="xsm" src={owlStatic} alt="" />
                <Text type="label">{requestsCopys.zukkiName}</Text>
              </HStack>
              <Text>{offer.zukkiSummary}</Text>
              <PossibleFaults faults={offer.possibleFaults} />
            </VStack>
          </Card>
          <div className="zukki-actions zukki-request-footer">
            <Button label={requestsCopys.decline} variant="secondary" size="lg" width="100%" isDisabled={isExpired} onClick={() => props.onDecline()} />
            <Button label={requestsCopys.acceptAndChat} variant="primary" size="lg" width="100%" isDisabled={isExpired} onClick={() => props.onAccept()} />
          </div>
        </VStack>
      </div>
    </Theme>
  );
}

// Local clock time of an ISO instant, e.g. "12:05 AM" (device-local, like the chat; D7).
function formatClockTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
