import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { serviceOrderSchema, type ServiceOrderFormData } from "./serviceOrderSchema";
import { Plus, Trash2, Calculator } from "lucide-react";
import { useState, useEffect } from "react";
import { 
  SERVICE_ORDER_STATUSES, 
  SERVICE_ORDER_PRIORITIES,
  ServiceOrderServiceItem,
  ServiceOrderProductItem
} from "@/types/serviceOrders";
import { QuickCreateProductModal } from "./QuickCreateProductModal";
import { QuickCreateServiceModal } from "./QuickCreateServiceModal";



interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface AvailableService {
  id: string;
  name: string;
  price?: number;
  unit: string;
}

interface AvailableProduct {
  id: string;
  name: string;
  salePrice?: number;
  unit: string;
  stock?: number;
}

interface ServiceOrderFormProps {
  form: UseFormReturn<ServiceOrderFormData>;
  onSubmit: (data: ServiceOrderFormData & { services: ServiceOrderServiceItem[]; products: ServiceOrderProductItem[] }) => void;
  isSubmitting: boolean;
  clients: Client[];
  users: User[];
  availableServices: AvailableService[];
  availableProducts: AvailableProduct[];
  isLoadingClients: boolean;
  isLoadingUsers: boolean;
  isLoadingServices: boolean;
  isLoadingProducts: boolean;
  onCancel: () => void;
  isEditing: boolean;
  initialServices?: ServiceOrderServiceItem[];
  initialProducts?: ServiceOrderProductItem[];
  // Funções de busca dinâmica
  searchClients?: (searchTerm: string) => void;
  searchUsers?: (searchTerm: string) => void;
  searchServices?: (searchTerm: string) => void;
  searchProducts?: (searchTerm: string) => void;
  // Termos de busca atuais
  clientsSearchTerm?: string;
  usersSearchTerm?: string;
  servicesSearchTerm?: string;
  productsSearchTerm?: string;
  // Callbacks para atualização das listas após cadastro rápido
  onServiceCreated?: () => void;
  onProductCreated?: () => void;
  // Permite substituir os botões internos por um componente customizado
  // English: Allows overriding internal action buttons with a custom component
  renderActions?: React.ReactNode;
}

