import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Mail, User, Building, FileText, Plus, Eye, Pencil, Shield, 
  Phone, MapPin, Calendar, Briefcase, CreditCard, Building2, UserCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/hooks/users';
import { useContractsList } from '@/hooks/contracts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

export default function UserView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: userResponse, isLoading: isLoadingUser, error: userError } = useUser(id!);

  const user = (userResponse as any);

  const { data: contractsData, isLoading: isContractsLoading, error: contractsError } = useContractsList({ 
    owner_id: id,
    per_page: 50 
  }, { enabled: !!id });

  const { data: clientContractsData, isLoading: isClientContractsLoading, error: clientContractsError } = useContractsList({
    client_id: id,
    per_page: 50
  }, { enabled: !!id });

  const handleBack = () => {
    navigate('/admin/settings/users');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const getContractStatusBadge = (status: string) => {
    const map: Record<string, { label: string, variant: "default" | "destructive" | "outline" | "secondary" }> = {
      'pending': { label: 'Pendente', variant: 'secondary' },
      'active': { label: 'Ativo', variant: 'default' },
      'approved': { label: 'Aprovado', variant: 'default' },
      'cancelled': { label: 'Cancelado', variant: 'destructive' },
      'rejected': { label: 'Rejeitado', variant: 'destructive' },
      'draft': { label: 'Rascunho', variant: 'outline' },
    };

    const config = map[status] || { label: status, variant: 'secondary' };
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  if (isLoadingUser) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando informações do usuário...</p>
        </div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-destructive">Usuário não encontrado</h2>
              <p className="text-muted-foreground">O usuário solicitado não foi encontrado ou você não tem permissão para visualizá-lo.</p>
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para lista
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPJ = user.tipo_pessoa === 'pj';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button onClick={handleBack} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Mail className="h-3 w-3" /> {user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => navigate(`/admin/settings/users/${id}/edit`)} variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Badge variant={user.ativo === 's' ? 'default' : 'destructive'} className="text-sm px-3 py-1">
            {user.ativo === 's' ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Coluna Principal (Esquerda) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Dados Pessoais / Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                {isPJ ? <Building2 className="mr-2 h-5 w-5" /> : <UserCircle className="mr-2 h-5 w-5" />}
                {isPJ ? 'Dados da Empresa' : 'Dados Pessoais'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Nome / Razão Social</label>
                  <p className="text-sm font-medium">{user.name}</p>
                  {isPJ && user.razao && (
                    <p className="text-xs text-muted-foreground">{user.razao}</p>
                  )}
                  {isPJ && user.config?.nome_fantasia && (
                    <p className="text-xs text-muted-foreground">Fantasia: {user.config.nome_fantasia}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">{isPJ ? 'CNPJ' : 'CPF'}</label>
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-3 w-3 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {isPJ ? (user.cnpj || 'Não informado') : (user.cpf || 'Não informado')}
                    </p>
                  </div>
                  {!isPJ && user.config?.rg && (
                    <p className="text-xs text-muted-foreground mt-1">RG: {user.config.rg}</p>
                  )}
                </div>

                {!isPJ && (
                   <div className="space-y-1">
                     <label className="text-xs font-medium text-muted-foreground uppercase">Gênero</label>
                     <p className="text-sm">
                       {user.genero === 'm' ? 'Masculino' : user.genero === 'f' ? 'Feminino' : 'Não informado'}
                     </p>
                   </div>
                )}

                {!isPJ && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Data de Nascimento</label>
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-3 w-3 text-muted-foreground" />
                      <p className="text-sm">{formatDate(user.config?.nascimento)}</p>
                    </div>
                  </div>
                )}

                {!isPJ && user.config?.escolaridade && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Escolaridade</label>
                    <p className="text-sm">{user.config.escolaridade}</p>
                  </div>
                )}

                {!isPJ && user.config?.profissao && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Profissão</label>
                    <p className="text-sm">{user.config.profissao}</p>
                  </div>
                )}

                {isPJ && user.config?.tipo_pj && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Tipo de Empresa</label>
                    <p className="text-sm">{user.config.tipo_pj}</p>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <MapPin className="mr-2 h-5 w-5" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Logradouro</label>
                  <p className="text-sm">
                    {user.config?.endereco ? (
                      <>
                        {user.config.endereco}, {user.config.numero || 'S/N'}
                        {user.config.complemento && ` - ${user.config.complemento}`}
                      </>
                    ) : 'Não informado'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Bairro</label>
                  <p className="text-sm">{user.config?.bairro || '-'}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">CEP</label>
                  <p className="text-sm">{user.config?.cep || '-'}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Cidade / UF</label>
                  <p className="text-sm">
                    {user.config?.cidade ? `${user.config.cidade}${user.config.uf ? ` / ${user.config.uf}` : ''}` : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Observações */}
          {user.config?.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {user.config.observacoes}
                </p>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Coluna Lateral (Direita) */}
        <div className="space-y-6">
          
          {/* Contatos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Phone className="mr-2 h-5 w-5" />
                Contatos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Telefone Celular</label>
                <div className="flex items-center">
                  <p className="text-sm font-medium">{user.config?.celular || 'Não informado'}</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Telefone Residencial</label>
                <div className="flex items-center">
                  <p className="text-sm font-medium">{user.config?.telefone_residencial || 'Não informado'}</p>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">E-mail</label>
                <p className="text-sm font-medium truncate" title={user.email}>{user.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Atendimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Briefcase className="mr-2 h-5 w-5" />
                Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Nota: Estes campos dependem de como o backend retorna funnel/stage dentro de config ou relacionamento */}
              {/* Assumindo que podem vir em user.config ou user.funnel/stage se expandidos */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Funil</label>
                <p className="text-sm font-medium">
                  {user.funnel?.name || user.config?.funnelId || 'Não informado'}
                </p>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Etapa</label>
                <p className="text-sm font-medium">
                   {user.stage?.name || user.config?.stage_id || 'Não informado'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Shield className="mr-2 h-5 w-5" />
                Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Permissão</label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{user.permission?.name || user.permission_id || 'Sem permissão'}</Badge>
                </div>
              </div>

              {user.organization && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Organização</label>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{user.organization.name}</span>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Criado em</label>
                <p className="text-sm text-muted-foreground">{formatDate(user.created_at)}</p>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">Atualizado em</label>
                <p className="text-sm text-muted-foreground">{formatDate(user.updated_at)}</p>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Contratos - Full Width */}
        <div className="md:col-span-3 space-y-6">
          
          {/* Contratos Gerenciados */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <FileText className="mr-2 h-5 w-5" />
                {`Contratos gerados por ${user.name}`}
              </CardTitle>
              <div className="flex items-center gap-2">
                  {contractsData?.total !== undefined && (
                      <Badge variant="outline" className="font-normal">
                          {contractsData.total} contrato(s)
                      </Badge>
                  )}
                  <Button size="sm" onClick={() => navigate(`/admin/contracts/create?owner_id=${id}`)}>
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
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isContractsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Carregando contratos...
                        </TableCell>
                      </TableRow>
                    ) : contractsError ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-destructive">
                          Erro ao carregar contratos.
                        </TableCell>
                      </TableRow>
                    ) : (!contractsData || contractsData.data.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Nenhum contrato encontrado para este usuário.
                        </TableCell>
                      </TableRow>
                    ) : (
                      contractsData.data.map((contract: any) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.contract_number || contract.id}</TableCell>
                          <TableCell>{contract.client?.name || '-'}</TableCell>
                          <TableCell>
                            {getContractStatusBadge(contract.status)}
                          </TableCell>
                          <TableCell>{formatDate(contract.start_date)}</TableCell>
                          <TableCell>{formatDate(contract.end_date)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/contracts/${contract.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/contracts/${contract.id}/edit`)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Contratos Próprios */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <FileText className="mr-2 h-5 w-5" />
                Contratos próprios:
              </CardTitle>
              <div className="flex items-center gap-2">
                  {clientContractsData?.total !== undefined && (
                      <Badge variant="outline" className="font-normal">
                          {clientContractsData.total} contrato(s)
                      </Badge>
                  )}
                  <Button size="sm" onClick={() => navigate(`/admin/contracts/create?client_id=${id}`)}>
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
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isClientContractsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Carregando contratos...
                        </TableCell>
                      </TableRow>
                    ) : clientContractsError ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-destructive">
                          Erro ao carregar contratos.
                        </TableCell>
                      </TableRow>
                    ) : (!clientContractsData || clientContractsData.data.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Nenhum contrato encontrado para este usuário como cliente.
                        </TableCell>
                      </TableRow>
                    ) : (
                      clientContractsData.data.map((contract: any) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.contract_number || contract.id}</TableCell>
                          <TableCell>{contract.client?.name || '-'}</TableCell>
                          <TableCell>
                            {getContractStatusBadge(contract.status)}
                          </TableCell>
                          <TableCell>{formatDate(contract.start_date)}</TableCell>
                          <TableCell>{formatDate(contract.end_date)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/contracts/${contract.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/contracts/${contract.id}/edit`)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
