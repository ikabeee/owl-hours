// Customers arrive as "first name + initial" ("Ana L."); the chat greets by first name.
export function firstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}
