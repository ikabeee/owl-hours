import { useState } from 'react';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Selector } from '@astryxdesign/core/Selector';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Button } from '@astryxdesign/core/Button';
import { contentCopys as copy } from '../copys/contentCopys.ts';
import type { StoryPhotoJob } from '../lib/storyPack.ts';

export type PhotoJobView = StoryPhotoJob;

export type StoryPhotoAssignmentsProps = {
  jobs: PhotoJobView[];
  onAssign: (
    jobId: string,
    beforeMediaId: string,
    afterMediaId: string,
  ) => Promise<void>;
};

export function StoryPhotoAssignments({
  jobs,
  onAssign,
}: StoryPhotoAssignmentsProps) {
  return (
    <section>
      <Heading level={2}>{copy.photoJobsTitle}</Heading>
      <Text type="supporting" style={descriptionStyle}>
        {copy.photoJobsDescription}
      </Text>
      {jobs.length === 0 ? (
        <Text style={emptyJobsStyle}>{copy.noPhotoJobs}</Text>
      ) : (
        jobs.map((job) => (
          <PhotoJobCard key={job.id} job={job} onAssign={onAssign} />
        ))
      )}
    </section>
  );
}

function PhotoJobCard({
  job,
  onAssign,
}: {
  job: PhotoJobView;
  onAssign: (
    jobId: string,
    beforeMediaId: string,
    afterMediaId: string,
  ) => Promise<void>;
}) {
  const initialBefore =
    job.assets.find((asset) => asset.role === 'before')?.id ?? '';
  const initialAfter =
    job.assets.find((asset) => asset.role === 'after')?.id ?? '';

  const [before, setBefore] = useState(initialBefore);
  const [after, setAfter] = useState(initialAfter);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const blockedMessage =
    job.assignmentBlockedReason === 'ambiguous_conversation'
      ? copy.photoAmbiguous
      : copy.photoConsentRequired;

  const allowed = job.shareConsent === 'yes' && !job.assignmentBlockedReason;
  const hasValidAssets =
    job.assets.some((asset) => asset.id === before) &&
    job.assets.some((asset) => asset.id === after);
  const valid = allowed && confirmed && before !== after && hasValidAssets;

  async function handleAssign() {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    try {
      await onAssign(job.id, before, after);
      setConfirmed(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article style={cardStyle}>
      <Heading level={3} style={titleStyle}>
        {job.jobTitle}
      </Heading>
      <Text style={businessNameStyle}>{job.businessName}</Text>
      <Text style={consentTextStyle}>
        {job.shareConsent === 'yes'
          ? copy.photoConsentGranted
          : copy.photoConsentMissing}
        {job.consentRecordedAt && (
          <>
            {' · '}
            <time dateTime={job.consentRecordedAt}>
              {new Date(job.consentRecordedAt).toLocaleString('en-US')}
            </time>
          </>
        )}
      </Text>
      {!allowed && <p role="status">{blockedMessage}</p>}
      {allowed && (
        <>
          <div style={pairStyle}>
            <PhotoSelectorField
              label={copy.before}
              job={job}
              value={before}
              onChange={(value) => {
                setBefore(value);
                setConfirmed(false);
              }}
            />
            <PhotoSelectorField
              label={copy.after}
              job={job}
              value={after}
              onChange={(value) => {
                setAfter(value);
                setConfirmed(false);
              }}
            />
          </div>
          {before && before === after && (
            <p role="alert" style={alertStyle}>
              {copy.differentPhotos}
            </p>
          )}
          <div style={checkboxWrapperStyle}>
            <CheckboxInput
              label={copy.confirmPhotoAssignment}
              value={confirmed}
              onChange={(checked) => setConfirmed(checked)}
            />
          </div>
          <Button
            label={busy ? copy.savingPhotos : copy.savePhotos}
            variant="secondary"
            size="lg"
            isDisabled={!valid || busy}
            isLoading={busy}
            onClick={handleAssign}
          />
        </>
      )}
    </article>
  );
}

function PhotoSelectorField({
  label,
  job,
  value,
  onChange,
}: {
  label: string;
  job: PhotoJobView;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = job.assets.find((asset) => asset.id === value);
  const options = job.assets.map((asset, index) => ({
    value: asset.id,
    label: copy.photoChoice(index + 1, asset.role),
  }));

  return (
    <div style={fieldStyle}>
      <Selector
        label={label}
        hasClear={false}
        placeholder={copy.choosePhoto}
        options={options}
        value={value}
        onChange={onChange}
        size="lg"
      />
      {selected?.imageUrl && (
        <img
          src={selected.imageUrl}
          alt={label}
          style={previewImageStyle}
        />
      )}
    </div>
  );
}

const descriptionStyle = {
  fontSize: 16,
  lineHeight: 1.5,
  margin: '8px 0 0',
} as const;

const emptyJobsStyle = {
  fontSize: 16,
  lineHeight: 1.5,
  margin: '12px 0 0',
} as const;

const cardStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: 16,
  marginTop: 12,
} as const;

const titleStyle = {
  margin: 0,
} as const;

const businessNameStyle = {
  margin: 0,
  fontSize: 16,
} as const;

const consentTextStyle = {
  margin: 0,
  fontSize: 16,
} as const;

const pairStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
  gap: 12,
} as const;

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
} as const;

const previewImageStyle = {
  width: '100%',
  height: 160,
  objectFit: 'cover',
  borderRadius: 8,
} as const;

const alertStyle = {
  color: 'var(--color-text-primary)',
  margin: '4px 0',
  fontSize: 16,
} as const;

const checkboxWrapperStyle = {
  minHeight: 48,
  display: 'flex',
  alignItems: 'center',
} as const;
