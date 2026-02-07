import { GenericApiService } from './GenericApiService';
import type { Mesa, CreateMesaInput, UpdateMesaInput } from '@/types/mesas';
import type { MesaListParams } from '@/types/mesas';

class MesasService extends GenericApiService<Mesa, CreateMesaInput, UpdateMesaInput> {
  constructor() {
    super('/mesas');
  }
  async list(params?: MesaListParams) {
    return super.list(params);
  }

  async getByToken(token: string) {
    return this.customGet<{ data: Mesa }>(`/token/${token}`);
  }
}

export const mesasService = new MesasService();
export type { MesaListParams };
