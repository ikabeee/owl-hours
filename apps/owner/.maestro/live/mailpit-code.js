// Reads the newest sign-in code from the local Supabase Mailpit into output.code.
const list = json(http.get(`${MAILPIT_URL}/api/v1/messages`).body);
const message = json(http.get(`${MAILPIT_URL}/api/v1/message/${list.messages[0].ID}`).body);
output.code = message.Text.match(/\b(\d{6})\b/)[1];
