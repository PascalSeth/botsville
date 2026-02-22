/**
 * Dashboard API client - fetches with credentials (session cookie)
 */

export async function dashboardFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    const json = await res.json();
    if (!res.ok) {
      return { error: (json as { error?: string }).error ?? `Request failed (${res.status})` };
    }
    return { data: json as T };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { error: message };
  }
}
