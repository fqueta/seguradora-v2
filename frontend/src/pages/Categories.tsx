/**
 * Componente para gerenciamento de categorias
 * Fornece interface completa para operações CRUD de categorias
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { useToast } from "../hooks/use-toast";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  FolderTree,
  Folder,
  FolderOpen,
  LayoutGrid,
  Zap,
  Tag,
  Filter,
  ArrowRight
} from "lucide-react";
import {
  useCategoriesList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useParentCategories,
} from "../hooks/categories";
import {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryFormData,
} from "../types/categories";
import { cn } from "@/lib/utils";

// Schema de validação do formulário
const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional(),
  parentId: z.string().optional(),
  entidade: z.string().min(1, "Entidade é obrigatória"),
  active: z.boolean().default(true),
});

/**
 * Componente principal de gerenciamento de categorias
 */
export default function Categories() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [entidadeFilter, setEntidadeFilter] = useState("all");

  // Hooks para operações CRUD
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useCategoriesList({
    search: searchTerm || undefined,
    entidade: entidadeFilter === "all" ? undefined : entidadeFilter,
    limit: 50,
  });
  
  const { data: parentCategories = [] } = useParentCategories();

  const categories = categoriesResponse?.data || [];

  // Formulário
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      parentId: "",
      entidade: "",
      active: true,
    },
  });

  // Mutações
  const createMutation = useCreateCategory({
    onSuccess: () => {
      toast({
        title: "Categoria criada",
        description: "Categoria criada com sucesso.",
      });
      setIsDialogOpen(false);
      setEditingCategory(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar categoria.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useUpdateCategory({
    onSuccess: () => {
      toast({
        title: "Categoria atualizada",
        description: "Categoria atualizada com sucesso.",
      });
      setIsDialogOpen(false);
      setEditingCategory(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar categoria.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useDeleteCategory({
    onSuccess: () => {
      toast({
        title: "Categoria excluída",
        description: "Categoria excluída com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao excluir categoria.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleNewCategory = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      description: "",
      parentId: "none",
      entidade: "",
      active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      parentId: category.parentId || "none",
      entidade: category.entidade,
      active: category.active,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    try {
      await deleteMutation.mutateAsync(category.id);
    } catch (error) {
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        const updateData: UpdateCategoryInput = {
          name: data.name,
          description: data.description || undefined,
          parentId: data.parentId === "none" ? undefined : data.parentId,
          entidade: data.entidade,
          active: data.active,
        };
        await updateMutation.mutateAsync({ id: editingCategory.id, data: updateData });
      } else {
        const createData: CreateCategoryInput = {
          name: data.name,
          description: data.description || undefined,
          parentId: data.parentId === "none" ? undefined : data.parentId,
          entidade: data.entidade,
          active: data.active,
        };
        await createMutation.mutateAsync(createData);
      }
    } catch (error) {
    }
  };

  // Filtros e estatísticas
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCategories = categories.length;
  const activeCategories = categories.filter(c => c.active).length;
  const parentCategoriesCount = categories.filter(c => !c.parentId).length;
  const subcategoriesCount = categories.filter(c => c.parentId).length;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Função para obter nome da categoria pai
  const getParentCategoryName = (parentId?: string) => {
    if (!parentId) return "Categoria Principal";
    const parent = categories.find(c => c.id === parentId) || 
                   parentCategories.find(c => c.id === parentId);
    return parent?.name || "Categoria não encontrada";
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <LayoutGrid className="h-6 w-6 text-primary" />
            </div>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest py-0.5 border-primary/20 bg-primary/5 text-primary">
              Gerenciamento de Ativos
            </Badge>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Categorias</h1>
          <p className="text-muted-foreground mt-1 font-medium italic">Organize seus produtos e serviços em uma estrutura hierárquica inteligente.</p>
        </div>

        <Button 
          onClick={handleNewCategory}
          className="h-14 px-8 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 gap-3 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Nova Categoria
        </Button>
      </div>

      {/* Estatísticas Redesenhadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total de Categorias', value: totalCategories, icon: <FolderTree className="w-5 h-5" />, color: 'bg-blue-500', light: 'bg-blue-50' },
          { label: 'Categorias Ativas', value: activeCategories, icon: <FolderOpen className="w-5 h-5" />, color: 'bg-emerald-500', light: 'bg-emerald-50' },
          { label: 'Hierarquia Pai', value: parentCategoriesCount, icon: <Folder className="w-5 h-5" />, color: 'bg-orange-500', light: 'bg-orange-50' },
          { label: 'Subcategorias', value: subcategoriesCount, icon: <Tag className="w-5 h-5" />, color: 'bg-indigo-500', light: 'bg-indigo-50' }
        ].map((stat, i) => (
          <Card key={i} className="rounded-[2rem] border-none shadow-xl shadow-gray-100/50 overflow-hidden group hover:-translate-y-1 transition-all">
            <CardContent className="p-6 flex items-center gap-5">
              <div className={cn("p-4 rounded-2xl text-white shadow-lg", stat.color)}>
                 {stat.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</span>
                <span className="text-3xl font-black text-gray-900 leading-none">{stat.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros em Estilo Glassmorphism */}
      <Card className="rounded-[2.5rem] border-none shadow-lg shadow-gray-100/30 bg-white/50 backdrop-blur-md overflow-hidden">
        <div className="p-8 pb-4 border-b border-gray-100/50">
           <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">Filtros Avançados</h3>
           </div>
        </div>
        <CardContent className="p-8 pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex-1 group w-full">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-300 group-focus-within:text-primary transition-colors" />
              </div>
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-14 pl-12 rounded-2xl border-gray-100 bg-white/80 font-bold focus:ring-primary shadow-sm"
              />
            </div>
            
            <div className="w-full md:w-[300px]">
               <Select value={entidadeFilter} onValueChange={setEntidadeFilter}>
                 <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-white/80 font-bold shadow-sm">
                   <div className="flex items-center gap-2">
                     <Zap className="w-4 h-4 text-primary" />
                     <SelectValue placeholder="Todas as entidades" />
                   </div>
                 </SelectTrigger>
                 <SelectContent className="rounded-2xl border-none shadow-2xl">
                   <SelectItem value="all" className="rounded-xl font-bold">💎 Todas as Entidades</SelectItem>
                   <SelectItem value="servicos" className="rounded-xl font-bold">🚀 Serviços</SelectItem>
                   <SelectItem value="produtos" className="rounded-xl font-bold">🛒 Produtos</SelectItem>
                   <SelectItem value="financeiro" className="rounded-xl font-bold">💰 Financeiro</SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de categorias Premium */}
      <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-white">
        <div className="bg-gray-50/50 p-8 border-b border-gray-100 flex items-center justify-between">
           <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Lista de Categorias</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                 {filteredCategories.length} categoria(s) encontrada(s) na base de dados
              </p>
           </div>
           <Badge className="bg-white text-gray-600 border-gray-200 px-4 py-1.5 rounded-full font-black text-[10px] uppercase shadow-sm">Ativos em Tempo Real</Badge>
        </div>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/30">
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-gray-400 py-6 pl-8">Nome</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-gray-400 py-6">Descrição</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-gray-400 py-6">Entidade</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-gray-400 py-6">Estrutura</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-gray-400 py-6">Status</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-gray-400 py-6 text-right pr-8">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingCategories ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                         <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                         <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Sincronizando dados...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20">
                       <div className="flex flex-col items-center gap-3">
                          <Search className="h-12 w-12 text-gray-100" />
                          <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Nenhuma categoria localizada</span>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id} className="hover:bg-gray-50/50 transition-colors group">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 flex items-center justify-center bg-gray-50 rounded-xl group-hover:bg-white transition-all shadow-inner group-hover:shadow-md">
                              <Tag className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                           </div>
                           <div className="font-black text-gray-900 text-sm">{category.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="text-xs font-bold text-gray-400 max-w-xs truncate italic">
                          {category.description || "Sem descrição registrada"}
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge variant="outline" className={cn(
                          "font-black uppercase text-[9px] tracking-widest border-none px-3 py-1 rounded-lg shadow-sm",
                          category.entidade === "servicos" ? "bg-blue-50 text-blue-600" : 
                          category.entidade === "produtos" ? "bg-emerald-50 text-emerald-600" : 
                          category.entidade === "financeiro" ? "bg-amber-50 text-amber-600" : 
                          "bg-gray-50 text-gray-600"
                        )}>
                          {category.entidade === "servicos" ? "Serviços" : 
                           category.entidade === "produtos" ? "Produtos" : 
                           category.entidade === "financeiro" ? "Financeiro" : 
                           category.entidade}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-2">
                           {!category.parentId ? (
                              <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[9px] uppercase tracking-widest">Principal</Badge>
                           ) : (
                              <div className="flex items-center gap-1.5">
                                 <span className="text-[10px] font-black text-gray-300">Pai:</span>
                                 <span className="text-[10px] font-black text-gray-600">{getParentCategoryName(category.parentId)}</span>
                              </div>
                           )}
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-2">
                           <div className={cn("h-2 w-2 rounded-full", category.active ? "bg-emerald-500 animate-pulse" : "bg-gray-300")} />
                           <span className={cn("text-[10px] font-black uppercase tracking-widest", category.active ? "text-emerald-500" : "text-gray-400")}>
                              {category.active ? "Online" : "Offline"}
                           </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8 py-5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-md transition-all">
                              <MoreHorizontal className="h-5 w-5 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-2xl border-none shadow-2xl p-2">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2">Gestão</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-gray-50 mb-1" />
                            <DropdownMenuItem className="rounded-xl font-bold h-10 px-3">
                              <Eye className="mr-3 h-4 w-4 text-blue-500" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditCategory(category)} className="rounded-xl font-bold h-10 px-3">
                              <Edit className="mr-3 h-4 w-4 text-emerald-500" />
                              Editar Escopo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-50 mb-1" />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 rounded-xl font-bold h-10 px-3"
                              onClick={() => handleDeleteCategory(category)}
                            >
                              <Trash2 className="mr-3 h-4 w-4" />
                              Remover Registro
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de criação/edição Estilizado */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[650px] p-0 border-none rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="bg-primary p-12 text-white relative">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <LayoutGrid className="w-32 h-32" />
             </div>
             <DialogHeader className="relative z-10">
               <DialogTitle className="text-3xl font-black tracking-tight flex items-center gap-4">
                 {editingCategory ? <Edit className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                 {editingCategory ? "Editar Categoria" : "Nova Categoria"}
               </DialogTitle>
               <DialogDescription className="text-white/70 font-bold uppercase tracking-widest text-[11px] mt-2">
                 {editingCategory 
                   ? "Ajuste os parâmetros da estrutura hierárquica."
                   : "Crie uma nova ramificação organizacional no sistema."
                 }
               </DialogDescription>
             </DialogHeader>
          </div>
          
          <div className="p-10 pt-8 bg-white">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-black uppercase tracking-widest text-[10px] text-gray-400 ml-1">Nome da Categoria</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex.: Bebidas, Sobremesas, Eletrônicos..." className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:shadow-md transition-all text-lg shadow-inner" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-black uppercase tracking-widest text-[10px] text-gray-400 ml-1">Descrição do Escopo</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Detalhes sobre quais itens fazem parte desta categoria..."
                              className="min-h-[120px] rounded-2xl border-gray-100 bg-gray-50/50 font-medium shadow-inner focus:shadow-md transition-all"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="entidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black uppercase tracking-widest text-[10px] text-gray-400 ml-1">Entidade Raiz</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold shadow-inner">
                              <SelectValue placeholder="Selecione o tipo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="servicos" className="rounded-xl font-bold">🚀 Serviços</SelectItem>
                            <SelectItem value="produtos" className="rounded-xl font-bold">🛒 Produtos</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="parentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black uppercase tracking-widest text-[10px] text-gray-400 ml-1">Posicionamento na Árvore</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold shadow-inner">
                              <SelectValue placeholder="Hierarquia superior..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="none" className="rounded-xl font-bold">💎 Categoria Principal</SelectItem>
                            {parentCategories
                              .filter(cat => cat.id !== editingCategory?.id) 
                              .map((category) => (
                              <SelectItem key={category.id} value={category.id} className="rounded-xl font-bold">
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-[2rem] border-2 border-dashed border-gray-100 p-6 bg-gray-50/20">
                          <div className="space-y-1">
                            <FormLabel className="text-lg font-black tracking-tight text-gray-900">Disponibilidade Imediata</FormLabel>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                              Defina se esta categoria está ativa no sistema
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-primary"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-xs text-gray-400"
                  >
                    Descartar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20"
                  >
                    {isSubmitting ? (
                       <Loader2 className="w-5 h-5 animate-spin" />
                    ) : editingCategory ? (
                       <Zap className="w-5 h-5" />
                    ) : (
                       <ArrowRight className="w-5 h-5" />
                    )}
                    {isSubmitting ? "Efetuando Cadastro..." : editingCategory ? "Sincronizar Alterações" : "Confirmar Criação"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Footer / Info */}
      <div className="text-center pb-20 opacity-30">
         <p className="text-[10px] font-black uppercase tracking-[0.4em]">Engine de Classificação Estruturada v2.1</p>
      </div>

    </div>
  );
}
function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m4.9 19.1 2.9-2.9" />
      <path d="M2 12h4" />
      <path d="m4.9 4.9 2.9 2.9" />
    </svg>
  );
}