import { useQuery } from '@tanstack/react-query';
import type { Mesa, CreateMesaInput, UpdateMesaInput } from '@/types/mesas';
import type { MesaListParams } from '@/types/mesas';
import { mesasService } from '@/services/mesasService';
import { useGenericApi } from './useGenericApi';

function getMesasApi() {
  return useGenericApi<Mesa, CreateMesaInput, UpdateMesaInput, MesaListParams>({
    service: mesasService as any,
    queryKey: 'mesas',
    entityName: 'Mesa'
  });
}

export function useMesasList(params?: MesaListParams, queryOptions?: any) {
  const api = getMesasApi();
  const safeQueryOptions = {
    retry: (failureCount: number, error: any) => {
      if (error?.status === 404 || (error?.status >= 400 && error?.status < 500)) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    ...queryOptions
  };
  return api.useList(params, safeQueryOptions);
}

export function useMesa(id: string, queryOptions?: any) {
  const api = getMesasApi();
  return api.useGetById(id, queryOptions);
}

export function useMesaByToken(token?: string) {
  return useQuery({
    queryKey: ['mesas', 'token', token],
    queryFn: () => mesasService.getByToken(token!),
    enabled: !!token,
  });
}

export function useCreateMesa(mutationOptions?: any) {
  const api = getMesasApi();
  return api.useCreate(mutationOptions);
}

export function useUpdateMesa(mutationOptions?: any) {
  const api = getMesasApi();
  return api.useUpdate(mutationOptions);
}

export function useDeleteMesa(mutationOptions?: any) {
  const api = getMesasApi();
  return api.useDelete(mutationOptions);
}

export const useMesasApi = getMesasApi;
