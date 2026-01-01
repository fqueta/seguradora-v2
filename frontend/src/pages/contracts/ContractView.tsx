import { useParams, useNavigate } from 'react-router-dom';
import { useContract } from '@/hooks/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, FileText, User, Calendar, DollarSign, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContractView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: contract, isLoading, error } = useContract(id as string);

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-[150px]" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !contract) {
        return (
            <div className="container mx-auto py-6">
                <Card>
                    <CardContent className="p-6 text-center">
                        <h2 className="text-xl font-bold mb-2">Erro ao carregar contrato</h2>
                        <p className="text-muted-foreground mb-4">
                            Não foi possível encontrar o contrato solicitado.
                        </p>
                        <Button onClick={() => navigate('/admin/contracts')}>
                            Voltar para lista
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        } catch {
            return dateString;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendente';
            case 'active': return 'Ativo';
            case 'approved': return 'Aprovado';
            case 'cancelled': return 'Cancelado';
            default: return status;
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'active': return 'default'; // often green/primary
            case 'approved': return 'default';
            case 'pending': return 'secondary'; // yellow/gray
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => navigate('/admin/contracts')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            Contrato #{contract.contract_number || contract.id}
                        </h1>
                        <p className="text-muted-foreground">
                            Detalhes do contrato
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(contract.status)}>
                        {getStatusLabel(contract.status)}
                    </Badge>
                    <Button onClick={() => navigate(`/admin/contracts/${id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informações Principais */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Informações Principais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Número do Contrato</label>
                                <p className="font-medium">{contract.contract_number || '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Número C.</label>
                                <p className="font-medium">{contract.c_number || '-'}</p>
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{contract.client?.name || 'Cliente não identificado'}</span>
                            </div>
                        </div>

                         <div>
                            <label className="text-sm font-medium text-muted-foreground">Produto</label>
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{contract.product?.name || 'Produto não identificado'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Valores e Prazos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Valores e Prazos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Valor do Contrato</label>
                            <p className="text-2xl font-bold text-primary">
                                {formatCurrency(contract.value)}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Início da Vigência
                                </label>
                                <p className="font-medium">{formatDate(contract.start_date)}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Fim da Vigência
                                </label>
                                <p className="font-medium">{formatDate(contract.end_date)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Observações */}
                {contract.description && (
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Observações
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                {contract.description}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
