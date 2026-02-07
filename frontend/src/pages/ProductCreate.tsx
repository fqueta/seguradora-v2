import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ShoppingBag, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCreateProduct } from '@/hooks/products';
import { useCategoriesList } from '@/hooks/categories';
import { useSuppliersList } from '@/hooks/suppliers';
import { ProductForm, productSchema } from '@/components/products/ProductForm';
import { CreateProductInput } from '@/types/products';
import { toast } from 'sonner';

/**
 * ProductCreate
 * pt-BR: Página premium para criação de produtos.
 * en-US: Premium page for product creation.
 */
export default function ProductCreate() {
  const navigate = useNavigate();
  const createProductMutation = useCreateProduct();
  
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

  const form = useForm<CreateProductInput>({
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

  const onSubmit = async (data: CreateProductInput) => {
    try {
      await createProductMutation.mutateAsync({
        ...data,
      });
      toast.success('Produto criado com sucesso!');
      navigate('/admin/products');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar produto');
    }
  };

  const handleBack = () => navigate('/admin/products');

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
              <Plus className="w-8 h-8 text-primary stroke-[3]" />
              Novo Produto
            </h1>
            <p className="text-muted-foreground mt-1 font-medium">Cadastre um novo item no seu catálogo de vendas.</p>
          </div>
        </div>
      </div>

      <Card className="rounded-[2.5rem] shadow-2xl border-none overflow-hidden bg-white">
        <CardHeader className="bg-gray-50/50 border-b p-10">
          <CardTitle className="text-xl font-black">Informações do Produto</CardTitle>
          <CardDescription className="text-base font-medium">Preencha os detalhes técnicos, preços e estoque do item.</CardDescription>
        </CardHeader>
        <CardContent className="p-10">
          <ProductForm
            form={form}
            onSubmit={onSubmit}
            onCancel={handleBack}
            categories={categories}
            units={units}
            suppliers={suppliers}
            isLoadingCategories={isLoadingCategories}
            isLoadingUnits={false}
            isLoadingSuppliers={isLoadingSuppliers}
            isSubmitting={createProductMutation.isPending}
            mode="create"
          />
        </CardContent>
      </Card>
    </div>
  );
}
