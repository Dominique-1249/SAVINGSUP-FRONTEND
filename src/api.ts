import type {
  AuthResult,
  DashboardData,
  EntryInput,
  SavingsEntry,
  User,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const body = (await response.json().catch(() => null)) as
    | { data?: T }
    | ApiErrorBody
    | null;

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    const firstValidationError = errorBody?.errors
      ? Object.values(errorBody.errors)[0]?.[0]
      : undefined;

    throw new Error(
      firstValidationError ||
        errorBody?.message ||
        "Something went wrong. Please try again.",
    );
  }

  return (body as { data: T }).data;
}

export function registerUser(input: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}) {
  return request<AuthResult>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginUser(input: { email: string; password: string }) {
  return request<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getMe(token: string) {
  return request<{ user: User }>("/auth/me", {}, token);
}

export function logoutUser(token: string) {
  return request<{ ok: boolean }>(
    "/auth/logout",
    { method: "POST" },
    token,
  );
}

export async function getDashboard(token: string) {
  const [dashboard, entries] = await Promise.all([
    request<DashboardData>("/savings/summary", {}, token),
    request<{ entries: SavingsEntry[] }>("/savings/entries", {}, token),
  ]);

  return { ...dashboard, entries: entries.entries };
}

export function createEntry(token: string, input: EntryInput) {
  return request<{ entry: SavingsEntry }>(
    "/savings/entries",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    token,
  );
}

export function deleteEntry(token: string, id: number) {
  return request<{ message: string }>(
    `/savings/entries/${id}`,
    { method: "DELETE" },
    token,
  );
}

export function saveGoal(
  token: string,
  input: { name: string; target_amount: string },
) {
  return request<{ goal: { id: number; name: string; target_amount: string } }>(
    "/savings/goal",
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
    token,
  );
}
