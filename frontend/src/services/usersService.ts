import { 
  UserRecord, 
  CreateUserInput, 
  UpdateUserInput, 
  UsersListParams, 
  Paginated
} from '@/types/users';

import { BaseApiService } from './BaseApiService';

class UsersService extends BaseApiService {
  constructor() {
    super();
  }

  async listUsers(params?: UsersListParams): Promise<Paginated<UserRecord>> {
    const queryParams: Record<string, any> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.page) queryParams.page = params.page;
    if (params?.per_page) queryParams.per_page = params.per_page;
    if (params?.consultores) queryParams.consultores = 'true';
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.excluido) queryParams.excluido = params.excluido;

    const response = await this.get<any>('/users', queryParams);
    return this.normalizePaginatedResponse<UserRecord>(response);
  }

  async getUser(id: string): Promise<UserRecord> {
    return this.get<UserRecord>(`/users/${id}`);
  }

  async createUser(payload: CreateUserInput): Promise<UserRecord> {
    return this.post<UserRecord>('/users', payload);
  }

  async updateUser(id: string, payload: UpdateUserInput): Promise<UserRecord> {
    return this.put<UserRecord>(`/users/${id}`, payload);
  }

  async deleteUser(id: string): Promise<void> {
    return this.delete<void>(`/users/${id}`);
  }

  async restoreUser(id: string): Promise<void> {
    return this.put<void>(`/users/${id}/restore`);
  }

  async forceDeleteUser(id: string): Promise<void> {
    return this.delete<void>(`/users/${id}/force`);
  }

  /**
   * Busca propriedades dos usuários
   */
  async getUsersPropertys(): Promise<UserRecord[]> {
    return this.get<UserRecord[]>('/users/propertys');
  }

  // Métodos de perfil
  async getProfile(): Promise<UserRecord> {
    return this.get<UserRecord>('/user/profile');
  }

  async updateProfile(data: Partial<UserRecord> | FormData): Promise<UserRecord> {
    if (data instanceof FormData) {
      return this.postFormData<UserRecord>('/user/profile', data);
    }
    return this.put<UserRecord>('/user/profile', data);
  }
}

export const usersService = new UsersService();