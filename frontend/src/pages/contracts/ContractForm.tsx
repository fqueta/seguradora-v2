import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCreateContract, useUpdateContract, useContract } from '@/hooks/contracts';
import { useClientsList } from '@/hooks/clients';
import { useProductsList } from '@/hooks/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QuickClientForm from '@/components/serviceOrders/QuickClientForm';
import { useQueryClient } from '@tanstack/react-query';
import { FormActionBar } from '@/components/common/FormActionBar';
import { CurrencyInput } from '@/components/ui/currency-input';
import { currencyRemoveMaskToNumber } from '@/lib/masks/currency';

const contractSchema = z.object({
    contract_number: z.string().optional().nullable(),
    c_number: z.string().optional().nullable(),
    status: z.string({ required_error: "Status é obrigatório" }).min(1, "Status é obrigatório"),
    start_date: z.string({ required_error: "Data de início é obrigatória" }).min(1, "Data de início é obrigatória").refine((date) => {
        if (!date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Force local time interpretation by appending T00:00:00 if strictly date string
        const dateStr = date.includes('T') ? date : date + 'T00:00:00';
        const selected = new Date(dateStr);
        return selected >= today;
    }, "Data de início deve ser hoje ou futura"),
    end_date: z.string({ required_error: "Data de fim é obrigatória" }).min(1, "Data de fim é obrigatória"),
    client_id: z.string({ required_error: "Cliente é obrigatório" }).min(1, "Cliente é obrigatório"),
    owner_id: z.string().optional().nullable(),
    product_id: z.string({ required_error: "Produto é obrigatório" }).min(1, "Produto é obrigatório"),
    value: z.coerce.number().optional().nullable(),
    description: z.string().optional().nullable(),
});

type ContractFormData = z.infer<typeof contractSchema>;

export default function ContractForm() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const clientIdParam = searchParams.get('client_id');
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [editingClientId, setEditingClientId] = useState<string | null>(null);
    const [tempClients, setTempClients] = useState<any[]>([]);
    
    const { data: contract, isLoading: isLoadingContract } = useContract(id as string, { enabled: isEdit });
    const createMutation = useCreateContract();
    const updateMutation = useUpdateContract();
    const { data: clients } = useClientsList({ per_page: 100 });
    const { data: products } = useProductsList({ per_page: 100 });
    
    // Merge remote clients with locally created temp clients (handling duplicates)
    // Mescla clientes remotos com clientes temporários locais (tratando duplicatas)
    const combinedClients = useMemo(() => {
        const remoteList = clients?.data || [];
        const filteredTemp = tempClients.filter(tc => !remoteList.find((c: any) => String(c.id) === String(tc.id)));
        return [...filteredTemp, ...remoteList];
    }, [clients?.data, tempClients]);

    const clientOptions = useComboboxOptions(combinedClients, 'id', 'name');
    const productOptions = useComboboxOptions(products?.data || [], 'id', 'name');

    const form = useForm<ContractFormData>({
        resolver: zodResolver(contractSchema),
        defaultValues: {
            status: 'pending',
            contract_number: '',
            c_number: '',
            description: '',
            client_id: '',
            product_id: '',
            start_date: '',
            end_date: '',
            owner_id: '',
            value: 0,
        }
    });

    useEffect(() => {
        if (contract) {
            form.reset({
                contract_number: contract.contract_number,
                c_number: contract.c_number,
                status: contract.status,
                start_date: contract.start_date?.split('T')[0],
                end_date: contract.end_date?.split('T')[0],
                client_id: contract.client_id?.toString(),
                owner_id: contract.owner_id?.toString(),
                product_id: contract.product_id?.toString(),
                value: contract.value,
                description: contract.description,
            });
        }
    }, [contract, form]);

    useEffect(() => {
        if (!isEdit && clientIdParam) {
            form.setValue('client_id', clientIdParam, { shouldValidate: true });
        }
    }, [isEdit, clientIdParam, form]);

    // Determine if the form should be restricted (only description editable)
    const isRestricted = useMemo(() => {
        return isEdit && (contract?.status === 'approved' || contract?.status === 'cancelled');
    }, [isEdit, contract]);

    const handleBack = () => {
        navigate(clientIdParam ? `/admin/clients/${clientIdParam}/view` : '/admin/contracts');
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSaveContinue = () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        form.handleSubmit((data) => {
            const onError = (error: any) => {
                setIsSubmitting(false);
                // BaseApiService assigns the JSON body to error.body
                const errorMessage = error?.body?.mens || error?.body?.data?.retornoMsg || error?.message || "Erro ao salvar contrato";
                toast({ variant: "destructive", title: "Erro", description: errorMessage });
            };

            if (isEdit) {
                updateMutation.mutate({ id: id!, data }, {
                    onSuccess: (resp: any) => {
                        setIsSubmitting(false);
                        const variant = resp?.color === 'success' ? 'success' : (resp?.color === 'danger' ? 'destructive' : (resp?.exec === false ? 'destructive' : 'default'));
                        const title = variant === 'destructive' ? "Erro" : "Sucesso";
                        
                        toast({ 
                            variant: variant as any, 
                            title, 
                            description: resp?.mens || "Contrato atualizado com sucesso" 
                        });
                    },
                    onError
                });
            } else {
                createMutation.mutate(data, {
                    onSuccess: (newContract: any) => {
                        setIsSubmitting(false);
                        const variant = newContract?.color === 'success' ? 'success' : (newContract?.color === 'danger' ? 'destructive' : (newContract?.exec === false ? 'destructive' : 'default'));
                        const title = variant === 'destructive' ? "Erro" : "Sucesso";
                        
                        toast({ 
                            variant: variant as any, 
                            title, 
                            description: newContract?.mens || "Contrato criado com sucesso" 
                        });
                        
                        // Redirect to edit mode
                        if (newContract?.exec !== false && newContract?.data?.id) {
                            const editUrl = `/admin/contracts/${newContract.data.id}/edit${clientIdParam ? `?client_id=${clientIdParam}` : ''}`;
                            navigate(editUrl);
                        }
                    },
                    onError
                });
            }
        }, () => {
             setIsSubmitting(false);
        })();
    };

    const handleSaveExit = () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        form.handleSubmit((data) => {
            const onError = (error: any) => {
                setIsSubmitting(false);
                // BaseApiService assigns the JSON body to error.body
                const errorMessage = error?.body?.mens || error?.body?.data?.retornoMsg || error?.message || "Erro ao salvar contrato";
                toast({ variant: "destructive", title: "Erro", description: errorMessage });
            };

            if (isEdit) {
                updateMutation.mutate({ id: id!, data }, {
                    onSuccess: (resp: any) => {
                        setIsSubmitting(false);
                        const variant = resp?.color === 'success' ? 'success' : (resp?.color === 'danger' ? 'destructive' : (resp?.exec === false ? 'destructive' : 'default'));
                        const title = variant === 'destructive' ? "Erro" : "Sucesso";
                        
                        toast({ 
                            variant: variant as any, 
                            title, 
                            description: resp?.mens || "Contrato atualizado com sucesso" 
                        });

                         if (resp?.exec !== false) {
                            navigate(clientIdParam ? `/admin/clients/${clientIdParam}/view` : '/admin/contracts');
                         }
                    },
                    onError
                });
            } else {
                createMutation.mutate(data, {
                    onSuccess: (newContract: any) => {
                        setIsSubmitting(false);
                        const variant = newContract?.color === 'success' ? 'success' : (newContract?.color === 'danger' ? 'destructive' : (newContract?.exec === false ? 'destructive' : 'default'));
                        const title = variant === 'destructive' ? "Erro" : "Sucesso";
                        
                        toast({ 
                            variant: variant as any, 
                            title, 
                            description: newContract?.mens || "Contrato criado com sucesso" 
                        });

                        if (newContract?.exec !== false) {
                            navigate(clientIdParam ? `/admin/clients/${clientIdParam}/view` : '/admin/contracts');
                        }
                    },
                    onError
                });
            }
        }, () => {
             setIsSubmitting(false);
        })();
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <div>
                     <h1 className="text-3xl font-bold">{isEdit ? 'Editar Contrato' : 'Novo Contrato'}</h1>
                     <p className="text-muted-foreground">
                         {isEdit ? 'Edite as informações do contrato' : 'Preencha as informações do novo contrato'}
                     </p>
                </div>
            </div>

            <Form {...form}>
                <form className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados do Contrato</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="client_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cliente</FormLabel>
                                        <div className="flex gap-2">
                                            <Combobox
                                                options={clientOptions}
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                placeholder="Selecione um cliente"
                                                searchPlaceholder="Buscar cliente..."
                                                emptyText="Nenhum cliente encontrado"
                                                onCreate={() => {
                                                    setEditingClientId(null);
                                                    setIsClientModalOpen(true);
                                                }}
                                                createLabel="Criar Novo Cliente"
                                                className="flex-1"
                                                disabled={isRestricted}
                                            />
                                            {field.value && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingClientId(field.value);
                                                        setIsClientModalOpen(true);
                                                    }}
                                                    title="Editar Cliente"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <FormMessage />

                                        <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
                                            <DialogContent className="sm:max-w-[600px]">
                                                <DialogHeader>
                                                    <DialogTitle>{editingClientId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                                                </DialogHeader>
                                                <QuickClientForm
                                                    clientId={editingClientId || undefined}
                                                    onCancel={() => setIsClientModalOpen(false)}
                                                    onClientCreated={(newClient) => {
                                                        setIsClientModalOpen(false);
                                                        setTempClients(prev => [...prev, newClient]);
                                                        queryClient.invalidateQueries({ queryKey: ['clients'] });
                                                        form.setValue('client_id', newClient.id.toString(), { shouldValidate: true });
                                                        toast({ title: "Cliente cadastrado com sucesso" });
                                                    }}
                                                    onClientUpdated={(updatedClient) => {
                                                        setIsClientModalOpen(false);
                                                        setTempClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
                                                        queryClient.invalidateQueries({ queryKey: ['clients'] });
                                                        // Force re-render of combobox option label if needed
                                                        form.setValue('client_id', updatedClient.id.toString(), { shouldValidate: true });
                                                        toast({ title: "Cliente atualizado com sucesso" });
                                                    }}
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="product_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Produto</FormLabel>
                                        <Combobox
                                            options={productOptions}
                                            value={field.value}
                                            onValueChange={(val) => {
                                                const selectedProduct = products?.data?.find((p: any) => String(p.id) === val);
                                                if (selectedProduct) {
                                                    form.setValue('value', Number(selectedProduct.salePrice));
                                                }
                                                field.onChange(val);
                                            }}
                                            placeholder="Selecione um produto"
                                            searchPlaceholder="Buscar produto..."
                                            emptyText="Nenhum produto encontrado"
                                            disabled={isRestricted}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="start_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Início Vigência</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="date" 
                                                min={new Date().toISOString().split('T')[0]}
                                                {...field} 
                                                value={field.value || ""} 
                                                disabled={isRestricted}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    const val = e.target.value;
                                                    if (val) {
                                                        const date = new Date(val + 'T00:00:00');
                                                        date.setFullYear(date.getFullYear() + 1);
                                                        const y = date.getFullYear();
                                                        const m = String(date.getMonth() + 1).padStart(2, '0');
                                                        const d = String(date.getDate()).padStart(2, '0');
                                                        form.setValue('end_date', `${y}-${m}-${d}`);
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="end_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fim Vigência</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} value={field.value || ""} disabled={isRestricted} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={isRestricted}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="pending">Pendente</SelectItem>
                                                <SelectItem value="active">Ativo</SelectItem>
                                                <SelectItem value="approved">Aprovado</SelectItem>
                                                <SelectItem value="cancelled">Cancelado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor</FormLabel>
                                        <FormControl>
                                            <CurrencyInput
                                                value={field.value}
                                                onChange={(e) => field.onChange(currencyRemoveMaskToNumber(e.target.value))}
                                                disabled
                                                className="bg-muted"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="col-span-1 md:col-span-2">
                                        <FormLabel>Observação (opcional)</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </CardContent>
                    </Card>

                    <FormActionBar
                        mode="create"
                        fixed={true}
                        onBack={handleBack}
                        onSaveContinue={handleSaveContinue}
                        onSaveExit={handleSaveExit}
                        isLoading={createMutation.isPending || updateMutation.isPending || isSubmitting}
                    />
                </form>
            </Form>
        </div>
    );
}
