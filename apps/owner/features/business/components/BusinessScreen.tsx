// Placeholder: OwBusiness lands in the business slice.
import { StyleSheet, Text, View } from "react-native";

export default function BusinessScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.body}>Business lands in the next slice.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { fontSize: 16 },
});
