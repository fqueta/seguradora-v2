import { ContractRecord, CreateContractInput, UpdateContractInput, ContractsListParams } from '@/types/contracts';
import { contractsService } from '@/services/contractsService';
import { useGenericApi } from './useGenericApi';

function getContractsApi() {
  return useGenericApi<ContractRecord, CreateContractInput, UpdateContractInput, ContractsListParams>({
    service: contractsService,
    queryKey: 'contracts',
    entityName: 'Contrato',
    suppressToasts: true
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

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useDeleteContract(mutationOptions?: any) {
  const api = getContractsApi();
  return api.useDelete(mutationOptions);
}

export function useCancelContract(mutationOptions?: any) {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string | number>({
    mutationFn: (id: string | number) => contractsService.cancelContract(id),
    onSuccess: (data) => {
        if(data?.exec === false){
            toast.error(data?.mens || 'Erro ao cancelar contrato');
            return;
        }
        toast.success('Contrato cancelado com sucesso');
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (error: any) => {
        toast.error('Erro ao cancelar contrato: ' + (error.message || 'Erro desconhecido'));
    },
    ...mutationOptions
  });
}
