export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ error: 'Không kết nối được máy chủ.' }));
    throw new Error(body.error ?? 'Yêu cầu thất bại.');
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}
export function post<T>(path: string, body: unknown) {
  return api<T>(path, { method: 'POST', body: JSON.stringify(body) });
}
