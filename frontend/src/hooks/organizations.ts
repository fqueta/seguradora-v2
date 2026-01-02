import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '@/services/organizationService';
import { OrganizationCreateInput, OrganizationListParams, OrganizationUpdateInput } from '@/types/organization';

export const useOrganizationsList = (params?: OrganizationListParams) => {
  return useQuery({
    queryKey: ['organizations', params],
    queryFn: () => organizationService.list(params),
  });
};

export const useOrganization = (id: number | string) => {
  return useQuery({
    queryKey: ['organization', id],
    queryFn: () => organizationService.getById(id),
    enabled: !!id,
  });
};

export const useCreateOrganization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: OrganizationCreateInput) => organizationService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
        },
    });
};

export const useUpdateOrganization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number | string; data: OrganizationUpdateInput }) => organizationService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
            queryClient.invalidateQueries({ queryKey: ['organization', data.id] });
        },
    });
};

export const useDeleteOrganization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number | string) => organizationService.deleteById(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
        },
    });
};
