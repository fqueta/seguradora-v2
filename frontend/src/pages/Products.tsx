import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useProductsList, useCreateProduct, useUpdateProduct, useDeleteProduct, useProductCategories, useProductUnits } from "@/hooks/products";
import type { Product, CreateProductInput, UpdateProductInput } from "@/types/products";
import { Plus, Edit, Package, LayoutGrid, Zap, Search, Filter, Badge as BadgeIcon } from "lucide-react";
import ProductsStats from "@/components/products/ProductsStats";
import ProductsTable from "@/components/products/ProductsTable";
import ProductFormDialog from "@/components/products/ProductFormDialog";
import { ProductFormData, productSchema } from "@/components/products/ProductForm";
import { Badge } from "@/components/ui/badge";

/**
 * Products
 * pt-BR: Centro de gestão de produtos com design unificado e visual Premium.
 */
export default function Products() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Hooks para produtos
  const { data: productsData, isLoading: isLoadingProducts, error: productsError, refetch } = useProductsList();
  
  const createMutation = useCreateProduct({
    onSuccess: () => {
      toast.success('Produto criado com sucesso!');
      setIsDialogOpen(false);
      setEditingProduct(null);
      refetch();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar produto');
    }
  });

  const updateMutation = useUpdateProduct({
    onSuccess: () => {
      toast.success('Produto atualizado com sucesso!');
      setIsDialogOpen(false);
      setEditingProduct(null);
      refetch();
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar produto');
    }
  });

  const deleteMutation = useDeleteProduct({
    onSuccess: () => {
      toast.success('Produto excluído com sucesso!');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao excluir produto');
    }
  });

  // Hooks para categorias e unidades
  const { data: categories = [], isLoading: isLoadingCategories, error: categoriesError } = useProductCategories();
  const { data: units = [], isLoading: isLoadingUnits, error: unitsError } = useProductUnits();

  // Extrai os produtos da resposta paginada
  const products = Array.isArray(productsData) ? productsData : productsData?.data || [];

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      salePrice: 0,
      costPrice: 0,
      stock: 0,
      unit: "Unidade",
      active: true,
      image: "",
      rating: 0,
      reviews: 0,
      availability: "available" as const,
      terms: [],
      validUntil: "",
    },
  });

  const handleNewProduct = () => {
    navigate('/admin/products/create');
  };

  const handleEditProduct = (product: Product) => {
    navigate(`/admin/products/${product.id}/edit`);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (confirm("Deseja realmente remover este produto do catálogo?")) {
       await deleteMutation.mutateAsync(product.id);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (editingProduct) {
        const updateData: UpdateCategoryInput = {
          name: data.name,
          description: data.description || '',
          category: data.category,
          salePrice: data.salePrice,
          costPrice: data.costPrice,
          stock: data.stock,
          unit: data.unit,
          active: data.active,
          image: data.image || '',
          rating: data.rating || 0,
          reviews: data.reviews || 0,
          availability: data.availability,
          terms: data.terms,
          validUntil: data.validUntil || ''
        };
        await updateMutation.mutateAsync({ id: editingProduct.id, data: updateData });
      } else {
        const createData: CreateCategoryInput = {
          name: data.name,
          description: data.description || '',
          category: data.category,
          salePrice: data.salePrice,
          costPrice: data.costPrice,
          stock: data.stock,
          unit: data.unit,
          active: data.active,
          image: data.image || '',
          rating: data.rating || 0,
          reviews: data.reviews || 0,
          availability: data.availability,
          terms: data.terms,
          validUntil: data.validUntil || ''
        };
        await createMutation.mutateAsync(createData);
      }
    } catch (error) {
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
      
      {/* Header Premium Unificado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2 pt-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest py-0.5 border-primary/20 bg-primary/5 text-primary">
              Catálogo de Vendas
            </Badge>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Produtos & Estoque</h1>
          <p className="text-muted-foreground mt-1 font-medium italic">Gerencie sua vitrine virtual, precificação e níveis de disponibilidade com precisão.</p>
        </div>

        <Button 
          onClick={handleNewProduct}
          className="h-14 px-8 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 gap-3 transition-all hover:scale-[1.02] active:scale-95 text-white"
        >
          <Plus className="h-5 w-5" />
          Novo Produto
        </Button>
      </div>

      {/* Stats Cards Section */}
      <div className="px-2">
         <ProductsStats products={products} />
      </div>

      {/* Main Table Content */}
      <div className="px-2 pb-20">
         <ProductsTable
            products={products}
            isLoading={isLoadingProducts}
            error={productsError}
            onNewProduct={handleNewProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onRefetch={refetch}
         />
      </div>

      {/* Form Dialog (Se for usado na listagem) */}
      <ProductFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingProduct={editingProduct}
        form={form}
        onSubmit={onSubmit}
        categories={categories}
        units={units}
        isLoadingCategories={isLoadingCategories}
        isLoadingUnits={isLoadingUnits}
        categoriesError={categoriesError}
        unitsError={unitsError}
        isSubmitting={isSubmitting}
      />

      {/* Info Footer */}
      <div className="text-center pb-20 opacity-30">
         <p className="text-[10px] font-black uppercase tracking-[0.4em]">Inventory Management Neural Cloud v2.1.4</p>
      </div>
    </div>
  );
}
