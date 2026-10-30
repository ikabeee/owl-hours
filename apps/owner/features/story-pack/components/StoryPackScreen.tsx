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
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import {
  buildApprovalMediaSnapshot,
  isBackNavigationDisabled,
  type StoryPack,
  type StoryTargets,
} from '../lib/storyPack.ts';
import type { StoryPackView } from '../hooks/useStoryPack.ts';
import { contentCopys as copy } from '../copys/contentCopys.ts';
import { storyPackServiceCopys } from '../copys/storyPackServiceCopys.ts';
import { StoryPhotoAssignments } from './StoryPhotoAssignments.tsx';
import { renderStoryImages } from './renderStoryImages.ts';
import { useStoryPackExport } from '../hooks/useStoryPackExport.ts';
import { useStoryPackEditor } from '../hooks/useStoryPackEditor.ts';
import { Loading } from './Loading.tsx';
import { Overview } from './Overview.tsx';
import { StoryPackEditor } from './StoryPackEditor.tsx';
import { StoryPackHeader } from './StoryPackHeader.tsx';
import { DemoBanner } from './DemoBanner.tsx';
import { WorkspaceToolbar } from './WorkspaceToolbar.tsx';
import { WorkspaceBrandLine } from './WorkspaceBrandLine.tsx';
import { StatusBanner } from './StatusBanner.tsx';
import { SignInForm } from './SignInForm.tsx';

export default function StoryPackScreen(
  props: StoryPackView & {
    insets: { top: number; bottom: number };
    dom?: DOMProps;
    deliverExport: (
      payload: import('../lib/storyPackDelivery.ts').StoryPackDelivery,
    ) => Promise<void>;
  },
) {
  const selected = props.selectedPack;
  const { draft, dirty, setDraft, acceptSaved } = useStoryPackEditor(selected);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const { exporting, exportError, exportPack, clearExportError } =
    useStoryPackExport({
      authorize: props.prepareHandoff,
      render: renderStoryImages,
      deliver: props.deliverExport,
      delivered: props.markHandoffDelivered,
    });

  function updateSlide(index: number, field: 'title' | 'body', value: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            slides: current.slides.map((slide, slideIndex) =>
              slideIndex === index ? { ...slide, [field]: value } : slide,
            ),
          }
        : current,
    );
  }

  function updateTarget(key: keyof StoryTargets, checked: boolean) {
    setDraft((current) =>
      current
        ? {
            ...current,
            platforms: { ...current.platforms, [key]: checked },
          }
        : current,
    );
  }

  async function saveDraft(): Promise<StoryPack | null> {
    if (!draft) return null;
    setSaving(true);
    try {
      const saved = await props.updateDraft({
        caption: draft.caption,
        slides: draft.slides,
        platforms: draft.platforms,
      });
      if (saved) acceptSaved(saved, draft);
      return saved;
    } finally {
      setSaving(false);
    }
  }

  async function approveDraft() {
    if (!draft) return;
    setApproving(true);
    setApprovalError(null);

    const source = props.sources.find(
      (candidate) => candidate.id === draft.sourceJobId,
    );
    const expectedMedia = source
      ? buildApprovalMediaSnapshot(source, draft)
      : null;

    if (!expectedMedia) {
      setApproving(false);
      setApprovalError(storyPackServiceCopys.changedSinceReview);
      return;
    }

    setSaving(true);
    try {
      const saved = await props.updateDraft({
        caption: draft.caption,
        slides: draft.slides,
        platforms: draft.platforms,
      });
      if (saved) {
        if (!acceptSaved(saved, draft)) return;
        const approved = await props.approve({
          expectedUpdatedAt: saved.updatedAt,
          expectedMedia,
        });
        if (approved) acceptSaved(approved, saved);
      }
    } finally {
      setSaving(false);
      setApproving(false);
    }
  }

  const error = approvalError ?? exportError ?? props.error;
  const notice = props.notice;
  const canViewWorkspace =
    props.mode === 'demo' ||
    (props.mode === 'live' && props.authStatus === 'signed_in');

  const backDisabled = isBackNavigationDisabled({
    saving,
    exporting,
    approving,
  });

  function renderWorkspaceView() {
    if (props.mode === 'unconfigured') {
      return (
        <Card padding={4}>
          <Heading level={2}>{copy.configurationTitle}</Heading>
          <Text>{copy.configurationNotice}</Text>
        </Card>
      );
    }

    if (props.authStatus === 'loading' || (props.loading && !draft)) {
      return <Loading />;
    }

    if (!canViewWorkspace) {
      return (
        <SignInForm
          authBusy={props.authBusy}
          onSignIn={props.signIn}
        />
      );
    }

    if (selected && draft) {
      const source =
        props.sources.find((candidate) => candidate.id === draft.sourceJobId) ??
        null;
      const receipt =
        props.deliveryReceipt?.packId === draft.id
          ? props.deliveryReceipt.openedAt
          : null;

      return (
        <StoryPackEditor
          draft={draft}
          source={source}
          receipt={receipt}
          onChangeCaption={(caption) =>
            setDraft((current) =>
              current ? { ...current, caption } : current,
            )
          }
          onChangeSlide={updateSlide}
          onChangeTarget={updateTarget}
          onSave={saveDraft}
          onApprove={approveDraft}
          onPrepare={exportPack}
          exporting={exporting}
          saving={saving}
          approving={approving}
          dirty={dirty}
        />
      );
    }

    return (
      <VStack gap={4}>
        {props.mode === 'live' && (
          <StoryPhotoAssignments
            jobs={props.photoJobs}
            onAssign={props.assignPhotos}
          />
        )}
        <Overview
          sources={props.sources}
          packs={props.packs}
          onCreate={props.createFromJob}
          onSelect={props.selectPack}
        />
      </VStack>
    );
  }

  const isLiveSignedIn =
    props.mode === 'live' && props.authStatus === 'signed_in';

  return (
    <Theme theme={neutralTheme} mode="light">
      <div
        className="zukki-root"
        style={{
          ...pageStyle,
          paddingTop: props.insets.top,
          paddingBottom: props.insets.bottom,
        }}
      >
        <div style={contentStyle}>
          <StoryPackHeader
            showBack={Boolean(selected)}
            backDisabled={backDisabled}
            onBack={() => {
              setApprovalError(null);
              void props.selectPack(null);
            }}
          />

          {props.mode === 'demo' && <DemoBanner />}

          {isLiveSignedIn && (
            <WorkspaceToolbar
              sessionEmail={props.sessionEmail}
              authBusy={props.authBusy}
              onReload={props.reload}
              onSignOut={props.signOut}
            />
          )}

          <WorkspaceBrandLine />

          <StatusBanner
            error={error}
            notice={notice}
            onDismiss={() => {
              setApprovalError(null);
              clearExportError();
              void props.clearNotice();
            }}
          />

          {renderWorkspaceView()}

          <p style={footerNoteStyle}>{copy.metaHandoff}</p>
        </div>
      </div>
    </Theme>
  );
}

const pageStyle = {
  width: '100%',
  minHeight: '100%',
  overflowY: 'auto',
} as const;

const contentStyle = {
  width: 'min(100%, 1040px)',
  margin: '0 auto',
  padding: '16px 16px 36px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
} as const;

const footerNoteStyle = {
  margin: 0,
  color: 'var(--color-text-secondary)',
  fontSize: 16,
  lineHeight: 1.4,
} as const;
