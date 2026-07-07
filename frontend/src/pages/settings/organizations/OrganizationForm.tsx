import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import EditFooterBar from '@/components/ui/edit-footer-bar';
import { useUsersList, useUpdateUser } from '@/hooks/users';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, UserMinus, Package, Receipt, HelpCircle } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { UserRecord } from '@/types/users';
import { useProductsList } from '@/hooks/products';
import { MultiSelect } from '@/components/ui/multi-select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { currencyRemoveMaskToNumber } from '@/lib/masks/currency';

const organizationSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    document: z.string().optional().nullable(),
    email: z.string().email("Email inválido").optional().nullable().or(z.literal('')),
    phone: z.string().optional().nullable(),
    active: z.boolean().default(true),
    config: z.object({
        cep: z.string().min(9, "CEP incompleto"),
        endereco: z.string().optional().nullable(),
        numero: z.string().min(1, "Número é obrigatório"),
        complemento: z.string().optional().nullable(),
        bairro: z.string().optional().nullable(),
        cidade: z.string().optional().nullable(),
        uf: z.string().optional().nullable(),
        allowed_products: z.array(z.string()).optional().default([]),
        alloyal_business_id: z.string().optional().nullable(),
        billing: z.object({
            cycle_start_day: z.coerce.number().min(1).max(28).optional().default(1),
            products_pricing: z.array(z.object({
                product_id: z.string(),
                monthly_value_per_life: z.any(),
            })).optional().default([]),
        }).optional().default({ cycle_start_day: 1, products_pricing: [] }),
    }),
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
                alloyal_business_id: '',
                billing: {
                    cycle_start_day: 1,
                    products_pricing: [],
                },
            },
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
                    alloyal_business_id: config.alloyal_business_id || '',
                    billing: {
                        cycle_start_day: config.billing?.cycle_start_day || 1,
                        products_pricing: config.billing?.products_pricing || [],
                    },
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
                billing: data.config?.billing ? {
                    ...data.config.billing,
                    cycle_start_day: Number(data.config.billing.cycle_start_day || 1),
                    products_pricing: (data.config.billing.products_pricing || []).map((p: any) => ({
                        product_id: String(p.product_id),
                        monthly_value_per_life: typeof p.monthly_value_per_life === 'string'
                            ? currencyRemoveMaskToNumber(p.monthly_value_per_life)
                            : Number(p.monthly_value_per_life || 0)
                    }))
                } : undefined
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

    const allowedProducts = useWatch({
        control: form.control,
        name: 'config.allowed_products',
    }) || [];

    const productsPricing = useWatch({
        control: form.control,
        name: 'config.billing.products_pricing',
    }) || [];

    useEffect(() => {
        const currentPricing = form.getValues('config.billing.products_pricing') || [];

        // Mapear os produtos permitidos atuais mantendo os preços já configurados
        const updatedPricing = allowedProducts.map((productId: string) => {
            const existing = currentPricing.find((p: any) => String(p.product_id) === String(productId));
            return {
                product_id: productId,
                monthly_value_per_life: existing ? existing.monthly_value_per_life : 0,
            };
        });

        // Verificar se houve alteração na lista de produtos permitidos (adicionados ou removidos)
        const currentKeys = currentPricing.map((p: any) => String(p.product_id)).sort().join(',');
        const updatedKeys = updatedPricing.map((p: any) => String(p.product_id)).sort().join(',');

        if (currentKeys !== updatedKeys) {
            form.setValue('config.billing.products_pricing', updatedPricing);
        }
    }, [allowedProducts, form]);

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
                                <AddressInputs form={form}>
                                     <FormField
                                        control={form.control}
                                        name="config.alloyal_business_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>ID Clube de Vantagens (Alloyal)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value || ''} placeholder="Ex: 12345" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </AddressInputs>
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

                    <Card>
                        <CardHeader className="flex flex-row items-center gap-2">
                            <Receipt className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>Configuração de Cobrança</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="config.billing.cycle_start_day"
                                render={({ field }) => (
                                    <FormItem className="max-w-[240px]">
                                        <div className="flex items-center gap-2">
                                            <FormLabel>Dia de início do ciclo de cobrança</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button type="button" className="text-muted-foreground hover:text-slate-900 transition-colors">
                                                        <HelpCircle className="h-4 w-4" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 space-y-2 text-xs">
                                                    <p className="font-bold text-slate-800">Como funciona o ciclo mensal?</p>
                                                    <p>
                                                        O sistema gerencia os ciclos de faturamento de forma **automática** e **contínua**:
                                                    </p>
                                                    <ul className="list-disc pl-4 space-y-1">
                                                        <li><strong>Dia de início</strong>: É o dia configurado neste campo.</li>
                                                        <li><strong>Dia de término</strong>: É calculado automaticamente como o dia anterior do mês subsequente (ex: de 19/05 a 18/06).</li>
                                                        <li><strong>Sem lacunas</strong>: O ciclo seguinte inicia exatamente no dia seguinte, prevenindo dias sem cobrança.</li>
                                                        <li><strong>Adaptação automática</strong>: O cálculo ajusta-se dinamicamente a meses com 28, 29, 30 ou 31 dias (inclusive em anos bissextos).</li>
                                                    </ul>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={28}
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {allowedProducts.length > 0 ? (
                                <div className="space-y-2 mt-4">
                                    <FormLabel>Valores de venda por vida ativa (mensal)</FormLabel>
                                    <div className="border rounded-md overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Produto</TableHead>
                                                    <TableHead className="w-[200px]">Valor por Vida (R$)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {allowedProducts.map((productId: string) => {
                                                    const product = allProducts.find((p) => String(p.id) === productId);
                                                    const pricingIndex = productsPricing.findIndex((p: any) => p.product_id === productId);

                                                    if (pricingIndex === -1) return null;

                                                    return (
                                                        <TableRow key={productId}>
                                                            <TableCell className="font-medium">
                                                                {product ? product.name : `Produto #${productId}`}
                                                            </TableCell>
                                                            <TableCell>
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`config.billing.products_pricing.${pricingIndex}.monthly_value_per_life`}
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormControl>
                                                                                <CurrencyInput
                                                                                    placeholder="R$ 0,00"
                                                                                    {...field}
                                                                                    value={field.value}
                                                                                    onValueChange={(val) => field.onChange(val)}
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">
                                    Selecione produtos no card acima para definir os valores de cobrança.
                                </p>
                            )}
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
                                {organization.users && organization.users.filter((u: UserRecord) => Number(u.permission_id) <= 5).length > 0 ? (
                                    organization.users
                                        .filter((u: UserRecord) => Number(u.permission_id) <= 5)
                                        .map((user: UserRecord) => (
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

            <EditFooterBar
                onBack={() => navigate('/admin/settings/organizations')}
                onContinue={handleSaveAndStay}
                onFinish={handleSaveAndExit}
                disabled={createMutation.isPending || updateMutation.isPending}
                fixed
            />
        </div>
    );
}
