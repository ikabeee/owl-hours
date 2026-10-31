import { IconButton } from '@astryxdesign/core/IconButton';
import { X } from 'lucide-react';
import { Owl } from '../../../shared/mascot/Owl';
import owlFailed from '../../../shared/mascot/owl/failed';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export type StatusBannerProps = {
  error: string | null;
  notice: string | null;
  onDismiss: () => void;
};

export function StatusBanner({
  error,
  notice,
  onDismiss,
}: StatusBannerProps) {
  if (!error && !notice) {
    return null;
  }

  const message = error ?? notice;
  const isError = Boolean(error);

  return (
    <div
      role={isError ? 'alert' : 'status'}
      style={isError ? errorBannerStyle : noticeBannerStyle}
    >
      {isError && <Owl src={owlFailed} scale={0.6} clip alt="" />}
      <span style={bannerMessageStyle}>{message}</span>
      <IconButton
        label={copy.dismiss}
        icon={<X size={18} aria-hidden="true" />}
        variant="ghost"
        size="lg"
        style={dismissStyle}
        onClick={onDismiss}
      />
    </div>
  );
}

const errorBannerStyle = {
  border: '1px solid var(--color-border-emphasized)',
  background: 'var(--color-background-muted)',
  color: 'var(--color-text-primary)',
  borderRadius: 10,
  padding: '12px 14px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
} as const;

const noticeBannerStyle = {
  border: '1px solid var(--color-border)',
  background: 'var(--color-background-muted)',
  color: 'var(--color-success)',
  borderRadius: 10,
  padding: '12px 14px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
} as const;

const bannerMessageStyle = {
  flex: 1,
  fontSize: 16,
} as const;

const dismissStyle = {
  minWidth: 44,
  minHeight: 44,
  padding: 8,
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
} as const;
