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
import { VStack } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Divider } from '@astryxdesign/core/Divider';
import { TextInput } from '@astryxdesign/core/TextInput';
import { ArrowLeft } from 'lucide-react';
import { onboardingCopys } from '../copys/onboardingCopys';
import { isSendCodeEnabled } from '../lib/signUpForm';
import ZukkiSays from './ZukkiSays';

// ZukkiSays + name, phone, terms and "Send code", disabled until the form is valid.
// "Continue with Facebook" skips verify; the fields stay DOM-local, only the send persists.
export default function SignUpScreen(props: {
  defaultName: string;
  defaultPhone: string;
  insets: { top: number; bottom: number };
  onSendCode: (name: string, phone: string) => Promise<void>;
  onFacebook: () => Promise<void>;
  onBack: () => Promise<void>;
  dom?: DOMProps;
}) {
  const { insets } = props;
  const [name, setName] = useState(props.defaultName);
  const [phone, setPhone] = useState(props.defaultPhone);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const canSend = isSendCodeEnabled({ name, phone, termsAccepted });

  return (
    <Theme theme={neutralTheme}>
      <div className="zukki-root" style={{ ...pageStyle, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <div style={backRowStyle}>
          <IconButton label={onboardingCopys.backLabel} icon={<ArrowLeft size={22} />} variant="ghost" onClick={() => props.onBack()} />
        </div>
        <div style={bodyStyle}>
          <ZukkiSays owl="idle" text={onboardingCopys.signUpLead} tone="muted" />
          <Heading level={1}>{onboardingCopys.signUpTitle}</Heading>
          <TextInput label={onboardingCopys.nameLabel} size="lg" value={name} onChange={setName} />
          <VStack gap={1}>
            <TextInput label={onboardingCopys.phoneLabel} size="lg" value={phone} onChange={setPhone} />
            <Text type="supporting">{onboardingCopys.phoneHelp}</Text>
          </VStack>
          <CheckboxInput label={onboardingCopys.termsLabel} value={termsAccepted} onChange={setTermsAccepted} />
          <Divider label={onboardingCopys.orDivider} />
          <Button
            label={onboardingCopys.continueWithFacebook}
            variant="secondary"
            size="lg"
            width="100%"
            icon={<FacebookIcon />}
            onClick={() => props.onFacebook()}
          />
        </div>
        <div style={footerStyle}>
          <Button
            label={onboardingCopys.sendCode}
            variant="primary"
            size="lg"
            width="100%"
            isDisabled={!canSend}
            onClick={() => props.onSendCode(name, phone)}
          />
        </div>
      </div>
    </Theme>
  );
}

// The Facebook badge from the handoff (OwSignUp.dc.html), drawn inline.
function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill={FACEBOOK_BLUE} />
      <path
        d="M13.4 19v-6h2l.3-2.4h-2.3V9.2c0-.7.2-1.2 1.2-1.2h1.2V5.9a16 16 0 0 0-1.8-.1c-1.8 0-3 1.1-3 3.1v1.7H9v2.4h2v6z"
        fill={FACEBOOK_WHITE}
      />
    </svg>
  );
}

// Facebook brand colours, from the OwSignUp.dc.html badge fills.
const FACEBOOK_BLUE = "#0866ff";
const FACEBOOK_WHITE = "#ffffff";

const pageStyle = { display: "flex", flexDirection: "column", width: "100%", minHeight: "100dvh" } as const;

const backRowStyle = { height: 52, paddingInline: 8, display: "flex", alignItems: "center" } as const;

const bodyStyle = { flex: 1, paddingInline: 24, display: "flex", flexDirection: "column", gap: 18 } as const;

const footerStyle = { padding: "12px 24px 16px" } as const;
