import { BaseApiService } from './BaseApiService';

class ApiCredentialsService extends BaseApiService {
  async list(params?: Record<string, any>) {
    const resp = await this.get<any>('/api-credentials', params);
    return resp;
  }
  async getOne(id: number | string) {
    const resp = await this.get<any>(`/api-credentials/${id}`);
    return resp;
  }
  async create(payload: {
    name: string;
    active?: boolean;
    config: { url: string; user: string; pass: string; produto?: string };
    meta?: { key: string; value: string }[];
  }) {
    const resp = await this.post<any>('/api-credentials', payload);
    return resp;
  }
  async update(id: number | string, payload: {
    name?: string;
    active?: boolean;
    config?: { url?: string; user?: string; pass?: string; produto?: string };
    meta?: { key: string; value: string }[];
  }) {
    const resp = await this.put<any>(`/api-credentials/${id}`, payload);
    return resp;
  }
  async destroy(id: number | string) {
    const resp = await this.delete<any>(`/api-credentials/${id}`);
    return resp;
  }
  async restore(id: number | string) {
    const resp = await this.put<any>(`/api-credentials/${id}/restore`, {});
    return resp;
  }
  async forceDelete(id: number | string) {
    const resp = await this.delete<any>(`/api-credentials/${id}/force`);
    return resp;
  }
}

export const apiCredentialsService = new ApiCredentialsService();
