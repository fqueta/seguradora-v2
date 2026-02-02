import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, CalendarIcon, Eye, RotateCcw, MoreHorizontal } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { MaskedInputField } from '@/components/lib/MaskedInputField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddressAccordion } from "@/components/lib/AddressAccordion";
import { UserForm } from '@/components/users/UserForm';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { cpfApplyMask } from '@/lib/masks/cpf-apply-mask';

import { 
  useUsersList, 
  useCreateUser, 
  useUpdateUser,
  useDeleteUser,
  useRestoreUser,
  useForceDeleteUser
} from '@/hooks/users';
import { usePermissionsList } from '@/hooks/permissions';
import { useOrganizationsList } from '@/hooks/organizations';
import { UserRecord, CreateUserInput } from '@/types/users';
import { toast } from '@/hooks/use-toast';
import { usersService } from '@/services/usersService';

const userSchema = z.object({
  tipo_pessoa: z.enum(["pf", "pj"]).optional(),
  permission_id: z.coerce.string().min(1, 'Permissão é obrigatória'),
  organization_id: z.number().nullable().optional(),
  email: z.string().email('Email inválido'),
  password: z.string().transform(val => val === "" ? undefined : val).optional().refine(val => val === undefined || val.length >= 6, {
    message: "Senha deve ter pelo menos 6 caracteres"
  }),
  name: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  // status: z.enum(["actived", "disabled"]),
  razao: z.string().optional(),
  genero: z.enum(["m", "f", "ni"]).optional(),
  ativo: z.enum(["s", "n"]).optional(),
  config: z.object({
    nome_fantasia: z.string().nullable().optional(),
    celular: z.string().nullable().optional(),
    telefone_residencial: z.string().nullable().optional(),
    telefone_comercial: z.string().nullable().optional(),
    rg: z.string().nullable().optional(),
    nascimento: z.string().nullable().optional(),
    escolaridade: z.string().nullable().optional(),
    profissao: z.string().nullable().optional(),
    tipo_pj: z.string().nullable().optional(),
    cep: z.string().nullable().optional(),
    endereco: z.string().nullable().optional(),
    numero: z.string().nullable().optional(),
    complemento: z.string().nullable().optional(),
    bairro: z.string().nullable().optional(),
    cidade: z.string().nullable().optional(),
    uf: z.string().nullable().optional(),
  }).optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function Users() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [forceDeletingUser, setForceDeletingUser] = useState<UserRecord | null>(null);
  const [showTrash, setShowTrash] = useState(false);

  const { data: usersData, isLoading, error, refetch } = useUsersList({ 
    page, 
    per_page: 10,
    excluido: showTrash ? 's' : undefined
  });

  // Refetch when showTrash changes
  useEffect(() => {
    setPage(1);
    refetch();
  }, [showTrash, refetch]);

  const { data: permissionsData, isLoading: isLoadingPermissions } = usePermissionsList();
  const permissions = permissionsData?.data || [];

  const { data: organizationsData } = useOrganizationsList({ per_page: 100, active: true });
  const organizations = organizationsData?.data || [];

  // Fetch users for owner selection
  const { data: ownersData } = useUsersList({ per_page: 9999, consultores: false });
  const ownersList = ownersData?.data || [];
  
  // Change Owner State
  const [changeOwnerOpen, setChangeOwnerOpen] = useState(false);
  const [selectedUserOwner, setSelectedUserOwner] = useState<UserRecord | null>(null);
  const [newOwnerId, setNewOwnerId] = useState<string>('');

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const restoreMutation = useRestoreUser();
  const forceDeleteMutation = useForceDeleteUser();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      tipo_pessoa: 'pf',
      permission_id: '',
      organization_id: null,
      name: '',
      email: '',
      password: '',
      cpf: '',
      cnpj: '',
      razao: '',
      // status: 'actived',
      genero: 'ni',
      ativo: 's',
      config: {
        nome_fantasia: '',
        celular: '',
        telefone_residencial: '',
        telefone_comercial: '',
        rg: '',
        nascimento: '',
        escolaridade: '',
        profissao: '',
        tipo_pj: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
      },
    },
  });

  const users = usersData?.data || [];
  const totalPages = usersData?.last_page || 1;

  // Auto-fill permission_id when permissions load and field is empty
  useEffect(() => {
    const currentPermissionId = form.getValues('permission_id');
    
    if (!currentPermissionId && permissions.length > 0 && !editingUser) {
      form.setValue('permission_id', String(permissions[0].id));
    }
  }, [permissions, form, editingUser]);

  // Client-side filtering
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    
    const searchLower = search.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  }, [users, search]);

  const handleOpenModal = (user?: UserRecord) => {
    if (user) {
      setEditingUser(user);
      form.reset({
        tipo_pessoa: user.tipo_pessoa,
        permission_id: String(user.permission_id),
        organization_id: user.organization_id || null,
        email: user.email,
        name: user.name,
        cpf: user.cpf || '',
        cnpj: user.cnpj || '',
        razao: user.razao || '',
        genero: user.genero,
        ativo: user.ativo,
        config: typeof user.config === 'object' && !Array.isArray(user.config)
        ? user.config
        : {
          nome_fantasia: user.config.nome_fantasia ?? '',
          celular: user.config.celular ?? '',
          telefone_residencial: user.config.telefone_residencial ?? '',
          telefone_comercial: user.config.telefone_comercial ?? '',
          rg: user.config.rg ?? '',
          nascimento: user.config.nascimento ?? '',
          escolaridade: user.config.escolaridade ?? '',
          profissao: user.config.profissao ?? '',
          tipo_pj: user.config.tipo_pj ?? '',
          cep: user.config.cep ?? '',
          endereco: user.config.endereco ?? '',
          numero: user.config.numero ?? '',
          complemento: user.config.complemento ?? '',
          bairro: user.config.bairro ?? '',
          cidade: user.config.cidade ?? '',
          uf: user.config.uf ?? '',
        },
      });
    } else {
      setEditingUser(null);
      form.reset({
        permission_id: permissions.length > 0 ? String(permissions[0].id) : "",
        organization_id: null,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    form.reset();
  };

  const onSubmit = async (data: UserFormData) => {
    console.log('Valores submetidos:', data); 
    try {
      const payload: CreateUserInput = {
        tipo_pessoa: data.tipo_pessoa as any,
        token: '', // Empty token as per schema
        permission_id: data.permission_id,
        organization_id: data.organization_id,
        email: data.email,
        password: data.password || 'mudar123', // Default password if not provided
        name: data.name,
        cpf: data.cpf || '',
        cnpj: data.cnpj || '',
        razao: data.razao || '',
        config: {
          nome_fantasia: data.config?.nome_fantasia || '',
          celular: data.config?.celular || '',
          telefone_residencial: data.config?.telefone_residencial || '',
          telefone_comercial: data.config?.telefone_comercial || '',
          rg: data.config?.rg || '',
          nascimento: data.config?.nascimento || '',
          escolaridade: data.config?.escolaridade || '',
          profissao: data.config?.profissao || '',
          tipo_pj: data.config?.tipo_pj || '',
          cep: data.config?.cep || '',
          endereco: data.config?.endereco || '',
          numero: data.config?.numero || '',
          complemento: data.config?.complemento || '',
          bairro: data.config?.bairro || '',
          cidade: data.config?.cidade || '',
          uf: data.config?.uf || '',
        },
        genero: data.genero,
        ativo: data.ativo,
      };

      if (editingUser) {
        await updateMutation.mutateAsync({ 
          id: editingUser.id, 
          data: payload
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      handleCloseModal();
    } catch (error: any) {
      const body = error?.body;
      const apiMessage = error?.message || 'Erro desconhecido';
      if (body?.errors && typeof body.errors === 'object') {
        const errorsObj = body.errors as Record<string, string[]>;
        Object.entries(errorsObj).forEach(([field, messages]) => {
          const msg = Array.isArray(messages) && messages.length ? messages[0] : apiMessage;
          try {
            form.setError(field as any, { message: msg });
          } catch {
            // fallback ignore
          }
        });
      }
    }
  };

  const handleDelete = async () => {
    if (deletingUser) {
      try {
        await deleteMutation.mutateAsync(deletingUser.id);
        setDeletingUser(null);
      } catch (error) {
        // Error is handled by the mutation hook
      }
    }
  };

  const handleRestore = async (user: UserRecord) => {
    try {
      await restoreMutation.mutateAsync(user.id);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleForceDelete = async () => {
    if (forceDeletingUser) {
      try {
        await forceDeleteMutation.mutateAsync(forceDeletingUser.id);
        setForceDeletingUser(null);
      } catch (error) {
        // Error is handled by the mutation hook
      }
    }
  };

  const getAtivoBadge = (ativo: string) => {
    return ativo === 's' ? 
      <Badge className="bg-success text-success-foreground">Sim</Badge> : 
      <Badge variant="secondary">Não</Badge>;
  };

  const handleOnclick = ()=>{
    const rowData = form.getValues();
    console.log('Dados do Formulario',rowData);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-6 max-w-md">
            <h2 className="text-2xl font-semibold text-destructive mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar a gestão de usuários.
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-semibold text-destructive mb-2">Erro</h2>
          <p className="text-muted-foreground">
            Erro ao carregar usuários: {errorMessage}
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Usuários</h1>
              {showTrash && <Badge variant="destructive">LIXEIRA</Badge>}
            </div>
            <p className="text-muted-foreground">
              Gerencie os usuários do sistema
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showTrash ? "default" : "outline"}
            onClick={() => setShowTrash(!showTrash)}
            title={showTrash ? "Ver Ativos" : "Ver Lixeira"}
          >
            {showTrash ? <RotateCcw className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {showTrash ? "Ver Ativos" : "Lixeira"}
          </Button>
          {!showTrash && (
            <Button onClick={() => navigate('/admin/settings/users/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Configure os usuários do sistema
          </CardDescription>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar usuários..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-6">
              {search.trim() ? (
                <p className="text-muted-foreground">
                  Nenhum usuário encontrado para "{search}".
                </p>
              ) : (
                <>
                  <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
                  {!showTrash && (
                    <Button 
                      onClick={() => handleOpenModal()} 
                      className="mt-4"
                      variant="outline"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar primeiro usuário
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissão</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Organização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      onDoubleClick={() => !showTrash && navigate(`/admin/settings/users/${user.id}/view`)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !showTrash) {
                          e.preventDefault();
                          navigate(`/admin/settings/users/${user.id}/view`);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      className={`cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring ${showTrash ? 'opacity-80' : ''}`}
                    >
                      <TableCell className="font-medium">
                        {user.name}
                      </TableCell>
                      <TableCell>
                        {user.cpf ? cpfApplyMask(user.cpf) : '-'}
                      </TableCell>
                      <TableCell>
                        {user.email}
                      </TableCell>
                      <TableCell>
                        {permissions.find(p => String(p.id) === String(user.permission_id))?.name || user.permission_id}
                      </TableCell>
                      <TableCell>
                        {getAtivoBadge(user.ativo)}
                      </TableCell>
                      <TableCell>
                        {user.organization?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {showTrash ? (
                             <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestore(user);
                                }}
                                title="Restaurar"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setForceDeletingUser(user);
                                }}
                                title="Excluir Permanentemente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/admin/settings/users/${user.id}/view`)}>
                                  <Eye className="mr-2 h-4 w-4" /> Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/admin/settings/users/${user.id}/edit`)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedUserOwner(user);
                                  if (!user.organization_id) {
                                     toast({ title: 'Atenção', description: 'Selecione uma organização para este usuário antes de alterar o proprietário.', variant: 'destructive' });
                                     // Optionally open edit modal
                                     handleOpenModal(user);
                                  } else {
                                    setNewOwnerId(user.autor ? String(user.autor) : '');
                                    setChangeOwnerOpen(true);
                                  }
                                }}>
                                  <Pencil className="mr-2 h-4 w-4" /> Alterar Proprietário
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeletingUser(user)} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Altere os dados do usuário' : 'Preencha os dados para criar um novo usuário'}
            </DialogDescription>
          </DialogHeader>
          <UserForm
            form={form as any}
            onSubmit={onSubmit as any}
            onCancel={handleCloseModal}
            editingUser={editingUser ?? null}
            permissions={permissions as any}
            organizations={organizations}
            isLoadingPermissions={isLoadingPermissions}
            handleOnclick={handleOnclick}
            showTipoPessoa={false}
            showGenero={false}
            showAddressSection={false}
            showCpf={false}
            showPhones={false}
            ativoAsSwitch={true}
            showBirthDate={false}
          />
          </DialogContent>
      </Dialog>
      
      {/* Change Owner Modal */}
      <Dialog open={changeOwnerOpen} onOpenChange={setChangeOwnerOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Alterar Proprietário do Usuário</DialogTitle>
            <DialogDescription>
              Selecione o novo proprietário para este usuário. Apenas usuários da mesma organização são listados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              Usuário: <span className="font-medium">{selectedUserOwner?.name}</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm font-medium">Novo Proprietário</label>
              <Select value={newOwnerId} onValueChange={(v) => setNewOwnerId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o proprietário" />
                </SelectTrigger>
                <SelectContent>
                  {ownersList
                    .filter(u => u.organization_id === selectedUserOwner?.organization_id)
                    .map((u) => (
                    <SelectItem key={String(u.id)} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setChangeOwnerOpen(false)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  if (!selectedUserOwner || !newOwnerId) return;
                  try {
                    await usersService.changeOwner(String(selectedUserOwner.id), newOwnerId);
                    toast({ title: 'Sucesso', description: 'Proprietário alterado com sucesso.' });
                    setChangeOwnerOpen(false);
                    refetch();
                  } catch (e: any) {
                    const msg = e?.body?.message || e?.message || 'Falha ao alterar proprietário';
                    toast({ title: 'Erro', description: msg, variant: 'destructive' });
                  }
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir o usuário "{deletingUser?.name}"? 
              Esta ação moverá o usuário para a lixeira.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog 
        open={!!forceDeletingUser} 
        onOpenChange={() => setForceDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente o usuário "{forceDeletingUser?.name}"?
              <br/><br/>
              <span className="font-bold text-red-600">ATENÇÃO: Esta ação é irreversível e removerá todos os dados associados.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleForceDelete}
              disabled={forceDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
