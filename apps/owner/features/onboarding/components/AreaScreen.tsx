'use dom';

import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '../../../shared/theme/figtreeStylesheet';
import '../../../shared/theme/zukki-theme.css';
import './areaScreen.css';

import { useState } from 'react';
import type { DOMProps } from 'expo/dom';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Slider } from '@astryxdesign/core/Slider';
import { Switch } from '@astryxdesign/core/Switch';
import mapCity from '../../../assets/img/mapCity';
import { onboardingCopys } from '../copys/onboardingCopys';
import { MAX_RADIUS_KM, MIN_RADIUS_KM } from '../lib/areaRadius';
import { radiusText } from '../lib/priceText';
import OnboardingFrame from './OnboardingFrame';
import SetupStepHeader from './SetupStepHeader';

// Setup step 3: the map card with the radius slider, regular hours, and the night
// switch. Both controls stay DOM-local; Finish persists them. In live mode the card
// also offers the device location, which the native route reads and saves.
export default function AreaScreen(props: {
  radiusKm: number;
  nightUrgent: boolean;
  hoursSummary: string;
  offersLocation: boolean;
  locationMessage: string | null;
  isFinishDisabled: boolean;
  onUseLocation: (radiusKm: number) => Promise<void>;
  insets: { top: number; bottom: number };
  onFinish: (radiusKm: number, nightUrgent: boolean) => Promise<void>;
  onBack: () => Promise<void>;
  dom?: DOMProps;
}) {
  const { insets } = props;
  const [radius, setRadius] = useState(props.radiusKm);
  const [night, setNight] = useState(props.nightUrgent);

  return (
    <OnboardingFrame
      insets={insets}
      onBack={() => props.onBack()}
      footerLabel={onboardingCopys.finishButton}
      onFooter={() => props.onFinish(radius, night)}
      isFooterDisabled={props.isFinishDisabled}
    >
      <SetupStepHeader step={3} />
      <Heading level={1}>{onboardingCopys.areaTitle}</Heading>
      <Card padding={3}>
        <VStack gap={3}>
          <div className="onk-map">
            <img className="onk-map-img" src={mapCity} alt={onboardingCopys.mapAlt} />
            <span className="onk-map-circle" aria-hidden="true" />
            <span className="onk-map-dot" aria-hidden="true" />
          </div>
          {props.offersLocation && (
            <VStack gap={2}>
              <Button
                label={onboardingCopys.useLocation}
                variant="secondary"
                size="lg"
                width="100%"
                clickAction={() => props.onUseLocation(radius)}
              />
              <div aria-live="polite">
                {props.locationMessage && <Text type="supporting">{props.locationMessage}</Text>}
              </div>
            </VStack>
          )}
          <VStack gap={2}>
            <HStack justify="between" align="center">
              <Text type="label">{onboardingCopys.radiusLabel}</Text>
              <Text type="large">{radiusText(radius)}</Text>
            </HStack>
            <Slider
              label={onboardingCopys.radiusLabel}
              isLabelHidden
              min={MIN_RADIUS_KM}
              max={MAX_RADIUS_KM}
              step={1}
              value={radius}
              onChange={setRadius}
            />
          </VStack>
        </VStack>
      </Card>
      <Card padding={2}>
        <div style={rowStyle}>
          <VStack gap={0} className="zukki-grow">
            <Text>{onboardingCopys.regularHours}</Text>
            <Text type="supporting">{props.hoursSummary}</Text>
          </VStack>
        </div>
        <div style={dividedRowStyle}>
          <VStack gap={0} className="zukki-grow">
            <Text>{onboardingCopys.nightRequests}</Text>
            <Text type="supporting">{onboardingCopys.nightRequestsWindow}</Text>
          </VStack>
          <Switch
            label={onboardingCopys.nightRequests}
            isLabelHidden
            value={night}
            onChange={setNight}
          />
        </div>
      </Card>
    </OnboardingFrame>
  );
}

const rowStyle = { display: "flex", alignItems: "center", gap: 12, minHeight: 56, paddingInline: 12 } as const;

const dividedRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minHeight: 56,
  paddingInline: 12,
  borderTop: "1px solid var(--color-border)",
} as const;
