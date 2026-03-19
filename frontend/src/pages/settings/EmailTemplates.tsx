import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Plus, Pencil, Search, Trash, Mail, Undo2, Trash2, Archive } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { emailTemplatesService, EmailTemplate } from '@/services/emailTemplatesService';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EmailTemplates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [trashPage, setTrashPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [forceDeleteId, setForceDeleteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>('active');

  // Query para templates ativos
  const { data, isLoading, error } = useQuery({
    queryKey: ['settings', 'email-templates', 'list', { search, page }],
    queryFn: async () => {
      const params: any = { per_page: 10, page, order_by: 'updated_at', order: 'desc' };
      if (search) params.search = search;
      return emailTemplatesService.list(params);
    },
  });

  // Query para lixeira
  const { data: trashData, isLoading: isLoadingTrash } = useQuery({
    queryKey: ['settings', 'email-templates', 'trash', { search, trashPage }],
    queryFn: async () => {
      const params: any = { per_page: 10, page: trashPage, order_by: 'updated_at', order: 'desc' };
      if (search) params.post_title = search;
      return emailTemplatesService.listTrash(params);
    },
    enabled: activeTab === 'trash',
  });

  const items = useMemo(() => {
    const paginator = (data || {}) as any;
    const arr = (paginator?.data ?? []) as EmailTemplate[];
    return Array.isArray(arr) ? arr : [];
  }, [data]);

  const trashItems = useMemo(() => {
    const paginator = (trashData || {}) as any;
    const arr = (paginator?.data ?? []) as EmailTemplate[];
    return Array.isArray(arr) ? arr : [];
  }, [trashData]);

  const trashCount = useMemo(() => {
    return (trashData as any)?.total || 0;
  }, [trashData]);

  // Mover para lixeira
  const deleteMutation = useMutation({
    mutationFn: (id: number) => emailTemplatesService.deleteById(id),
    onSuccess: () => {
      toast.success('Template movido para a lixeira');
      queryClient.invalidateQueries({ queryKey: ['settings', 'email-templates'] });
    },
    onError: (err: any) => {
      toast.error(String(err?.message || 'Falha ao excluir template'));
    },
  });

  // Restaurar da lixeira
  const restoreMutation = useMutation({
    mutationFn: (id: number) => emailTemplatesService.restore(id),
    onSuccess: () => {
      toast.success('Template restaurado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['settings', 'email-templates'] });
    },
    onError: (err: any) => {
      toast.error(String(err?.message || 'Falha ao restaurar template'));
    },
  });

  // Excluir permanentemente
  const forceDeleteMutation = useMutation({
    mutationFn: (id: number) => emailTemplatesService.forceDelete(id),
    onSuccess: () => {
      toast.success('Template excluído permanentemente');
      queryClient.invalidateQueries({ queryKey: ['settings', 'email-templates'] });
    },
    onError: (err: any) => {
      toast.error(String(err?.message || 'Falha ao excluir permanentemente'));
    },
  });

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {}
  };

  const handleForceDeleteConfirm = async () => {
    if (!forceDeleteId) return;
    try {
      await forceDeleteMutation.mutateAsync(forceDeleteId);
      setForceDeleteId(null);
    } catch {}
  };

  const renderPagination = (paginatorData: any, currentPage: number, setPageFn: (p: number | ((prev: number) => number)) => void) => {
    if (!paginatorData || (paginatorData as any).last_page <= 1) return null;
    return (
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageFn((p: number) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {currentPage} de {(paginatorData as any).last_page}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageFn((p: number) => Math.min((paginatorData as any).last_page, p + 1))}
          disabled={currentPage === (paginatorData as any).last_page}
        >
          Próximo
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/5 via-transparent to-transparent p-4 -mx-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Templates de E-mail</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Gerencie os templates de notificação por e-mail.</p>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate('/admin/settings/email-templates/create')} className="gap-2 shadow-sm">
          <Plus className="h-3.5 w-3.5" /> Novo Template
        </Button>
      </div>

      {/* Barra de busca */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por assunto ou slug..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); setTrashPage(1); }}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Tabs: Ativos / Lixeira */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="active" className="gap-1.5 text-xs data-[state=active]:shadow-sm">
            <Mail className="h-3.5 w-3.5" /> Ativos
          </TabsTrigger>
          <TabsTrigger value="trash" className="gap-1.5 text-xs data-[state=active]:shadow-sm">
            <Trash className="h-3.5 w-3.5" /> Lixeira
            {trashCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[9px] leading-none">
                {trashCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Templates Ativos */}
        <TabsContent value="active" className="mt-4">
          <Card className="shadow-sm border-border/60">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Assunto</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Slug</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Atualizado</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                          <span className="text-xs text-muted-foreground">Carregando...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-destructive text-sm">Erro ao carregar templates</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Mail className="h-8 w-8 opacity-30" />
                          <span className="text-sm">Nenhum template encontrado</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow
                        key={item.ID}
                        className="cursor-pointer hover:bg-muted/50 group"
                        onDoubleClick={() => navigate(`/admin/settings/email-templates/${item.ID}/edit`)}
                      >
                        <TableCell className="font-medium text-sm">{item.post_title}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-primary font-mono">
                            {item.post_name}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.post_status === 'publish' ? 'default' : 'secondary'} className="text-[10px]">
                            {item.post_status === 'publish' ? 'Publicado' : 'Rascunho'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.updated_at ? new Date(item.updated_at).toLocaleString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/settings/email-templates/${item.ID}/edit`)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteId(item.ID!)}
                              >
                                <Trash className="h-3.5 w-3.5 mr-2" /> Mover para Lixeira
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {renderPagination(data, page, setPage)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Lixeira */}
        <TabsContent value="trash" className="mt-4">
          <Card className="shadow-sm border-border/60 border-destructive/20">
            <CardHeader className="py-3 px-4 bg-destructive/5 border-b border-destructive/10">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-destructive/70" />
                <span className="text-xs font-semibold text-destructive/70 uppercase tracking-wider">
                  Itens na lixeira — serão excluídos permanentemente após 30 dias
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Assunto</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Slug</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider">Excluído em</TableHead>
                    <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTrash ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                          <span className="text-xs text-muted-foreground">Carregando lixeira...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : trashItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Trash className="h-8 w-8 opacity-30" />
                          <span className="text-sm">A lixeira está vazia</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    trashItems.map((item) => (
                      <TableRow key={item.ID} className="group opacity-75 hover:opacity-100 transition-opacity">
                        <TableCell className="font-medium text-sm line-through decoration-muted-foreground/40">{item.post_title}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-muted-foreground font-mono">
                            {item.post_name}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/30">
                            Excluído
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.updated_at ? new Date(item.updated_at).toLocaleString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 text-primary hover:text-primary"
                              onClick={() => restoreMutation.mutate(item.ID!)}
                              disabled={restoreMutation.isPending}
                            >
                              <Undo2 className="h-3 w-3" /> Restaurar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => setForceDeleteId(item.ID!)}
                            >
                              <Trash2 className="h-3 w-3" /> Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {renderPagination(trashData, trashPage, setTrashPage)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Mover para lixeira */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-destructive" /> Mover para Lixeira?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O template será movido para a lixeira. Você pode restaurá-lo a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90 gap-2">
              <Trash className="h-3.5 w-3.5" /> Mover para Lixeira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Excluir permanentemente */}
      <AlertDialog open={!!forceDeleteId} onOpenChange={() => setForceDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> Excluir Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>Esta ação não pode ser desfeita.</strong> O template será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceDeleteConfirm} className="bg-destructive hover:bg-destructive/90 gap-2">
              <Trash2 className="h-3.5 w-3.5" /> Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
