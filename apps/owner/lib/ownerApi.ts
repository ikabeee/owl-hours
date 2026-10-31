// The signed-in owner's calls to the Zukki API (/v1/owner): the session token goes on every request,
// the { success, data } envelope is unwrapped, and a failure carries the API's error code.
export type OwnerApiDeps = { baseUrl: string; getToken: () => Promise<string>; fetch: typeof fetch };

export type OwnerApi = {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
};

export class OwnerApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "OwnerApiError";
    this.status = status;
    this.code = code;
  }
}

type Envelope<T> = { success?: boolean; data?: T; error?: { code?: string; message?: string } };

export function createOwnerApi(deps: OwnerApiDeps): OwnerApi {
  const base = `${deps.baseUrl.replace(/\/$/, "")}/v1/owner`;

  async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const token = await deps.getToken();
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    if (body !== undefined) headers["content-type"] = "application/json";
    const response = await deps.fetch(`${base}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const parsed = (await response.json().catch(() => null)) as Envelope<T> | null;
    if (!response.ok || !parsed?.success) {
      throw new OwnerApiError(
        response.status,
        parsed?.error?.code ?? "http_error",
        parsed?.error?.message ?? `Owner API ${method} ${path} failed (${response.status})`,
      );
    }
    return parsed.data as T;
  }

  return {
    get: (path) => call("GET", path),
    post: (path, body) => call("POST", path, body ?? {}),
  };
}
