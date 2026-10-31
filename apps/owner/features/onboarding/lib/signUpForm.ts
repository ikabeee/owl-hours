// Sign-up form validity: "Send code", disabled until the form is valid (HANDOFF-RN-UI section 8).
// Email check (operator decision): the value trimmed must hold one "@" with a "." in the
// domain part; Supabase validates the rest.
export type SignUpForm = { name: string; email: string; termsAccepted: boolean };

export function isSendCodeEnabled(form: SignUpForm): boolean {
  return hasName(form.name) && hasValidEmail(form.email) && form.termsAccepted;
}

function hasName(name: string): boolean {
  return name.trim() !== "";
}

function hasValidEmail(email: string): boolean {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return false;
  const domain = trimmed.slice(at + 1);
  return domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}
