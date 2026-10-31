import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { contentCopys as copy } from '../copys/contentCopys.ts';

export function Loading() {
  return (
    <Card padding={4}>
      <Text type="supporting" style={loadingTextStyle}>
        {copy.loading}
      </Text>
    </Card>
  );
}

const loadingTextStyle = {
  fontSize: 16,
  lineHeight: 1.5,
} as const;
