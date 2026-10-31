import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export type WorkspaceToolbarProps = {
  sessionEmail?: string | null;
  authBusy?: boolean;
  onReload: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
};

export function WorkspaceToolbar({
  sessionEmail,
  authBusy = false,
  onReload,
  onSignOut,
}: WorkspaceToolbarProps) {
  return (
    <section style={workspaceToolbarStyle}>
      <div>
        <strong>{copy.liveWorkspace}</strong>
        <p style={userEmailStyle}>{sessionEmail}</p>
        <Text type="supporting" style={liveNoticeStyle}>
          {copy.liveNotice}
        </Text>
      </div>
      <div style={toolbarActionsStyle}>
        <Button
          label={copy.reload}
          variant="secondary"
          size="lg"
          onClick={() => {
            void onReload();
          }}
        />
        <Button
          label={copy.signOut}
          variant="secondary"
          size="lg"
          isLoading={authBusy}
          onClick={() => {
            void onSignOut();
          }}
        />
      </div>
    </section>
  );
}

const workspaceToolbarStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'center',
  justifyContent: 'space-between',
} as const;

const toolbarActionsStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
} as const;

const userEmailStyle = {
  margin: '4px 0',
  fontSize: 16,
} as const;

const liveNoticeStyle = {
  fontSize: 16,
  lineHeight: 1.5,
} as const;
