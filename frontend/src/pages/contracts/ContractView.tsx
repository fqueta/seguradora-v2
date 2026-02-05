import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useContract, useCancelContract } from '@/hooks/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, FileText, User, Calendar, DollarSign, Package, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useMemo } from 'react';
import EditFooterBar from '@/components/ui/edit-footer-bar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ContractView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const clientIdParam = searchParams.get('client_id');
    const { user } = useAuth();
    const { data: contract, isLoading, error } = useContract(id as string);
    const { mutate: cancelContract, isPending: isCancelling } = useCancelContract();
    const [expandedEvents, setExpandedEvents] = useState<number[]>([]);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const integrationData = useMemo(() => {
        const ci: any = (contract as any)?.contato_integrado;
        if (!ci) return null;
        const raw = ci?.data;
        try {
            return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
            return raw && typeof raw === 'object' ? raw : null;
        }
    }, [contract]);

    const toggleJson = (eventId: number) => {
        setExpandedEvents(prev => 
            prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
        );
    };

    const handleCancel = () => {
        cancelContract(id as string);
    };

    // ... (rest of the code)
    /**
     * handleBack
     * pt-BR: Volta para a origem (cliente, se presente, ou lista de contratos).
     * en-US: Navigates back to origin (client if present, or contracts list).
     */
    const handleBack = () => {
        navigate(clientIdParam ? `/admin/clients/${clientIdParam}/view` : '/admin/contracts');
    };
    /**
     * handleEdit
     * pt-BR: Navega para a página de edição do contrato atual.
     * en-US: Navigates to the edit page of the current contract.
     */
    const handleEdit = () => {
        navigate(`/admin/contracts/${id}/edit`);
    };
    /**
     * handleOpenCancel
     * pt-BR: Abre o modal de confirmação de cancelamento.
     * en-US: Opens the cancellation confirmation modal.
     */
    const handleOpenCancel = () => {
        if (contract?.status === 'approved') {
            setIsCancelDialogOpen(true);
        }
    };

    if (isLoading) {
        // ... (loading state)
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
        // ... (error state)
        return (
            <div className="container mx-auto py-6">
                <Card>
                    <CardContent className="p-6 text-center">
                        <h2 className="text-xl font-bold mb-2">Erro ao carregar contrato</h2>
                        <p className="text-muted-foreground mb-4">
                            Não foi possível encontrar o contrato solicitado.
                        </p>
                        <Button onClick={() => navigate(clientIdParam ? `/admin/clients/${clientIdParam}/view` : '/admin/contracts')}>
                            {clientIdParam ? 'Voltar para o cliente' : 'Voltar para lista'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ... (helper functions)

    const formatCurrency = (value?: number) => {
        if (value === undefined || value === null) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            // Se a data estiver no formato YYYY-MM-DD, fazemos o parse manual
            if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
                const [year, month, day] = dateString.trim().split('-');
                return `${day}/${month}/${year}`;
            }
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
    const getGeneroLabel = (genero?: string) => {
        if (!genero) return '-';
        if (genero === 'm') return 'Masculino';
        if (genero === 'f') return 'Feminino';
        if (genero === 'ni') return 'Não Informado';
        return genero;
    };

    return (
        <div className="container mx-auto py-6 space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={handleBack}>
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
                        <div>
                             <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Responsável
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4">
                                <div>
                                    <label className="text-xs text-muted-foreground">Proprietário</label>
                                    <p className="font-medium">{contract.owner?.name || 'Não identificado'}</p>
                                </div>
                                {contract.organization?.name && (
                                    <div>
                                        <label className="text-xs text-muted-foreground">Organização</label>
                                        <p className="font-medium">{contract.organization.name}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Dados do Cliente
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4">
                                {(() => {
                                    // Robust config parsing
                                    const clientConfig = typeof contract.client?.config === 'string' 
                                        ? JSON.parse(contract.client.config) 
                                        : (contract.client?.config || {});
                                    
                                    return (
                                        <>
                                            <div>
                                                <label className="text-xs text-muted-foreground">Nome Completo</label>
                                                <p className="font-medium">{contract.client?.name || 'Cliente não identificado'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground">CPF/CNPJ</label>
                                                <p className="font-medium">{contract.client?.cpf || contract.client?.cnpj || '-'}</p>
                                            </div>
                                            
                                            {clientConfig.nascimento && (
                                                <div>
                                                    <label className="text-xs text-muted-foreground">Data de Nascimento</label>
                                                    <p className="font-medium">{formatDate(clientConfig.nascimento)}</p>
                                                </div>
                                            )}
                                            
                                            <div>
                                                <label className="text-xs text-muted-foreground">Sexo</label>
                                                <p className="font-medium">{getGeneroLabel(contract.client?.genero)}</p>
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <label className="text-xs text-muted-foreground">Endereço</label>
                                                <p className="font-medium">
                                                    {(() => {
                                                        const parts = [
                                                            clientConfig.endereco,
                                                            clientConfig.numero,
                                                            clientConfig.complemento,
                                                            clientConfig.bairro,
                                                            clientConfig.cidade,
                                                            clientConfig.uf,
                                                            clientConfig.cep
                                                        ].filter((v: any) => !!v && String(v).trim() !== '');
                                                        return parts.length > 0 ? parts.join(', ') : '-';
                                                    })()}
                                                </p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                         <div className="pt-4 border-t">
                             <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Produto
                            </h3>
                             <div className="flex items-center gap-2">
                                <span className="font-medium">{contract.product?.post_title || contract.product?.name || 'Produto não identificado'}</span>
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

                {/* Resumo da Integração */}
                {integrationData && (
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-600/10 text-blue-700 border-0">Integração</Badge>
                                Resumo da Integração
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Número da Operação</label>
                                    <p className="font-medium">{integrationData?.numOperacao || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Número da Apólice</label>
                                    <p className="font-medium">{integrationData?.apolices?.numApolice || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Número do Certificado</label>
                                    <p className="font-medium">{integrationData?.numCertificado || '-'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

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

                {/* Histórico do Contrato */}
                {contract.events && contract.events.length > 0 && (
                     <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Eventos de Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold">Eventos de Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {contract.events
                                        .filter((e: any) => e.event_type === 'status_update')
                                        .slice()
                                        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                        .map((event: any, index: number) => (
                                        <div key={index} className="relative border-l-2 border-muted pl-4 pb-2 last:pb-0">
                                            <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-background bg-primary" />
                                            <div className="mb-1 text-xs text-muted-foreground">
                                                {new Date(event.created_at).toLocaleString('pt-BR')}
                                            </div>
                                            <div className="font-medium flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline" className="bg-primary/10 text-primary border-0">
                                                    {event.event_type}
                                                </Badge>
                                                {event.from_status && event.to_status && (
                                                    <span className="text-sm">
                                                        Status: {getStatusLabel(event.from_status)} → {getStatusLabel(event.to_status)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm">
                                                <p className="font-medium mb-2">{event.description}</p>
                                                {event.user && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Usuário: <span className="font-semibold text-foreground">{event.user.name}</span>
                                                    </p>
                                                )}
                                                {user?.permission_id == '1' && event.payload && (
                                                    <div className="mt-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-6 text-xs"
                                                            onClick={() => toggleJson(event.id)}
                                                        >
                                                            Ver JSON
                                                        </Button>
                                                        {expandedEvents.includes(event.id) && (
                                                            <pre className="mt-2 p-2 bg-slate-950 text-slate-50 rounded text-xs overflow-x-auto">
                                                                {(() => {
                                                                    try {
                                                                        const parsed = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
                                                                        return JSON.stringify(parsed, null, 2);
                                                                    } catch (e) {
                                                                        return event.payload;
                                                                    }
                                                                })()}
                                                            </pre>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {contract.events.filter((e: any) => e.event_type === 'status_update').length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento de status registrado.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Eventos de Integração */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold">Eventos de Integração</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {contract.events
                                        .filter((e: any) => e.event_type !== 'status_update')
                                        .slice()
                                        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                        .map((event: any, index: number) => (
                                        <div key={index} className="relative border-l-2 border-muted pl-4 pb-2 last:pb-0">
                                            <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-background bg-blue-500" />
                                            <div className="mb-1 text-xs text-muted-foreground">
                                                {new Date(event.created_at).toLocaleString('pt-BR')}
                                            </div>
                                            <div className="font-medium mb-1">
                                                <Badge className="bg-blue-600 hover:bg-blue-700">
                                                    {event.event_type === 'contratacao_end' ? 'Integração SulAmérica' : event.event_type}
                                                </Badge>
                                            </div>
                                            <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm">
                                                <p className="mb-2">{event.description}</p>
                                                {event.user && (
                                                    <p className="text-xs text-muted-foreground mb-2">
                                                        Usuário: <span className="font-semibold text-foreground">{event.user.name}</span>
                                                    </p>
                                                )}
                                                
                                                {/* Mensagem de Retorno se houver */}
                                                {event.payload && (() => {
                                                    try {
                                                        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
                                                        if (payload?.mens) {
                                                            return (
                                                                <p className="text-xs font-medium mt-1 mb-2">
                                                                    Mensagem: {payload.mens}
                                                                </p>
                                                            );
                                                        }
                                                        // Check inside response object if strictly structured that way
                                                        if (payload?.response?.mens) {
                                                             return (
                                                                <p className="text-xs font-medium mt-1 mb-2">
                                                                    Mensagem: {payload.response.mens}
                                                                </p>
                                                            );
                                                        }
                                                    } catch (e) { return null; }
                                                })()}

                                                {user?.permission_id == '1' && event.payload && (
                                                    <div className="mt-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-6 text-xs"
                                                            onClick={() => toggleJson(event.id)}
                                                        >
                                                            Ver JSON
                                                        </Button>
                                                        {expandedEvents.includes(event.id) && (
                                                            <pre className="mt-2 p-2 bg-slate-950 text-slate-50 rounded text-xs overflow-x-auto">
                                                                {(() => {
                                                                    try {
                                                                        const parsed = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
                                                                        return JSON.stringify(parsed, null, 2);
                                                                    } catch (e) {
                                                                        return event.payload;
                                                                    }
                                                                })()}
                                                            </pre>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {contract.events.filter((e: any) => e.event_type !== 'status_update').length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento de integração registrado.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
            
            {/* Barra fixa no rodapé com ações: Voltar, Editar e Cancelar */}
            <EditFooterBar
                onBack={handleBack}
                onContinue={handleEdit}
                onFinish={handleOpenCancel}
                finishVariant="destructive"
                disabled={isCancelling}
                backLabel="Voltar"
                continueLabel="Editar"
                finishLabel="Cancelar"
                showContinue={true}
                showFinish={contract.status === 'approved'}
                fixed={true}
            />
            {/* Dialog de confirmação de cancelamento acionado pela barra de rodapé */}
            {contract.status === 'approved' && (
                <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Cancelar Contrato?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação irá cancelar o contrato e notificar a integração (se disponível). 
                                Tem certeza que deseja continuar?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Voltar</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={handleCancel}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Sim, Cancelar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
