// Thin route adapter: the Jobs module owns the screen. OwJobs.
import { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import JobsScreen from '../../features/jobs/components/JobsScreen';
import { useJobs } from '../../features/jobs/hooks/useJobs';

export default function JobsRoute() {
  const insets = useSafeAreaInsets();
  const { jobs, reload } = useJobs();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  if (!jobs) return null;

  return (
    <JobsScreen
      jobs={jobs}
      insets={{ top: insets.top, bottom: insets.bottom }}
      onOpenJob={async (id) => router.push(`/job/${id}`)}
      dom={domHost}
    />
  );
}

// Expo's DOM wrapper defaults to contentInsetAdjustmentBehavior "automatic", which adds the
// safe area on top of the insets the screens already pad, so the screens own the insets alone.
const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
