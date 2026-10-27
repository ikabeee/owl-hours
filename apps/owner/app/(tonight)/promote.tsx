// Screen 10 (HfPromote): ad preview from consented job photos.
// Lands with the Could scope (ad studio).
import { StyleSheet, Text, View } from "react-native";

export default function PromoteScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.body}>Ad studio lands in the next slice.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { fontSize: 16 },
});