export default function ServiceOrderForm({
  form,
  onSubmit,
  isSubmitting,
  clients,
  users,
  availableServices,
  availableProducts,
  isLoadingClients,
  isLoadingUsers,
  isLoadingServices,
  isLoadingProducts,
  onCancel,
  isEditing,
  initialServices = [],
  initialProducts = [],
  searchClients,
  searchUsers,
  searchServices,
  searchProducts,
  clientsSearchTerm,
  usersSearchTerm,
  servicesSearchTerm,
  productsSearchTerm,
  onServiceCreated,
  onProductCreated
  ,
  renderActions
}: ServiceOrderFormProps) {
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedServices, setSelectedServices] = useState<ServiceOrderServiceItem[]>(initialServices);
  const [selectedProducts, setSelectedProducts] = useState<ServiceOrderProductItem[]>(initialProducts);
  const [servicesTotal, setServicesTotal] = useState(0);
  const [productsTotal, setProductsTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Calcula totais quando serviços ou produtos mudam
  useEffect(() => {
    const sTotal = selectedServices.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    const pTotal = selectedProducts.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
    setServicesTotal(sTotal);
    setProductsTotal(pTotal);
    setTotalAmount(sTotal + pTotal);
  }, [selectedServices, selectedProducts]);
  // console.log('aircraft', aircraft);
  // console.log('selectedAircraft',selectedAircraft);
  
  // Adiciona um serviço à lista
  const addService = (serviceId: string) => {
    if (!serviceId) return;
    
    // Busca mais robusta - compara tanto string quanto number
    const service = availableServices.find(s => {
      return String(s.id) === serviceId || s.id === serviceId;
    });
    
    // console.log('service encontrado:', service);
    
    if (!service) {
      console.error('Serviço não encontrado para ID:', serviceId);
      return;
    }
  
    // Verifica se o serviço já foi adicionado
    const alreadyExists = selectedServices.some(item => String(item.service_id) === serviceId);
    if (alreadyExists) {
      alert('Este serviço já foi adicionado à lista!');
      return;
    }
  
    const price = Number(service.price) || 0;
    const newItem: ServiceOrderServiceItem = {
      service_id: serviceId,
      service,
      quantity: 1,
      unit_price: price,
      total_price: price,
      notes: ''
    };
  
    setSelectedServices(prev => [...prev, newItem]);
  };

  // Remove um serviço da lista
  const removeService = (index: number) => {
    setSelectedServices(prev => prev.filter((_, i) => i !== index));
  };

  // Atualiza um serviço na lista
  const updateService = (index: number, field: keyof ServiceOrderServiceItem, value: any) => {
    setSelectedServices(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          // Garante que os valores sejam números válidos
          const quantity = Number(updated.quantity) || 0;
          const unitPrice = Number(updated.unit_price) || 0;
          updated.total_price = quantity * unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  // Adiciona um produto à lista
  const addProduct = (productId: string) => {
    if (!productId) return;
    // console.log('productId recebido:', productId, 'tipo:', typeof productId);
    // console.log('availableProducts:', availableProducts);
    const product = availableProducts.find(p => String(p.id) === productId);
    if (!product) return;

    // Verifica se o produto já foi adicionado
    const alreadyExists = selectedProducts.some(item => item.product_id === productId);
    if (alreadyExists) {
      alert('Este produto já foi adicionado à lista!');
      return;
    }

    const salePrice = Number(product.salePrice) || 0;
    const newItem: ServiceOrderProductItem = {
      product_id: productId,
      product,
      quantity: 1,
      unit_price: salePrice,
      total_price: salePrice,
      notes: ''
    };

    setSelectedProducts(prev => [...prev, newItem]);
  };

  // Remove um produto da lista
  const removeProduct = (index: number) => {
    setSelectedProducts(prev => prev.filter((_, i) => i !== index));
  };

  // Atualiza um produto na lista
  const updateProduct = (index: number, field: keyof ServiceOrderProductItem, value: any) => {
    setSelectedProducts(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          // Garante que os valores sejam números válidos
          const quantity = Number(updated.quantity) || 0;
          const unitPrice = Number(updated.unit_price) || 0;
          updated.total_price = quantity * unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  // Submete o formulário com os dados completos
  const handleSubmit = (data: ServiceOrderFormData) => {
    onSubmit({
      ...data,
      services: selectedServices,
      products: selectedProducts
    });
  };

  const handleServiceCreated = (service: any) => {
    // Atualiza a lista de serviços
    console.log('service:', service);
    console.log('service.id:', service.id);
    onServiceCreated?.();
    // Adiciona automaticamente o novo serviço à lista
    setTimeout(() => {
      addService(String(service.id));
    }, 100); // Pequeno delay para garantir que a lista foi atualizada
  };

  const handleProductCreated = (product: any) => {
    // Atualiza a lista de produtos
    onProductCreated?.();
    // Adiciona automaticamente o novo produto à lista
    setTimeout(() => {
      addProduct(String(product.id));
    }, 100); // Pequeno delay para garantir que a lista foi atualizada
  };
  
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Documento */}
              <FormField
                control={form.control}
                name="doc_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="orc">Orçamento</SelectItem>
                        <SelectItem value="os">Ordem de Serviço</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o título da ordem"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               {/* Campo Hidden para Client ID */}
               <FormField
                 control={form.control}
                 name="client_id"
                 render={({ field }) => (
                   <FormItem className="hidden">
                     <FormControl>
                       <Input type="hidden" {...field} />
                     </FormControl>
                   </FormItem>
                 )}
               />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_ORDER_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`bg-${status.color}-100 text-${status.color}-800`}>
                                {status.label}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prioridade */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_ORDER_PRIORITIES.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`bg-${priority.color}-100 text-${priority.color}-800`}>
                                {priority.label}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Data Início Estimada */}
              <FormField
                control={form.control}
                name="estimated_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Início Estimada</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Data Fim Estimada */}
              <FormField
                control={form.control}
                name="estimated_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Fim Estimada</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Responsável */}
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Responsável</FormLabel>
                    <FormControl>
                      <Combobox
                        options={users.map(user => ({
                          value: user.id,
                          label: user.name
                        }))}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione um responsável"
                        searchPlaceholder="Buscar responsável..."
                        emptyText="Nenhum usuário encontrado"
                        disabled={isSubmitting || isLoadingUsers}
                        loading={isLoadingUsers}
                        onSearch={searchUsers}
                        searchTerm={usersSearchTerm}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os detalhes da ordem de serviço"
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Serviços */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Serviços</span>
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <span className="text-sm font-normal">
                  Total: R$ {servicesTotal.toFixed(2)}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Adicionar Serviço */}
            <div className="flex gap-2">
              <Combobox
                options={availableServices.map(service => ({
                  value: String(service.id),
                  label: `${service.name} - R$ ${Number(service.price || 0).toFixed(2)}`
                }))}
                value=""
                onValueChange={addService}
                placeholder="Selecione um serviço para adicionar"
                searchPlaceholder="Buscar serviço..."
                emptyText="Nenhum serviço encontrado"
                disabled={isSubmitting || isLoadingServices}
                loading={isLoadingServices}
                className="flex-1"
                onSearch={searchServices}
                searchTerm={servicesSearchTerm}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowServiceModal(true)}
                disabled={isSubmitting}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista de Serviços Selecionados */}
            {selectedServices.length > 0 && (
              <div className="space-y-2">
                {selectedServices.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
                      <div>
                        <Label className="text-xs">Serviço</Label>
                        <p className="text-sm font-medium">{item.service?.name}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateService(index, 'quantity', parseFloat(e.target.value) || 1)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Preço Unit.</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateService(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Total</Label>
                        <p className="text-sm font-medium py-1">R$ {(Number(item.total_price) || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Observações</Label>
                        <Input
                          placeholder="Observações"
                          value={item.notes || ''}
                          onChange={(e) => updateService(index, 'notes', e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeService(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Produtos</span>
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <span className="text-sm font-normal">
                  Total: R$ {productsTotal.toFixed(2)}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Adicionar Produto */}
            <div className="flex gap-2">
              <Combobox
                options={availableProducts.map(product => ({
                  value: String(product.id),
                  label: `${product.name} - R$ ${Number(product.salePrice || 0).toFixed(2)} (Estoque: ${Number(product.stock || 0)})`
                }))}
                value=""
                onValueChange={addProduct}
                placeholder="Selecione um produto para adicionar"
                searchPlaceholder="Buscar produto..."
                emptyText="Nenhum produto encontrado"
                disabled={isSubmitting || isLoadingProducts}
                loading={isLoadingProducts}
                className="flex-1"
                onSearch={searchProducts}
                searchTerm={productsSearchTerm}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProductModal(true)}
                disabled={isSubmitting}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista de Produtos Selecionados */}
            {selectedProducts.length > 0 && (
              <div className="space-y-2">
                {selectedProducts.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
                      <div>
                        <Label className="text-xs">Produto</Label>
                        <p className="text-sm font-medium">{item.product?.name}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Preço Unit.</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateProduct(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Total</Label>
                        <p className="text-sm font-medium py-1">R$ {(Number(item.total_price) || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="text-xs">Observações</Label>
                        <Input
                          placeholder="Observações"
                          value={item.notes || ''}
                          onChange={(e) => updateProduct(index, 'notes', e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeProduct(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Observações Públicas */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Públicas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações visíveis ao cliente"
                        className="min-h-[100px]"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Observações Internas */}
              <FormField
                control={form.control}
                name="internal_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Internas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações internas da equipe"
                        className="min-h-[100px]"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Resumo Financeiro */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Total Serviços</p>
                <p className="text-2xl font-bold text-blue-800">R$ {servicesTotal.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Total Produtos</p>
                <p className="text-2xl font-bold text-green-800">R$ {productsTotal.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600">Total Geral</p>
                <p className="text-2xl font-bold text-purple-800">R$ {totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        {renderActions ? (
          renderActions
        ) : (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : isEditing ? "Atualizar" : "Criar"} Ordem
            </Button>
          </div>
        )}
      </form>

      {/* Modais de cadastro rápido */}
      <QuickCreateServiceModal
        open={showServiceModal}
        onOpenChange={setShowServiceModal}
        onServiceCreated={handleServiceCreated}
      />

      <QuickCreateProductModal
        open={showProductModal}
        onOpenChange={setShowProductModal}
        onProductCreated={handleProductCreated}
      />
    </Form>
  );
}

// Exports movidos para fora do componente para evitar problemas com Fast Refresh
export type { Client, User, AvailableService, AvailableProduct };