// Sign-up form validity: "Send code", disabled until the form is valid (HANDOFF-RN-UI section 8).
// Phone rule (operator, L2): 10-15 digits once spaces, "+" and dashes are removed (E.164 maximum).
export type SignUpForm = { name: string; phone: string; termsAccepted: boolean };

const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;

export function isSendCodeEnabled(form: SignUpForm): boolean {
  return hasName(form.name) && hasValidPhone(form.phone) && form.termsAccepted;
}

function hasName(name: string): boolean {
  return name.trim() !== "";
}

function hasValidPhone(phone: string): boolean {
  const digits = phone.replace(/[+\s-]/g, "");
  return (
    /^\d+$/.test(digits) && digits.length >= MIN_PHONE_DIGITS && digits.length <= MAX_PHONE_DIGITS
  );
}
