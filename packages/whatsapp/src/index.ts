// WhatsApp Cloud API sender. Webhooks carry only a media ID;
// fetching the media URL, downloading, and storing in object storage
// (TBD) lands in the next slice.
export type InteractiveButton = { id: string; title: string };

export async function sendTextMessage(_to: string, _body: string): Promise<void> {
  throw new Error("todo: WhatsApp send (next slice)");
}

export async function sendInteractiveMessage(
  _to: string,
  _body: string,
  _buttons: InteractiveButton[],
): Promise<void> {
  throw new Error("todo: WhatsApp interactive (next slice)");
}
