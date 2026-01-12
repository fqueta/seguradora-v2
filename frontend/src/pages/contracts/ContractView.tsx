import { useParams, useNavigate } from 'react-router-dom';
import { useContract } from '@/hooks/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, FileText, User, Calendar, DollarSign, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function ContractView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: contract, isLoading, error } = useContract(id as string);
    const [expandedEvents, setExpandedEvents] = useState<number[]>([]);

    const toggleJson = (eventId: number) => {
        setExpandedEvents(prev => 
            prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
        );
    };

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
                                                <p className="font-medium">{contract.client?.genero || '-'}</p>
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <label className="text-xs text-muted-foreground">Endereço</label>
                                                <p className="font-medium">
                                                    {[
                                                        clientConfig.endereco || contract.client?.address,
                                                        clientConfig.numero || contract.client?.number,
                                                        clientConfig.bairro || contract.client?.district,
                                                        clientConfig.cidade || contract.client?.city,
                                                        clientConfig.uf || contract.client?.state
                                                    ].filter(Boolean).join(', ') || '-'}
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
        </div>
    );
}
