// Placeholder: OwChats lands in the chat slice.
import { StyleSheet, Text, View } from "react-native";

export default function ChatsScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.body}>Chats lands in the next slice.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { fontSize: 16 },
});
