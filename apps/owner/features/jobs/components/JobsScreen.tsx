// Placeholder: OwJobs lands in the jobs slice.
import { StyleSheet, Text, View } from "react-native";

export default function JobsScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.body}>Jobs lands in the next slice.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { fontSize: 16 },
});
