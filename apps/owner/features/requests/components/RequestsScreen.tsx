// Placeholder: OwRequests lands in the requests slice.
import { StyleSheet, Text, View } from "react-native";

export default function RequestsScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.body}>Requests lands in the next slice.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { fontSize: 16 },
});
