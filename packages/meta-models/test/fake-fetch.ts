// A recording fetch for client tests: no network, every call is captured.
export type RecordedCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  json: unknown;
  form: FormData | null;
};

export function fakeFetch(respond: (call: RecordedCall) => Response) {
  const calls: RecordedCall[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const body = init?.body;
    const call: RecordedCall = {
      url: String(input),
      method: init?.method ?? "GET",
      headers,
      json: typeof body === "string" ? JSON.parse(body) : null,
      form: body instanceof FormData ? body : null,
    };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { fn, calls };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
