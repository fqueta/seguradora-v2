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

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useDeleteContract(mutationOptions?: any) {
  const api = getContractsApi();
  return api.useDelete(mutationOptions);
}

export function useCancelContract(mutationOptions?: any) {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (variables: any) => {
        const id = typeof variables === 'object' ? variables.id : variables;
        const payload = typeof variables === 'object' ? variables : {};
        // Remove ID from payload to avoid sending it in body if unnecessary, though backend might ignore
        if(typeof variables === 'object') {
            delete payload.id;
        }
        return contractsService.cancelContract(id, payload);
    },
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

export function useContractsTrash(params?: ContractsListParams, queryOptions?: any) {
    return useQuery({
        queryKey: ['contracts', 'trash', params],
        queryFn: () => contractsService.getTrash(params),
        ...queryOptions
    });
}

export function useRestoreContract(mutationOptions?: any) {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string | number>({
    mutationFn: (id: string | number) => contractsService.restoreContract(id),
    onSuccess: () => {
        toast.success('Contrato restaurado com sucesso');
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (error: any) => {
        toast.error('Erro ao restaurar contrato: ' + (error.message || 'Erro desconhecido'));
    },
    ...mutationOptions
  });
}

export function useForceDeleteContract(mutationOptions?: any) {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string | number>({
    mutationFn: (id: string | number) => contractsService.forceDeleteContract(id),
    onSuccess: () => {
        toast.success('Contrato excluído permanentemente');
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (error: any) => {
        toast.error('Erro ao excluir contrato: ' + (error.message || 'Erro desconhecido'));
    },
    ...mutationOptions
  });
}
