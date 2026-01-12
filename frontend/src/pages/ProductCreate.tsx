import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateProduct } from '@/hooks/products';
import { useCategoriesList } from '@/hooks/categories';
import { useSuppliersList } from '@/hooks/suppliers';
import { ProductForm } from '@/components/products/ProductForm';
import { productSchema } from '@/components/products/ProductForm';
import { CreateProductInput } from '@/types/products';
import { toast } from '@/hooks/use-toast';
import { FormActionBar } from '@/components/common/FormActionBar';

/**
 * Página dedicada para criação de novos produtos
 * Oferece mais espaço e melhor experiência do usuário comparado ao modal
 */
export default function ProductCreate() {
  const navigate = useNavigate();
  const createProductMutation = useCreateProduct();
  const { data: categoriesResponse, isLoading: isLoadingCategories, error: categoriesError } = useCategoriesList({
    entidade: 'produtos'
  });
  const categories = categoriesResponse?.data || [];
  
  const { data: suppliersResponse, isLoading: isLoadingSuppliers } = useSuppliersList({
    page: 1,
    per_page: 100
  });
  const suppliers = suppliersResponse?.data || [];
  
  // Mock units data - você pode criar um hook useUnits() se necessário
  const units = [
    { id: 1, name: 'Unidade', label: 'un', value: 'un' },
    { id: 2, name: 'Quilograma', label: 'kg', value: 'kg' },
    { id: 3, name: 'Litro', label: 'L', value: 'L' },
    { id: 4, name: 'Metro', label: 'm', value: 'm' },
    { id: 5, name: 'Peça', label: 'pç', value: 'pç' },
  ];
  const isLoadingUnits = false;
  const unitsError = null;

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
      supplier_id: undefined,
    },
  });

  /**
   * Função para lidar com o envio do formulário de criação
   */
  const onSubmit = async (data: CreateProductInput) => {
    try {
      await createProductMutation.mutateAsync({
        name: data.name,
        description: data.description,
        category: data.category,
        salePrice: data.salePrice,
        costPrice: data.costPrice,
        stock: data.stock,
        unit: data.unit,
        plan: data.plan,
        active: data.active,
        image: data.image,
        rating: data.rating,
        reviews: data.reviews,
        availability: data.availability,
        terms: data.terms,
        validUntil: data.validUntil,
        supplier_id: data.supplier_id,
      });
      
      toast({
        title: 'Produto criado com sucesso!',
        description: 'O produto foi adicionado ao catálogo.',
      });
      
      navigate('/admin/products');
    } catch (error) {
      toast({
        title: 'Erro ao criar produto',
        description: 'Ocorreu um erro ao tentar criar o produto. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Função para cancelar e voltar à lista de produtos
   */
  const handleCancel = () => {
    navigate('/admin/products');
  };
  const handleBack = () => {
    navigate('/admin/products');
  };
  const buildPayload = (data: CreateProductInput) => ({
    name: data.name,
    description: data.description,
    category: data.category,
    salePrice: data.salePrice,
    costPrice: data.costPrice,
    stock: data.stock,
    unit: data.unit,
    active: data.active,
    image: data.image,
    rating: data.rating,
    reviews: data.reviews,
    availability: data.availability,
    terms: data.terms,
    validUntil: data.validUntil,
    supplier_id: data.supplier_id,
  });
  const handleSaveContinue = () => {
    form.handleSubmit(async (data) => {
      try {
        await createProductMutation.mutateAsync(buildPayload(data));
        toast({
          title: 'Produto salvo',
          description: 'Você pode continuar editando antes de sair.',
        });
      } catch (error) {
        toast({
          title: 'Erro ao salvar produto',
          description: 'Ocorreu um erro ao tentar salvar. Tente novamente.',
          variant: 'destructive',
        });
      }
    })();
  };
  const handleSaveExit = () => {
    form.handleSubmit(async (data) => {
      try {
        await createProductMutation.mutateAsync(buildPayload(data));
        toast({
          title: 'Produto criado com sucesso!',
          description: 'O produto foi adicionado ao catálogo.',
        });
        navigate('/admin/products');
      } catch (error) {
        toast({
          title: 'Erro ao salvar produto',
          description: 'Ocorreu um erro ao tentar salvar. Tente novamente.',
          variant: 'destructive',
        });
      }
    })();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Produto</h1>
          <p className="text-muted-foreground">
            Adicione um novo produto ao catálogo
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ProductForm 
              form={form as any}
              onSubmit={onSubmit}
              isSubmitting={createProductMutation.isPending}
              categories={categories}
              units={units}
              isLoadingCategories={isLoadingCategories}
              isLoadingUnits={isLoadingUnits}
              isLoadingSuppliers={isLoadingSuppliers}
              suppliers={suppliers}
              categoriesError={categoriesError}
              unitsError={unitsError}
              onCancel={handleCancel}
              isEditing={false}
            />
            
            {/* Action Buttons (reusable component) */}
            <FormActionBar
              mode="create"
              fixed={true}
              onBack={handleBack}
              onSaveContinue={handleSaveContinue}
              onSaveExit={handleSaveExit}
              isLoading={createProductMutation.isPending}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
