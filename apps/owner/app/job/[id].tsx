// Native wrapper: owns data, navigation and safe areas. The DOM screen only draws. OwJob.
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import JobScreen from '../../features/jobs/components/JobScreen';
import { useJob } from '../../features/jobs/hooks/useJob';

export default function JobRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const job = useJob(id);
  if (!job) return null;

  return (
    <JobScreen
      job={job.job}
      insets={{ top: insets.top, bottom: insets.bottom }}
      onAdvance={job.advance}
      onBack={async () => router.back()}
      dom={domHost}
    />
  );
}

// Expo's DOM wrapper defaults to contentInsetAdjustmentBehavior "automatic", which adds the
// safe area on top of the insets the screens already pad, so the screens own the insets alone.
const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
