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
    onSuccess: (data, variables) => {
        if(data?.exec === false){
            toast.error(data?.mens || 'Erro ao cancelar contrato');
            return;
        }
        toast.success('Contrato cancelado com sucesso');
        const id = typeof variables === 'object' ? variables.id : variables;

        if (id) {
            queryClient.setQueryData(['contracts', 'detail', String(id)], (old: any) => {
                if (!old || typeof old !== 'object') return old;

                const supplierTag = String((old as any)?.supplier_tag ?? data?.supplier ?? '').toLowerCase();
                const isIza = supplierTag.includes('iza');

                const next: any = { ...old, status: 'cancelled' };

                if (isIza) {
                    const iza = (next as any).integration_iza && typeof (next as any).integration_iza === 'object'
                        ? { ...(next as any).integration_iza }
                        : {};
                    const izaData = iza.data && typeof iza.data === 'object' ? { ...iza.data } : {};
                    const alreadyCancelling = Boolean(data?.integration_response?.already_cancelling);
                    next.status = alreadyCancelling ? 'cancelling' : 'cancelled';
                    izaData.status = alreadyCancelling ? 'cancelling' : 'cancelled';

                    const cancelBody = data?.integration_response?.data?.data;
                    if (cancelBody && typeof cancelBody === 'object') {
                        if (Object.prototype.hasOwnProperty.call(cancelBody, 'cancellation_status')) {
                            (izaData as any).cancellation_status = cancelBody.cancellation_status;
                        }
                        if (Object.prototype.hasOwnProperty.call(cancelBody, 'cancellation_at')) {
                            (izaData as any).cancellation_at = cancelBody.cancellation_at;
                        }
                    } else if (alreadyCancelling) {
                        (izaData as any).cancellation_status = 'cancelling';
                    }

                    iza.data = izaData;
                    iza.cancel = {
                        date_cancelled: data?.integration_response?.date_cancelled ?? data?.date_cancelled ?? null,
                        already_cancelling: data?.integration_response?.already_cancelling ?? null,
                        cancellation_status: alreadyCancelling ? 'cancelling' : ((izaData as any).cancellation_status ?? null),
                        message: data?.integration_response?.message ?? null,
                    };
                    (next as any).integration_iza = iza;
                }

                return next;
            });
        }
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
        queryClient.invalidateQueries({ queryKey: ['contracts', 'detail', String(id)] });
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
