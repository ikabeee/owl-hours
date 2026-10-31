// Accessible label for a job card: title, customer and price, and the status line under it.
export function jobCardLabel(card: { title: string; subtitle: string; statusText: string }): string {
  return `${card.title}, ${card.subtitle}, ${card.statusText}`;
}
