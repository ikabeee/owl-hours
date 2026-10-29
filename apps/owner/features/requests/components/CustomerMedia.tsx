import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { useLightbox } from '@astryxdesign/core/Lightbox';
import bathLeak from '../../../assets/img/bathLeak';
import type { Media } from '../../../shared/data/types';
import { requestsCopys } from '../copys/requestsCopys';
import { mediaDurationText } from '../lib/mediaDurationText';
import { mediaFrameSource } from '../lib/mediaFrameSource';
import './requestScreen.css';

// Until the backend serves real URLs, the demo media ids resolve to the embedded frames.
const demoFrames: Record<string, string> = { 'bath-leak': bathLeak };

// The demo has no video file: the lightbox shows the frame, captioned with the kind and duration.
// Media without a loadable frame shows only its caption instead of a blank banner.
export function CustomerMedia({ media }: { media: Media }) {
  const caption = describeMedia(media);
  const frame = mediaFrameSource(media.thumbUrl, demoFrames);

  return (
    <VStack gap={1}>
      {frame && <MediaBanner frame={frame} caption={caption} />}
      <Text type="supporting">{caption}</Text>
    </VStack>
  );
}

// Owns the lightbox hook, so it only mounts when there is a frame to show.
function MediaBanner({ frame, caption }: { frame: string; caption: string }) {
  const lightbox = useLightbox({ media: { src: frame, alt: requestsCopys.videoFrameAlt, caption, type: 'image' } });

  return (
    <>
      <Thumbnail className="zukki-media-banner" src={frame} alt={requestsCopys.videoFrameAlt} onClick={() => lightbox.open()} />
      {lightbox.element}
    </>
  );
}

// "Video · 0:14"; a photo or a video of unknown length is just its kind.
function describeMedia(media: Media) {
  const kind = media.kind === 'video' ? requestsCopys.videoLabel : requestsCopys.photoLabel;
  const duration = mediaDurationText(media);
  return duration ? `${kind} · ${duration}` : kind;
}
