import { useState } from 'react';
import { useContractsList, useDeleteContract } from '@/hooks/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
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

export default function ContractList() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);
    const [page, setPage] = useState(1);
    const { data, isLoading } = useContractsList({ page, search: debouncedSearch });
    const deleteMutation = useDeleteContract();
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const handleDelete = () => {
        if (deleteId) {
            deleteMutation.mutate(deleteId, {
                onSuccess: () => setDeleteId(null)
            });
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Contratos</h1>
                <Button onClick={() => navigate('/admin/contracts/create')}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Contrato
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar contratos..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Número</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Início</TableHead>
                                <TableHead>Fim</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">Carregando...</TableCell>
                                </TableRow>
                            ) : data?.data?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">Nenhum contrato encontrado</TableCell>
                                </TableRow>
                            ) : (
                                data?.data?.map((contract: any) => (
                                    <TableRow key={contract.id}>
                                        <TableCell>{contract.contract_number || contract.id}</TableCell>
                                        <TableCell>{contract.status}</TableCell>
                                        <TableCell>{contract.client?.name || '-'}</TableCell>
                                        <TableCell>{contract.start_date}</TableCell>
                                        <TableCell>{contract.end_date}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/contracts/${contract.id}/edit`)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setDeleteId(contract.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
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
        </div>
    );
}
