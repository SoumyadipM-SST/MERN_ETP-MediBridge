export const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export async function api(path, options = {}) {
  const form = options.body instanceof FormData;
  const response = await fetch(`${API}/api${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "X-MediBridge": "1",
      ...(!form ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body
      ? form
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });
  const result = await response.json().catch(() => ({
    error: { message: "The server could not be reached. Try again." },
  }));
  if (!response.ok) {
    const error = new Error(result.error?.message || "The request failed.");
    error.status = response.status;
    throw error;
  }
  return result.data;
}
