import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, User, Building, Calendar, Briefcase, FileText, DollarSign, Edit, Plus, Eye, Pencil, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useClientById } from '@/hooks/clients';
import { getMockClientById } from '@/mocks/clients';
import { ClientRecord } from '@/types/clients';
import { useFunnel, useStagesList } from '@/hooks/funnels';
import { phoneApplyMask } from '@/lib/masks/phone-apply-mask';
import { useContractsList } from '@/hooks/contracts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EventTimeline } from '@/components/clients/EventTimeline';



/**
 * Página de visualização detalhada de um cliente específico
 * Exibe todas as informações do cadastro do cliente de forma organizada
 */
export default function ClientView() {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // pt-BR: Flag para ativar uso de dados mockados
  // en-US: Flag to enable mocked data usage
  const useMock = import.meta.env.VITE_USE_MOCK_CLIENTS === 'true';
  // Hooks para buscar e atualizar cliente
  const { data: clientResponse, isLoading: isLoadingClient, error, isError, isSuccess } = useClientById(id!);
  /**
   * Normaliza o formato da resposta do cliente
   * pt-BR: A API pode retornar o cliente direto ou dentro de `data`.
   * en-US: API may return the client directly or wrapped under `data`.
   */
  const client: ClientRecord | null = useMock
    ? getMockClientById(id!)
    : (() => {
        const raw: any = clientResponse as any;
        if (!raw) return null;
        if (raw && typeof raw === 'object' && 'data' in raw && raw.data && !Array.isArray(raw.data)) {
          return raw.data as ClientRecord;
        }
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          return raw as ClientRecord;
        }
        return null;
      })();
  const link_admin:string = 'admin';
  // Log para debug em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('Client data:', client);
  }
  const { toast } = useToast();
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false);
  const handleIntegrate = () => {
    setShowIntegrationDialog(true);
  };

  /**
   * Busca dados do Funil e Etapa para exibição no card "Atendimento".
   * - Evita chamadas quando em modo mock.
   * - Faz lookup da etapa pelo `stage_id` no resultado paginado.
   */
  const funnelId = client?.config?.funnelId || '';
  const stageId = client?.config?.stage_id || '';
  const funnelQuery = useFunnel(funnelId, {
    enabled: !!funnelId && !useMock,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const stagesQuery = useStagesList(funnelId, { per_page: 100 }, {
    enabled: !!funnelId && !useMock,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const funnelName = (useMock ? 'Funil de Leads (mock)' : (funnelQuery.data?.name || funnelId || 'Não informado'));
  const { data: contractsData, isLoading: isContractsLoading, error: contractsError } = useContractsList({ 
    client_id: id,
    per_page: 50 
  }, { enabled: !!id });

  const stageName = (() => {
    if (useMock) return stageId ? `Etapa ${stageId}` : 'Não informado';
    const list = (stagesQuery.data as any)?.data || [];
    const found = list.find((s: any) => s.id === stageId);
    return found?.name || (stageId || 'Não informado');
  })();



  /**
   * detectFunnelIdFromClient
   * pt-BR: Tenta detectar o funil do cliente a partir de diferentes caminhos
   *        usados pela API e normaliza para string.
   * en-US: Attempts to detect client's funnel from different API paths and
   *        normalizes to string.
   */
  const detectFunnelIdFromClient = (c: ClientRecord | null): string | null => {
    if (!c) return null;
    const p: any = (c as any).preferencias || {};
    const cfg: any = (c as any).config || {};
    const candidates = [
      cfg?.funnelId,
      p?.pipeline?.funnelId,
      p?.atendimento?.funnelId,
      p?.funnelId,
    ];
    for (const v of candidates) {
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (s.length > 0) return s;
    }
    return null;
  };
  /**
   * getReturnUrl
   * pt-BR: Determina a URL de retorno priorizando `state.from` (página de origem),
   *        depois `?returnTo` na query string, com fallback para o funil atual
   *        ou lista de clientes.
   * en-US: Determines the return URL prioritizing `state.from` (origin page),
   *        then `?returnTo` query param, falling back to current funnel or
   *        clients list.
   */
  const getReturnUrl = (): string => {
    const from = (location.state as any)?.from;
    if (from && typeof from === 'object') {
      const path = String(from.pathname || '/');
      const search = String(from.search || '');
      const hash = String(from.hash || '');
      return `${path}${search}${hash}`;
    }
    const returnTo = searchParams.get('returnTo');
    if (returnTo && returnTo.startsWith('/')) {
      try {
        const decoded = decodeURIComponent(returnTo);
        if (decoded.startsWith('/')) return decoded;
      } catch {}
    }
    const funnelFromQuery = searchParams.get('funnel') || '';
    const fallbackFunnel = detectFunnelIdFromClient(client) || '';
    const targetFunnel = funnelFromQuery || fallbackFunnel;
    if (targetFunnel) {
      return `/${link_admin}/customers/leads?funnel=${encodeURIComponent(String(targetFunnel))}`;
    }
    return `/${link_admin}/clients`;
  };
  /**
   * handleBack
   * pt-BR: Navega de volta para a página de atendimento (kanban), preservando
   *        o funil previamente aberto via `?funnel=`. Se o parâmetro não estiver
   *        presente (acesso direto), usa o funil do cliente como fallback.
   * en-US: Navigates back to the attendance (kanban) page, preserving the
   *        previously opened funnel via `?funnel=`. If the parameter is absent
   *        (direct access), falls back to the client's funnel.
   */
  const handleBack = () => {
    navigate(getReturnUrl());
  };

  /**
   * Navega para a página de edição do cliente
   */
  const handleEdit = () => {
    // Preserva o funil atual na query string ao ir para edição
    // pt-BR: Se houver `?funnel=` na URL atual, repassa para a edição.
    // en-US: If `?funnel=` exists in current URL, forward it to the edit page.
    const funnelFromQuery = searchParams.get('funnel') || '';
    const fallbackFunnel = detectFunnelIdFromClient(client) || '';
    const targetFunnel = funnelFromQuery || fallbackFunnel;
    const q = targetFunnel ? `?funnel=${encodeURIComponent(String(targetFunnel))}` : '';
    // Também envia o estado de origem para a página de edição
    navigate(`/${link_admin}/clients/${id}/edit${q}`, { state: { from: location } });
  };

  /**
   * Formata a data para exibição no formato brasileiro
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    try {
      // Se a data estiver no formato YYYY-MM-DD, fazemos o parse manual
      // para evitar problemas de timezone (que podem subtrair 1 dia)
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
        const [year, month, day] = dateString.trim().split('-');
        return `${day}/${month}/${year}`;
      }

      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  /**
   * Formata o CEP para exibição
   */
  const formatCEP = (cep: string) => {
    if (!cep) return 'Não informado';
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  /**
   * Formata CPF para exibição
   */
  const formatCPF = (cpf: string) => {
    if (!cpf) return 'Não informado';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  /**
   * Formata CNPJ para exibição
   */
  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return 'Não informado';
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  /**
   * Formata telefone para exibição
   */
  const formatPhone = (phone: string) => {
    const cleaned = (phone || '').replace(/\D/g, '');
    const masked = phoneApplyMask(cleaned);
    return masked || 'Não informado';
  };

  if (!useMock && isLoadingClient) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando informações do cliente...</p>
        </div>
      </div>
    );
  }

  // Função para determinar o tipo de erro e mensagem apropriada
  const getErrorInfo = () => {
    // pt-BR: Ao usar mocks, não exibir telas de erro originadas da API
    // en-US: When using mocks, suppress API-originated error screens
    if (useMock) return null;
    if (!error && !client && !isLoadingClient) {
      return {
        title: 'Cliente não encontrado',
        message: 'O cliente solicitado não foi encontrado ou não existe.',
        type: 'not-found'
      };
    }
    
    if (error) {
      const errorWithStatus = error as Error & { status?: number };
      
      switch (errorWithStatus.status) {
        case 404:
          return {
            title: 'Cliente não encontrado',
            message: 'O cliente com este ID não existe no sistema.',
            type: 'not-found'
          };
        case 500:
          return {
            title: 'Erro interno do servidor',
            message: 'Ocorreu um erro interno no servidor. Tente novamente em alguns minutos ou entre em contato com o suporte.',
            type: 'server-error'
          };
        case 403:
          return {
            title: 'Acesso negado',
            message: 'Você não tem permissão para visualizar este cliente.',
            type: 'forbidden'
          };
        case 401:
          return {
            title: 'Não autorizado',
            message: 'Sua sessão expirou. Faça login novamente.',
            type: 'unauthorized'
          };
        default:
          return {
            title: 'Erro ao carregar cliente',
            message: error.message || 'Ocorreu um erro inesperado ao carregar as informações do cliente.',
            type: 'generic'
          };
      }
    }
    
    return null;
  };

  const errorInfo = getErrorInfo();
  
  if (errorInfo) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              {/* Ícone baseado no tipo de erro */}
              <div className="flex justify-center">
                {errorInfo.type === 'server-error' && (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                )}
                {errorInfo.type === 'not-found' && (
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.935-6.072-2.456M15 21H9a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v14a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                {(errorInfo.type === 'forbidden' || errorInfo.type === 'unauthorized') && (
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                )}
                {errorInfo.type === 'generic' && (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{errorInfo.title}</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {errorInfo.message}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para lista
                </Button>
                
                {errorInfo.type === 'server-error' && (
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="default"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Tentar novamente
                  </Button>
                )}
                
                {errorInfo.type === 'unauthorized' && (
                  <Button 
                    onClick={() => {
                      localStorage.removeItem('token');
                      window.location.href = '/auth/login';
                    }} 
                    variant="default"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Fazer login
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verificação adicional de segurança
  if (!client) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.935-6.072-2.456M15 21H9a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v14a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Cliente não encontrado</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  O cliente solicitado não foi encontrado ou não existe.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para lista
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-6 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">

          <div>
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <p className="text-muted-foreground">
              {client.tipo_pessoa === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">

          <Badge variant={
            client.status === 'actived' ? 'default' : 
            client.status === 'inactived' ? 'destructive' : 
            'secondary'
          }>
            {client.status === 'actived' ? 'Ativo' : 
             client.status === 'inactived' ? 'Inativo' : 
             'Pré-cadastro'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Integração ao Clube */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <Building className="mr-2 h-5 w-5" />
              Integração ao Clube
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={`flex items-center gap-1 ${client.is_alloyal && (client.is_alloyal.active ?? true) ? 'bg-green-600 text-white border-transparent' : 'bg-red-600 text-white border-transparent'}`}
              >
                <Building className="h-3 w-3" />
                Integrado ao clube
              </Badge>
              {(!client.is_alloyal || !(client.is_alloyal.active ?? true)) && (
                <Button size="sm" onClick={handleIntegrate}>
                  Integrar ao clube
                </Button>
              )}
            </div>
            <Dialog open={showIntegrationDialog} onOpenChange={setShowIntegrationDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Como integrar ao clube</DialogTitle>
                  <DialogDescription>
                    Para integrar ao clube você precisa acessar a página de edição do cadastro e apertar o botão de salvar.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowIntegrationDialog(false)}>
                    Fechar
                  </Button>
                  <Button onClick={() => { setShowIntegrationDialog(false); handleEdit(); }}>
                    Ir para edição
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {client.is_alloyal && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID</label>
                  <p className="text-sm">{client.is_alloyal.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Situação</label>
                  <p className="text-sm">
                    <Badge variant={client.is_alloyal.active ? 'default' : 'destructive'}>
                      {client.is_alloyal.active ? 'Ativado' : 'Desativado'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID da Empresa</label>
                  <p className="text-sm">{client.is_alloyal.business_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Ativação</label>
                  <p className="text-sm">{formatDate(client.is_alloyal.activated_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    {client.is_alloyal.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CPF</label>
                  <p className="text-sm">{formatCPF(client.is_alloyal.cpf)}</p>
                </div>
                {client.points !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Pontos</label>
                    <p className="text-sm flex items-center">
                      <DollarSign className="mr-2 h-4 w-4" />
                      {client.points}
                    </p>
                  </div>
                )}
                {client.is_alloyal?.wallet && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Saldo da Carteira</label>
                    <p className="text-sm flex items-center">
                      <DollarSign className="mr-2 h-4 w-4" />
                      R$ {client.is_alloyal.wallet.balance.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              <User className="mr-2 h-5 w-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="text-sm">{client.name || 'Não informado'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Vendedor</label>
              <p className="text-sm">{client.autor_name || client.autor || 'Não informado'}</p>
            </div>
            
            {client.tipo_pessoa === 'pj' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Razão Social</label>
                <p className="text-sm">{client.razao || 'Não informado'}</p>
              </div>
            )}
            
            {client.config?.nome_fantasia && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome Fantasia</label>
                <p className="text-sm">{client.config.nome_fantasia}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Documento</label>
              <p className="text-sm">
                {client.tipo_pessoa === 'pf' 
                  ? formatCPF(client.cpf) 
                  : formatCNPJ(client.cnpj)
                }
              </p>
            </div>

            {client.config?.rg && client.tipo_pessoa === 'pf' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">RG</label>
                <p className="text-sm">{client.config.rg}</p>
              </div>
            )}

            {client.tipo_pessoa === 'pf' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Gênero</label>
                <p className="text-sm">
                  {client.genero === 'm' ? 'Masculino' : 
                   client.genero === 'f' ? 'Feminino' : 'Não informado'}
                </p>
              </div>
            )}

            {client.config?.nascimento && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                <p className="text-sm">{formatDate(client.config.nascimento)}</p>
              </div>
            )}

            {client.config?.tipo_pj && client.tipo_pessoa === 'pj' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tipo de Pessoa Jurídica</label>
                <p className="text-sm">{client.config.tipo_pj}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações Profissionais/Acadêmicas */}
        {(client.config?.escolaridade || client.config?.profissao) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="mr-2 h-5 w-5" />
                Informações Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.config?.escolaridade && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Escolaridade</label>
                  <p className="text-sm flex items-center">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    {client.config.escolaridade}
                  </p>
                </div>
              )}

              {client.config?.profissao && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Profissão</label>
                  <p className="text-sm flex items-center">
                    <Briefcase className="mr-2 h-4 w-4" />
                    {client.config.profissao}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contratos */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Contratos {process.env.NODE_ENV === 'development' && <span className="text-xs font-normal ml-2 opacity-50">(ID: {id})</span>}
            </CardTitle>
            <div className="flex items-center gap-2">
                {contractsData?.total !== undefined && (
                    <Badge variant="outline" className="font-normal">
                        {contractsData.total} contrato(s)
                    </Badge>
                )}
                <Button size="sm" onClick={() => navigate(`/admin/contracts/create?client_id=${id}`)} title="Adicionar um novo contrato para este cliente">
                    <Plus className="mr-2 h-4 w-4" /> Novo contrato
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Debug row to confirm rendering */}
                  {isContractsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Carregando contratos...
                      </TableCell>
                    </TableRow>
                  ) : contractsError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-destructive">
                        Erro ao carregar contratos: {(contractsError as any)?.message || 'Erro desconhecido'}
                      </TableCell>
                    </TableRow>
                  ) : (!contractsData || !Array.isArray(contractsData.data)) ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {(!contractsData) ? 'Aguardando dados...' : 'Estrutura de dados inválida'}
                      </TableCell>
                    </TableRow>
                  ) : contractsData.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Nenhum contrato encontrado para este cliente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contractsData?.data?.map((contract: any) => {
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
                          <TableCell className="font-medium">{contract.contract_number || contract.id}</TableCell>
                          <TableCell>
                            <Badge variant={
                              contract.status === 'approved' || contract.status === 'active' ? 'default' :
                              contract.status === 'cancelled' || contract.status === 'rejected' ? 'destructive' :
                              'secondary'
                            }>
                              {translatedStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(contract.start_date)}</TableCell>
                          <TableCell>{formatDate(contract.end_date)}</TableCell>
                          <TableCell>
                            {contract.value 
                              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {contract?.product?.supplierData?.name 
                              || contract?.product?.supplier?.name 
                              || '-'}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                             <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/contracts/${contract.id}?client_id=${client.id}`)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/contracts/${contract.id}/edit?client_id=${client.id}`)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="mr-2 h-5 w-5" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                {client.email || 'Não informado'}
              </p>
            </div>

            {client.config?.celular && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Celular</label>
                <p className="text-sm flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  {formatPhone(client.config.celular)}
                </p>
              </div>
            )}

            {client.config?.telefone_residencial && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone Residencial</label>
                <p className="text-sm flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  {formatPhone(client.config.telefone_residencial)}
                </p>
              </div>
            )}


          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.config?.cep && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">CEP</label>
                <p className="text-sm">{formatCEP(client.config.cep)}</p>
              </div>
            )}

            {client.config?.endereco && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                <p className="text-sm">
                  {client.config.endereco}
                  {client.config?.numero && `, ${client.config.numero}`}
                </p>
              </div>
            )}

            {client.config?.complemento && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Complemento</label>
                <p className="text-sm">{client.config.complemento}</p>
              </div>
            )}

            {client.config?.bairro && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                <p className="text-sm">{client.config.bairro}</p>
              </div>
            )}

            {(client.config?.cidade || client.config?.uf) && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cidade/UF</label>
                <p className="text-sm">
                  {client.config?.cidade && client.config?.uf 
                    ? `${client.config.cidade}, ${client.config.uf}`
                    : client.config?.cidade || client.config?.uf || 'Não informado'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Link de Ativação - Para clientes pré-registrados */}
        {client.status === 'pre_registred' && (client as any).link_active_cad && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Ativação de Cadastro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p className="text-sm">
                  <Badge variant="secondary">
                    Aguardando Ativação
                  </Badge>
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Link de Ativação</label>
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open((client as any).link_active_cad, '_blank')}
                    className="w-full"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Acessar Link de Ativação
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique para abrir o link de ativação do cadastro
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Atendimento (Funil e Etapa) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5" />
              Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Funil</label>
              <p className="text-sm">{funnelName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Etapa</label>
              <p className="text-sm">{stageName}</p>
            </div>
          </CardContent>
        </Card>

        {/* Informações Profissionais/Acadêmicas */}
        {(client.config?.escolaridade || client.config?.profissao) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="mr-2 h-5 w-5" />
                Informações Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.config?.escolaridade && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Escolaridade</label>
                  <p className="text-sm flex items-center">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    {client.config.escolaridade}
                  </p>
                </div>
              )}

              {client.config?.profissao && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Profissão</label>
                  <p className="text-sm flex items-center">
                    <Briefcase className="mr-2 h-4 w-4" />
                    {client.config.profissao}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Observações */}
      {client.config?.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{client.config.observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Linha do Tempo de Eventos */}
      <EventTimeline events={client.events} />

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {client.created_at && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data de Cadastro</label>
              <p className="text-sm">{formatDate(client.created_at)}</p>
            </div>
          )}

          {client.updated_at && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
              <p className="text-sm">{formatDate(client.updated_at)}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground">ID do Cliente</label>
            <p className="text-sm font-mono">{client.id}</p>
          </div>
        </CardContent>
      </Card>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto py-3 flex items-center justify-between gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2"
            >
                <ArrowLeft className="h-4 w-4" />
                Voltar
            </Button>

            <Button
                variant="default"
                size="sm"
                onClick={handleEdit}
                className="flex items-center gap-2"
            >
                <Edit className="h-4 w-4" />
                Editar
            </Button>
        </div>
      </div>
    </div>
  );
}
