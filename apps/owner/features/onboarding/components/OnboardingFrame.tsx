'use dom';

import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '@astryxdesign/theme-neutral/fonts.css';
import '../../../shared/theme/zukki-theme.css';

import type { ReactNode } from 'react';
import type { DOMProps } from 'expo/dom';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { ArrowLeft } from 'lucide-react';
import { onboardingCopys } from '../copys/onboardingCopys';

// Shared setup-step chrome: back row, body container and footer button. The body slot
// is composed inside the DOM tree, so nothing but data and callbacks crosses the DOM
// boundary from the native routes: screens keep passing their own props down only.
export default function OnboardingFrame(props: {
  insets: { top: number; bottom: number };
  onBack: () => Promise<void>;
  footerLabel: string;
  onFooter: () => Promise<void>;
  children: ReactNode;
  dom?: DOMProps;
}) {
  const { insets } = props;

  return (
    <Theme theme={neutralTheme}>
      <div className="zukki-root" style={{ ...pageStyle, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <div style={backRowStyle}>
          <IconButton label={onboardingCopys.backLabel} icon={<ArrowLeft size={22} />} variant="ghost" onClick={() => props.onBack()} />
        </div>
        <div style={bodyStyle}>{props.children}</div>
        <div style={footerStyle}>
          <Button
            label={props.footerLabel}
            variant="primary"
            size="lg"
            width="100%"
            onClick={() => props.onFooter()}
          />
        </div>
      </div>
    </Theme>
  );
}

const pageStyle = { display: "flex", flexDirection: "column", width: "100%", minHeight: "100dvh" } as const;

const backRowStyle = { height: 52, paddingInline: 8, display: "flex", alignItems: "center" } as const;

const bodyStyle = { flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12 } as const;

const footerStyle = { padding: "12px 16px", borderTop: "1px solid var(--color-border)", background: "var(--color-background-card)" } as const;
