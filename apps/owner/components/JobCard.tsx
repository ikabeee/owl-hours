import { StyleSheet, Text, View } from "react-native";
import type { TonightJob } from "../lib/tonight.ts";

type JobCardProps = {
  job: TonightJob;
};

export function JobCard({ job }: JobCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{job.title}</Text>
      <Text style={styles.meta}>
        {job.customer} · ${job.total_min}-${job.total_max} · {job.arrival_window}
      </Text>
      <Text style={styles.state}>{job.state}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#ffffff", padding: 16, borderRadius: 8 },
  title: { fontSize: 17, fontWeight: "600" },
  meta: { fontSize: 16, color: "#555555" },
  state: { fontSize: 16, color: "#0074e2" },
});
