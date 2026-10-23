const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  full_name: string;
}

async function apiRequest<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let detail = `Lỗi ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {}
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const body = new URLSearchParams({ username, password });
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: body.toString(),
  });
}

export async function register(fullName: string, email: string, password: string): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ full_name: fullName, email, password }),
    headers: { "Content-Type": "application/json" },
  });
}

export function saveToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("access_token");
}

export function removeToken() {
  localStorage.removeItem("access_token");
}
