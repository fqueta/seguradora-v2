import { 
  SupplierRecord, 
  CreateSupplierInput, 
  UpdateSupplierInput, 
  SuppliersListParams,  
} from '@/types/suppliers';
import { PaginatedResponse } from '@/types/index';
import { BaseApiService } from './BaseApiService';

/**
 * Serviço para gerenciamento de fornecedores
 * Estende BaseApiService para reutilizar funcionalidades comuns
 */
class SuppliersService extends BaseApiService {
  /**
   * Lista fornecedores com parâmetros de filtro
   * @param params - Parâmetros de listagem
   */
  async listSuppliers(params?: SuppliersListParams): Promise<PaginatedResponse<SupplierRecord>> {
    const response = await this.get<any>('/fornecedores', params);
    return this.normalizePaginatedResponse<SupplierRecord>(response);
  }

  /**
   * Obtém fornecedor por ID
   * @param id - ID do fornecedor
   */
  async getSupplier(id: string): Promise<SupplierRecord> {
    return this.get<SupplierRecord>(`/fornecedores/${id}`);
  }

  /**
   * Cria novo fornecedor
   * @param payload - Dados do fornecedor
   */
  async createSupplier(payload: CreateSupplierInput): Promise<SupplierRecord> {
    return this.post<SupplierRecord>('/fornecedores', payload);
  }

  /**
   * Atualiza fornecedor existente
   * @param id - ID do fornecedor
   * @param payload - Dados atualizados
   */
  async updateSupplier(id: string, payload: UpdateSupplierInput): Promise<SupplierRecord> {
    return this.put<SupplierRecord>(`/fornecedores/${id}`, payload);
  }

  /**
   * Exclui fornecedor
   * @param id - ID do fornecedor
   */
  async deleteSupplier(id: string): Promise<any> {
    await this.delete(`/fornecedores/${id}`);
  }

  // Métodos de conveniência para compatibilidade com useGenericApi
  async list(params?: SuppliersListParams): Promise<PaginatedResponse<SupplierRecord>> {
    return this.listSuppliers(params);
  }

  async getById(id: string): Promise<SupplierRecord> {
    return this.getSupplier(id);
  }

  async create(data: CreateSupplierInput): Promise<SupplierRecord> {
    return this.createSupplier(data);
  }

  async update(id: string, data: UpdateSupplierInput): Promise<SupplierRecord> {
    return this.updateSupplier(id, data);
  }

  async delete(id: string): Promise<any> {
    return this.deleteSupplier(id);
  }
}

export const suppliersService = new SuppliersService();
