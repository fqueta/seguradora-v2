import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateOrganization, useUpdateOrganization, useOrganization } from '@/hooks/organizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SmartDocumentInput } from '@/components/lib/SmartDocumentInput';
import { phoneApplyMask } from '@/lib/masks/phone-apply-mask';
import { AddressInputs } from '@/components/lib/AddressInputs';
import { FormActionBar } from '@/components/common/FormActionBar';
import { useUsersList, useUpdateUser } from '@/hooks/users';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, UserMinus, Package } from 'lucide-react';
import { UserRecord } from '@/types/users';
import { useProductsList } from '@/hooks/products';
import { MultiSelect } from '@/components/ui/multi-select';

const organizationSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    document: z.string().optional().nullable(),
    email: z.string().email("Email inválido").optional().nullable().or(z.literal('')),
    phone: z.string().optional().nullable(),
    active: z.boolean().default(true),
    config: z.object({
        cep: z.string().optional().nullable(),
        endereco: z.string().optional().nullable(),
        numero: z.string().optional().nullable(),
        complemento: z.string().optional().nullable(),
        bairro: z.string().optional().nullable(),
        cidade: z.string().optional().nullable(),
        uf: z.string().optional().nullable(),
        allowed_products: z.array(z.string()).optional().default([]),
    }).optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export default function OrganizationForm() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    
    const { data: organization, isLoading: isLoadingOrganization, refetch: refetchOrganization } = useOrganization(id as string);
    const createMutation = useCreateOrganization();
    const updateMutation = useUpdateOrganization();
    const updateUserMutation = useUpdateUser();

    // Buscar usuários para adicionar
    const { data: usersData, isLoading: isLoadingUsers } = useUsersList({ per_page: 100 });
    const allUsers = usersData?.data || [];

    // Buscar produtos
    const { data: productsData, isLoading: isLoadingProducts } = useProductsList({ per_page: 100 });
    const allProducts = productsData?.data || [];
    const productOptions = allProducts.map(p => ({ value: String(p.id), label: p.name }));

    const form = useForm<OrganizationFormData>({
        resolver: zodResolver(organizationSchema),
        defaultValues: {
            name: '',
            document: '',
            email: '',
            phone: '',
            active: true,
            config: {
                cep: '',
                endereco: '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: '',
                uf: '',
                allowed_products: [],
            }
        }
    });

    useEffect(() => {
        if (organization) {
            const config = organization.config || {};
            form.reset({
                name: organization.name,
                document: organization.document,
                email: organization.email,
                phone: organization.phone,
                active: organization.active,
                config: {
                    cep: config.cep || '',
                    endereco: config.endereco || '',
                    numero: config.numero || '',
                    complemento: config.complemento || '',
                    bairro: config.bairro || '',
                    cidade: config.cidade || '',
                    uf: config.uf || '',
                    allowed_products: config.allowed_products?.map(String) || [],
                },
            });
        }
    }, [organization, form]);



    const onSubmit = (data: OrganizationFormData, options?: { redirect?: boolean }) => {
        const shouldRedirect = options?.redirect ?? true;
        
        // Clean up data
        const cleanData = {
            ...data,
            document: data.document || null,
            email: data.email || null,
            phone: data.phone || null,
            config: {
                ...data.config,
                cep: data.config?.cep || null,
                endereco: data.config?.endereco || null,
                numero: data.config?.numero || null,
                complemento: data.config?.complemento || null,
                bairro: data.config?.bairro || null,
                cidade: data.config?.cidade || null,
                uf: data.config?.uf || null,
            }
        };

        if (isEdit) {
            updateMutation.mutate({ id: id!, data: cleanData as any }, {
                onSuccess: () => {
                    toast({ title: "Organização atualizada com sucesso" });
                    if (shouldRedirect) navigate('/admin/settings/organizations');
                },
                onError: (error: any) => {
                    console.error(error);
                    toast({ 
                        title: "Erro ao atualizar organização", 
                        description: error.response?.data?.message || "Ocorreu um erro ao salvar.",
                        variant: "destructive"
                    });
                }
            });
        } else {
            createMutation.mutate(cleanData as any, {
                onSuccess: () => {
                    toast({ title: "Organização criada com sucesso" });
                    if (shouldRedirect) navigate('/admin/settings/organizations');
                },
                onError: (error: any) => {
                    console.error(error);
                    toast({ 
                        title: "Erro ao criar organização", 
                        description: error.response?.data?.message || "Ocorreu um erro ao salvar.",
                        variant: "destructive"
                    });
                }
            });
        }
    };

    const handleSaveAndStay = () => {
        form.handleSubmit((data) => onSubmit(data, { redirect: false }))();
    };

    const handleSaveAndExit = () => {
        form.handleSubmit((data) => onSubmit(data, { redirect: true }))();
    };

    const handleAddUser = (userId: string) => {
        if (!id) return;
        updateUserMutation.mutate({ 
            id: userId, 
            data: { organization_id: Number(id) } 
        }, {
            onSuccess: () => {
                toast({ title: "Usuário adicionado com sucesso" });
                refetchOrganization();
            }
        });
    };

    const handleRemoveUser = (userId: string) => {
        updateUserMutation.mutate({ 
            id: userId, 
            data: { organization_id: null } 
        }, {
            onSuccess: () => {
                toast({ title: "Usuário removido com sucesso" });
                refetchOrganization();
            }
        });
    };

    // Opções para o combobox de usuários (apenas os que não estão nesta organização)
    const availableUsersOptions = useComboboxOptions(
        allUsers.filter(u => u.organization_id !== Number(id)),
        'id',
        'name',
        undefined,
        (u) => u.email
    );

    if (isEdit && isLoadingOrganization) return <div>Carregando...</div>;

    return (
        <div className="container mx-auto py-6 space-y-6 pb-24">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/admin/settings/organizations')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <div>
                     <h1 className="text-3xl font-bold">{isEdit ? 'Editar Organização' : 'Nova Organização'}</h1>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => onSubmit(data, { redirect: true }))} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados da Organização</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome</FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                value={field.value ?? ''} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <SmartDocumentInput
                                name="document"
                                control={form.control}
                                label="Documento (CNPJ/CPF)"
                                tipoPessoa="pj"
                                placeholder="00.000.000/0000-00"
                                required={false}
                            />

                             <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefone</FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                value={field.value ?? ''} 
                                                onChange={(e) => field.onChange(phoneApplyMask(e.target.value))}
                                                placeholder="(00) 00000-0000"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="md:col-span-2">
                                <AddressInputs form={form} />
                            </div>

                            <FormField
                                control={form.control}
                                name="active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Ativo
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />

                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center gap-2">
                            <Package className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Produtos Permitidos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="config.allowed_products"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Selecione os produtos que esta organização pode utilizar</FormLabel>
                                        <FormControl>
                                            <MultiSelect
                                                options={productOptions}
                                                value={field.value || []}
                                                onChange={field.onChange}
                                                placeholder="Selecione os produtos..."
                                                searchPlaceholder="Buscar produtos..."
                                                disabled={isLoadingProducts}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Apenas os produtos selecionados aparecerão para os usuários desta organização ao cadastrar novos contratos.
                                        </p>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </form>
            </Form>

            {isEdit && organization && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Membros da Organização</CardTitle>
                        <div className="w-72">
                            <Combobox 
                                options={availableUsersOptions}
                                onValueChange={(val) => val && handleAddUser(val)}
                                placeholder="Adicionar usuário..."
                                searchPlaceholder="Buscar usuário por nome..."
                                loading={isLoadingUsers}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {organization.users && organization.users.length > 0 ? (
                                    organization.users.map((user: UserRecord) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    {user.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => handleRemoveUser(user.id)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <UserMinus className="h-4 w-4 mr-2" />
                                                    Remover
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            Nenhum usuário vinculado a esta organização.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <FormActionBar
                mode="create"
                fixed
                onBack={() => navigate('/admin/settings/organizations')}
                onCancel={() => navigate('/admin/settings/organizations')}
                onSaveContinue={handleSaveAndStay}
                onSaveExit={handleSaveAndExit}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    );
}
