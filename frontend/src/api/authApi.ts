import { API_BASE_URL } from "./config";

const ACCESS_TOKEN_KEY = "emotionai-access-token";

export function hasAccessToken(): boolean {
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY) !== null;
}

export function getAccessToken(): string | null {
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function logout(): void {
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

interface AuthErrorResponse {
  detail?: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export async function register(
  email: string,
  password: string,
  fullName: string
): Promise<RegisteredUser> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });

  return readResponse<RegisteredUser>(response);
}

export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
  });
  const result = await readResponse<{ access_token: string }>(response);
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, result.access_token);
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Yêu cầu thất bại (HTTP ${response.status})`;
    try {
      const body = (await response.json()) as AuthErrorResponse;
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // Keep the HTTP status message when the server response is not JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
