import { BaseApiService } from "./BaseApiService";

export interface IntegrationEvent {
  id: number;
  event_type: string;
  description: string;
  created_at: string;
  contract_id: number | null;
  contract_number?: string | null;
  contract_token?: string | null;
  client_name?: string | null;
  client_id?: number | null;
  supplier?: string | null;
  status?: string | null;
}

class IntegrationEventsService extends BaseApiService {
  async listRecent(limit: number = 10, filters?: { supplier?: string; from?: string; to?: string; status?: string }): Promise<{ success: boolean; data: IntegrationEvent[] }> {
    return this.get<{ success: boolean; data: IntegrationEvent[] }>("/contract-events/recent", { limit, ...(filters || {}) });
  }
}

export const integrationEventsService = new IntegrationEventsService();
