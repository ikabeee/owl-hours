import { Text } from '@astryxdesign/core/Text';
import type { JobView } from '../lib/jobView.ts';
import './jobsScreen.css';

// Real events first, then the steps still ahead (muted, without a time).
export function JobTimeline(props: { events: JobView['timeline']; pendingSteps: string[] }) {
  return (
    <div role="list">
      {props.events.map((event) => (
        <TimelineRow key={`${event.timeText}-${event.text}`} timeText={event.timeText} text={event.text} />
      ))}
      {props.pendingSteps.map((step) => (
        <TimelineRow key={step} timeText={null} text={step} isPending />
      ))}
    </div>
  );
}

function TimelineRow(props: { timeText: string | null; text: string; isPending?: boolean }) {
  return (
    <div role="listitem" className={props.isPending ? 'zukki-timeline-row zukki-timeline-row-pending' : 'zukki-timeline-row'}>
      <Text type="supporting" className="zukki-timeline-time">{props.timeText ?? ''}</Text>
      <span className="zukki-timeline-dot" aria-hidden />
      <Text>{props.text}</Text>
    </div>
  );
}
