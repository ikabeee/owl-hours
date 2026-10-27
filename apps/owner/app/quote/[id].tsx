// Screen 05 (HfQuote): line items, estimated total, owner confirm.
// Wires POST /jobs/:id/propose with actor owner in the next slice.
import { StyleSheet, Text, View } from "react-native";

export default function QuoteScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.body}>Quote confirm lands in the next slice.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { fontSize: 16 },
});
