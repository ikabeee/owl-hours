// Placeholder: OwContent lands in the content slice.
import { StyleSheet, Text, View } from "react-native";

export default function ContentScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.body}>Content lands in the next slice.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { fontSize: 16 },
});
