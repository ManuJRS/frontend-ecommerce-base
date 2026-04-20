import { API_URL } from '@/shared/config/api';

/** Origen del servidor Strapi (sin `/api`), para prefijar rutas `/uploads/...`. */
export function getStrapiOrigin(): string {
  try {
    return new URL(API_URL).origin;
  } catch {
    return 'http://localhost:1337';
  }
}

/** Si la URL del media es relativa, la concatena al origen de Strapi. */
export function resolveStrapiMediaUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const origin = getStrapiOrigin();
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}
