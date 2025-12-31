import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateContract, useUpdateContract, useContract } from '@/hooks/contracts';
import { useClientsList } from '@/hooks/clients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';

const contractSchema = z.object({
    contract_number: z.string().optional(),
    c_number: z.string().optional(),
    status: z.string().min(1, "Status é obrigatório"),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    client_id: z.string().optional(),
    owner_id: z.string().optional(),
    product_id: z.string().optional(),
    value: z.coerce.number().optional(),
    description: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractSchema>;

export default function ContractForm() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const { data: contract, isLoading: isLoadingContract } = useContract(id as string, { enabled: isEdit });
    const createMutation = useCreateContract();
    const updateMutation = useUpdateContract();
    const { data: clients } = useClientsList({ per_page: 100 });

    const form = useForm<ContractFormData>({
        resolver: zodResolver(contractSchema),
        defaultValues: {
            status: 'pending',
        }
    });

    useEffect(() => {
        if (contract) {
            form.reset({
                contract_number: contract.contract_number,
                c_number: contract.c_number,
                status: contract.status,
                start_date: contract.start_date,
                end_date: contract.end_date,
                client_id: contract.client_id?.toString(),
                owner_id: contract.owner_id?.toString(),
                product_id: contract.product_id?.toString(),
                value: contract.value,
                description: contract.description,
            });
        }
    }, [contract, form]);

    const onSubmit = (data: ContractFormData) => {
        if (isEdit) {
            updateMutation.mutate({ id: id!, data }, {
                onSuccess: () => {
                    toast({ title: "Contrato atualizado com sucesso" });
                    navigate('/admin/contracts');
                }
            });
        } else {
            createMutation.mutate(data, {
                onSuccess: () => {
                    toast({ title: "Contrato criado com sucesso" });
                    navigate('/admin/contracts');
                }
            });
        }
    };

    if (isEdit && isLoadingContract) return <div>Carregando...</div>;

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/admin/contracts')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
                <h1 className="text-3xl font-bold">{isEdit ? 'Editar Contrato' : 'Novo Contrato'}</h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um cliente" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {clients?.data?.map((client: any) => (
                                                    <SelectItem key={client.id} value={client.id.toString()}>
                                                        {client.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="product_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>ID do Produto</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="contract_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nº Contrato</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="c_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>C.</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value || ""} />
                                        </FormControl>
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
                                            <Input type="date" {...field} value={field.value || ""} />
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
                                            <Input type="date" {...field} value={field.value || ""} />
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
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
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
                                            <Input type="number" step="0.01" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => navigate('/admin/contracts')}>Cancelar</Button>
                        <Button type="submit">Salvar</Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
