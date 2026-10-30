import { contentCopys as copy } from '../copys/contentCopys.ts';

export function DemoBanner() {
  return (
    <section
      role="status"
      aria-label={copy.demoTitle}
      style={demoBannerStyle}
    >
      <strong>{copy.demoTitle}</strong>
      <p style={demoNoticeTextStyle}>{copy.demoNotice}</p>
    </section>
  );
}

const demoBannerStyle = {
  padding: '12px 14px',
  borderRadius: 12,
  background: 'var(--color-background-muted)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  fontSize: 16,
} as const;

const demoNoticeTextStyle = {
  margin: '4px 0 0',
  color: 'inherit',
  fontSize: 16,
} as const;
