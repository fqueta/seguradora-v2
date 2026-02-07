import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOrder, useUpdateOrder } from "@/hooks/orders";
import { FulfillmentType, PaymentMethod, Order, OrderItem, CustomerInfo } from "@/types/orders";
import OrderItemsEditor from "@/components/orders/OrderItemsEditor";
import { useProductsList } from "@/hooks/products";
import { useMesasList } from "@/hooks/mesas";
import { Combobox, useComboboxOptions } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";

const AdminOrderEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useOrder(id as string);
  const { mutateAsync: updateOrder, isPending } = useUpdateOrder(id as string);

  const [fulfillmentType, setFulfillmentType] = React.useState<FulfillmentType>(FulfillmentType.Pickup);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(PaymentMethod.Card);
  const [customer, setCustomer] = React.useState<CustomerInfo>({
    name: "",
    phone: "",
    address: null,
  });
  const [notes, setNotes] = React.useState<string>("");
  const [mesaId, setMesaId] = React.useState<number | null>(null);
  const [items, setItems] = React.useState<OrderItem[]>([]);
  const [productsSearchTerm, setProductsSearchTerm] = React.useState<string>("");
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
    (p) => `R$ ${Number(p?.salePrice || 0).toFixed(2)} • Estoque: ${Number(p?.stock || 0)}`
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

  React.useEffect(() => {
    const current = order as Order | undefined;
    if (!current) return;
    setFulfillmentType(current.fulfillmentType);
    setPaymentMethod(current.paymentMethod);
    setCustomer(current.customer);
    setNotes(current.notes ?? "");
    setItems(current.items ?? []);
    setMesaId((current as any)?.mesaId ?? null);
  }, [order]);

  const updateCustomer = (patch: Partial<CustomerInfo>) => {
    setCustomer((prev) => ({ ...prev, ...patch }));
  };
  const updateAddress = (patch: any) => {
    const nextAddr = { ...(customer.address ?? {}), ...patch };
    setCustomer((prev) => ({ ...prev, address: nextAddr }));
  };
  const updateItem = (idx: number, patch: Partial<OrderItem>) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };
  const selectProductForItem = (idx: number, productIdStr: string) => {
    const pid = Number(productIdStr);
    const product = availableProducts.find((p) => String(p.id) === productIdStr);
    const title = product?.name ?? "";
    const unitPrice = Number(product?.salePrice ?? 0);
    updateItem(idx, { productId: pid, title, unitPrice });
  };

  const submit = async () => {
    try {
      const payload = { fulfillmentType, paymentMethod, customer, notes, mesaId, items };
      const updated = await updateOrder(payload);
      const oid = (updated as any)?.id ?? id;
      alert("Pedido atualizado");
      navigate(`/admin/orders/${oid}`);
    } catch (err: any) {
      alert(err?.message ?? "Falha ao salvar pedido");
    }
  };

  if (isLoading) return <div className="p-6">Carregando pedido...</div>;
  if (error || !order) return <div className="p-6 text-destructive">Pedido não encontrado</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Pedido #{(order as Order)?.id}</h1>
          <p className="text-muted-foreground">Atualize dados, itens e status do pedido</p>
        </div>
        <Button disabled={isPending} onClick={submit}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Dados do Pedido</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm mb-1">Atendimento</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={fulfillmentType}
                  onChange={(e) => setFulfillmentType(e.target.value as FulfillmentType)}
                >
                  <option value={FulfillmentType.Pickup}>Retirada</option>
                  <option value={FulfillmentType.Delivery}>Entrega</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Pagamento</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                >
                  <option value={PaymentMethod.Card}>Cartão</option>
                  <option value={PaymentMethod.Cash}>Dinheiro</option>
                  <option value={PaymentMethod.Pix}>PIX</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm mb-1">Mesa</label>
                <Combobox
                  options={mesaOptions}
                  value={mesaId ? String(mesaId) : ""}
                  onValueChange={(val) => setMesaId(val ? Number(val) : null)}
                  placeholder="Selecione uma mesa..."
                  searchPlaceholder="Buscar mesa..."
                  emptyText="Nenhuma mesa encontrada"
                  disabled={isPending}
                  loading={isLoadingMesas}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Cliente</h2>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Nome"
                value={customer.name}
                onChange={(e) => updateCustomer({ name: e.target.value })}
              />
              <Input
                placeholder="Telefone"
                value={customer.phone}
                onChange={(e) => updateCustomer({ phone: e.target.value })}
              />
            </div>
            {fulfillmentType === FulfillmentType.Delivery && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Rua"
                  value={customer.address?.street ?? ""}
                  onChange={(e) => updateAddress({ street: e.target.value })}
                />
                <Input
                  placeholder="Número"
                  value={customer.address?.number ?? ""}
                  onChange={(e) => updateAddress({ number: e.target.value })}
                />
                <Input
                  placeholder="Bairro"
                  value={customer.address?.neighborhood ?? ""}
                  onChange={(e) => updateAddress({ neighborhood: e.target.value })}
                />
                <Input
                  placeholder="Cidade"
                  value={customer.address?.city ?? ""}
                  onChange={(e) => updateAddress({ city: e.target.value })}
                />
                <Input
                  placeholder="Estado"
                  value={customer.address?.state ?? ""}
                  onChange={(e) => updateAddress({ state: e.target.value })}
                />
                <Input
                  placeholder="CEP"
                  value={customer.address?.zip ?? ""}
                  onChange={(e) => updateAddress({ zip: e.target.value })}
                />
                <Input
                  placeholder="Complemento"
                  value={customer.address?.complement ?? ""}
                  onChange={(e) => updateAddress({ complement: e.target.value })}
                />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Observações</h2>
            <textarea
              className="w-full border rounded px-2 py-1"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Itens</h2>
          <OrderItemsEditor items={items} onChange={setItems} />
        </div>
      </div>
    </div>
  );
};

export default AdminOrderEdit;
