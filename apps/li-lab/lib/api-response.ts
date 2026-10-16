export type ApiErrorPayload = {
  error: string;
  code?: string;
  detail?: string;
};

export async function readApiResponse<T>(response: Response): Promise<T | ApiErrorPayload> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("application/json")) {
    try {
      return await response.json() as T | ApiErrorPayload;
    } catch {
      return { error: `The server returned an invalid response (${response.status}).`, code: "INVALID_RESPONSE" };
    }
  }

  const text = (await response.text()).trim();
  if (response.status === 413) return { error: "The uploaded file is too large.", code: "FILE_TOO_LARGE" };
  return {
    error: text || `Request failed with status ${response.status}.`,
    code: response.status >= 500 ? "SERVER_ERROR" : "REQUEST_FAILED"
  };
}

export function apiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") return payload.error;
  return fallback;
}
