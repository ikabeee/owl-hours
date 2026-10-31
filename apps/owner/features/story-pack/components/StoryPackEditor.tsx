import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
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
import { storyPackServiceCopys } from '../copys/storyPackServiceCopys.ts';
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
  approving,
  dirty,
}: StoryPackEditorProps) {
  const isReadOnly = draft.status !== 'draft' || approving;

  return (
    <VStack gap={4}>
      <EditorHeading draft={draft} />
      <StatusSteps status={draft.status} />
      {draft.isDemo && (
        <VStack gap={1}>
          <Text type="label">{copy.demoContentLabel}</Text>
          <Text type="supporting">{copy.demoVisualDescription}</Text>
        </VStack>
      )}
      <div style={slideGridStyle}>
        {draft.slides.map((slide, index) => (
          <SlideEditor
            key={index}
            draft={draft}
            source={source}
            index={index}
            isReadOnly={isReadOnly}
            onChangeSlide={onChangeSlide}
          />
        ))}
      </div>
      <CaptionAndTargets
        draft={draft}
        isReadOnly={isReadOnly}
        onChangeCaption={onChangeCaption}
        onChangeTarget={onChangeTarget}
      />
      <EditorNotes draft={draft} receipt={receipt} dirty={dirty} />
    </VStack>
  );
}

function EditorHeading({ draft }: { draft: StoryPack }) {
  return (
    <VStack gap={1}>
      <Text type="label">{copy.previewLabel}</Text>
      <Heading level={2}>{draft.jobTitle}</Heading>
      <Text type="supporting">{copy.sourceLine(draft.businessName, draft.isDemo)}</Text>
      <Text type="label" role="status">{storyPackStatusLabel(draft.status)}</Text>
    </VStack>
  );
}

function SlideEditor({
  draft,
  source,
  index,
  isReadOnly,
  onChangeSlide,
}: {
  draft: StoryPack;
  source: StorySource | null;
  index: number;
  isReadOnly: boolean;
  onChangeSlide: StoryPackEditorProps['onChangeSlide'];
}) {
  const slide = draft.slides[index];
  const expectedRole = index === 0 ? 'before' : 'after';
  const asset = source?.assets.find(
    (candidate) =>
      draft.sourceMediaIds.includes(candidate.id) &&
      candidate.role === expectedRole,
  );
  const unavailableLabel = draft.isDemo ? copy.sampleVisual : copy.photoUnavailable;
  const imageLabel = asset?.label ?? unavailableLabel;

  return (
    <article style={slideCardStyle}>
      <div style={storyCanvasStyle}>
        {asset?.imageUrl ? (
          <img src={asset.imageUrl} alt={asset.label} style={storyImageStyle} />
        ) : (
          <div style={visualPlaceholderStyle}>
            <span style={storyKickerStyle}>{copy.storyKicker(index)}</span>
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
          isReadOnly={isReadOnly}
          size="md"
        />
        <TextArea
          label={copy.slideBodyLabel}
          value={slide.body}
          onChange={(value) => onChangeSlide(index, 'body', value)}
          rows={3}
          maxLength={STORY_PACK_LIMITS.slideBody}
          isReadOnly={isReadOnly}
          size="md"
        />
      </div>
    </article>
  );
}

function CaptionAndTargets({
  draft,
  isReadOnly,
  onChangeCaption,
  onChangeTarget,
}: {
  draft: StoryPack;
  isReadOnly: boolean;
  onChangeCaption: StoryPackEditorProps['onChangeCaption'];
  onChangeTarget: StoryPackEditorProps['onChangeTarget'];
}) {
  return (
    <Card padding={4}>
      <VStack gap={3}>
        <VStack gap={1}>
          <Heading level={2}>{copy.captionLabel}</Heading>
          <Text type="supporting">{copy.captionGuidance}</Text>
        </VStack>
        <TextArea
          label={copy.captionLabel}
          isLabelHidden
          value={draft.caption}
          onChange={onChangeCaption}
          rows={3}
          maxLength={STORY_PACK_LIMITS.caption}
          isReadOnly={isReadOnly}
          size="md"
        />
        <Divider />
        <VStack gap={1}>
          <Text type="label">{copy.destinations}</Text>
          <Text type="supporting">{copy.destinationGuidance}</Text>
        </VStack>
        <HStack gap={4} wrap="wrap">
          <TargetToggle
            label={copy.facebook}
            selected={draft.platforms.facebook}
            disabled={isReadOnly}
            onChange={(checked) => onChangeTarget('facebook', checked)}
            icon={<Share2 size={18} />}
          />
          <TargetToggle
            label={copy.instagram}
            selected={draft.platforms.instagram}
            disabled={isReadOnly}
            onChange={(checked) => onChangeTarget('instagram', checked)}
            icon={<Camera size={18} />}
          />
        </HStack>
      </VStack>
    </Card>
  );
}

function EditorNotes({
  draft,
  receipt,
  dirty,
}: {
  draft: StoryPack;
  receipt: string | null;
  dirty: boolean;
}) {
  const editable = draft.status === 'draft';
  const approved = draft.status === 'approved';
  const hasNoFormat = !draft.platforms.facebook && !draft.platforms.instagram;

  return (
    <VStack gap={2}>
      {!editable && !approved && <Text type="supporting">{copy.editLocked}</Text>}
      {dirty && <Text role="status">{copy.unsavedChanges}</Text>}
      {approved && <Text>{copy.approvalStatus}</Text>}
      {receipt && <Text>{copy.receipt(receipt)}</Text>}
      {approved && !draft.canHandoff && <Text role="status">{copy.handoffBlocked}</Text>}
      {editable && hasNoFormat && <Text>{storyPackServiceCopys.chooseFormat}</Text>}
      {draft.slides.length !== 3 && <Text role="status">{copy.legacyDraft}</Text>}
      <Text type="supporting">{copy.exportContents}</Text>
      {draft.status === 'published' && <Text weight="bold">{copy.publishedStatus}</Text>}
      <Text type="supporting">{copy.actualPublishStatus}</Text>
    </VStack>
  );
}

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
