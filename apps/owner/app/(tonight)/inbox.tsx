// Screen 04 (HfInbox): tonight's jobs grouped into the three tabs.
// Example feature: data comes from GET /jobs, grouping from lib/tonight.
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { JobCard } from "../../components/JobCard.tsx";
import { listJobs } from "../../lib/api-client.ts";
import { groupJobsByTab } from "../../lib/tonight.ts";
import type { TonightJob, TonightTabs } from "../../lib/tonight.ts";

export default function InboxScreen() {
  const [tabs, setTabs] = useState<TonightTabs | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    listJobs().then(
      (jobs) => setTabs(groupJobsByTab(jobs)),
      () => setFailed(true),
    );
  }, []);

  if (failed) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Could not load tonight's jobs.</Text>
      </View>
    );
  }
  if (tabs === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <ScrollView style={styles.list}>
      <TabSection title="Needs you" jobs={tabs.needsYou} />
      <TabSection title="Assistant" jobs={tabs.assistant} />
      <TabSection title="Booked" jobs={tabs.booked} />
    </ScrollView>
  );
}

function TabSection({ title, jobs }: { title: string; jobs: TonightJob[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>
        {title} · {jobs.length}
      </Text>
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: { padding: 16, gap: 8 },
  heading: { fontSize: 20, fontWeight: "700" },
  body: { fontSize: 16 },
});
