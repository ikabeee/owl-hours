// Spec: odd/tasks/owner-business.md S3: validation as in the quote, positive whole numbers.
export function isValidPrice(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}
