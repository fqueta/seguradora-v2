import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, Edit, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useProduct, useUpdateProduct } from '@/hooks/products';
import { useCategoriesList } from '@/hooks/categories';
import { useSuppliersList } from '@/hooks/suppliers';
import { ProductForm, productSchema } from '@/components/products/ProductForm';
import { UpdateProductInput } from '@/types/products';
import { toast } from 'sonner';

/**
 * ProductEdit
 * pt-BR: Página premium para edição de produtos.
 * en-US: Premium page for product editing.
 */
export default function ProductEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, error } = useProduct(id!);
  const updateProductMutation = useUpdateProduct();
  
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useCategoriesList({
    entidade: 'produtos'
  });
  const categories = categoriesResponse?.data || [];
  
  const { data: suppliersResponse, isLoading: isLoadingSuppliers } = useSuppliersList({
    page: 1,
    per_page: 100
  });
  const suppliers = suppliersResponse?.data || [];
  
  const units = [
    { id: 1, name: 'Unidade', label: 'un', value: 'un' },
    { id: 2, name: 'Quilograma', label: 'kg', value: 'kg' },
    { id: 3, name: 'Litro', label: 'L', value: 'L' },
    { id: 4, name: 'Metro', label: 'm', value: 'm' },
    { id: 5, name: 'Peça', label: 'pç', value: 'pç' },
  ];

  const form = useForm<UpdateProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      salePrice: 0,
      costPrice: 0,
      stock: 0,
      unit: '',
      plan: undefined,
      active: true,
      image: '',
      rating: 0,
      reviews: 0,
      availability: 'available',
      terms: [],
      validUntil: undefined,
      variationGroups: [],
      supplier_id: undefined,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || '',
        description: product.description || '',
        category: product.category ? String(product.category) : '',
        salePrice: product.salePrice || 0,
        costPrice: product.costPrice || 0,
        stock: product.stock || 0,
        unit: product.unit || '',
        active: product.active ?? true,
        image: product.image || '',
        rating: product.rating || 0,
        reviews: product.reviews || 0,
        availability: product.availability || 'available',
        terms: product.terms || [],
        validUntil: product.validUntil,
        plan: product.plan ? String(product.plan) as any : undefined,
        variationGroups: product.variationGroups || [],
        supplier_id: product.supplier_id ? String(product.supplier_id) : undefined,
      });
    }
  }, [product, form]);

  const onSubmit = async (data: UpdateProductInput) => {
    if (!id) return;
    try {
      await updateProductMutation.mutateAsync({
        id,
        data: { ...data },
      });
      toast.success('Produto atualizado com sucesso!');
      navigate('/admin/products');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar produto');
    }
  };

  const handleBack = () => navigate('/admin/products');

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium">Carregando formulário...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
          <CardHeader className="bg-red-50 text-center py-10">
            <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-4">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-black text-red-900">Oops!</CardTitle>
            <CardDescription className="text-red-600 font-medium">Produto não encontrado.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <Button onClick={handleBack} variant="outline" className="rounded-2xl h-12 px-8 font-bold">
              Voltar para a Lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="rounded-2xl w-14 h-14 bg-gray-50 hover:bg-gray-100" onClick={handleBack}>
            <ChevronLeft className="w-8 h-8 text-gray-400" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
              <Edit className="w-8 h-8 text-primary stroke-[3]" />
              Editar Produto
            </h1>
            <p className="text-muted-foreground mt-1 font-medium">Atualizando: <span className="text-gray-900 font-bold">{product.name}</span></p>
          </div>
        </div>
      </div>

      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden bg-white">
        <CardHeader className="bg-gray-50/50 border-b p-10">
          <CardTitle className="text-xl font-black">Formulário de Edição</CardTitle>
          <CardDescription className="text-base font-medium">Modifique as informações técnicas e comerciais deste item.</CardDescription>
        </CardHeader>
        <CardContent className="p-10">
          <ProductForm
            form={form as any}
            onSubmit={onSubmit}
            onCancel={handleBack}
            categories={categories}
            units={units}
            suppliers={suppliers}
            isLoadingCategories={isLoadingCategories}
            isLoadingUnits={false}
            isLoadingSuppliers={isLoadingSuppliers}
            isSubmitting={updateProductMutation.isPending}
            mode="edit"
            isEditing={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
