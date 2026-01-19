import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Mail, User, Building, FileText, Plus, Eye, Pencil, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/hooks/users';
import { useContractsList } from '@/hooks/contracts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={handleBack} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={() => navigate(`/admin/settings/users/${id}/edit`)} variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Badge variant={user.ativo === 's' ? 'default' : 'destructive'}>
            {user.ativo === 's' ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Informações do Cadastro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="text-sm font-medium">{user.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">E-mail</label>
              <p className="text-sm flex items-center">
                <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                {user.email}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Permissão (Level)</label>
              <p className="text-sm flex items-center">
                <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                {user.permission_id}
              </p>
            </div>
            {user.organization && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Organização</label>
                <p className="text-sm flex items-center">
                  <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                  {user.organization.name}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Criado em</label>
              <p className="text-sm">{formatDate(user.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contratos Gerenciados (onde o usuário é o owner) */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Contratos do Usuário
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
                          <Badge variant={
                            contract.status === 'approved' || contract.status === 'active' ? 'default' :
                            contract.status === 'cancelled' || contract.status === 'rejected' ? 'destructive' :
                            'secondary'
                          }>
                            {contract.status}
                          </Badge>
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
  );
}
