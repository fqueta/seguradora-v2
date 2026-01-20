import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ClientRecord } from '@/types/clients';
import { useUsersList } from '@/hooks/users';
import { useRestoreClient } from '@/hooks/clients';
import { useOrganizationsList } from '@/hooks/organizations';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { clientsService } from '@/services/clientsService';

interface ClientsTableProps {
  clients: ClientRecord[];
  onEdit: (client: ClientRecord) => void;
  onDelete: (client: ClientRecord) => void;
  isLoading: boolean;
  /**
   * Indica se a visualização atual é a Lixeira.
   * When true, shows a visual banner warning the list is filtering deleted records.
   */
  trashEnabled?: boolean;
}

/**
 * Componente de Tabela de Clientes
 * Renders client rows with owner and status. When `trashEnabled` is true,
 * shows a purple banner at the top, hides the Delete action, e exibe "Restaurar".
 */
export function ClientsTable({ clients, onEdit, onDelete, isLoading, trashEnabled }: ClientsTableProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  // Garantir que clients seja sempre um array válido
  const clientsList = Array.isArray(clients) ? clients : [];
  // Hook de restauração
  const restoreClientMutation = useRestoreClient();
  
  // Buscar lista de usuários para identificar o proprietário
  const { data: usersData } = useUsersList();
  const usersList = usersData?.data || [];
  // Organizações disponíveis
  const { data: organizationsData } = useOrganizationsList({ per_page: 100 });
  const organizations = organizationsData?.data || [];
  // Estado do modal de transferência
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [targetOrgId, setTargetOrgId] = useState<string>('');
  
  // Função para obter o nome do proprietário pelo ID do autor
  const getOwnerName = (autorId: string) => {
    const user = usersList.find(user => user.id === autorId);
    return user?.name || 'Não identificado';
  };
  // console.log('trashEnabled:', trashEnabled);
  
  // Função para formatar o status
  const getStatusBadge = (status: string) => {
    const statusMap = {
      'actived': { label: 'Ativo', variant: 'default' as const },
      'inactived': { label: 'Inativo', variant: 'destructive' as const },
      'pre_registred': { label: 'Pré-cadastro', variant: 'secondary' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status || 'Não definido', variant: 'outline' as const };
    
    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.label}
      </Badge>
    );
  };
  
  if (isLoading) {
    return <div className="text-center py-4">Carregando clientes...</div>;
  }
  
  if (clientsList.length === 0) {
    return (
      <div className="space-y-2">
        {trashEnabled && (
          <div className="flex items-center gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800">
            <Trash2 className="h-4 w-4" />
            <span>Exibindo itens da Lixeira — registros excluídos.</span>
          </div>
        )}
        <div className="text-center py-4">Nenhum cliente encontrado</div>
      </div>
    );
  }
  // console.log('Clientes:', clientsList);
  
  return (
    <div className="space-y-2">
      {trashEnabled && (
        <div className="flex items-center gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800">
          <Trash2 className="h-4 w-4" />
          <span>Exibindo itens da Lixeira — registros excluídos.</span>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Organização</TableHead>
            <TableHead>Proprietário</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientsList.map((client) => (
            <TableRow 
              key={client.id}
              onDoubleClick={() => navigate(`/admin/clients/${client.id}/view`)}
              className="cursor-pointer hover:bg-muted/50"
              title={`Visualizar detalhes do cliente ${client.name} com dois cliques`}
            >
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell>
                {client.tipo_pessoa === 'pf' ? (client.cpf || 'Não informado') : (client.cnpj || 'Não informado')}
              </TableCell>
              <TableCell>{client.email || 'Não informado'}</TableCell>
              <TableCell>{client.organization?.name || 'Não informada'}</TableCell>
              <TableCell>{client.autor_name || 'Não identificado'}</TableCell>
              <TableCell>
                {/* Debug temporário */}
                <div style={{fontSize: '10px', color: 'gray', marginBottom: '4px'}}>
                  {/* Debug: {JSON.stringify({ativo: client.status, type: typeof client.status})} */}
                </div>
                {getStatusBadge(client.status)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/admin/clients/${client.id}/view`, { state: { from: location } })}>
                      <Eye className="mr-2 h-4 w-4" /> Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/admin/clients/${client.id}/edit`, { state: { from: location } })}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    {Number(user?.permission_id || 99) <= 2 && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedClient(client);
                          setTargetOrgId('');
                          setTransferOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Transferir organização
                      </DropdownMenuItem>
                    )}
                    {trashEnabled && (
                      <DropdownMenuItem 
                        onClick={() => { restoreClientMutation.mutate(client.id); }}
                        disabled={restoreClientMutation.isPending}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                      </DropdownMenuItem>
                    )}
                    {!trashEnabled && (
                      <DropdownMenuItem onClick={() => onDelete(client)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* Modal de transferência de organização */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Transferir organização do cliente</DialogTitle>
            <DialogDescription>
              Ao continuar, o cliente será transferido para a nova organização e seus contratos serão ajustados para a mesma organização.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              Cliente: <span className="font-medium">{selectedClient?.name}</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm font-medium">Nova organização</label>
              <Select value={targetOrgId} onValueChange={(v) => setTargetOrgId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a organização" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org: any) => (
                    <SelectItem key={String(org.id)} value={String(org.id)}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground">
              Esta ação é permitida apenas para usuários com permissão administrativa (permission_id ≤ 2).
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  if (!selectedClient || !targetOrgId) return;
                  try {
                    await clientsService.transferOrganization(String(selectedClient.id), targetOrgId);
                    toast({ title: 'Transferência concluída', description: 'Organização e contratos atualizados.' });
                    setTransferOpen(false);
                    // Força atualização da página para refletir mudanças
                    window.location.reload();
                  } catch (e: any) {
                    const msg = e?.body?.message || e?.message || 'Falha ao transferir organização';
                    toast({ title: 'Erro', description: msg, variant: 'destructive' as any });
                  }
                }}
              >
                Transferir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
