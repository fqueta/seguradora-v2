import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserForm } from '@/components/users/UserForm';
import { usePermissionsList } from '@/hooks/permissions';
import { useOrganizationsList } from '@/hooks/organizations';
import { useUpdateUser, useUser } from '@/hooks/users';
import { UpdateUserInput } from '@/types/users';
import { toast } from '@/hooks/use-toast';

const userEditSchema = z.object({
  tipo_pessoa: z.enum(['pf', 'pj']).default('pf'),
  permission_id: z.coerce.string().min(1, 'Permissão é obrigatória'),
  client_permission: z.array(z.string()).default([]),
  organization_id: z.coerce.number().nullable().optional(),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().optional().refine(val => !val || val.length >= 6, {
    message: "Senha deve ter pelo menos 6 caracteres"
  }),
  ativo: z.enum(['s', 'n']).default('s'),
  genero: z.enum(['m', 'f', 'ni']).default('ni'),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  razao: z.string().optional(),
  config: z.object({
    celular: z.string().nullable().optional(),
    telefone_comercial: z.string().nullable().optional(),
    nascimento: z.string().nullable().optional(),
    cep: z.string().nullable().optional(),
    endereco: z.string().nullable().optional(),
    numero: z.string().nullable().optional(),
    complemento: z.string().nullable().optional(),
    bairro: z.string().nullable().optional(),
    cidade: z.string().nullable().optional(),
    uf: z.string().nullable().optional(),
  }).optional(),
});

type UserEditFormData = z.infer<typeof userEditSchema>;

export default function UserEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: userResponse, isLoading: isLoadingUser } = useUser(id!);
  const updateMutation = useUpdateUser();
  const { data: permissionsData, isLoading: isLoadingPermissions, error: permissionsError } = usePermissionsList();
  const { data: organizationsData, error: organizationsError } = useOrganizationsList({ per_page: 100, active: true });
  
  const permissions = permissionsData?.data || [];
  const organizations = organizationsData?.data || [];

  // Feedback de erro se houver falha no carregamento
  useEffect(() => {
    if (permissionsError) {
      toast({
        title: "Erro ao carregar permissões",
        description: permissionsError instanceof Error ? permissionsError.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
    if (organizationsError) {
      toast({
        title: "Erro ao carregar organizações",
        description: organizationsError instanceof Error ? organizationsError.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }, [permissionsError, organizationsError]);

  // userResponse might contain the user directly or in a data property
  const user = (userResponse as any);

  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      tipo_pessoa: 'pf',
      permission_id: '',
    client_permission: [],
      organization_id: null,
      name: '',
      email: '',
      password: '',
      ativo: 's',
      genero: 'ni',
      config: {
        celular: '',
        telefone_comercial: '',
        nascimento: '',
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

  useEffect(() => {
    if (user) {
      form.reset({
        tipo_pessoa: user.tipo_pessoa || 'pf',
        permission_id: String(user.permission_id),
        client_permission: (user.client_permission || []).map((v: number) => String(v)),
        organization_id: user.organization_id || null,
        name: user.name,
        email: user.email,
        ativo: user.ativo || 's',
        genero: user.genero || 'ni',
        cpf: user.cpf || '',
        cnpj: user.cnpj || '',
        razao: user.razao || '',
        config: {
          celular: user.config?.celular || '',
          telefone_comercial: user.config?.telefone_comercial || '',
          nascimento: user.config?.nascimento || '',
          cep: user.config?.cep || '',
          endereco: user.config?.endereco || '',
          numero: user.config?.numero || '',
          complemento: user.config?.complemento || '',
          bairro: user.config?.bairro || '',
          cidade: user.config?.cidade || '',
          uf: user.config?.uf || '',
        },
      });
    }
  }, [user, form]);

  const onSubmit = async (data: UserEditFormData) => {
    const payload: UpdateUserInput = {
      tipo_pessoa: data.tipo_pessoa as any,
      permission_id: data.permission_id,
      client_permission: (data.client_permission || []).map((v) => Number(v)),
      organization_id: data.organization_id || null,
      email: data.email,
      name: data.name,
      genero: data.genero,
      ativo: data.ativo,
      cpf: data.cpf,
      cnpj: data.cnpj,
      razao: data.razao,
      config: {
        ...data.config,
        nome_fantasia: '',
        telefone_residencial: '',
        rg: '',
        escolaridade: '',
        profissao: '',
        tipo_pj: '',
      } as any,
    };

    if (data.password) {
      payload.password = data.password;
    }

    try {
      await updateMutation.mutateAsync({ id: id!, data: payload });
      // Redireciona para a visualização ou lista
      navigate(`/admin/settings/users/${id}/view`);
    } catch (err: any) {
      // Erro tratado pelo hook
    }
  };

  const onCancel = () => navigate(-1);

  if (isLoadingUser) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Usuário</h1>
          <p className="text-muted-foreground">Atualize as informações do cadastro</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Usuário</CardTitle>
          <CardDescription>Altere os campos necessários</CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            form={form as any}
            onSubmit={onSubmit as any}
            onCancel={onCancel}
            editingUser={user}
            permissions={permissions as any}
            organizations={organizations}
            isLoadingPermissions={isLoadingPermissions}
            ativoAsSwitch={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
