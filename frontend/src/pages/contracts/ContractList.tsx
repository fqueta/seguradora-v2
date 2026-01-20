import { useState } from 'react';
import { useContractsList, useDeleteContract, useContractsTrash, useRestoreContract, useForceDeleteContract } from '@/hooks/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash, Eye, X, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationsList } from '@/hooks/organizations';
import { useUsersList } from '@/hooks/users';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from "@/components/ui/badge";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ContractList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const canFilterAdmin = user && (Number(user.permission_id) < 3);

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);
    const [status, setStatus] = useState<string>('all');
    const [vigenciaInicio, setVigenciaInicio] = useState<string>('');
    const [vigenciaFim, setVigenciaFim] = useState<string>('');
    const [orgId, setOrgId] = useState<string>('all');
    const [ownerId, setOwnerId] = useState<string>('all');
    const [page, setPage] = useState(1);

    const { data: orgs } = useOrganizationsList({ per_page: 100 });
    const { data: users } = useUsersList({ per_page: 100 });

    const [isTrashMode, setIsTrashMode] = useState(false);

    const queryParams = { 
        page, 
        search: debouncedSearch,
        status: status !== 'all' ? status : undefined,
        vigencia_inicio: vigenciaInicio || undefined,
        vigencia_fim: vigenciaFim || undefined,
        organization_id: orgId !== 'all' ? orgId : undefined,
        owner_id: ownerId !== 'all' ? ownerId : undefined,
    };

    const { data: regularData, isLoading: regularLoading } = useContractsList(queryParams, { enabled: !isTrashMode });
    const { data: trashData, isLoading: trashLoading } = useContractsTrash(queryParams, { enabled: isTrashMode });

    const data = isTrashMode ? trashData : regularData;
    const isLoading = isTrashMode ? trashLoading : regularLoading;

    const deleteMutation = useDeleteContract();
    const restoreMutation = useRestoreContract();
    const forceDeleteMutation = useForceDeleteContract();

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [forceDeleteId, setForceDeleteId] = useState<number | null>(null);

    const handleDelete = () => {
        if (!deleteId) return;
        deleteMutation.mutate(deleteId.toString(), {
            onSuccess: (res: any) => {
                setDeleteId(null);
                if (res?.exec === false) {
                    toast({
                        title: 'Operação não concluída',
                        description: res?.message || 'Contrato não pode ser excluído',
                        variant: 'destructive'
                    });
                } else {
                    const variant = res?.color === 'success' ? 'success' : 'default';
                    toast({
                        title: 'Contrato excluído',
                        description: res?.message || 'Contrato removido com sucesso',
                        variant
                    });
                }
            },
            onError: (error: any) => {
                setDeleteId(null);
                const msg = error?.body?.message || error?.message || 'Falha ao excluir contrato';
                toast({ title: 'Erro ao excluir', description: msg, variant: 'destructive' });
            }
        });
    };

    const handleRestore = (id: number) => {
        restoreMutation.mutate(id.toString());
    };

    const handleForceDelete = () => {
        if (!forceDeleteId) return;
        forceDeleteMutation.mutate(forceDeleteId.toString(), {
            onSuccess: () => setForceDeleteId(null),
            onError: () => setForceDeleteId(null)
        });
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('all');
        setVigenciaInicio('');
        setVigenciaFim('');
        setOrgId('all');
        setOwnerId('all');
        setPage(1);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold">Contratos</h1>
                    {isTrashMode && <Badge variant="destructive">LIXEIRA</Badge>}
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant={isTrashMode ? "default" : "outline"}
                        onClick={() => setIsTrashMode(!isTrashMode)}
                        title={isTrashMode ? "Ver Ativos" : "Ver Lixeira"}
                    >
                        {isTrashMode ? <RotateCcw className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {isTrashMode ? "Ver Ativos" : "Lixeira"}
                    </Button>
                    {!isTrashMode && (
                        <Button onClick={() => navigate('/admin/contracts/create')}>
                            <Plus className="mr-2 h-4 w-4" /> Novo Contrato
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader className="space-y-4 relative z-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar contratos..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="approved">Aprovado</SelectItem>
                                <SelectItem value="active">Ativo</SelectItem>
                                <SelectItem value="cancelled">Cancelado</SelectItem>
                                <SelectItem value="rejected">Rejeitado</SelectItem>
                                <SelectItem value="draft">Rascunho</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2 col-span-1 md:col-span-2 lg:col-span-2">
                            <Input
                                type="date"
                                value={vigenciaInicio}
                                onChange={(e) => setVigenciaInicio(e.target.value)}
                                className="text-xs"
                                placeholder="Início"
                            />
                            <span className="text-muted-foreground text-xs">até</span>
                            <Input
                                type="date"
                                value={vigenciaFim}
                                onChange={(e) => setVigenciaFim(e.target.value)}
                                className="text-xs"
                                placeholder="Fim"
                            />
                            <Button variant="outline" size="icon" onClick={clearFilters} title="Limpar Filtros">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {canFilterAdmin && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select value={orgId} onValueChange={setOrgId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Organização" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Organizações</SelectItem>
                                    {orgs?.data?.map((org: any) => (
                                        <SelectItem key={org.id} value={org.id.toString()}>
                                            {org.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={ownerId} onValueChange={setOwnerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Autor/Vendedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Autores</SelectItem>
                                    {users?.data?.map((u: any) => (
                                        <SelectItem key={u.id} value={u.id.toString()}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                            <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Número</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Titular</TableHead>
                                <TableHead>Organização</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Início</TableHead>
                                <TableHead>Fim</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center">Carregando...</TableCell>
                                </TableRow>
                            ) : data?.data?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center">Nenhum contrato encontrado</TableCell>
                                </TableRow>
                            ) : (
                                data?.data?.map((contract: any) => {
                                    const statusMap: Record<string, string> = {
                                        'pending': 'Pendente',
                                        'active': 'Ativo',
                                        'cancelled': 'Cancelado',
                                        'approved': 'Aprovado',
                                        'rejected': 'Rejeitado',
                                        'draft': 'Rascunho'
                                    };
                                    const translatedStatus = statusMap[contract.status?.toLowerCase()] || contract.status || '-';
                                    
                                    return (
                                        <TableRow key={contract.id}>
                                            <TableCell>{contract.contract_number || contract.id}</TableCell>
                                            <TableCell>{translatedStatus}</TableCell>
                                            <TableCell>{contract.client?.name || '-'}</TableCell>
                                            <TableCell>{contract.organization?.name || '-'}</TableCell>
                                            <TableCell>
                                                {contract.value 
                                                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {contract.start_date 
                                                    ? new Date(contract.start_date).toLocaleDateString('pt-BR') 
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {contract.end_date 
                                                    ? new Date(contract.end_date).toLocaleDateString('pt-BR') 
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted" title="Ações">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="z-50">
                                                        {isTrashMode ? (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleRestore(contract.id)}>
                                                                    <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setForceDeleteId(contract.id)}>
                                                                    <Trash2 className="mr-2 h-4 w-4 text-red-500" /> Excluir Permanentemente
                                                                </DropdownMenuItem>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <DropdownMenuItem onClick={() => navigate(`/admin/contracts/${contract.id}`)}>
                                                                    <Eye className="mr-2 h-4 w-4" /> Visualizar
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => navigate(`/admin/contracts/${contract.id}/edit`)}>
                                                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => setDeleteId(contract.id)}>
                                                                    <Trash className="mr-2 h-4 w-4 text-red-500" /> Excluir
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Contrato</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir este contrato?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!forceDeleteId} onOpenChange={() => setForceDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Permanentemente</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir este contrato permanentemente? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleForceDelete} className="bg-red-600">Excluir Permanentemente</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}