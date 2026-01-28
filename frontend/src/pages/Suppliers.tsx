import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import * as z from "zod";
import { Plus, Search } from "lucide-react";
import { 
  useSuppliersList, 
  useCreateSupplier, 
  useUpdateSupplier,
  useDeleteSupplier
} from '@/hooks/suppliers';
import { SupplierRecord, CreateSupplierInput } from '@/types/suppliers';
import { SupplierForm } from '@/components/suppliers/SupplierForm';
import { SuppliersTable } from '@/components/suppliers/SuppliersTable';

/**
 * Schema de validação para formulário de fornecedores
 */
const supplierSchema = z.object({
  tipo_pessoa: z.enum(["pf", "pj"]),
  email: z.string().nullable().optional().refine((val) => {
    if (!val || val === '') return true;
    return z.string().email().safeParse(val).success;
  }, { message: 'Email inválido' }),
  name: z.string().min(1, 'Nome é obrigatório'),
  password: z.string().optional().refine((val) => {
    if (!val || val === '') return true; // Permite vazio
    return val.length >= 6; // Se preenchido, deve ter pelo menos 6 caracteres
  }, {
    message: 'A senha deve ter pelo menos 6 caracteres'
  }),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  razao: z.string().optional(),
  genero: z.enum(["m", "f", "ni"]),
  ativo: z.enum(["s", "n"]),
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
    observacoes: z.string().nullable().optional(),
  }),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

/**
 * Página principal de gerenciamento de fornecedores
 */
