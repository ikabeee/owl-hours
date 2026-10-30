import { VStack } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Divider } from '@astryxdesign/core/Divider';
import { Camera, Share2 } from 'lucide-react';
import {
  storyPackStatusLabel,
  type StoryPack,
  type StorySource,
  type StoryTargets,
} from '../lib/storyPack.ts';
import { contentCopys as copy } from '../copys/contentCopys.ts';
import { StatusSteps } from './StatusSteps.tsx';
import { TargetToggle } from './TargetToggle.tsx';
import { STORY_PACK_LIMITS } from '@owl-hours/shared';

export type StoryPackEditorProps = {
  draft: StoryPack;
  source: StorySource | null;
  receipt: string | null;
  onChangeCaption: (caption: string) => void;
  onChangeSlide: (
    index: number,
    field: 'title' | 'body',
    value: string,
  ) => void;
  onChangeTarget: (key: keyof StoryTargets, checked: boolean) => void;
  onSave: () => Promise<StoryPack | null>;
  onApprove: () => Promise<void>;
  onPrepare: () => Promise<void>;
  exporting: boolean;
  saving: boolean;
  approving: boolean;
  dirty: boolean;
};

export function StoryPackEditor({
  draft,
  source,
  receipt,
  onChangeCaption,
  onChangeSlide,
  onChangeTarget,
  onSave,
  onApprove,
  onPrepare,
  exporting,
  saving,
  approving,
  dirty,
}: StoryPackEditorProps) {
  const editable = draft.status === 'draft';
  const approved = draft.status === 'approved';
  const isBusy = saving || approving;

  return (
    <VStack gap={4}>
      <section style={editorHeadingStyle}>
        <div>
          <div style={eyebrowStyle}>{copy.previewLabel}</div>
          <Heading level={2}>{draft.jobTitle}</Heading>
          <Text type="supporting" style={sourceSubtitleStyle}>
            {copy.sourceLabel}: {draft.businessName}
            {draft.isDemo ? ` · ${copy.demoSample}` : ''}
          </Text>
        </div>
        <span style={statusBadgeStyle}>
          {storyPackStatusLabel(draft.status)}
        </span>
      </section>

      <StatusSteps status={draft.status} />

      {draft.isDemo && (
        <div style={demoInlineStyle}>
          <strong>{copy.demoContentLabel}</strong>
          <span>{copy.demoVisualDescription}</span>
        </div>
      )}

      <div style={slideGridStyle}>
        {draft.slides.map((slide, index) => {
          const expectedRole = index === 0 ? 'before' : 'after';
          const asset = source?.assets.find(
            (candidate) =>
              draft.sourceMediaIds.includes(candidate.id) &&
              candidate.role === expectedRole,
          );
          const unavailableLabel = draft.isDemo
            ? copy.sampleVisual
            : copy.photoUnavailable;
          const imageLabel = asset?.label ?? unavailableLabel;

          return (
            <article key={index} style={slideCardStyle}>
              <div style={storyCanvasStyle}>
                {asset?.imageUrl ? (
                  <img
                    src={asset.imageUrl}
                    alt={asset.label}
                    style={storyImageStyle}
                  />
                ) : (
                  <div style={visualPlaceholderStyle}>
                    <span style={storyKickerStyle}>
                      {copy.storyKicker(index)}
                    </span>
                    <span style={visualLabelStyle}>{imageLabel}</span>
                  </div>
                )}
                <div style={storyTextOverlayStyle}>
                  <h3 style={storyTitleStyle}>{slide.title}</h3>
                  <p style={storyBodyStyle}>{slide.body}</p>
                </div>
                <span style={storyCountStyle}>{copy.pageCount(index)}</span>
              </div>
              <div style={slideFieldsStyle}>
                <TextArea
                  label={copy.slideTitleLabel}
                  value={slide.title}
                  onChange={(value) => onChangeSlide(index, 'title', value)}
                  rows={2}
                  maxLength={STORY_PACK_LIMITS.slideTitle}
                  isReadOnly={!editable || approving}
                  size="md"
                />
                <TextArea
                  label={copy.slideBodyLabel}
                  value={slide.body}
                  onChange={(value) => onChangeSlide(index, 'body', value)}
                  rows={3}
                  maxLength={STORY_PACK_LIMITS.slideBody}
                  isReadOnly={!editable || approving}
                  size="md"
                />
              </div>
            </article>
          );
        })}
      </div>

      <Card padding={4}>
        <VStack gap={3}>
          <div>
            <Heading level={2}>{copy.captionLabel}</Heading>
            <Text type="supporting" style={captionGuidanceStyle}>
              {copy.captionGuidance}
            </Text>
          </div>
          <TextArea
            label={copy.captionLabel}
            isLabelHidden
            value={draft.caption}
            onChange={onChangeCaption}
            rows={3}
            maxLength={STORY_PACK_LIMITS.caption}
            isReadOnly={!editable || approving}
            size="md"
          />
          <Divider />
          <VStack gap={1}>
            <Text type="label">{copy.destinations}</Text>
            <Text type="supporting" style={captionGuidanceStyle}>
              {copy.destinationGuidance}
            </Text>
          </VStack>
          <div style={targetGridStyle}>
            <TargetToggle
              label={copy.facebook}
              selected={draft.platforms.facebook}
              disabled={!editable || approving}
              onClick={() =>
                onChangeTarget('facebook', !draft.platforms.facebook)
              }
              icon={<Share2 size={18} />}
            />
            <TargetToggle
              label={copy.instagram}
              selected={draft.platforms.instagram}
              disabled={!editable || approving}
              onClick={() =>
                onChangeTarget('instagram', !draft.platforms.instagram)
              }
              icon={<Camera size={18} />}
            />
          </div>
        </VStack>
      </Card>

      <div style={actionRowStyle}>
        {editable && (
          <>
            <Button
              label={copy.save}
              variant="secondary"
              size="lg"
              isDisabled={saving}
              style={actionButtonStyle}
              onClick={() => {
                void onSave();
              }}
            />
            <Button
              label={copy.approve}
              variant="primary"
              size="lg"
              isLoading={isBusy}
              isDisabled={
                draft.slides.length !== 3 ||
                (!draft.platforms.facebook && !draft.platforms.instagram)
              }
              style={actionButtonStyle}
              onClick={() => {
                void onApprove();
              }}
            />
          </>
        )}
        {approved && (
          <Button
            label={copy.downloadLabel}
            variant="primary"
            size="lg"
            isLoading={exporting}
            isDisabled={!draft.canHandoff}
            style={actionButtonStyle}
            onClick={() => {
              void onPrepare();
            }}
          />
        )}
        {!editable && !approved && (
          <div style={lockedNoteStyle}>{copy.editLocked}</div>
        )}
      </div>

      {dirty && (
        <p role="status" style={stateNoteStyle}>
          {copy.unsavedChanges}
        </p>
      )}
      {approved && <p style={stateNoteStyle}>{copy.approvalStatus}</p>}
      {receipt && <p style={stateNoteStyle}>{copy.receipt(receipt)}</p>}
      {approved && !draft.canHandoff && (
        <p role="status" style={stateNoteStyle}>
          {copy.handoffBlocked}
        </p>
      )}
      {editable &&
        !draft.platforms.facebook &&
        !draft.platforms.instagram && (
          <p style={stateNoteStyle}>{copy.chooseFormat}</p>
        )}
      {draft.slides.length !== 3 && (
        <p role="status" style={stateNoteStyle}>
          {copy.legacyDraft}
        </p>
      )}
      <p style={actualPublishNoteStyle}>{copy.exportContents}</p>
      {draft.status === 'published' && (
        <p style={publishedNoteStyle}>{copy.publishedStatus}</p>
      )}
      <p style={actualPublishNoteStyle}>{copy.actualPublishStatus}</p>
    </VStack>
  );
}

const editorHeadingStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
} as const;

const eyebrowStyle = {
  color: 'var(--color-accent)',
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: '.09em',
  textTransform: 'uppercase',
  marginBottom: 4,
} as const;

const sourceSubtitleStyle = {
  fontSize: 16,
  lineHeight: 1.5,
} as const;

const captionGuidanceStyle = {
  fontSize: 16,
  lineHeight: 1.5,
} as const;

const statusBadgeStyle = {
  borderRadius: 9999,
  padding: '6px 9px',
  background: 'var(--color-background-muted)',
  color: 'var(--color-text-primary)',
  fontSize: 16,
  fontWeight: 700,
  flexShrink: 0,
} as const;

const demoInlineStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  borderRadius: 10,
  background: 'var(--color-background-muted)',
  padding: '10px 12px',
  color: 'var(--color-text-secondary)',
  fontSize: 16,
} as const;

const slideGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
  gap: 12,
  alignItems: 'start',
} as const;

const slideCardStyle = {
  minWidth: 0,
  padding: 10,
  borderRadius: 14,
  background: 'var(--color-background-card)',
  border: '1px solid var(--color-border)',
} as const;

const storyCanvasStyle = {
  width: '100%',
  aspectRatio: '9 / 16',
  borderRadius: 11,
  overflow: 'hidden',
  position: 'relative',
  background: 'var(--color-background-muted)',
  color: 'var(--color-text-primary)',
} as const;

const storyImageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
} as const;

const visualPlaceholderStyle = {
  width: '100%',
  height: '100%',
  padding: 16,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  background: 'var(--color-background-muted)',
} as const;

const storyKickerStyle = {
  fontSize: 16,
  letterSpacing: '.09em',
  fontWeight: 800,
} as const;

const visualLabelStyle = {
  alignSelf: 'flex-start',
  borderRadius: 9999,
  padding: '6px 8px',
  background: 'var(--color-background-card)',
  color: 'var(--color-text-primary)',
  fontSize: 16,
} as const;

const storyTextOverlayStyle = {
  position: 'absolute',
  left: 16,
  right: 16,
  bottom: 28,
  padding: 12,
  borderRadius: 8,
  background: 'var(--color-background-card)',
  color: 'var(--color-text-primary)',
} as const;

const storyTitleStyle = {
  margin: '0 0 6px',
  fontSize: 25,
  lineHeight: 1.08,
  fontWeight: 800,
} as const;

const storyBodyStyle = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.35,
} as const;

const storyCountStyle = {
  position: 'absolute',
  right: 10,
  top: 10,
  fontSize: 16,
  fontWeight: 700,
  background: 'var(--color-background-card)',
  color: 'var(--color-text-primary)',
  borderRadius: 9999,
  padding: '5px 8px',
} as const;

const slideFieldsStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  paddingTop: 12,
} as const;

const targetGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
  gap: 10,
} as const;

const actionRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
  gap: 10,
} as const;

const actionButtonStyle = {
  minHeight: 48,
} as const;

const lockedNoteStyle = {
  gridColumn: '1 / -1',
  borderRadius: 10,
  background: 'var(--color-background-muted)',
  padding: 12,
  color: 'var(--color-text-secondary)',
  fontSize: 16,
} as const;

const stateNoteStyle = {
  margin: 0,
  color: 'var(--color-text-primary)',
  fontSize: 16,
  lineHeight: 1.4,
} as const;

const publishedNoteStyle = {
  margin: 0,
  color: 'var(--color-success)',
  fontWeight: 700,
  fontSize: 16,
} as const;

const actualPublishNoteStyle = {
  margin: 0,
  color: 'var(--color-text-secondary)',
  fontSize: 16,
  lineHeight: 1.4,
} as const;
