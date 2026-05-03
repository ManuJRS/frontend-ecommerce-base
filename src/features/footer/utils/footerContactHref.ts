/**
 * Normalización de `href` para enlaces de contacto del footer (correo y teléfono).
 * Cada función exportada tiene una única razón de cambio (SRP): solo correo o solo teléfono.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

/** Dígitos mínimos razonables para un número marcable (evita confundir códigos cortos con rutas). */
const PHONE_MIN_SIGNIFICANT_DIGITS = 7;

/** Límite superior alineado con E.164 (sin contar el prefijo +). */
const PHONE_MAX_DIGITS = 15;

function trimOrEmpty(value: string | null | undefined): string {
  if (value == null) return '';
  return String(value).trim();
}

function stripTelScheme(value: string): string {
  return value.replace(/^tel:/iu, '').trim();
}

function onlySignificantDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Si el valor parece un correo electrónico, devuelve un `mailto:` válido; si no, `null`.
 * No interpreta rutas ni otros esquemas; solo texto tipo correo o `mailto:` ya presente.
 */
export function toMailtoHrefIfEmail(value: string | null | undefined): string | null {
  const raw = trimOrEmpty(value);
  if (!raw) return null;

  if (/^mailto:/iu.test(raw)) {
    const addr = raw.replace(/^mailto:/iu, '').split('?')[0]?.trim() ?? '';
    return EMAIL_PATTERN.test(addr) ? `mailto:${addr}` : null;
  }

  return EMAIL_PATTERN.test(raw) ? `mailto:${raw}` : null;
}

/**
 * Si el valor parece un número telefónico marcable, devuelve un `tel:` normalizado; si no, `null`.
 * Acepta dígitos, espacios, guiones, paréntesis y punto; opcionalmente un `+` inicial.
 */
export function toTelHrefIfPhone(value: string | null | undefined): string | null {
  const raw = trimOrEmpty(value);
  if (!raw || /@/.test(raw)) return null;

  if (/^mailto:/iu.test(raw)) return null;
  if (/^https?:\/\//iu.test(raw) || /^\/\//u.test(raw)) return null;

  let candidate = raw;
  if (/^tel:/iu.test(candidate)) {
    candidate = stripTelScheme(candidate);
  }

  const hasPlus = candidate.startsWith('+');
  const digits = onlySignificantDigits(candidate);

  if (digits.length < PHONE_MIN_SIGNIFICANT_DIGITS || digits.length > PHONE_MAX_DIGITS) {
    return null;
  }

  if (hasPlus) {
    return `tel:+${digits}`;
  }

  return `tel:${digits}`;
}
