import { env } from '../config/env';

function joinUrl(path: string) {
  return `${env.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(joinUrl(path), {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(joinUrl(path), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(`POST ${path} failed with status ${response.status}`);
  }

  return data;
}
