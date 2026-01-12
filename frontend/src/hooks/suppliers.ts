import { 
  SupplierRecord, 
  CreateSupplierInput, 
  UpdateSupplierInput, 
  SuppliersListParams 
} from '@/types/suppliers';
import { useGenericApi } from '@/hooks/useGenericApi';
import { suppliersService } from '@/services/suppliersService';

/**
 * Função que retorna hooks genéricos para API de fornecedores
 * Utiliza o padrão estabelecido para reutilização de código
 */
function getSuppliersApi() {
  return useGenericApi<SupplierRecord, CreateSupplierInput, UpdateSupplierInput, SuppliersListParams>({
    service: suppliersService,
    queryKey: 'suppliers',
    entityName: 'Fornecedor'
  });
}

// Exporta os hooks individuais para manter compatibilidade
export function useSuppliersList(params?: SuppliersListParams, queryOptions?: any) {
  const api = getSuppliersApi();
  return api.useList(params, queryOptions);
}

export function useSupplier(id: string, queryOptions?: any) {
  const api = getSuppliersApi();
  return api.useGetById(id, queryOptions);
}

export function useCreateSupplier(mutationOptions?: any) {
  const api = getSuppliersApi();
  return api.useCreate(mutationOptions);
}

export function useUpdateSupplier(mutationOptions?: any) {
  const api = getSuppliersApi();
  return api.useUpdate(mutationOptions);
}

export function useDeleteSupplier(mutationOptions?: any) {
  const api = getSuppliersApi();
  return api.useDelete(mutationOptions);
}

/**
 * Hook completo da API de fornecedores para uso avançado
 */
export const useSuppliersApi = getSuppliersApi;