export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const { toast } = useToast();
  const navigate = useNavigate();

  const suppliersQuery = useSuppliersList({
    page: currentPage,
    per_page: pageSize,
  });
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      tipo_pessoa: "pf",
      email: "",
      name: "",
      cpf: "",
      cnpj: "",
      razao: "",
      genero: "ni",
      ativo: "s",
      config: {
        nome_fantasia: "",
        celular: "",
        telefone_residencial: "",
        telefone_comercial: "",
        rg: "",
        nascimento: "",
        escolaridade: "",
        profissao: "",
        tipo_pj: "",
        cep: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
        observacoes: "",
      },
    },
  });
  const link_admin:string = 'admin';

  const handleNewSupplier = () => {
    setEditingSupplier(null);
    form.reset({
      tipo_pessoa: "pf",
      email: "",
      name: "",
      cpf: "",
      cnpj: "",
      razao: "",
      genero: "ni",
      ativo: "s",
      config: {
        nome_fantasia: "",
        celular: "",
        telefone_residencial: "",
        telefone_comercial: "",
        rg: "",
        nascimento: "",
        escolaridade: "",
        profissao: "",
        tipo_pj: "",
        cep: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
        observacoes: "",
      },
    });
    setIsDialogOpen(true);
  };

  const handleEditSupplier = (supplier: SupplierRecord) => {
    setEditingSupplier(supplier);
    form.reset({
      tipo_pessoa: supplier.tipo_pessoa,
      email: supplier.email,
      name: supplier.name,
      cpf: supplier.cpf || "",
      cnpj: supplier.cnpj || "",
      razao: supplier.razao || "",
      genero: supplier.genero,
      ativo: supplier.ativo,
      config: {
        nome_fantasia: supplier.config?.nome_fantasia || "",
        celular: supplier.config?.celular || "",
        telefone_residencial: supplier.config?.telefone_residencial || "",
        telefone_comercial: supplier.config?.telefone_comercial || "",
        rg: supplier.config?.rg || "",
        nascimento: supplier.config?.nascimento || "",
        escolaridade: supplier.config?.escolaridade || "",
        profissao: supplier.config?.profissao || "",
        tipo_pj: supplier.config?.tipo_pj || "",
        cep: supplier.config?.cep || "",
        endereco: supplier.config?.endereco || "",
        numero: supplier.config?.numero || "",
        complemento: supplier.config?.complemento || "",
        bairro: supplier.config?.bairro || "",
        cidade: supplier.config?.cidade || "",
        uf: supplier.config?.uf || "",
        observacoes: supplier.config?.observacoes || "",
      },
    });
    setIsDialogOpen(true);
  };
  
  const handleDeleteSupplier = (supplier: SupplierRecord) => {
    setSupplierToDelete(supplier);
    setOpenDeleteDialog(true);
  };
  
  const confirmDeleteSupplier = () => {
    if (supplierToDelete) {
      deleteSupplierMutation.mutate(supplierToDelete.id, {
        onSuccess: () => {
          toast({
            title: "Fornecedor excluído",
            description: "Fornecedor excluído com sucesso",
          });
          setOpenDeleteDialog(false);
          setSupplierToDelete(null);
        },
        onError: (error) => {
          toast({
            title: "Erro ao excluir fornecedor",
            description: `Ocorreu um erro: ${error.message}`,
            variant: "destructive",
          });
        },
      });
    }
  };

  const onSubmit = (data: SupplierFormData) => {
    if (!editingSupplier && (!data.password || data.password.length < 6)) {
      // In supplier creation, password might be optional? 
      // User didn't specify, but Partners had it mandatory-ish if provided.
      // If the schema allows optional password, then we are good.
      // For now, let's keep it loose or same as Partners.
      // Partners required validation manually if new.
    }

    const supplierData: any = {
      tipo_pessoa: data.tipo_pessoa,
      email: data.email,
      name: data.name,
      cpf: data.tipo_pessoa === 'pf' ? data.cpf : undefined,
      cnpj: data.tipo_pessoa === 'pj' ? data.cnpj : undefined,
      razao: data.tipo_pessoa === 'pj' ? data.razao : undefined,
      genero: data.genero,
      ativo: data.ativo,
      config: data.config,
    };

    if (data.password && data.password.trim() !== '') {
      supplierData.password = data.password;
    }
    
    if (editingSupplier) {
      updateSupplierMutation.mutate(
        {
          id: editingSupplier.id,
          data: supplierData
        },
        {
          onSuccess: () => {
            toast({
              title: "Fornecedor atualizado",
              description: `Fornecedor ${data.name} atualizado com sucesso`,
            });
            setIsDialogOpen(false);
            setEditingSupplier(null);
            form.reset();
          },
          onError: (error: any) => {
            console.error(error);
            let errorMessage = error.message;
            
            if (error.response?.data?.errors) {
              errorMessage = Object.values(error.response.data.errors).flat().join('\n');
            } else if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
            }

            toast({
              title: "Erro ao atualizar fornecedor",
              description: errorMessage,
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createSupplierMutation.mutate(
        supplierData as CreateSupplierInput,
        {
          onSuccess: () => {
            toast({
              title: "Fornecedor criado",
              description: `Fornecedor ${data.name} criado com sucesso`,
            });
            setIsDialogOpen(false);
            form.reset();
          },
          onError: (error: any) => {
            console.error(error);
            let errorMessage = error.message;
            
            if (error.response?.data?.errors) {
              errorMessage = Object.values(error.response.data.errors).flat().join('\n');
            } else if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
            }

            toast({
              title: "Erro ao criar fornecedor",
              description: errorMessage,
              variant: "destructive",
            });
          },
        }
      );
    }
  };

  const onCancel = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    form.reset();
  };

  const filteredSuppliers = useMemo(() => {
    if (!suppliersQuery.data?.data) return [];
    
    const searchTermLower = searchTerm.toLowerCase();
    return suppliersQuery.data.data.filter((supplier) => {
      const document = supplier.tipo_pessoa === 'pf' ? supplier.cpf : supplier.cnpj;
      return (
        supplier.name.toLowerCase().includes(searchTermLower) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchTermLower)) ||
        (document && document.toLowerCase().includes(searchTermLower))
      );
    });
  }, [suppliersQuery.data, searchTerm]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Fornecedores</h1>
        <Button onClick={handleNewSupplier}>
          <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Fornecedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliersQuery.data?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fornecedores cadastrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fornecedores Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliersQuery.data?.data?.filter(s => s.ativo === 's').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Com status ativo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pessoa Física</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliersQuery.data?.data?.filter(s => s.tipo_pessoa === 'pf').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fornecedores PF
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pessoa Jurídica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliersQuery.data?.data?.filter(s => s.tipo_pessoa === 'pj').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fornecedores PJ
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Fornecedores</CardTitle>
          <CardDescription>
            Gerencie seus fornecedores.
          </CardDescription>
          <div className="flex items-center mt-4">
            <Search className="h-4 w-4 mr-2 opacity-50" />
            <Input
              placeholder="Buscar por nome, email ou documento..."
              className="max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {suppliersQuery.isLoading ? (
            <div className="flex justify-center items-center py-8">
              <p>Carregando fornecedores...</p>
            </div>
          ) : suppliersQuery.isError ? (
            <div className="flex justify-center items-center py-8 text-red-500">
              <p>Erro ao carregar fornecedores: {suppliersQuery.error.message}</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <p>Nenhum fornecedor encontrado.</p>
            </div>
          ) : (
            <SuppliersTable 
              suppliers={filteredSuppliers}
              onEdit={handleEditSupplier}
              onDelete={handleDeleteSupplier}
              // onView={(supplier) => navigate(`/${link_admin}/suppliers/${supplier.id}`)}
              isLoading={suppliersQuery.isLoading}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? "Atualize as informações do fornecedor."
                : "Preencha as informações do novo fornecedor."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6">
            <form id="supplier-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <SupplierForm form={form as any} isLoading={createSupplierMutation.isPending || updateSupplierMutation.isPending} />
            </form>
          </div>

          <div className="p-4 border-t flex justify-end space-x-2 bg-white rounded-b-lg">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" form="supplier-form" disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}>
              {editingSupplier ? "Atualizar" : "Criar"} Fornecedor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fornecedor {supplierToDelete?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSupplier} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
