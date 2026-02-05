import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { SulAmericaSettingsCard } from '@/components/settings/SulAmericaSettingsCard';
import { apiCredentialsService } from '@/services/apiCredentialsService';

export default function IntegrationSettings() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['settings', 'api-credentials', 'list'],
    queryFn: async () => apiCredentialsService.list({ per_page: 50 }),
  });
  const items = useMemo(() => {
    const arr = (data?.data?.data || data?.data || []) as any[];
    return Array.isArray(arr) ? arr : [];
  }, [data]);
  const sulamerica = useMemo(() => {
    const found = items.find((i: any) => String(i.slug || '').toLowerCase() === 'sulamerica' || String(i.name || '').toLowerCase() === 'sulamerica');
    return found || null;
  }, [items]);
  const [localValue, setLocalValue] = useState<string>(() => {
    if (!sulamerica || !sulamerica.config) return '';
    try {
      return JSON.stringify({
        url: sulamerica.config.url || '',
        user: sulamerica.config.user || '',
        pass: sulamerica.config.pass || '',
        produto: sulamerica.config.produto || '',
      });
    } catch {
      return '';
    }
  });
  const createMutation = useMutation({
    mutationKey: ['settings', 'api-credentials', 'create'],
    mutationFn: async (payload: any) => apiCredentialsService.create(payload),
    onSuccess: () => {
      toast.success('Credenciais criadas');
      queryClient.invalidateQueries({ queryKey: ['settings', 'api-credentials', 'list'] });
    },
    onError: (err: any) => {
      toast.error(String(err?.message || 'Falha ao criar credenciais'));
    },
  });
  const updateMutation = useMutation({
    mutationKey: ['settings', 'api-credentials', 'update'],
    mutationFn: async (payload: { id: any; data: any }) => apiCredentialsService.update(payload.id, payload.data),
    onSuccess: () => {
      toast.success('Credenciais atualizadas');
      queryClient.invalidateQueries({ queryKey: ['settings', 'api-credentials', 'list'] });
    },
    onError: (err: any) => {
      toast.error(String(err?.message || 'Falha ao atualizar credenciais'));
    },
  });
  const handleChange = (_id: number, newValue: string) => {
    setLocalValue(newValue);
  };
  const handleSave = () => {
    let parsed: any = null;
    try {
      parsed = JSON.parse(localValue || '{}');
    } catch {
      parsed = {};
    }
    if (!parsed || typeof parsed !== 'object') {
      toast.error('Preencha os campos corretamente');
      return;
    }
    const payload = {
      name: 'SulAmerica',
      active: true,
      config: {
        url: String(parsed.url || ''),
        user: String(parsed.user || ''),
        pass: String(parsed.pass || ''),
        produto: String(parsed.produto || ''),
      },
    };
    if (sulamerica && sulamerica.id) {
      updateMutation.mutate({ id: sulamerica.id, data: { config: payload.config } });
    } else {
      createMutation.mutate(payload);
    }
  };
  const disabled = isLoading || createMutation.isPending || updateMutation.isPending;
  return (
    <PermissionGuard requiredPermissions={['view']}>
      <AppLayout>
        <Card>
          <CardHeader>
            <CardTitle>Integrações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SulAmericaSettingsCard
              option={{ id: sulamerica?.id || 0 }}
              value={localValue}
              onChange={handleChange}
              onSave={handleSave}
              isLoading={disabled}
            />
          </CardContent>
        </Card>
      </AppLayout>
    </PermissionGuard>
  );
}
