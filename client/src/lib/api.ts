export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('X-PesoWise-Request', '1');
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers, credentials: 'include' });
  } catch {
    throw new ApiError(0, 'Cannot reach PesoWise. Check that the server is running.');
  }
  if (response.status === 204) return undefined as T;
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/api/auth/')) {
      window.dispatchEvent(new Event('pesowise:unauthorized'));
    }
    const message = payload && typeof payload.error === 'string' ? payload.error : 'Something went wrong.';
    const fields = payload && payload.fields && typeof payload.fields === 'object' ? (payload.fields as Record<string, string>) : undefined;
    throw new ApiError(response.status, message, fields);
  }
  return payload as T;
}

export function withQuery(path: string, params: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export async function downloadCsv(path: string, fallbackName: string): Promise<void> {
  const response = await fetch(path, { credentials: 'include', headers: { 'X-PesoWise-Request': '1' } });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(response.status, payload?.error ?? 'Could not export this file.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const header = response.headers.get('Content-Disposition');
  const match = header?.match(/filename="([^"]+)"/);
  link.href = url;
  link.download = match?.[1] ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
