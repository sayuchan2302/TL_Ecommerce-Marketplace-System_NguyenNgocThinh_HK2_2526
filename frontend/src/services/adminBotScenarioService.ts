import { apiRequest } from './apiClient';

export type BotScenarioActionKey = 'ORDER_LOOKUP' | 'SIZE_ADVICE' | 'PRODUCT_FAQ';

export interface BotScenarioQuickAction {
  key: BotScenarioActionKey;
  label: string;
}

export interface BotScenarioPayload {
  welcomePrompt: string;
  unknownPrompt: string;
  askOrderCodePrompt: string;
  askOrderPhonePrompt: string;
  orderPhoneInvalidPrompt: string;
  orderLookupContinuePrompt: string;
  askHeightPrompt: string;
  invalidHeightPrompt: string;
  askWeightPrompt: string;
  invalidWeightPrompt: string;
  sizeAdviceContinuePrompt: string;
  productFaqContinuePrompt: string;
  quickActions: BotScenarioQuickAction[];
}

export interface BotScenarioRevisionMeta {
  version: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface BotScenarioSnapshot {
  draft: BotScenarioPayload;
  published: BotScenarioPayload;
  draftMeta?: BotScenarioRevisionMeta;
  publishedMeta?: BotScenarioRevisionMeta;
}

export const adminBotScenarioService = {
  async getSnapshot(): Promise<BotScenarioSnapshot> {
    return apiRequest<BotScenarioSnapshot>('/api/admin/bot/scenario', {}, { auth: true });
  },

  async saveDraft(payload: BotScenarioPayload): Promise<BotScenarioSnapshot> {
    return apiRequest<BotScenarioSnapshot>('/api/admin/bot/scenario/draft', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, { auth: true });
  },

  async publishDraft(): Promise<BotScenarioSnapshot> {
    return apiRequest<BotScenarioSnapshot>('/api/admin/bot/scenario/publish', {
      method: 'POST',
    }, { auth: true });
  },

  async resetDraftFromPublished(): Promise<BotScenarioSnapshot> {
    return apiRequest<BotScenarioSnapshot>('/api/admin/bot/scenario/draft/reset', {
      method: 'POST',
    }, { auth: true });
  },
};

