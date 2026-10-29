import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import { useLightbox } from '@astryxdesign/core/Lightbox';
import bathLeak from '../../../assets/img/bathLeak';
import type { Media } from '../../../shared/data/types';
import { requestsCopys } from '../copys/requestsCopys';
import { mediaDurationText } from '../lib/mediaDurationText';
import './requestScreen.css';

// Until the backend serves real URLs, the demo media ids resolve to the embedded frames.
const demoFrames: Record<string, string> = { 'bath-leak': bathLeak };

// The demo has no video file: the lightbox shows the frame, captioned with the kind and duration.
export function CustomerMedia({ media }: { media: Media }) {
  const caption = describeMedia(media);
  const frame = demoFrames[media.thumbUrl];
  const lightbox = useLightbox({ media: { src: frame ?? '', alt: requestsCopys.videoFrameAlt, caption, type: 'image' } });

  return (
    <VStack gap={1}>
      <Thumbnail className="zukki-media-banner" src={frame} alt={requestsCopys.videoFrameAlt} onClick={() => lightbox.open()} />
      <Text type="supporting">{caption}</Text>
      {lightbox.element}
    </VStack>
  );
}

// "Video · 0:14"; a photo or a video of unknown length is just its kind.
function describeMedia(media: Media) {
  const kind = media.kind === 'video' ? requestsCopys.videoLabel : requestsCopys.photoLabel;
  const duration = mediaDurationText(media);
  return duration ? `${kind} · ${duration}` : kind;
}
