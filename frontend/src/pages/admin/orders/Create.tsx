import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateOrder } from "@/hooks/orders";
import { useProductsList } from "@/hooks/products";
import { useMesasList } from "@/hooks/mesas";
import { Combobox, useComboboxOptions } from "@/components/ui/combobox";
import { FulfillmentType, PaymentMethod, OrderItem, CustomerInfo } from "@/types/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Trash2, 
  ClipboardList, 
  User, 
  ShoppingBag, 
  Coins, 
  Store,
  LayoutDashboard,
  MessageSquare,
  ArrowRight,
  ChevronLeft
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import CustomerForm from "@/components/orders/CustomerForm";
import { Textarea } from "@/components/ui/textarea";

const AdminOrderCreate = () => {
  const navigate = useNavigate();
  const { mutateAsync: createOrder, isPending } = useCreateOrder();

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>(FulfillmentType.Pickup);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Card);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    phone: "",
    address: null,
  });
  const [notes, setNotes] = useState<string>("");
  const [mesaId, setMesaId] = useState<number | null>(null);
  const [items, setItems] = useState<OrderItem[]>([
    { productId: 0, title: "", notes: "", quantity: 1, unitPrice: 0 },
  ]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [productsSearchTerm, setProductsSearchTerm] = useState<string>("");
  
  const { data: productsPage, isLoading: isLoadingProducts } = useProductsList(
    { search: productsSearchTerm, per_page: 20 },
    { keepPreviousData: true }
  );
  const availableProducts = (productsPage?.data ?? []) as any[];
  const productOptions = useComboboxOptions<any>(
    availableProducts,
    "id",
    "name",
    undefined,
    (p) => `R$ ${Number(p?.salePrice || 0).toFixed(2)} • Est: ${Number(p?.stock || 0)}`
  );

  const { data: mesasPage, isLoading: isLoadingMesas } = useMesasList({ per_page: 50 });
  const availableMesas = (mesasPage?.data ?? []) as any[];
  const mesaOptions = useComboboxOptions<any>(
    availableMesas,
    "id",
    "name",
    undefined,
    (m) => `Capacidade: ${m?.capacity ?? '-'}` 
  );

  const updateItem = (idx: number, patch: Partial<OrderItem>) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setItems([...items, { productId: 0, title: "", notes: "", quantity: 1, unitPrice: 0 }]);
  };

  const selectProductForItem = (idx: number, productIdStr: string) => {
    const pid = Number(productIdStr);
    const product = availableProducts.find((p) => String(p.id) === productIdStr);
    const title = product?.name ?? "";
    const unitPrice = Number(product?.salePrice ?? 0);
    updateItem(idx, { productId: pid, title, unitPrice });
  };

  /**
   * Currency Mask Logic
   */
  const formatValueToCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
    }).format(val);
  };

  const handlePriceChange = (idx: number, rawValue: string) => {
    // Remove tudo que não é número
    const digits = rawValue.replace(/\D/g, "");
    if (!digits) {
      updateItem(idx, { unitPrice: 0 });
      return;
    }
    // Converte para centavos e depois para decimal (0,00)
    const numericValue = Number(digits) / 100;
    updateItem(idx, { unitPrice: numericValue });
  };


  const submit = async () => {
    if (!customer.name) {
      toast.error("Por favor, informe o nome do cliente.");
      return;
    }

    try {
      const itemsWithTotals = items.map((it) => ({
        ...it,
        totalPrice: Number(it.quantity) * Number(it.unitPrice),
      })).filter(it => it.productId > 0);

      if (itemsWithTotals.length === 0) {
        toast.error("Adicione pelo menos um produto ao pedido.");
        return;
      }

      const payload = { 
        fulfillmentType, 
        paymentMethod, 
        customer, 
        notes, 
        mesaId, 
        items: itemsWithTotals 
      };
      
      const created = await createOrder(payload);
      const id = (created as any)?.id;
      setFieldErrors({});
      
      if (id) {
        toast.success("Pedido criado com sucesso!");
        navigate(`/admin/orders/${id}`);
      }
    } catch (err: any) {
      const body = err?.body;
      const errorsObj: Record<string, string[]> = body?.errors || {};
      
      const newFieldErrors: Record<string, string> = {};
      Object.entries(errorsObj).forEach(([key, msgs]) => {
        newFieldErrors[key] = msgs[0];
      });
      setFieldErrors(newFieldErrors);
      toast.error("Verifique os campos obrigatórios.");
    }
  };

  const formatBRL = useMemo(
    () => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
    []
  );

  const itemsTotals = useMemo(
    () => items.map((it) => Number(it.quantity) * Number(it.unitPrice)),
    [items]
  );

  const orderTotal = useMemo(
    () => itemsTotals.reduce((acc, v) => acc + (isFinite(v) ? v : 0), 0),
    [itemsTotals]
  );

  const canSubmit = useMemo(() => {
    return items.some((it) => it.productId > 0) && customer.name.length > 0;
  }, [items, customer.name]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-8 h-8" />
          </Button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-primary" />
              Novo Pedido
            </h1>
            <p className="text-muted-foreground mt-1">Registre uma nova venda de forma rápida e intuitiva.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/orders")}>
            Cancelar
          </Button>
          <Button disabled={isPending || !canSubmit} onClick={submit} className="font-bold shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4 stroke-[3]" />
            {isPending ? "Criando..." : "Salvar Pedido"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
        {/* Left Column: Items Selection (Most Active Area) */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] shadow-sm border-none bg-white overflow-hidden flex flex-col min-h-[600px]">
            <CardHeader className="bg-gray-50/50 border-b p-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black">Itens do Pedido</CardTitle>
                  <CardDescription className="font-medium">Adicione os produtos e quantidades.</CardDescription>
                </div>
                <Badge variant="secondary" className="rounded-xl h-8 px-4 font-black bg-primary/10 text-primary border-none">
                  {items.filter(it => it.productId > 0).length} Itens Selecionados
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {items.map((it, idx) => (
                <div key={`item-${idx}`} className="group relative p-6 rounded-[1.5rem] border-2 border-gray-100 bg-white hover:border-primary/20 transition-all duration-300">
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    <div className="flex-1 w-full space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-1">Produto / Serviço</Label>
                          <Combobox
                            options={productOptions}
                            value={it.productId ? String(it.productId) : ""}
                            onValueChange={(val) => selectProductForItem(idx, val)}
                            placeholder="Pesquisar produto..."
                            searchPlaceholder="Digite o nome..."
                            emptyText="Produto não encontrado"
                            disabled={isPending}
                            loading={isLoadingProducts}
                            onSearch={setProductsSearchTerm}
                            searchTerm={productsSearchTerm}
                            className="w-full h-12 rounded-xl border-gray-200"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-1">Quantidade</Label>
                          <div className="flex items-center border-2 border-gray-100 rounded-xl overflow-hidden focus-within:border-primary/50 transition-colors">
                            <button 
                              className="w-10 h-12 flex items-center justify-center hover:bg-gray-50 text-gray-400"
                              onClick={() => updateItem(idx, { quantity: Math.max(1, (it.quantity || 1) - 1) })}
                            >
                              -
                            </button>
                            <Input
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                              className="h-12 border-none text-center font-black text-lg bg-transparent focus-visible:ring-0"
                            />
                            <button 
                              className="w-10 h-12 flex items-center justify-center hover:bg-gray-50 text-gray-400"
                              onClick={() => updateItem(idx, { quantity: (it.quantity || 1) + 1 })}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-1">Preço Unitário</Label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">R$</span>
                            <Input
                              value={formatValueToCurrency(it.unitPrice)}
                              onChange={(e) => handlePriceChange(idx, e.target.value)}
                              className="h-12 pl-11 text-right font-black text-lg rounded-xl border-gray-200 focus:border-primary/50"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-gray-400 tracking-widest pl-1 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Observações e Adicionais
                        </Label>
                        
                        {it.variationGroups && it.variationGroups.length > 0 && (
                          <div className="mb-2 p-3 bg-gray-50 rounded-xl border border-dashed text-xs space-y-1">
                            {it.variationGroups.map((group) => (
                              <div key={group.name} className="flex gap-1 flex-wrap">
                                <span className="font-bold text-gray-500">{group.name}:</span>
                                <span className="text-gray-900">{group.options.map(o => o.name).join(", ")}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <Input
                          className="h-10 text-sm bg-gray-50/50 border-none rounded-xl"
                          placeholder="Ex: Sem cebola, com sachês extras..."
                          value={it.notes ?? ""}
                          onChange={(e) => updateItem(idx, { notes: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-between self-stretch pt-6 md:pt-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(idx)} 
                        className="text-gray-300 hover:text-destructive hover:bg-destructive/5 rounded-xl w-10 h-10 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                      <div className="text-right mt-auto">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Subtotal Item</p>
                        <p className="text-xl font-black text-primary">{formatBRL.format(itemsTotals[idx] || 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                className="w-full border-dashed rounded-[1.5rem] py-12 flex flex-col gap-2 border-4 border-gray-100 hover:border-primary/30 hover:bg-primary/5 group transition-all"
                onClick={addItem}
              >
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Plus className="w-6 h-6 text-gray-300 group-hover:text-primary" />
                </div>
                <span className="text-sm font-black text-gray-400 group-hover:text-primary uppercase tracking-widest">Incluir outro produto</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Configuration & Totals Sidebar */}
        <div className="lg:sticky lg:top-8 space-y-6">
          {/* Section: Basic Data */}
          <Card className="rounded-[2rem] shadow-sm border-none overflow-hidden bg-white">
            <CardHeader className="bg-gray-50/50 border-b p-6">
              <CardTitle className="flex items-center gap-2 text-md font-black uppercase tracking-tight">
                <ClipboardList className="w-5 h-5 text-primary" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Atendimento</Label>
                <Select 
                  value={fulfillmentType} 
                  onValueChange={(val) => setFulfillmentType(val as FulfillmentType)}
                >
                  <SelectTrigger className="h-12 rounded-xl border-gray-100 font-bold">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value={FulfillmentType.Pickup}>Retirada no Balcão</SelectItem>
                    <SelectItem value={FulfillmentType.Delivery}>Entrega (Delivery)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Pagamento</Label>
                <Select 
                  value={paymentMethod} 
                  onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
                >
                  <SelectTrigger className="h-12 rounded-xl border-gray-100 font-bold">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value={PaymentMethod.Card}>Cartão de Crédito/Débito</SelectItem>
                    <SelectItem value={PaymentMethod.Cash}>Dinheiro à Vista</SelectItem>
                    <SelectItem value={PaymentMethod.Pix}>PIX (Transferência)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mesa / Local</Label>
                <Combobox
                  options={mesaOptions}
                  value={mesaId ? String(mesaId) : ""}
                  onValueChange={(val) => setMesaId(val ? Number(val) : null)}
                  placeholder="Opcional..."
                  searchPlaceholder="Buscar..."
                  emptyText="Não encontrado"
                  disabled={isPending}
                  loading={isLoadingMesas}
                  className="w-full h-12 rounded-xl border-gray-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section: Customer */}
          <Card className="rounded-[2rem] shadow-sm border-none overflow-hidden bg-white">
            <CardHeader className="bg-gray-50/50 border-b p-6">
              <CardTitle className="flex items-center gap-2 text-md font-black uppercase tracking-tight">
                <User className="w-5 h-5 text-primary" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CustomerForm 
                value={customer} 
                fulfillmentType={fulfillmentType} 
                onChange={setCustomer} 
              />
            </CardContent>
          </Card>

          {/* Section: Total Summary Card */}
          <Card className="rounded-[2.5rem] shadow-2xl border-none bg-slate-900 text-white overflow-hidden">
            <CardContent className="p-8">
              <div className="space-y-4">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Resumo Financeiro</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Subtotal</span>
                  <span className="text-slate-200 font-black">{formatBRL.format(orderTotal)}</span>
                </div>
                {fulfillmentType === FulfillmentType.Delivery && (
                   <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium whitespace-nowrap">Taxa de Entrega</span>
                    <Badge variant="outline" className="border-slate-700 text-slate-400 font-black">CALC. NO FIM</Badge>
                   </div>
                )}
                
                <Separator className="bg-slate-800 my-6" />
                
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">Total Geral</span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-primary block">{formatBRL.format(orderTotal)}</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Icms incluso</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full h-16 rounded-[1.25rem] mt-8 font-black text-xl shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 text-white border-none group" 
                  disabled={isPending || !canSubmit}
                  onClick={submit}
                >
                  <span className="flex items-center gap-3">
                    {isPending ? "PROCESSANDO..." : "FINALIZAR PEDIDO"} 
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
                
                <div className="pt-4 text-center">
                  <button onClick={() => setNotes(n => n || " ")} className="text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto">
                    <MessageSquare className="w-3 h-3" />
                    Adicionar Notas Admin
                  </button>
                  {notes && (
                    <Textarea
                      className="mt-4 bg-slate-800 border-none rounded-xl text-xs text-slate-300 min-h-[80px]"
                      placeholder="Notas internas..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
};

export default AdminOrderCreate;
