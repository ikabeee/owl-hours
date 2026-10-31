import { HStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { IconButton } from '@astryxdesign/core/IconButton';
import { X } from 'lucide-react';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export type StatusLineProps = {
  error: string | null;
  notice: string | null;
  onDismiss: () => void;
};

export function StatusLine({ error, notice, onDismiss }: StatusLineProps) {
  const message = error ?? notice;
  if (!message) return null;
  const isError = Boolean(error);

  return (
    <HStack gap={2} align="center">
      <StatusDot variant={isError ? 'error' : 'success'} label={message} aria-hidden="true" />
      <Text role={isError ? 'alert' : 'status'} className="zukki-grow">
        {message}
      </Text>
      <IconButton
        label={copy.dismiss}
        icon={<X size={18} aria-hidden="true" />}
        variant="ghost"
        size="lg"
        onClick={onDismiss}
      />
    </HStack>
  );
}
