import { ContractRecord, CreateContractInput, UpdateContractInput, ContractsListParams } from '@/types/contracts';
import { contractsService } from '@/services/contractsService';
import { useGenericApi } from './useGenericApi';

function getContractsApi() {
  return useGenericApi<ContractRecord, CreateContractInput, UpdateContractInput, ContractsListParams>({
    service: contractsService,
    queryKey: 'contracts',
    entityName: 'Contrato',
    suppressToasts: false
  });
}

export function useContractsList(params?: ContractsListParams, queryOptions?: any) {
  const api = getContractsApi();
  return api.useList(params, queryOptions);
}

export function useContract(id: string, queryOptions?: any) {
  const api = getContractsApi();
  return api.useGetById(id, queryOptions);
}

export function useCreateContract(mutationOptions?: any) {
  const api = getContractsApi();
  return api.useCreate(mutationOptions);
}

export function useUpdateContract(mutationOptions?: any) {
  const api = getContractsApi();
  return api.useUpdate(mutationOptions);
}

export function useDeleteContract(mutationOptions?: any) {
  const api = getContractsApi();
  return api.useDelete(mutationOptions);
}
