// Customers arrive as "first name + initial" ("Ana L."); screens greet by first name.
export function firstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}
