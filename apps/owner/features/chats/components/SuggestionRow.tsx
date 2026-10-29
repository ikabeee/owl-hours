import type { CSSProperties } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Sparkles } from 'lucide-react';
import { chatsCopys } from '../copys/chatsCopys';

// Zukki's suggestion above the composer: "Zukki suggests sending the quote: $130–160" and a ghost "Review".
// The text wraps and the button keeps its width, so "Review" is never truncated on a narrow screen.
export function SuggestionRow(props: { quoteText: string; onReview: () => Promise<void> }) {
  return (
    <div style={rowStyle}>
      <Sparkles size={18} aria-hidden style={iconStyle} />
      <div style={textStyle}>
        <Text type="supporting">{chatsCopys.zukkiSuggestsQuote} {props.quoteText}</Text>
      </div>
      <div style={actionStyle}>
        <Button label={chatsCopys.reviewQuote} variant="ghost" size="lg" onClick={() => props.onReview()} />
      </div>
    </div>
  );
}

const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const iconStyle: CSSProperties = { flexShrink: 0 };
const textStyle: CSSProperties = { flex: 1, minWidth: 0 };
const actionStyle: CSSProperties = { flexShrink: 0 };
