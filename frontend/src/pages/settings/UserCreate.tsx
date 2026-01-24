import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// Removido uso direto de campos de telefone no cadastro
import { UserForm } from '@/components/users/UserForm';
import { usePermissionsList } from '@/hooks/permissions';
import { useOrganizationsList } from '@/hooks/organizations';
import { useCreateUser } from '@/hooks/users';
import { CreateUserInput } from '@/types/users';
import { toast } from '@/hooks/use-toast';

// Schema simplificado apenas com os campos que aparecem na imagem
const userCreateSchema = z.object({
  // Tipo de pessoa fixo: PF
  tipo_pessoa: z.literal('pf').default('pf'),
  permission_id: z.coerce.string().min(1, 'Permissão é obrigatória'),
  client_permission: z.array(z.string()).default([]),
  organization_id: z.coerce.number().nullable().optional(),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  ativo: z.enum(['s', 'n']).default('s'),
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
  }).default({
    celular: '',
    telefone_comercial: '',
    nascimento: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
  }),
});

type UserCreateFormData = z.infer<typeof userCreateSchema>;

/**
 * UserCreate Page
 * pt-BR: Página dedicada para cadastro de usuário. Mantém apenas os campos solicitados,
 *        fixa o tipo de pessoa como PF e remove o campo Telefone Residencial.
 * en-US: Dedicated page for user registration. Keeps only requested fields,
 *        defaults person type to PF and removes Residential Phone field.
 */
export default function UserCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateUser();
  const { data: permissionsData, isLoading: isLoadingPermissions } = usePermissionsList();
  const permissions = permissionsData?.data || [];
  const { data: organizationsData } = useOrganizationsList({ per_page: 100, active: true });
  const organizations = organizationsData?.data || [];

  const form = useForm<UserCreateFormData>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      tipo_pessoa: 'pf',
      permission_id: '',
    client_permission: [],
      organization_id: null,
      name: '',
      email: '',
      password: '',
      ativo: 's',
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
      },
    },
  });

  // Preenche automaticamente a primeira permissão carregada, se existir
  useEffect(() => {
    const first = permissions[0]?.id;
    if (first && !form.getValues('permission_id')) {
      form.setValue('permission_id', String(first));
    }
  }, [permissions]);

  /**
   * onSubmit
   * pt-BR: Cria o usuário e redireciona para a lista de usuários em caso de sucesso.
   * en-US: Creates the user and navigates back to the users list on success.
   */
  /**
   * internalSubmit
   * Handles the actual mutation logic
   */
  const internalSubmit = async (data: UserCreateFormData, mode: 'continue' | 'exit') => {
    const payload: CreateUserInput = {
      tipo_pessoa: 'pf',
      permission_id: data.permission_id,
      client_permission: (data.client_permission || []).map((v) => Number(v)),
      organization_id: data.organization_id || null,
      email: data.email,
      password: data.password,
      name: data.name,
      genero: 'ni',
      ativo: data.ativo,
      token: '',
      config: {
        nome_fantasia: '',
        celular: data.config.celular || '',
        telefone_residencial: '',
        telefone_comercial: data.config.telefone_comercial || '',
        rg: '',
        nascimento: data.config.nascimento || '',
        escolaridade: '',
        profissao: '',
        tipo_pj: '',
        cep: data.config.cep || '',
        endereco: data.config.endereco || '',
        numero: data.config.numero || '',
        complemento: data.config.complemento || '',
        bairro: data.config.bairro || '',
        cidade: data.config.cidade || '',
        uf: '',
      },
    };

    try {
      const resp = await createMutation.mutateAsync(payload);
      toast({ title: 'Usuário criado', description: 'Cadastro realizado com sucesso.' });
      
      if (mode === 'exit') {
        navigate('/admin/settings/users');
      } else {
         // Redirect to edit mode for the created user
         if (resp && resp.id) {
             navigate(`/admin/settings/users/${resp.id}/edit`);
         } else {
             // Fallback if ID is not returned (though it should be)
             navigate('/admin/settings/users');
         }
      }
    } catch (err: any) {
      toast({ title: 'Erro ao criar usuário', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleSaveContinue = () => {
      form.handleSubmit((data) => internalSubmit(data, 'continue'))();
  };

  const handleSaveExit = () => {
      form.handleSubmit((data) => internalSubmit(data, 'exit'))();
  };

  // Keep onSubmit for compatibility if needed, though we use the handlers above
  const onSubmit = async (data: UserCreateFormData) => {
     await internalSubmit(data, 'exit');
  };

  /**
   * onCancel
   * pt-BR: Cancela o cadastro e volta para a lista.
   * en-US: Cancels and returns to the list.
   */
  const onCancel = () => navigate('/admin/settings/users');

  return (
    <div className="container mx-auto py-6 space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Novo Usuário</h1>
          <p className="text-muted-foreground">Preencha os dados para criar um novo usuário</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Usuário</CardTitle>
          <CardDescription>Campos essenciais conforme solicitado</CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            form={form as any}
            onSubmit={onSubmit as any}
            onCancel={onCancel}
            editingUser={null}
            permissions={permissions as any}
            organizations={organizations}
            isLoadingPermissions={isLoadingPermissions}
            showTipoPessoa={false}
            showGenero={false}
            showAddressSection={false}
            showCpf={false}
            showPhones={false}
            ativoAsSwitch={true}
            showBirthDate={false}
            useFixedFooter={true}
            onSaveContinue={handleSaveContinue}
            onSaveExit={handleSaveExit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
