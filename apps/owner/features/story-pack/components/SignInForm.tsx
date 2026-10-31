import { useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export type SignInFormProps = {
  authBusy?: boolean;
  onSignIn: (email: string) => Promise<void> | void;
};

export function SignInForm({
  authBusy = false,
  onSignIn,
}: SignInFormProps) {
  const [email, setEmail] = useState('');

  return (
    <Card padding={4}>
      <form
        style={signInFormStyle}
        onSubmit={async (event) => {
          event.preventDefault();
          await onSignIn(email);
        }}
      >
        <Heading level={2}>{copy.signInTitle}</Heading>
        <TextInput
          label={copy.emailLabel}
          type="email"
          size="lg"
          isRequired
          value={email}
          onChange={setEmail}
          isDisabled={authBusy}
        />
        <Button
          label={copy.signIn}
          variant="primary"
          size="lg"
          type="submit"
          isLoading={authBusy}
          isDisabled={authBusy || !email.trim()}
        />
      </form>
    </Card>
  );
}

const signInFormStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxWidth: 420,
} as const;
