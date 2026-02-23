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
}

class IntegrationEventsService extends BaseApiService {
  async listRecent(limit: number = 10): Promise<{ success: boolean; data: IntegrationEvent[] }> {
    return this.get<{ success: boolean; data: IntegrationEvent[] }>("/contract-events/recent", { limit });
  }
}

export const integrationEventsService = new IntegrationEventsService();
