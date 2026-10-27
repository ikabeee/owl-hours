// Screen 07 (HfMap): tonight's map with the technician's position.
// Lands with the Should scope: MapLibre on web, react-native-maps on mobile.
import { StyleSheet, Text, View } from "react-native";

export default function MapScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.body}>Tonight's map lands in the next slice.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { fontSize: 16 },
});
