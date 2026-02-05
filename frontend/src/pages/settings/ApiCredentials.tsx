import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, RefreshCw, Trash2, Pencil, Search, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiCredentialsService } from '@/services/apiCredentialsService';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ApiCredentials() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['settings', 'api-credentials', 'list', { search, showTrash, page }],
    queryFn: async () => {
      const params: any = { per_page: 10, page, order_by: 'updated_at', order: 'desc' };
      if (search) params.name = search;
      if (showTrash) params.excluido = 's';
      return apiCredentialsService.list(params);
    },
  });

  const items = useMemo(() => {
    const paginator = (data?.data || {}) as any;
    const arr = (paginator?.data ?? data?.data ?? []) as any[];
    return Array.isArray(arr) ? arr : [];
  }, [data]);

  const destroyMutation = useMutation({
    mutationKey: ['settings', 'api-credentials', 'destroy'],
    mutationFn: async (id: any) => apiCredentialsService.destroy(id),
    onSuccess: () => {
      toast.success('Credencial excluída');
      queryClient.invalidateQueries({ queryKey: ['settings', 'api-credentials', 'list'] });
    },
    onError: (err: any) => {
      toast.error(String(err?.message || 'Falha ao excluir credencial'));
    },
  });
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await destroyMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {}
  };
  const restoreMutation = useMutation({
    mutationKey: ['settings', 'api-credentials', 'restore'],
    mutationFn: async (id: any) => apiCredentialsService.restore(id),
    onSuccess: () => {
      toast.success('Credencial restaurada');
      queryClient.invalidateQueries({ queryKey: ['settings', 'api-credentials', 'list'] });
    },
    onError: (err: any) => {
      toast.error(String(err?.message || 'Falha ao restaurar credencial'));
    },
  });
  const forceDeleteMutation = useMutation({
    mutationKey: ['settings', 'api-credentials', 'force-delete'],
    mutationFn: async (id: any) => apiCredentialsService.forceDelete(id),
    onSuccess: () => {
      toast.success('Credencial excluída permanentemente');
      queryClient.invalidateQueries({ queryKey: ['settings', 'api-credentials', 'list'] });
    },
    onError: (err: any) => {
      toast.error(String(err?.message || 'Falha ao excluir permanentemente'));
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Credenciais de Integração</h1>
        <Button onClick={() => navigate('/admin/settings/integration/create')}>
          <Plus className="mr-2 h-4 w-4" /> Nova credencial
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Pesquisar por nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button variant={showTrash ? 'secondary' : 'outline'} onClick={() => setShowTrash(!showTrash)}>
              {showTrash ? 'Exibindo Lixeira' : 'Exibir Lixeira'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Carregando...</TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Erro ao carregar credenciais</TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Nenhuma credencial encontrada</TableCell>
                </TableRow>
              ) : (
                items.map((i: any) => (
                  <TableRow
                    key={String(i.id)}
                    onDoubleClick={() => navigate(`/admin/settings/integration/${i.id}/edit`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/admin/settings/integration/${i.id}/edit`);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    className="cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <TableCell>{i.name}</TableCell>
                    <TableCell>{i.slug}</TableCell>
                    <TableCell>{i.active ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>{i.updated_at ? new Date(i.updated_at).toLocaleString() : ''}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/settings/integration/${i.id}/edit`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {showTrash ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => restoreMutation.mutate(i.id)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => forceDeleteMutation.mutate(i.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setDeleteId(i.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={isLoading}
            >
              Próximo
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá a credencial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
