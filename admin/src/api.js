const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1").replace(/\/+$/, "");

function apiEndpoint(path) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiEndpoint(path), { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "درخواست انجام نشد.");
  }
  if (response.status === 204) return null;
  return response.json();
}
