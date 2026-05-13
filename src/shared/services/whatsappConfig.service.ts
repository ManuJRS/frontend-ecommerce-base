import { api } from '@/core/api';

export interface WhatsAppConfig {
  isActive: boolean;
  phoneNumber: string;
  floatingMessage: string;
  defaultApiMessage: string;
}

function unwrapEntity(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const attrs = raw.attributes as Record<string, unknown> | undefined;
  if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
    return {
      id: raw.id,
      documentId: raw.documentId,
      ...attrs,
    };
  }
  return raw;
}

function boolOr(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
}

export const WhatsAppConfigService = {
  async getConfig(): Promise<WhatsAppConfig | null> {
    try {
      const response = await api.get('/whats-app-config');
      const entity = unwrapEntity(response.data.data as Record<string, unknown>);

      return {
        isActive: boolOr(entity.isActive ?? entity.IsActive, false),
        phoneNumber: String(entity.phoneNumber ?? entity.PhoneNumber ?? '').trim(),
        floatingMessage: String(
          entity.floatingMessage ?? entity.FloatingMessage ?? ''
        ).trim(),
        defaultApiMessage: String(
          entity.defaultApiMessage ?? entity.DefaultApiMessage ?? ''
        ).trim(),
      };
    } catch {
      return null;
    }
  },
};
