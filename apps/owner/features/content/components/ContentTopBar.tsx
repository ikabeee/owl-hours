import { Heading, Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Layout';
import { ArrowLeft } from 'lucide-react';
import { contentCopys } from '../copys/contentCopys';

export default function ContentTopBar(props: {
  title: string;
  subtitle: string;
  onBack: () => Promise<void>;
  actionLabel?: string;
  onAction?: () => Promise<void>;
}) {
  return (
    <div
      style={{
        background: 'var(--color-background-card)',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <button
        type="button"
        aria-label={contentCopys.backLabel}
        onClick={() => void props.onBack()}
        style={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-primary)',
        }}
      >
        <ArrowLeft size={22} />
      </button>
      <VStack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Heading level={2} style={{ fontSize: 19, margin: 0 }}>
          {props.title}
        </Heading>
        <Text type="supporting" style={{ fontSize: 13.5 }}>
          {props.subtitle}
        </Text>
      </VStack>
      {props.actionLabel && props.onAction ? (
        <button
          type="button"
          onClick={() => void props.onAction?.()}
          style={{
            height: 40,
            padding: '0 12px',
            border: 'none',
            background: 'transparent',
            color: 'var(--color-accent)',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {props.actionLabel}
        </button>
      ) : null}
    </div>
  );
}
