export const ADMIN_API_TOKEN_STORAGE_KEY = 'tracking-console.adminApiToken';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

export function getAdminApiToken(): string | undefined {
  const storage = getStorage();
  if (!storage) {
    return undefined;
  }

  const token = storage.getItem(ADMIN_API_TOKEN_STORAGE_KEY)?.trim();
  return token && token.length > 0 ? token : undefined;
}

export function setAdminApiToken(token: string): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const trimmed = token.trim();
  if (trimmed.length === 0) {
    storage.removeItem(ADMIN_API_TOKEN_STORAGE_KEY);
    return;
  }

  storage.setItem(ADMIN_API_TOKEN_STORAGE_KEY, trimmed);
}

export function clearAdminApiToken(): void {
  const storage = getStorage();
  storage?.removeItem(ADMIN_API_TOKEN_STORAGE_KEY);
}
