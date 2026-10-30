'use dom';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '@astryxdesign/theme-neutral/fonts.css';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import '../../../shared/theme/zukki-theme.css';
import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { authCopys as copy } from '../copys/authCopys.ts';

type Props = {
  email: string | null; busy: boolean; configured: boolean; error: string | null; notice: string | null;
  onSignIn(email: string): Promise<void>; onSignOut(): Promise<void>; onContinue(): Promise<void>;
  dom?: import('expo/dom').DOMProps;
};
export default function OwnerAuthScreen(props: Props) {
  const [email, setEmail] = useState('');
  return <Theme theme={neutralTheme} mode="light"><main className="zukki-root" style={{ maxWidth: 480, margin: '0 auto', padding: 24, fontSize: 16 }}>
    <h1>{copy.title}</h1>
    {props.error && <p role="alert">{props.error}</p>}
    {props.notice && <p role="status">{props.notice}</p>}
    {!props.configured && <p>{copy.unconfigured}</p>}
    {props.email ? <>
      <p>{copy.signedIn} {props.email}</p>
      <Button label={copy.continue} variant="primary" size="lg" clickAction={props.onContinue} />
      <Button label={copy.signOut} variant="secondary" size="lg" isLoading={props.busy} clickAction={props.onSignOut} />
    </> : <form onSubmit={event => { event.preventDefault(); void props.onSignIn(email); }}>
      <TextInput label={copy.email} type="email" size="lg" value={email} onChange={setEmail} isRequired isDisabled={!props.configured || props.busy} />
      <div style={{ marginTop: 16 }}>
        <Button label={copy.sendLink} variant="primary" size="lg" type="submit" isLoading={props.busy} isDisabled={!props.configured || !email.trim()} />
      </div>
    </form>}
  </main></Theme>;
}
