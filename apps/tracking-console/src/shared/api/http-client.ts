import { env } from '../config/env';
import { getAdminApiToken } from '../lib/admin-api-token';

function joinUrl(path: string) {
  return `${env.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function isAdminRequest(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

function buildHeaders(path: string, contentType?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  };

  if (contentType) {
    headers['content-type'] = contentType;
  }

  if (isAdminRequest(path)) {
    const token = getAdminApiToken();
    if (token) {
      headers.ADMIN_API_TOKEN = token;
    }
  }

  return headers;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(joinUrl(path), {
    method: 'GET',
    headers: buildHeaders(path)
  });

  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(joinUrl(path), {
    method: 'POST',
    headers: buildHeaders(path, 'application/json'),
    body: JSON.stringify(body)
  });

  const data = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(`POST ${path} failed with status ${response.status}`);
  }

  return data;
}
